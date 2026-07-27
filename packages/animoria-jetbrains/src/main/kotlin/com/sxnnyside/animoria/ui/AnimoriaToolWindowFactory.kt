package com.sxnnyside.animoria.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.sxnnyside.animoria.backend.CoreProcessManager

/**
 * Factory class registered in plugin.xml responsible for creating the
 * Animoria Tool Window inside the JetBrains IDE.
 * Mounts the native Swing [AnimoriaGalleryPanel] and ensures the background Node daemon process
 * is started and cleaned up safely.
 */
class AnimoriaToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(
        project: Project,
        toolWindow: ToolWindow,
    ) {
        val processManager = project.getService(CoreProcessManager::class.java)

        // Start Node background daemon indexer
        processManager.start()

        // Construct native Swing sidebar panel
        val galleryPanel = AnimoriaGalleryPanel(project)

        val content = ContentFactory.getInstance().createContent(galleryPanel, "", false)
        toolWindow.contentManager.addContent(content)

        // Bind process manager lifecycle to tool window disposable
        com.intellij.openapi.util.Disposer.register(toolWindow.disposable) {
            processManager.stop()
        }
    }
}
