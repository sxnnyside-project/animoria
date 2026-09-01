package com.sxnnyside.animoria.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow

// Brings a tool window tab to the front — the half of "focus" a webview can't do itself, since it can't select its own IDE tab.
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
