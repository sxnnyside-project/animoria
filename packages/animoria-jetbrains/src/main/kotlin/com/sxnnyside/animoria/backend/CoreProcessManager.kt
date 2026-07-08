package com.sxnnyside.animoria.backend

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.diagnostic.Logger
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

@Serializable
data class CoreEvent(
    val event: String,
    val data: JsonElement
)

@Serializable
data class ScanProgressData(
    val percent: Int,
    val message: String
)

@Serializable
data class WatcherEventData(
    val type: String,
    val path: String,
    val asset: JetBrainsAsset? = null
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
    val thumbnailPath: String? = null
)

@Service(Service.Level.PROJECT)
class CoreProcessManager(private val project: Project) {
    private val logger = Logger.getInstance(CoreProcessManager::class.java)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var process: Process? = null

    var onScanProgress: ((Int, String) -> Unit)? = null
    var onScanComplete: ((String) -> Unit)? = null
    var onWatcherEvent: ((String) -> Unit)? = null

    fun start() {
        val workspacePath = project.basePath ?: return
        scope.launch {
            try {
                val nodeExecutable = findNodeExecutable()
                val cliScript = findCliScriptPath()

                if (cliScript == null) {
                    logger.error("Animoria: CLI script 'cli.js' not found in workspace or plugin distribution.")
                    return@launch
                }

                logger.info("Animoria: Spawning core process with executable '$nodeExecutable' and script '$cliScript'")

                val pb = ProcessBuilder(nodeExecutable, cliScript, workspacePath)
                pb.redirectErrorStream(true)

                val proc = pb.start()
                process = proc

                BufferedReader(InputStreamReader(proc.inputStream, Charsets.UTF_8)).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        handleProcessLine(line!!)
                    }
                }
            } catch (e: Exception) {
                logger.error("Animoria: Failed to run core Node daemon process", e)
            }
        }
    }

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

            when (event) {
                "scanProgress" -> {
                    val progress = Json.decodeFromJsonElement<ScanProgressData>(data)
                    onScanProgress?.invoke(progress.percent, progress.message)
                }
                "scanComplete" -> {
                    // Forward raw assets array back as a serialized JSON string
                    val assets = data.jsonObject["assets"]?.toString() ?: "[]"
                    onScanComplete?.invoke(assets)
                }
                "watcherEvent" -> {
                    // Forward event metadata as a serialized JSON string
                    onWatcherEvent?.invoke(data.toString())
                }
            }
        } catch (e: Exception) {
            logger.debug("Animoria: Failed to parse event JSON line: $line", e)
        }
    }

    private fun findNodeExecutable(): String {
        val paths = listOf(
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node"
        )
        for (path in paths) {
            val file = File(path)
            if (file.exists() && file.canExecute()) {
                return path
            }
        }
        return "node"
    }

    private fun findCliScriptPath(): String? {
        val base = project.basePath ?: return null
        
        // 1. Check development environment path
        val devPath = File(base, "packages/animoria-core/dist/cli.js")
        if (devPath.exists()) {
            return devPath.absolutePath
        }

        // 2. Check production plugin installation path
        try {
            val jarPath = com.intellij.openapi.application.PathManager.getJarPathForClass(CoreProcessManager::class.java)
            if (jarPath != null) {
                val jarFile = File(jarPath)
                val pluginDir = if (jarFile.isFile) {
                    jarFile.parentFile?.parentFile
                } else {
                    jarFile.parentFile?.parentFile?.parentFile?.parentFile
                }
                if (pluginDir != null) {
                    val path = File(pluginDir, "classes/cli.js")
                    if (path.exists()) {
                        return path.absolutePath
                    }
                }
            }
        } catch (e: Exception) {
            // ignore loading error
        }

        return null
    }

    fun stop() {
        process?.destroy()
        process = null
        scope.cancel()
    }
}
