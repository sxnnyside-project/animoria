package com.sxnnyside.animoria.backend

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
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

@Serializable
data class GovernanceIssueData(
    val assetPath: String,
    val assetName: String,
    val category: String,
    val referenceCount: Int? = null,
    val duplicateOf: List<String>? = null,
)

@Serializable
data class GovernanceResultData(
    val unused: List<GovernanceIssueData> = emptyList(),
    val duplicates: List<GovernanceIssueData> = emptyList(),
    val overused: List<GovernanceIssueData> = emptyList(),
    val totalAssets: Int = 0,
    val durationMs: Double = 0.0,
    val generatedAt: String = "",
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
    val confidence: String,
    val referenceCount: Int,
)

@Serializable
data class CleanupProposalData(
    val candidates: List<CleanupCandidateData> = emptyList(),
    val totalSizeBytes: Long = 0,
    val affectedReferencesCount: Int = 0,
    val affectedFolders: List<String> = emptyList(),
    val estimatedHealthScoreDelta: Int = 0,
    val estimatedExecutionMs: Int = 0,
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
    val healthScoreAfter: Int = 0,
    val remainingCandidates: Int = 0,
    val completedAt: String = "",
    val trashLocation: String? = null,
)

@Serializable
data class DuplicateResolutionResultData(
    val removedAssetPaths: List<String> = emptyList(),
    val trashLocation: String? = null,
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
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var process: Process? = null
    private var stdinWriter: PrintWriter? = null

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
    var onGovernanceResult: ((GovernanceResultData) -> Unit)? = null

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
        val workspacePath = project.basePath ?: return
        scope.launch {
            try {
                val bundledExecutable = findBundledExecutable()

                val pb =
                    if (bundledExecutable != null) {
                        logger.info("Animoria: Spawning bundled native daemon: $bundledExecutable $workspacePath")
                        ProcessBuilder(bundledExecutable.absolutePath, workspacePath)
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
                                "spawning via Node: $nodeExecutable $cliScript $workspacePath",
                        )
                        ProcessBuilder(nodeExecutable, cliScript, workspacePath)
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

        val payload =
            buildJsonObject {
                put("command", command)
                put("data", data)
                put("requestId", requestId)
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

    // ── Private: line routing ─────────────────────────────────────────────────

    private fun handleProcessLine(line: String) {
        val trimmed = line.trim()
        if (!trimmed.startsWith("{")) {
            logger.debug("Animoria: Daemon console: $line")
            return
        }

        try {
            val json = Json.parseToJsonElement(trimmed).jsonObject
            val event = json["event"]?.jsonPrimitive?.content ?: return
            val data = json["data"] ?: return
            val requestId = json["requestId"]?.jsonPrimitive?.contentOrNull

            // If there is a pending request waiting for this requestId, resolve it.
            if (requestId != null) {
                pendingRequests[requestId]?.complete(data)
                // Some events are also broadcast via callbacks (e.g. governanceResult
                // can be triggered both on-demand and as an automatic pass).
            }

            routeEvent(event, data)
        } catch (e: Exception) {
            logger.debug("Animoria: Failed to parse event JSON line: $line", e)
        }
    }

    private fun routeEvent(
        event: String,
        data: JsonElement,
    ) {
        when (event) {
            "scanProgress" -> {
                val progress = Json.decodeFromJsonElement<ScanProgressData>(data)
                onScanProgress?.invoke(progress.percent, progress.message)
            }

            "scanComplete" -> {
                updateCachedAssets(data)
                onScanComplete?.invoke(data.toString())
            }

            "watcherEvent" -> {
                updateCachedAssets(data)
                onWatcherEvent?.invoke(data.toString())
            }

            "governanceResult" -> routeDecodedEvent(event, data, onGovernanceResult)
            "thumbnailResult" -> routeDecodedEvent(event, data, onThumbnailResult)
            "cleanupProposal" -> routeDecodedEvent(event, data, onCleanupProposal)
            "snippetResult" -> routeDecodedEvent(event, data, onSnippetResult)
            "cleanupSummary" -> routeDecodedEvent(event, data, onCleanupSummary)
            "duplicateResolutionResult" -> routeDecodedEvent(event, data, onDuplicateResolutionResult)
            "governanceReportExport" -> routeDecodedEvent(event, data, onGovernanceReportExport)

            "error", "commandError" -> {
                val message = data.jsonObject["message"]?.jsonPrimitive?.contentOrNull ?: "Unknown daemon error"
                AnimoriaLogger.warn("Animoria daemon: $message")
                onError?.invoke(message)
            }
        }
    }

    /** Decodes [data] as [T] and invokes [callback] with it, logging (not throwing) on a shape mismatch. */
    private inline fun <reified T> routeDecodedEvent(
        eventName: String,
        data: JsonElement,
        noinline callback: ((T) -> Unit)?,
    ) {
        try {
            callback?.invoke(Json.decodeFromJsonElement<T>(data))
        } catch (e: Exception) {
            logger.warn("Animoria: Failed to decode $eventName", e)
        }
    }

    private fun updateCachedAssets(data: JsonElement) {
        try {
            val assetsElement = data.jsonObject["assets"] ?: return
            cachedAssets = Json.decodeFromJsonElement<List<JetBrainsAsset>>(assetsElement)
        } catch (_: Exception) {
            // Best-effort only — leave the previous cache in place on decode failure.
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
        } catch (_: Exception) {
            // Ignore; fall through to null.
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
        val destinationRoot =
            File(com.intellij.openapi.application.PathManager.getSystemPath(), "animoria/native/$platformArchDir")
        val destinationExecutable = File(destinationRoot, executableName)

        if (destinationExecutable.exists()) return destinationExecutable

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
}
