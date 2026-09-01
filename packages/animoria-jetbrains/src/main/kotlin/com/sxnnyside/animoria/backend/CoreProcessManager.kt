package com.sxnnyside.animoria.backend

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.module.ModuleManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ModuleRootManager
import com.sxnnyside.animoria.logging.AnimoriaLogger
import kotlinx.coroutines.*
import kotlinx.serialization.json.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

// ── Project-level service ──────────────────────────────────────────────────────

/**
 * Project-level service managing the background Node.js CLI daemon process.
 *
 * ## Bidirectional NDJSON protocol
 * The daemon accepts commands via stdin (one JSON object per line) and emits
 * results on stdout. Each command carries an optional `requestId`; the daemon
 * echoes it back on the response so callers can correlate replies without
 * ordering assumptions.
 *
 * Push events (scan progress, watcher events) are emitted without a
 * `requestId` and are routed via the corresponding `on*` callbacks.
 *
 * ## Lifecycle
 * Started by `AnimoriaToolWindowFactory` when the Tool Window is first created.
 * Stopped when the Tool Window is disposed. The coroutine scope is cancelled on
 * `stop()` to drain all pending deferred results cleanly.
 */
@Service(Service.Level.PROJECT)
class CoreProcessManager(
    private val project: Project,
) {
    private val logger = Logger.getInstance(CoreProcessManager::class.java)
    private val binaryResolver = DaemonBinaryResolver(project, logger)

    /**
     * Decoder for daemon payloads.
     *
     * `ignoreUnknownKeys` because the canonical analysis is Core's contract, not the
     * plugin's: a Core that gains a field must not break an installed plugin that
     * predates it. The alternative — a strict decoder — turns every additive Core
     * change into a silent deserialization failure in the IDE.
     */
    private val payloadJson = Json { ignoreUnknownKeys = true }

    /**
     * The scope every daemon read-loop runs in, recreated by [start].
     *
     * A `CoroutineScope` is single-use: once cancelled it rejects every later
     * `launch` silently. This used to be a `val` created once at construction and
     * cancelled by [stop], which made the service permanently dead after its first
     * stop — closing the Animoria tool window and reopening it left a plugin whose
     * every feature quietly did nothing, because `start()` launched into a scope
     * that had already been cancelled. Recreating it on start is what makes
     * stop/start a real cycle rather than a one-way door.
     */
    private var scope: CoroutineScope = newScope()
    private var process: Process? = null

    /** The roots resolved by the last [start], used to trigger the automatic first scan once `ready` arrives. */
    private var lastRoots: List<String> = emptyList()
    private var stdinWriter: PrintWriter? = null

    private fun newScope(): CoroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /** True once the daemon has emitted `ready`. Requests wait for it. */
    @Volatile
    var isReady: Boolean = false
        private set

    /** Fired once the handshake completes and the first analysis is established. */
    var onReady: (() -> Unit)? = null

    /** Highest event sequence seen this session, for ordering assertions. */
    private var lastSequence: Int = 0

    /** Set once a version mismatch has been reported, so it is not repeated per line. */
    private var protocolMismatchReported: Boolean = false

    // Pending on-demand command results keyed by requestId.
    private val pendingRequests = ConcurrentHashMap<String, CompletableDeferred<JsonElement>>()

    // Best-effort cache of the latest known asset list, kept in sync from
    // scanComplete/watcherEvent push events so callers that only need a
    // quick, non-authoritative snapshot (e.g. a line-marker gutter icon)
    // don't need to round-trip a command for it.
    @Volatile
    private var cachedAssets: List<JetBrainsAsset> = emptyList()

    /** Best-effort snapshot of the most recently known asset list. */
    fun getCachedAssets(): List<JetBrainsAsset> = cachedAssets

    // ── Push-event callbacks ──────────────────────────────────────────────────

    /** Triggered during scanning to report progress percentage and status message. */
    var onScanProgress: ((Int, String) -> Unit)? = null

    /** Triggered when a workspace scan or incremental update finishes. */
    var onScanComplete: ((String) -> Unit)? = null

    /** Triggered when the daemon emits a governance analysis result. */
    var onGovernanceResult: ((WorkspaceAnalysisData) -> Unit)? = null

    /** Triggered when a thumbnail generation completes. */
    var onThumbnailResult: ((ThumbnailResultData) -> Unit)? = null

    /** Triggered with the cleanup proposal data. */
    var onCleanupProposal: ((CleanupProposalData) -> Unit)? = null

    /** Triggered when a snippet-generation request completes. */
    var onSnippetResult: ((SnippetResultData) -> Unit)? = null

    /** Triggered when a Bulk Cleanup execution completes. */
    var onCleanupSummary: ((CleanupSummaryData) -> Unit)? = null

    /** Triggered when a duplicate-resolution request completes. */
    var onDuplicateResolutionResult: ((DuplicateResolutionResultData) -> Unit)? = null

    /** Triggered when a governance report export completes. */
    var onGovernanceReportExport: ((GovernanceReportExportData) -> Unit)? = null

    /** Triggered on any daemon error. */
    var onError: ((String) -> Unit)? = null

    /**
     * Triggered when the daemon could not be spawned at all (no bundled
     * native executable for this platform, no `cli.js` reachable, or the
     * process failed to start) — distinct from [onError], which covers
     * failures of a *running* daemon. Without this, a spawn failure was
     * previously visible only as a single line in the global IDE log:
     * every feature would silently do nothing, with no indication why.
     */
    var onDaemonUnavailable: ((String) -> Unit)? = null

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /**
     * Spawns the background CLI daemon process for the current project.
     * Starts reading stdout lines and parsing them as NDJSON events.
     *
     * Prefers the self-contained native `animoria` executable bundled with the plugin or built
     * in `packages/animoria-core-rust/target/` over fallback runtimes.
     */
    fun start() {
        // V2: every content root the project declares, not `project.basePath`.
        //
        // `basePath` is the directory the `.idea` folder lives in. A project with
        // several modules, or one attached folder outside that directory, has assets
        // `basePath` does not cover — so the daemon indexed a subset and the plugin
        // reported the rest as absent rather than as unscanned.
        val roots = resolveContentRoots()
        if (roots.isEmpty()) {
            AnimoriaLogger.warn("Animoria: this project declares no content roots; nothing to index.")
            return
        }
        lastRoots = roots

        // Idempotent: a second start while a daemon is already running would leak
        // the first process, and the tool window factory can legitimately run more
        // than once for one project.
        if (process?.isAlive == true) return
        if (!scope.isActive) scope = newScope()

        scope.launch {
            try {
                val bundledExecutable = binaryResolver.findBundledExecutable()
                if (bundledExecutable == null) {
                    val message =
                        "Animoria could not start: no native daemon binary was found. " +
                            "Please compile animoria-core-rust ('cargo build --release')."
                    AnimoriaLogger.error(message)
                    onDaemonUnavailable?.invoke(message)
                    return@launch
                }

                logger.info("Animoria: Spawning bundled native daemon over ${roots.size} root(s)")
                // The native daemon takes no CLI arguments — every request,
                // including which workspace to scan, travels as NDJSON over
                // stdin. Passing `roots` here made clap reject the process
                // outright (`unexpected argument`), so it died before ever
                // printing a byte: no `ready` event, no error surfaced, just
                // a tool window stuck on "Waiting for the Animoria engine…"
                // for its whole lifetime.
                val pb = ProcessBuilder(listOf(bundledExecutable.absolutePath, "daemon"))
                // Keep stdout separate from stderr so we can parse JSON cleanly.
                pb.redirectErrorStream(false)

                val proc = pb.start()
                process = proc
                stdinWriter = PrintWriter(proc.outputStream.bufferedWriter(), true)

                // Drain stderr to the IDE log without mixing it into the NDJSON stream.
                scope.launch {
                    proc.errorStream.bufferedReader().forEachLine { line ->
                        logger.debug("Animoria daemon stderr: $line")
                    }
                }

                BufferedReader(InputStreamReader(proc.inputStream, Charsets.UTF_8)).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        handleProcessLine(line!!)
                    }
                }
            } catch (e: Exception) {
                val message = "Animoria daemon process failed to start or crashed: ${e.message}"
                AnimoriaLogger.error(message, e)
                onDaemonUnavailable?.invoke(message)
            }
        }
    }

    /**
     * Sends a command to the daemon via stdin and returns a `Deferred` that
     * resolves when the daemon emits a response carrying the matching `requestId`.
     *
     * If no response arrives within `timeoutMs` milliseconds, the deferred
     * completes exceptionally with a `TimeoutCancellationException`.
     */
    suspend fun sendCommand(
        command: String,
        data: JsonObject = buildJsonObject {},
        // Local subprocess IPC over standard I/O (typically < 10ms for warm scans)
        timeoutMs: Long = 10_000L,
    ): JsonElement {
        val requestId = UUID.randomUUID().toString()
        val deferred = CompletableDeferred<JsonElement>()
        pendingRequests[requestId] = deferred

        // Protocol v1 envelope. `method`, not `command`; `params`, not `data`; and a
        // required `protocol`, so a daemon of a different vintage rejects this rather
        // than interpreting it under its own assumptions.
        val payload =
            buildJsonObject {
                put("protocol", PROTOCOL_VERSION)
                put("id", requestId)
                put("method", command)
                put("params", data)
            }

        stdinWriter?.println(payload.toString())
            ?: error("Animoria daemon stdin not available — process not started")

        return try {
            withTimeout(timeoutMs) { deferred.await() }
        } finally {
            pendingRequests.remove(requestId)
        }
    }

    /**
     * Liveness check with a short timeout of its own. Requests are answered
     * in arrival order over one stdio pipe, so a `ping` queued behind a
     * long-running scan waits for it like anything else — this confirms the
     * daemon is alive between operations, not concurrently during one.
     */
    suspend fun ping(timeoutMs: Long = 2_000L): Boolean =
        runCatching {
            sendCommand("ping", timeoutMs = timeoutMs)
        }.isSuccess

    /**
     * Fire-and-forget: tells the daemon its cached analysis for [workspacePath]
     * is stale, called from [AnimoriaVFSListener] on every in-scope VFS event.
     * The daemon has no filesystem watcher of its own — this is IntelliJ's VFS
     * forwarding what it already knows, not a request for an immediate re-scan.
     * Any UI reading `LifecycleState.Stale` decides for itself whether/when to
     * trigger the next `analyze`.
     */
    fun notifyFileChanged(workspacePath: String) {
        if (!scope.isActive) return
        scope.launch {
            runCatching {
                sendCommand("markStale", buildJsonObject { put("workspace_path", workspacePath) })
            }.onFailure { error ->
                AnimoriaLogger.warn("Animoria: markStale failed for $workspacePath (${error.message})")
            }
        }
    }

    /**
     * Terminates the background daemon process and cancels the coroutine scope,
     * resolving all pending deferred results with a cancellation exception.
     */
    fun stop() {
        // The scope is not reusable after this; [start] creates a fresh one.
        scope.cancel()
        stdinWriter?.close()
        stdinWriter = null
        process?.let { proc ->
            proc.destroy()
            if (!proc.waitFor(500, java.util.concurrent.TimeUnit.MILLISECONDS)) {
                proc.destroyForcibly()
            }
        }
        process = null
        pendingRequests.values.forEach { it.cancel() }
        pendingRequests.clear()
    }

    // ── Private: workspace roots ──────────────────────────────────────────────

    /**
     * Every content root this project declares, canonicalized and deduplicated.
     *
     * `project.basePath` is where `.idea` lives, not the project's asset universe: a
     * multi-module project, or one with an attached folder elsewhere, has roots
     * `basePath` does not contain. Reading the module manager is the platform's own
     * answer to "what belongs to this project", and using anything else means Kotlin
     * is reconstructing the workspace model instead of reporting it.
     *
     * Falls back to `basePath` only when the module manager reports nothing, which
     * happens for a project opened as a plain directory.
     */
    private fun resolveContentRoots(): List<String> {
        val fromModules =
            runCatching {
                ModuleManager
                    .getInstance(project)
                    .modules
                    .flatMap { module -> ModuleRootManager.getInstance(module).contentRoots.toList() }
                    .mapNotNull { it.canonicalPath }
            }.getOrDefault(emptyList())

        val roots = if (fromModules.isNotEmpty()) fromModules else listOfNotNull(project.basePath)

        // Nested roots are dropped: the daemon attributes a path to its most specific
        // root anyway, and passing both would index the inner one twice under two
        // configurations.
        val sorted = roots.distinct().sorted()
        return sorted.filterIndexed { index, candidate ->
            sorted.take(index).none { candidate.startsWith("$it/") }
        }
    }

    // ── Private: line routing ─────────────────────────────────────────────────

    /**
     * Routes one protocol v1 message.
     *
     * Responses and events are structurally distinct now — a response carries `id`,
     * an event carries `event` and `sequence` — so a `commandError` can no longer be
     * an event wearing a response's shape, which is what made the previous protocol
     * unanalysable.
     */
    private fun handleProcessLine(line: String) {
        val trimmed = line.trim()
        if (!trimmed.startsWith("{")) {
            logger.debug("Animoria: Daemon console: $line")
            return
        }

        val json =
            runCatching { Json.parseToJsonElement(trimmed).jsonObject }
                .getOrElse {
                    logger.debug("Animoria: unparseable daemon line: $line")
                    return
                }

        val daemonProtocol = json["protocol"]?.jsonPrimitive?.intOrNull
        if (daemonProtocol == null || daemonProtocol != PROTOCOL_VERSION) {
            // Never proceed on a guess. A version mismatch means a broken install —
            // an old binary beside a new plugin, or the reverse — and continuing
            // would exchange payloads each side interprets under its own assumptions.
            reportProtocolMismatch(daemonProtocol)
            return
        }

        val requestId = json["id"]?.jsonPrimitive?.contentOrNull
        if (requestId != null) {
            settleResponse(requestId, json)
            return
        }

        val event = json["event"]?.jsonPrimitive?.contentOrNull ?: return
        recordSequence(event, json["sequence"]?.jsonPrimitive?.intOrNull ?: 0)
        routeEvent(event, json["payload"] ?: JsonNull)
    }

    /** Completes the waiting request for [requestId], with its result or its error. */
    private fun settleResponse(
        requestId: String,
        json: JsonObject,
    ) {
        val pending = pendingRequests[requestId]
        val error = json["error"]

        if (error == null || error is JsonNull) {
            pending?.complete(json["result"] ?: JsonNull)
            return
        }

        val message =
            error.jsonObject["message"]?.jsonPrimitive?.contentOrNull
                ?: "The Animoria engine reported an error."
        val code = error.jsonObject["code"]?.jsonPrimitive?.contentOrNull ?: "internal-error"
        pending?.completeExceptionally(DaemonRequestException(code, message))
        AnimoriaLogger.warn("Animoria daemon [$code]: $message")
    }

    /**
     * Asserts event ordering rather than assuming it.
     *
     * A sequence that goes backwards means a dropped or reordered event. Rendering
     * around it would show a stale analysis over a fresh one, which is invisible; a
     * logged gap is not.
     */
    private fun recordSequence(
        event: String,
        sequence: Int,
    ) {
        if (sequence in 1..lastSequence) {
            AnimoriaLogger.warn(
                "Animoria: out-of-order daemon event \"$event\" (sequence $sequence after $lastSequence)",
            )
        }
        if (sequence > lastSequence) lastSequence = sequence
    }

    /**
     * Every method this plugin actually calls, checked once against what the daemon
     * says it can answer.
     *
     * The protocol version cannot express "this binary predates the plugin that
     * bundled it": a stale daemon speaks v1 perfectly and simply refuses a method.
     * That shipped — `getUsageReferences` came back as
     * "declared but not implemented in this build", a message that describes the
     * binary accurately and hides the cause, once per feature, forever.
     *
     * One check at handshake turns a stream of confusing per-feature failures into a
     * single actionable statement about the install.
     */
    private fun verifyDaemonCapabilities(methods: Set<String>) {
        if (methods.isEmpty()) {
            // A daemon too old to declare its method list at all.
            AnimoriaLogger.error(
                "Animoria's bundled engine is out of date and cannot report what it supports. " +
                    "Reinstall the plugin, or rebuild it with: pnpm package:jetbrains",
            )
            return
        }

        val missing = REQUIRED_METHODS - methods
        if (missing.isNotEmpty()) {
            AnimoriaLogger.error(
                "Animoria's bundled engine is out of date: it cannot answer " +
                    "${missing.sorted().joinToString(", ")}. Features using them will not work. " +
                    "Rebuild the plugin with: pnpm package:jetbrains",
            )
        }
    }

    /** Reports an unusable daemon once, and stops treating it as available. */
    private fun reportProtocolMismatch(daemonProtocol: Int?) {
        if (protocolMismatchReported) return
        protocolMismatchReported = true

        val message =
            "Animoria's background engine speaks protocol ${daemonProtocol ?: "an unknown version"}, " +
                "but this plugin expects $PROTOCOL_VERSION. Reinstall the plugin so both are updated together."
        AnimoriaLogger.error(message)
        onDaemonUnavailable?.invoke(message)
    }

    private fun routeEvent(
        event: String,
        data: JsonElement,
    ) {
        if (routeLifecycleEvent(event, data)) return
        if (routeAnalysisEvent(event, data)) return
        routeFailureEvent(event, data)
    }

    /** Startup and progress. Returns true when handled. */
    private fun routeLifecycleEvent(
        event: String,
        @Suppress("UNUSED_PARAMETER") data: JsonElement,
    ): Boolean {
        when (event) {
            // Only "analysis-started" is ever actually emitted (right before the
            // daemon runs `scan`/`check`/`analyze`) — there's no granular
            // percent-complete producer for a synchronous, single-pass scan, so
            // no "*-progress" case is registered here to invent one.
            "analysis-started" -> {
                onScanProgress?.invoke(0, "Analyzing workspace…")
            }

            "ready" -> {
                // The handshake gate. Nothing but `hello`/`ping` is sent before this,
                // so a request's behaviour never depends on how fast the scan ran.
                isReady = true
                onReady?.invoke()

                // Nothing else triggers the first scan — VS Code's extension scans on
                // activation, but nothing here did, so the tool window opened onto a
                // holder that stayed empty until the developer clicked "Run
                // Governance" by hand. The daemon itself no longer scans CLI-supplied
                // roots (it takes no arguments at all), so this is the one place a
                // first analysis gets requested.
                //
                // `hello` is requested (not pushed as an event — the daemon never
                // emits one) so `verifyDaemonCapabilities` runs against a real
                // `methods` list before the first `analyze`, catching a daemon
                // binary that predates a method this plugin calls.
                scope.launch {
                    runCatching { sendCommand("hello") }
                        .onSuccess { result ->
                            val methods =
                                (result.jsonObject["methods"] as? JsonArray)
                                    ?.mapNotNull { it.jsonPrimitive.contentOrNull }
                                    ?.toSet()
                                    .orEmpty()
                            verifyDaemonCapabilities(methods)
                        }.onFailure { error ->
                            AnimoriaLogger.error("Animoria: hello handshake failed", error)
                        }
                }

                val root = lastRoots.firstOrNull()
                if (root != null) {
                    scope.launch {
                        runCatching { sendCommand("analyze", buildJsonObject { put("workspace_path", root) }) }
                            .onFailure { error ->
                                AnimoriaLogger.error("Animoria: initial scan failed", error)
                            }
                    }
                }
            }

            else -> return false
        }
        return true
    }

    /** The canonical analysis. Returns true when handled. */
    private fun routeAnalysisEvent(
        event: String,
        data: JsonElement,
    ): Boolean {
        when (event) {
            // `analysis-stale` carries no analysis payload — it's the daemon telling
            // JetBrains' own VFS-forwarded `markStale` call landed, so the cached
            // analysis should be treated as out of date. Nothing here re-triggers a
            // scan automatically; that stays a user/UI decision.
            "analysis-stale" -> {
                onScanProgress?.invoke(0, "Workspace changed — analysis is stale")
            }

            // ── Analysis ──
            //
            // One event carries the whole canonical analysis, and it is cached before
            // any callback runs — the inspection cannot wait on a daemon round-trip
            // inside a highlighting pass, so it must find the same analysis the tool
            // window is about to render.
            "analysis-completed" -> {
                // Decoded once, and loudly.
                //
                // The previous code decoded twice, each time discarding the failure —
                // one `catch {}` and one `runCatching {}.onSuccess {}` with no
                // `onFailure`. Because the shape was wrong, both threw on every single
                // analysis and the plugin silently held nothing. A decode failure here
                // means the client and the daemon disagree about the contract, which
                // is precisely the condition that must never be quiet.
                payloadJson
                    .runCatching {
                        if (data is JsonObject && data.containsKey("roots")) {
                            decodeFromJsonElement<MultiRootAnalysisData>(data).flatten()
                        } else {
                            decodeFromJsonElement<WorkspaceAnalysisData>(data)
                        }
                    }.onSuccess { flattened ->
                        cachedAssets = flattened.assets
                        AnimoriaAnalysisHolder.of(project).update(flattened, data)
                        onGovernanceResult?.invoke(flattened)
                        prefetchReferences(flattened.generation)
                    }.onFailure { error ->
                        AnimoriaLogger.error(
                            "Animoria: the analysis from the engine could not be read — " +
                                "contract mismatch with native daemon",
                            error,
                        )
                        onError?.invoke(
                            "Animoria could not read the analysis the engine produced. " +
                                "See the log for the contract mismatch.",
                        )
                    }
                onScanComplete?.invoke(data.toString())
            }

            else -> return false
        }
        return true
    }

    /**
     * Loads the whole workspace's usage references for one analysis generation.
     * Best-effort background prefetch for editor hover providers.
     */
    private fun prefetchReferences(generation: Int) {
        scope.launch {
            val response =
                runCatching { sendCommand("getUsageReferences") }.getOrElse { error ->
                    AnimoriaLogger.warn(
                        "Animoria: could not load usage references — editor hovers will be unavailable " +
                            "(${error.message})",
                    )
                    return@launch
                }

            runCatching { payloadJson.decodeFromJsonElement<WorkspaceReferencesResultData>(response) }
                .onSuccess { result ->
                    AnimoriaAnalysisHolder.of(project).updateReferences(
                        generation,
                        result.references.map {
                            AnimoriaAnalysisHolder.AssetReference(it.assetPath, it.reference)
                        },
                    )
                }.onFailure { error ->
                    AnimoriaLogger.warn("Animoria: the usage-reference payload could not be read (${error.message})")
                }
        }
    }

    /** Terminal and non-terminal failures. */
    private fun routeFailureEvent(
        event: String,
        data: JsonElement,
    ) {
        when (event) {
            // ── Failure ──
            //
            // `fatal` is terminal and distinct from `analysis-failed`: the first means
            // the workspace is unusable, the second that one run did not finish. The
            // old protocol had only `error`, so a host could not tell them apart and
            // showed the same "something went wrong" for both.
            "fatal" -> {
                val message =
                    data.jsonObject["message"]?.jsonPrimitive?.contentOrNull
                        ?: "Animoria could not use this workspace."
                isReady = false
                AnimoriaLogger.error("Animoria daemon fatal: $message")
                onDaemonUnavailable?.invoke(message)
            }

            "analysis-failed" -> {
                val message =
                    data.jsonObject["message"]?.jsonPrimitive?.contentOrNull
                        ?: "The analysis could not be completed."
                AnimoriaLogger.warn("Animoria: $message")
                onError?.invoke(message)
            }

            "diagnostics" -> {
                val message = data.jsonObject["message"]?.jsonPrimitive?.contentOrNull ?: return
                AnimoriaLogger.warn("Animoria daemon: $message")
            }
        }
    }

    companion object {
        /**
         * The protocol version this plugin speaks (Protocol v1).
         */
        const val PROTOCOL_VERSION: Int = 1

        /**
         * The daemon methods this plugin depends on.
         *
         * Checked against `hello.methods` once per connection. Kept as a literal set
         * rather than derived from the bridge's `Method` object because it is a
         * *requirement*, not an inventory: this is what the plugin will not work
         * without, and it should change only when a feature genuinely starts or stops
         * needing something. `DaemonVocabularyTest` holds every name here to the
         * protocol's own declaration.
         */
        val REQUIRED_METHODS: Set<String> =
            setOf(
                "hello",
                "getAnalysis",
                "analyze",
                "getUsageReferences",
                "generateThumbnail",
                "generateSnippet",
                "exportReport",
                "buildCleanupProposal",
                "buildCleanupPlan",
                "applyCleanupPlan",
                "buildResolutionPlan",
                "applyResolutionPlan",
                "listTrashSessions",
                "restoreTrashSession",
            )
    }
}

/**
 * A structured failure from the daemon.
 *
 * Carries the protocol's error `code` so a caller can branch — "refresh and retry"
 * for `stale-plan`, "reinstall" for `unsupported-version` — rather than matching on
 * prose. The message is the daemon's developer-facing sentence; the stack trace, if
 * any, stayed in the daemon's log where it belongs.
 */
class DaemonRequestException(
    val code: String,
    override val message: String,
) : RuntimeException(message)
