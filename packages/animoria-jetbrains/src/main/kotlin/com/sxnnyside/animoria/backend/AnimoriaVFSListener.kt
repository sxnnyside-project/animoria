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

// Bridges VFS events to the daemon's markStale. Uses BulkFileListener rather than a raw WatchService because VFS
// guarantees IDE-driven mutations (refactors, saves) are surfaced, which a filesystem watcher can miss or delay.
class AnimoriaVFSListener(
    private val project: Project,
) : BulkFileListener {
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
            ModuleManager
                .getInstance(project)
                .modules
                .flatMap { module -> ModuleRootManager.getInstance(module).contentRoots.toList() }
                .mapNotNull { it.canonicalPath }
        }.getOrDefault(emptyList())
            .ifEmpty { listOfNotNull(project.basePath) }

    override fun after(events: List<VFileEvent>) {
        val roots = contentRoots()
        if (roots.isEmpty()) return

        var matched = false
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

            logger.debug("Animoria VFS: $kind $path")
            matched = true
        }

        // One `markStale` per batch, not per event — a save/refactor can fire
        // dozens of VFS events for a handful of actually-changed files, and the
        // daemon only needs to know "this root's cached analysis is out of date,"
        // not how many events led there.
        if (matched) {
            // The same root `CoreProcessManager.start()` scanned (`resolveContentRoots()`
            // via this class's own `contentRoots()`), not `project.basePath` — those
            // differ for a multi-module project, and `markStale` must key on the root
            // the daemon actually indexed.
            manager.notifyFileChanged(roots.first())
        }
    }

    private fun shouldIgnore(path: String): Boolean {
        val segments = path.split("/", "\\")
        val ignored = setOf("node_modules", ".git", "dist", "build", ".turbo", ".animoria")
        return segments.any { it in ignored }
    }
}
