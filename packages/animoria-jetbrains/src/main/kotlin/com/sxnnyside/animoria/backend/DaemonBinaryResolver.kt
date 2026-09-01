package com.sxnnyside.animoria.backend

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import java.io.File

/**
 * Locates the bundled native `animoria` binary this plugin spawns. Pulled
 * out of `CoreProcessManager` because none of this depends on a live process
 * or the NDJSON protocol — it is pure filesystem and JAR-resource discovery,
 * run once per `start()`.
 *
 * ## Extraction caching
 * A bundled native executable ships zipped inside the plugin's own JAR and
 * cannot be spawned as a process from there, so it is extracted once to a
 * directory keyed by the JAR entry's CRC+size (see [daemonFingerprint]) —
 * not by plugin version — so an upgrade that changes the binary always
 * re-extracts, and one that doesn't never needlessly does.
 */
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
            com.intellij.openapi.application.PathManager
                .getJarPathForClass(DaemonBinaryResolver::class.java)
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
