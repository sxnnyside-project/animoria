package com.sxnnyside.animoria.backend

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import java.io.File

// Locates the bundled native `animoria` binary. A zipped JAR entry can't be spawned as a process, so it's
// extracted once to a directory keyed by the entry's CRC+size (see daemonFingerprint), not by plugin version.
class DaemonBinaryResolver(
    private val project: Project,
    private val logger: Logger,
) {
    /**
     * Locates a self-contained native `animoria` executable for the current OS/architecture.
     */
    fun findBundledExecutable(): File? {
        val platformArchDir = platformArchDirName() ?: return null
        val isWindows = System.getProperty("os.name").lowercase().contains("win")
        val nativeExecutableName = if (isWindows) "animoria.exe" else "animoria"

        val base = project.basePath
        if (base != null) {
            val rustRelease = File(base, "packages/animoria-core-rust/target/release/$nativeExecutableName")
            if (rustRelease.exists()) return rustRelease

            val rustDebug = File(base, "packages/animoria-core-rust/target/debug/$nativeExecutableName")
            if (rustDebug.exists()) return rustDebug
        }

        return extractBundledNativeDaemon(platformArchDir, nativeExecutableName)
    }

    // Extracts native/<platform-arch>/ from the plugin's jar to disk — an installed plugin has no unpacked
    // classes/ directory (unlike a runIde dev sandbox), only jar files under lib.
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
            com.intellij.openapi.application.PathManager
                .getJarPathForClass(DaemonBinaryResolver::class.java)
                ?: return null
        val jarFile = File(jarPath)
        if (!jarFile.isFile) return null

        // Keyed by the entry's CRC, not a fixed path: a fixed destination previously meant the daemon was
        // extracted once, ever, so a plugin upgrade kept running the binary cached on first launch.
        val fingerprint = daemonFingerprint(jarFile, resourcePrefix + executableName) ?: return null
        val destinationRoot =
            File(
                com.intellij.openapi.application.PathManager
                    .getSystemPath(),
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

    /** Maps JVM `os.name`/`os.arch` to the `<platform>-<arch>` directory naming the release build produces. */
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
