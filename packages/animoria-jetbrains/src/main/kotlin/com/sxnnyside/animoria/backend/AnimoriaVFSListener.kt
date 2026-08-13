package com.sxnnyside.animoria.backend

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.module.ModuleManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ModuleRootManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent
import com.intellij.openapi.vfs.newvfs.events.VFileDeleteEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.vfs.newvfs.events.VFileMoveEvent
import com.intellij.openapi.vfs.newvfs.events.VFilePropertyChangeEvent

/**
 * Bridges IntelliJ's Virtual File System (VFS) events to the Animoria daemon's
 * `notifyFileChange` push path via `CoreProcessManager.onWatcherEvent`.
 *
 * ## Why VFS and not `FileSystemWatcher`
 * IntelliJ's VFS guarantees that all filesystem mutations performed by the IDE
 * itself (refactors, saves, deletions from the Project view) are surfaced as VFS
 * events. A raw `java.nio.WatchService` listener would miss IDE-driven changes
 * until the OS propagated them — which can be delayed or silently dropped under
 * heavy IDE load. Using `BulkFileListener` is the documented stable API for
 * reacting to file changes inside IntelliJ Platform plugins.
 *
 * ## Scope
 * Only files inside the current project's `basePath` are forwarded. Events
 * outside the project boundary are silently ignored — this mirrors
 * `AnimoriaFileWatcher`'s workspace-scoped `RelativePattern` in VS Code.
 *
 * ## Threading
 * VFS events are delivered on the EDT. The daemon write (via
 * `CoreProcessManager`) is non-blocking (fire-and-forget), so EDT responsiveness
 * is not impacted. The daemon's internal debounce handles rapid bursts.
 */
class AnimoriaVFSListener(private val project: Project) : BulkFileListener {
    private val logger = Logger.getInstance(AnimoriaVFSListener::class.java)
    private val manager: CoreProcessManager get() = project.getService(CoreProcessManager::class.java)

    /**
     * Every content root this project declares.
     *
     * `project.basePath` was used here, which meant a change in any module outside
     * the `.idea` directory was filtered out and the daemon never heard about it —
     * so a second module's assets were indexed once at startup and then frozen.
     *
     * Read per event batch rather than cached: a root can be added or removed while
     * the IDE is open, and a stale list silently reintroduces the same gap.
     */
    private fun contentRoots(): List<String> =
        runCatching {
            ModuleManager.getInstance(project)
                .modules
                .flatMap { module -> ModuleRootManager.getInstance(module).contentRoots.toList() }
                .mapNotNull { it.canonicalPath }
        }.getOrDefault(emptyList())
            .ifEmpty { listOfNotNull(project.basePath) }

    override fun after(events: List<VFileEvent>) {
        val roots = contentRoots()
        if (roots.isEmpty()) return

        for (event in events) {
            val path = event.path
            // Segment-boundary containment, not a bare prefix test: `/workspace-old`
            // starts with `/workspace` and is a different directory.
            if (roots.none { path == it || path.startsWith("$it/") }) continue
            if (shouldIgnore(path)) continue

            val kind =
                when (event) {
                    is VFileCreateEvent -> "created"
                    is VFileDeleteEvent -> "deleted"
                    is VFileMoveEvent -> "created"
                    is VFileContentChangeEvent -> "changed"
                    is VFilePropertyChangeEvent -> if (event.propertyName == "name") "created" else continue
                    else -> continue
                }

            // Emit a synthetic watcher event so the daemon's WorkspaceIndexer
            // is notified of the change. This mirrors AnimoriaFileWatcher in VS Code.
            val payload = """{"type":"$kind","path":"$path"}"""
            logger.debug("Animoria VFS: $kind $path")

            // Notify the daemon via the existing watcher callback — the daemon
            // will call indexer.notifyFileChanged() on receipt and emit an update.
            manager.onWatcherEvent?.invoke(payload)
        }
    }

    private fun shouldIgnore(path: String): Boolean {
        val segments = path.split("/", "\\")
        val ignored = setOf("node_modules", ".git", "dist", "build", ".turbo", ".animoria")
        return segments.any { it in ignored }
    }
}
