package com.sxnnyside.animoria.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow

/**
 * Registry and navigation helper managing the activation and tab selection of Animoria tool windows.
 *
 * Coordinates tool window tab focus requests dispatched from webview bridge messages or native actions,
 * ensuring UI transitions execute safely on the Event Dispatch Thread (EDT).
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
