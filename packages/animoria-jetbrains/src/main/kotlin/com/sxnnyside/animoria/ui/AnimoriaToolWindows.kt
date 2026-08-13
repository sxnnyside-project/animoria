package com.sxnnyside.animoria.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow

/**
 * Brings one of Animoria's tool window tabs to the front.
 *
 * ## Why this exists
 * Selecting an asset in the gallery posted a `focus` message to the Preview panel and
 * stopped there. The message arrived, the panel selected the asset — and the developer
 * was still looking at the Assets tab, so nothing appeared to happen. "Open preview"
 * that leaves you on the page you were already on is indistinguishable from a dead
 * control, which is exactly how it was reported.
 *
 * Routing to a surface has two halves: telling the surface what to show, and *showing
 * the surface*. The shared UI owns the first and cannot do the second — a webview
 * cannot select the IDE tab that contains it.
 */
object AnimoriaToolWindows {
    private val windows = mutableMapOf<String, ToolWindow>()

    fun register(
        project: Project,
        toolWindow: ToolWindow,
    ) {
        windows[project.locationHash] = toolWindow
    }

    fun unregister(project: Project) {
        windows.remove(project.locationHash)
    }

    /**
     * Activates the tool window and selects the tab named [displayName].
     *
     * On the EDT, because content selection is a UI operation, and tolerant of a
     * missing tab: a tool window the developer has closed is not an error worth
     * reporting, it is a window that is not there.
     */
    fun show(
        project: Project,
        displayName: String,
    ) {
        val toolWindow = windows[project.locationHash] ?: return
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) return@invokeLater
            toolWindow.activate(null, true)
            val content =
                toolWindow.contentManager.contents.firstOrNull { it.displayName == displayName }
            if (content != null) toolWindow.contentManager.setSelectedContent(content, true)
        }
    }
}
