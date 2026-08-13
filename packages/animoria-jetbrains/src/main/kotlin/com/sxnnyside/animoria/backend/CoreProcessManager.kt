package com.sxnnyside.animoria.backend

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.module.ModuleManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ModuleRootManager
import com.sxnnyside.animoria.logging.AnimoriaLogger
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.PrintWriter
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

// ── Inbound push-event data classes ───────────────────────────────────────────

@Serializable
data class CoreEvent(
    val event: String,
    val data: JsonElement,
    val requestId: String? = null,
)

@Serializable
data class ScanProgressData(
    val percent: Int,
    val message: String,
)

@Serializable
data class WatcherEventData(
    val type: String,
    val path: String,
    val asset: JetBrainsAsset? = null,
)

@Serializable
data class JetBrainsAsset(
    val path: String,
    val name: String,
    val stem: String,
    val format: String,
    val sizeBytes: Long,
    val mtime: Double,
    val status: String,
    val metadata: JsonElement? = null,
    val error: String? = null,
    val thumbnailPath: String? = null,
)

@Serializable
data class HealthScoreData(
    val score: Int,
    val label: String,
    val details: String? = null,
)

// ── Canonical analysis (the daemon's one governance result) ───────────────────
//
// These mirror `WorkspaceAnalysis` in @animoria/core. They replace
// `GovernanceIssueData` / `GovernanceResultData`, which modelled a second
// governance engine's `unused` / `duplicate` / `overused` categories — a shape that
// fed nothing into the Health Score this plugin displayed beside it, and that the
// panel then re-derived its own score from.
//
// Unknown fields are ignored by the lenient `Json` instance below, so a Core that
// gains a field does not break a plugin that has not learned about it yet.

@Serializable
data class EvidenceLocationData(
    val file: String,
    val line: Int? = null,
    val excerpt: String? = null,
)

@Serializable
data class DiagnosticEvidenceData(
    /** `reference` | `absence` | `content-hash` | `file-metadata` | `config`. */
    val kind: String,
    val summary: String,
    val locations: List<EvidenceLocationData> = emptyList(),
)

@Serializable
data class RemediationData(
    val summary: String,
)

@Serializable
data class ScanCoverageData(
    /** `complete` | `partial` | `none` | `unknown`. */
    val status: String,
    val scannedExtensions: List<String> = emptyList(),
    val unscannedExtensions: List<String> = emptyList(),
    val filesScanned: Int = 0,
    val referencesDetected: Int = 0,
)

@Serializable
data class RuleDiagnosticData(
    val ruleId: String,
    /** `error` | `warning`. Maps directly onto an IntelliJ inspection severity. */
    val severity: String,
    val asset: JetBrainsAsset,
    val message: String,
    val evidence: DiagnosticEvidenceData,
    /** `certain` | `high` | `moderate` | `low`. */
    val confidence: String,
    val remediation: RemediationData,
    val helpUri: String,
    val coverage: ScanCoverageData? = null,
)

@Serializable
data class SkippedRuleData(
    val ruleId: String,
    val severity: String,
    val reason: RuleSkipReasonData,
)

@Serializable
data class RuleSkipReasonData(
    val code: String,
    val message: String,
)

@Serializable
data class AnalysisReadinessData(
    val assetsIndexed: Boolean = false,
    val referencesResolved: Boolean = false,
    val duplicatesResolved: Boolean = false,
    val complete: Boolean = false,
)

@Serializable
data class HealthScoreReportData(
    val score: Double = 0.0,
    val totalAssetCount: Int = 0,
    val totalDiagnosticCount: Int = 0,
    val qualifications: List<HealthQualificationData> = emptyList(),
)

@Serializable
data class HealthQualificationData(
    val code: String,
    val message: String,
)

/**
 * The Health Score, or the reason there is none.
 *
 * `status` is `computed` or `unavailable`. A workspace Core could not score is
 * rendered as "not available" with its reason — never as a number, and never as the
 * locally-invented `100 - unused*5 - …` this plugin used to compute.
 */
@Serializable
data class HealthOutcomeData(
    val status: String = "unavailable",
    val report: HealthScoreReportData? = null,
    val reason: String? = null,
    val message: String? = null,
)

@Serializable
data class DuplicateCandidateData(
    val asset: JetBrainsAsset,
    val referenceCount: Int = 0,
)

@Serializable
data class DuplicateGroupData(
    val id: String,
    /** `content-hash` | `filename` — the basis on which membership was established. */
    val matchKind: String = "content-hash",
    val contentHash: String = "",
    val candidates: List<DuplicateCandidateData> = emptyList(),
    val sizeBytes: Long = 0,
    val potentialSavingsBytes: Long = 0,
)

/**
 * One asset, with the root Core attributed it to.
 *
 * The daemon sends `MultiRootAnalysis`, whose `assets` are `{rootId, rootName, asset}`
 * — not bare assets. Decoding them straight into [JetBrainsAsset] threw
 * `MissingFieldException` on every analysis, and both call sites swallowed it: one
 * with an empty `catch`, the other with a `runCatching { }.onSuccess { }` that has no
 * failure branch. The plugin therefore held no analysis at all, and every surface —
 * the tree, the inspections, the shared UI — showed "waiting for the engine" forever.
 */
@Serializable
data class AttributedAssetData(
    val rootId: String = "",
    val rootName: String = "",
    val asset: JetBrainsAsset,
)

/** One finding, with the root Core attributed it to. */
@Serializable
data class AttributedDiagnosticData(
    val rootId: String = "",
    val rootName: String = "",
    val diagnostic: RuleDiagnosticData,
)

/**
 * The canonical multi-root analysis, as the daemon actually sends it.
 *
 * Kept separate from [WorkspaceAnalysisData], which is the *flattened* projection the
 * plugin's native surfaces consume. The distinction matters in one direction in
 * particular: the JCEF bridge must forward the canonical payload verbatim, because
 * the shared UI renders `MultiRootAnalysis` and a re-encoded flat view would be
 * missing `roots`, `lifecycle`, `freshness` and every root's `referenceCounts`.
 */
@Serializable
data class MultiRootAnalysisData(
    val generatedAt: String = "",
    val generation: Int = 0,
    val readiness: AnalysisReadinessData = AnalysisReadinessData(),
    val assets: List<AttributedAssetData> = emptyList(),
    val diagnostics: List<AttributedDiagnosticData> = emptyList(),
    val duplicateGroups: List<DuplicateGroupData> = emptyList(),
) {
    /** The flattened view the tree, the inspections and the report editor read. */
    fun flatten(): WorkspaceAnalysisData =
        WorkspaceAnalysisData(
            generatedAt = generatedAt,
            generation = generation,
            readiness = readiness,
            assets = assets.map { it.asset },
            diagnostics = diagnostics.map { it.diagnostic },
            duplicateGroups = duplicateGroups,
        )
}

/** The flattened workspace analysis the plugin's native surfaces consume. */
@Serializable
data class WorkspaceAnalysisData(
    val workspacePath: String = "",
    val generatedAt: String = "",
    val generation: Int = 0,
    val readiness: AnalysisReadinessData = AnalysisReadinessData(),
    val assets: List<JetBrainsAsset> = emptyList(),
    val coverage: ScanCoverageData? = null,
    val diagnostics: List<RuleDiagnosticData> = emptyList(),
    val evaluatedRuleIds: List<String> = emptyList(),
    val skippedRules: List<SkippedRuleData> = emptyList(),
    val duplicateGroups: List<DuplicateGroupData> = emptyList(),
    val health: HealthOutcomeData = HealthOutcomeData(),
)

@Serializable
data class ThumbnailResultData(
    val assetPath: String,
    val thumbnailPath: String? = null,
    val error: String? = null,
)

@Serializable
data class SnippetData(
    val label: String,
    val code: String,
    val imports: String? = null,
    val installHint: String? = null,
)

@Serializable
data class SnippetResultData(
    val results: List<SnippetData> = emptyList(),
    val error: String? = null,
)

@Serializable
data class CleanupCandidateData(
    val assetPath: String,
    val assetName: String,
    val sizeBytes: Long,
    val reasons: List<String> = emptyList(),
    /** Derived from the evidence behind the candidate — see @animoria/core. Never asserted. */
    val confidence: String,
    val referenceCount: Int,
)

@Serializable
data class CleanupProposalData(
    val candidates: List<CleanupCandidateData> = emptyList(),
    val totalSizeBytes: Long = 0,
    val affectedReferencesCount: Int = 0,
    val affectedFolders: List<String> = emptyList(),
    val generatedAt: String = "",
)

@Serializable
data class StaticAssetData(
    val path: String,
    val name: String,
    val stem: String,
    val format: String,
    val sizeBytes: Long,
)

@Serializable
data class CleanupSummaryData(
    val removedAssetPaths: List<String> = emptyList(),
    val bytesReclaimed: Long = 0,
    val healthScoreBefore: Int = 0,
    val remainingCandidates: Int = 0,
    val completedAt: String = "",
    val trashLocation: String? = null,
)

@Serializable
data class DuplicateResolutionResultData(
    val removedAssetPaths: List<String> = emptyList(),
    val trashLocation: String? = null,
    /** Session id for `restoreTrash` — how a resolution is undone. */
    val trashSessionId: String? = null,
    /** How many source lines Core repointed at the canonical asset. */
    val updatedReferenceCount: Int = 0,
    /** `applied` | `rejected` | `failed`. */
    val status: String = "applied",
    val error: String? = null,
)

// ── Duplicate resolution plan (S4) ────────────────────────────────────────────
//
// The plan a client previews *and* the plan execution consumes. Preview and
// execution reading from one shape is what makes "what you saw is what ran" a
// structural property rather than a convention two code paths have to honour.

@Serializable
data class PlannedAssetRemovalData(
    val path: String,
    val name: String = "",
    val sizeBytes: Long = 0,
)

@Serializable
data class ReferenceUpdateData(
    val file: String,
    val line: Int,
    /** The line as it stands today. */
    val oldText: String = "",
    /** The line after repointing. */
    val newText: String = "",
    /** The reference target being replaced. */
    val oldTarget: String = "",
    /** The target replacing it — a full path recomputed from the referencing file. */
    val newTarget: String = "",
)

@Serializable
data class UnrewritableReferenceData(
    val file: String,
    val line: Int,
    val text: String = "",
    /** Why Animoria will not rewrite this line. Never a guess — see Core's `RewriteRefusalReason`. */
    val reason: String = "",
    /** Plain-language explanation, safe to show a developer verbatim. */
    val explanation: String = "",
)

@Serializable
data class ResolutionPlanData(
    val canonicalAssetPath: String = "",
    val assetsToDelete: List<PlannedAssetRemovalData> = emptyList(),
    val referenceUpdates: List<ReferenceUpdateData> = emptyList(),
    val unrewritableReferences: List<UnrewritableReferenceData> = emptyList(),
    /**
     * `complete` — every reference will be repointed.
     * `partial` — some cannot be, and executing anyway leaves them pointing at
     * assets that have moved to trash. A client must show this before confirming.
     */
    val safety: String = "complete",
    val estimatedSavingsBytes: Long = 0,
)

@Serializable
data class ResolutionPlanResponseData(
    val plan: ResolutionPlanData? = null,
    val error: String? = null,
)

// ── Trash sessions (S2) ───────────────────────────────────────────────────────

@Serializable
data class TrashEntryData(
    val originalPath: String,
    val trashPath: String = "",
    val sizeBytes: Long = 0,
)

@Serializable
data class TrashSessionData(
    val sessionId: String,
    val movedAt: String = "",
    val entries: List<TrashEntryData> = emptyList(),
)

/**
 * One root's trash, as the daemon reports it.
 *
 * The daemon answers `listTrashSessions` with `{ roots: [{ rootId, sessions }] }`,
 * because a trash session lives under a root and restoring it needs that root's id.
 * This client used to decode the response as `{ sessions: [...] }` — a key the daemon
 * has never sent — so `sessions` was always empty and "Restore from Trash" reported
 * "Nothing in trash to restore" no matter how much was in it.
 */
@Serializable
data class TrashRootSessionsData(
    val rootId: String,
    val sessions: List<TrashSessionData> = emptyList(),
)

@Serializable
data class TrashSessionsData(
    val roots: List<TrashRootSessionsData> = emptyList(),
)

@Serializable
data class RestoreFailureData(
    val originalPath: String,
    /** `destination-occupied` | `trash-file-missing` | `move-failed`. */
    val reason: String = "",
)

@Serializable
data class RestoreResultData(
    val sessionId: String = "",
    val restoredPaths: List<String> = emptyList(),
    val failures: List<RestoreFailureData> = emptyList(),
    val error: String? = null,
)

@Serializable
data class GovernanceReportExportData(
    val content: String = "",
    val format: String = "markdown",
    val error: String? = null,
)

@Serializable
data class UsageReferenceData(
    val file: String,
    val line: Int,
    val content: String,
    /**
     * How the reference was established — `resolved-path`, `filename` or `code`.
     *
     * Carried because it is the strength of the evidence, and a surface that shows a
     * reference without it invites the reader to treat a filename guess and a resolved
     * path as the same claim.
     */
    val kind: String = "code",
)

/** One entry of the workspace-wide reference fetch. */
@Serializable
data class WorkspaceReferenceData(
    val rootId: String = "",
    val assetPath: String = "",
    val reference: UsageReferenceData,
)

/** The daemon's answer to `getUsageReferences` with no parameters. */
@Serializable
data class WorkspaceReferencesResultData(
    val complete: Boolean = false,
    val generation: Int = 0,
    val references: List<WorkspaceReferenceData> = emptyList(),
)

@Serializable
data class UsageReferencesResultData(
    val assetPath: String = "",
    val references: List<UsageReferenceData> = emptyList(),
    val durationMs: Double = 0.0,
    val error: String? = null,
)

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
class CoreProcessManager(private val project: Project) {
    private val logger = Logger.getInstance(CoreProcessManager::class.java)

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

    /** Triggered on filesystem watcher actions. */
    var onWatcherEvent: ((String) -> Unit)? = null

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
     * Spawns the background Node.js CLI daemon process for the current project.
     * Starts reading stdout lines and parsing them as NDJSON events.
     *
     * Prefers a self-contained native executable bundled with the plugin
     * (built by `@animoria/core`'s `build:sea` script — see
     * `scripts/build-sea.mjs`) over spawning a separately-installed `node`
     * binary, so end users are never required to have Node.js on their
     * machine. Falls back to `node cli.js` when no bundled binary matches
     * the current OS/architecture (e.g. running from source in
     * development, or an unsupported platform).
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

        // Idempotent: a second start while a daemon is already running would leak
        // the first process, and the tool window factory can legitimately run more
        // than once for one project.
        if (process?.isAlive == true) return
        if (!scope.isActive) scope = newScope()

        scope.launch {
            try {
                val bundledExecutable = findBundledExecutable()

                val pb =
                    if (bundledExecutable != null) {
                        logger.info(
                            "Animoria: Spawning bundled native daemon over ${roots.size} root(s)",
                        )
                        ProcessBuilder(listOf(bundledExecutable.absolutePath, "daemon") + roots)
                    } else {
                        val nodeExecutable = findNodeExecutable()
                        val cliScript = findCliScriptPath()

                        if (cliScript == null) {
                            val message =
                                "Animoria could not start: no native daemon is bundled for this platform, " +
                                    "and no @animoria/core 'cli.js' was found. If you're running from source, " +
                                    "run 'pnpm build' in the repo first."
                            AnimoriaLogger.error(message)
                            onDaemonUnavailable?.invoke(message)
                            return@launch
                        }

                        logger.info(
                            "Animoria: No bundled native daemon for this platform — " +
                                "spawning via Node: $nodeExecutable $cliScript",
                        )
                        ProcessBuilder(listOf(nodeExecutable, cliScript, "daemon") + roots)
                    }
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
        // Local subprocess IPC, not a network call — a real response arrives
        // in milliseconds even for large workspaces (see @animoria/core's own
        // scan benchmarks). 30s previously meant a silently-dead daemon left
        // the caller staring at "Loading…" for half a minute before any
        // feedback; 10s still gives a legitimately slow scan headroom.
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
                ModuleManager.getInstance(project)
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
        data: JsonElement,
    ): Boolean {
        when (event) {
            "indexing-started", "analysis-started" -> {
                onScanProgress?.invoke(0, "Analyzing workspace…")
            }

            "indexing-progress", "analysis-progress" -> {
                val message =
                    data.jsonObject["message"]?.jsonPrimitive?.contentOrNull ?: "Analyzing…"
                val percent = data.jsonObject["percent"]?.jsonPrimitive?.intOrNull ?: 0
                onScanProgress?.invoke(percent, message)
            }

            "ready" -> {
                // The handshake gate. Nothing but `hello`/`ping` is sent before this,
                // so a request's behaviour never depends on how fast the scan ran.
                isReady = true
                onReady?.invoke()
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
            // ── Analysis ──
            //
            // One event carries the whole canonical analysis, and it is cached before
            // any callback runs — the inspection cannot wait on a daemon round-trip
            // inside a highlighting pass, so it must find the same analysis the tool
            // window is about to render.
            "hello" -> {
                val methods =
                    (data.jsonObject["methods"] as? JsonArray)
                        ?.mapNotNull { it.jsonPrimitive.contentOrNull }
                        ?.toSet()
                        .orEmpty()
                verifyDaemonCapabilities(methods)
            }

            "analysis-completed", "analysis-stale" -> {
                // Decoded once, and loudly.
                //
                // The previous code decoded twice, each time discarding the failure —
                // one `catch {}` and one `runCatching {}.onSuccess {}` with no
                // `onFailure`. Because the shape was wrong, both threw on every single
                // analysis and the plugin silently held nothing. A decode failure here
                // means the client and the daemon disagree about the contract, which
                // is precisely the condition that must never be quiet.
                payloadJson.runCatching { decodeFromJsonElement<MultiRootAnalysisData>(data) }
                    .onSuccess { canonical ->
                        cachedAssets = canonical.assets.map { it.asset }
                        AnimoriaAnalysisHolder.of(project).update(canonical.flatten(), data)
                        onGovernanceResult?.invoke(canonical.flatten())
                        // Usage references are not carried on the analysis event — they
                        // would multiply its size — so they are fetched once per
                        // generation. The editor hover then answers synchronously
                        // instead of matching asset names against document text, which
                        // is what its deleted predecessor did.
                        prefetchReferences(canonical.generation)
                    }
                    .onFailure { error ->
                        AnimoriaLogger.error(
                            "Animoria: the analysis from the engine could not be read — " +
                                "the plugin and @animoria/core disagree about the analysis contract",
                            error,
                        )
                        onError?.invoke(
                            "Animoria could not read the analysis the engine produced. " +
                                "See the log for the contract mismatch.",
                        )
                    }
                onScanComplete?.invoke(data.toString())
            }

            "workspace-changed" -> onWatcherEvent?.invoke(data.toString())

            else -> return false
        }
        return true
    }

    /**
     * Loads the whole workspace's usage references for one analysis generation.
     *
     * Best-effort by design: a hover that cannot say anything is a hover that says
     * nothing, which is an acceptable outcome. It is still logged, because a hover
     * that silently stops working is exactly the kind of regression this audit found.
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
                }
                .onFailure { error ->
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

    // ── Private: process discovery ────────────────────────────────────────────

    private fun findNodeExecutable(): String {
        val isWindows = System.getProperty("os.name").lowercase().contains("win")
        val nodeName = if (isWindows) "node.exe" else "node"

        val pathEnv = System.getenv("PATH") ?: System.getenv("Path")
        if (!pathEnv.isNullOrEmpty()) {
            for (dir in pathEnv.split(File.pathSeparator)) {
                if (dir.trim().isEmpty()) continue
                val file = File(dir, nodeName)
                if (file.exists() && file.canExecute()) return file.absolutePath
            }
        }

        val fallbacks =
            if (isWindows) {
                listOf("C:\\Program Files\\nodejs\\node.exe", "C:\\Program Files (x86)\\nodejs\\node.exe")
            } else {
                listOf("/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node")
            }

        for (path in fallbacks) {
            val file = File(path)
            if (file.exists() && file.canExecute()) return path
        }

        return nodeName
    }

    private fun findCliScriptPath(): String? {
        val base = project.basePath ?: return null

        val devPath = File(base, "packages/animoria-core/dist/cli.js")
        if (devPath.exists()) return devPath.absolutePath

        try {
            val jarPath =
                com.intellij.openapi.application.PathManager.getJarPathForClass(CoreProcessManager::class.java)
            if (jarPath != null) {
                val jarFile = File(jarPath)
                val pluginDir =
                    if (jarFile.isFile) {
                        jarFile.parentFile?.parentFile
                    } else {
                        jarFile.parentFile?.parentFile?.parentFile?.parentFile
                    }
                if (pluginDir != null) {
                    val path = File(pluginDir, "classes/cli.js")
                    if (path.exists()) return path.absolutePath
                }
            }
        } catch (error: Exception) {
            // Reported, then fall through to the next discovery strategy.
            //
            // This is a legitimate "try the next location" failure rather than a
            // contract mismatch — but a plugin that cannot find its own daemon and
            // says nothing leaves the developer with a tool window that never loads
            // and a log with no clue in it.
            AnimoriaLogger.warn("Animoria: could not resolve the daemon from the plugin jar — ${error.message}")
        }

        return null
    }

    /**
     * Locates a self-contained native `animoria-core` executable for the
     * current OS/architecture, built by `@animoria/core`'s `build:sea`
     * script (see `scripts/build-sea.mjs`). Returns `null` when none is
     * bundled for this platform, in which case [start] falls back to
     * spawning via a separately-installed Node.
     */
    private fun findBundledExecutable(): File? {
        val platformArchDir = platformArchDirName() ?: return null
        val executableName =
            if (System.getProperty("os.name").lowercase().contains("win")) {
                "animoria-core.exe"
            } else {
                "animoria-core"
            }
        val base = project.basePath
        if (base != null) {
            val devPath = File(base, "packages/animoria-core/sea/$platformArchDir/$executableName")
            if (devPath.exists()) return devPath
        }

        return extractBundledNativeDaemon(platformArchDir, executableName)
    }

    /**
     * Extracts the `native/<platform-arch>/` resources (the executable and
     * its sibling `native_modules/`) from the plugin's own jar to a stable
     * location on disk, since a native binary cannot be spawned as a
     * process while it's still zipped inside a jar entry — unlike
     * `classes/cli.js` in a `runIde` dev sandbox, a real installed plugin
     * has no unpacked `classes/` directory at all, only jar files under `lib`.
     *
     * Skips the copy on subsequent calls once the executable already
     * exists at the destination — extraction is a one-time cost per
     * plugin install, not per project-open.
     */
    private fun extractBundledNativeDaemon(
        platformArchDir: String,
        executableName: String,
    ): File? {
        val resourcePrefix = "native/$platformArchDir/"

        // NOTE: `Class.protectionDomain.codeSource.location` is unreliable here —
        // IntelliJ's `PluginClassLoader` does not always populate `codeSource`
        // the way a standard `URLClassLoader` would, so it can silently return
        // null even though the plugin's jar is right there on disk. `PathManager`
        // is the platform-blessed way to resolve a plugin class back to its jar.
        val jarPath =
            com.intellij.openapi.application.PathManager.getJarPathForClass(CoreProcessManager::class.java)
                ?: return null
        val jarFile = File(jarPath)
        if (!jarFile.isFile) return null

        /*
         * The extraction directory is keyed by the *bytes being extracted*.
         *
         * ## The bug this replaces
         * The destination was `animoria/native/<platform-arch>/`, and the first line
         * of this function was:
         *
         *     if (destinationExecutable.exists()) return destinationExecutable
         *
         * — so the daemon was extracted **once, ever**. Upgrading the plugin left the
         * previous binary in place indefinitely: the JAR shipped a current daemon and
         * the IDE kept running the one it had cached on first launch.
         *
         * That is where the old daemon entered, and it explains why rebuilding the
         * plugin never fixed the reported
         * `"getUsageReferences" is declared but not implemented in this build` — the
         * artifact was correct and nothing was reading it. The failure is invisible to
         * every build-time gate, because at build time the artifact *is* right.
         *
         * Keying on the entry's CRC makes the identity of the directory the identity
         * of the binary: the same bytes reuse the extraction, different bytes get
         * their own, and a stale copy can never be mistaken for the current one.
         */
        val fingerprint = daemonFingerprint(jarFile, resourcePrefix + executableName) ?: return null
        val destinationRoot =
            File(
                com.intellij.openapi.application.PathManager.getSystemPath(),
                "animoria/native/$platformArchDir/$fingerprint",
            )
        val destinationExecutable = File(destinationRoot, executableName)

        if (destinationExecutable.exists()) return destinationExecutable

        // Earlier extractions of *other* builds are dead weight — ~100 MB each. Removed
        // before writing the new one so an upgrade cannot accumulate them.
        pruneStaleExtractions(destinationRoot.parentFile, fingerprint)

        val extractedAny =
            try {
                extractJarEntriesUnderPrefix(jarFile, resourcePrefix, destinationRoot)
            } catch (e: Exception) {
                logger.warn("Animoria: Failed to extract bundled native daemon from plugin jar", e)
                false
            }
        if (!extractedAny) return null

        if (!System.getProperty("os.name").lowercase().contains("win")) {
            destinationExecutable.setExecutable(true)
        }

        return if (destinationExecutable.exists()) destinationExecutable else null
    }

    /**
     * A stable identity for the daemon bytes inside [jarFile].
     *
     * The JAR entry's CRC and size, which the zip central directory already holds — no
     * need to read 100 MB to decide whether it has changed.
     */
    private fun daemonFingerprint(
        jarFile: File,
        entryPath: String,
    ): String? =
        runCatching {
            java.util.jar.JarFile(jarFile).use { jar ->
                val entry = jar.getJarEntry(entryPath) ?: return@use null
                if (entry.crc == -1L) null else "%08x-%d".format(entry.crc, entry.size)
            }
        }.getOrNull()

    /** Removes extractions of previous builds, which are ~100 MB each. */
    private fun pruneStaleExtractions(
        root: File,
        keep: String,
    ) {
        val entries = root.listFiles() ?: return
        for (entry in entries) {
            if (entry.isDirectory && entry.name != keep) {
                runCatching { entry.deleteRecursively() }
                    .onFailure { logger.warn("Animoria: could not remove a stale daemon extraction at ${entry.absolutePath}", it) }
            }
        }
    }

    /** Copies every entry under [resourcePrefix] in [jarFile] to [destinationRoot], preserving relative paths. */
    private fun extractJarEntriesUnderPrefix(
        jarFile: File,
        resourcePrefix: String,
        destinationRoot: File,
    ): Boolean {
        var extractedAny = false
        java.util.jar.JarFile(jarFile).use { jar ->
            for (entry in jar.entries()) {
                if (entry.isDirectory || !entry.name.startsWith(resourcePrefix)) continue

                val target = File(destinationRoot, entry.name.removePrefix(resourcePrefix))
                target.parentFile.mkdirs()
                jar.getInputStream(entry).use { input ->
                    target.outputStream().use { output -> input.copyTo(output) }
                }
                extractedAny = true
            }
        }
        return extractedAny
    }

    /** Maps JVM `os.name`/`os.arch` to the Node-style `<platform>-<arch>` directory naming `build-sea.mjs` produces. */
    private fun platformArchDirName(): String? {
        val osName = System.getProperty("os.name").lowercase()
        val platform =
            when {
                osName.contains("win") -> "win32"
                osName.contains("mac") || osName.contains("darwin") -> "darwin"
                osName.contains("linux") -> "linux"
                else -> return null
            }

        val osArch = System.getProperty("os.arch").lowercase()
        val arch =
            when {
                osArch.contains("aarch64") || osArch.contains("arm64") -> "arm64"
                osArch.contains("amd64") || osArch.contains("x86_64") || osArch == "x64" -> "x64"
                else -> return null
            }

        return "$platform-$arch"
    }

    companion object {
        /**
         * The protocol version this plugin speaks.
         *
         * Must match `PROTOCOL_VERSION` in `@animoria/core`'s `daemon/protocol.ts`.
         * `ReleaseConsistencyTest` asserts they agree, because a plugin and a daemon
         * that disagree here produce a mismatch message at every startup — visible,
         * but only after shipping.
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
