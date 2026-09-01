package com.sxnnyside.animoria.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.sxnnyside.animoria.backend.CoreProcessManager

/**
 * Factory for creating the Animoria Tool Window content in JetBrains IDEs.
 *
 * Initializes the native daemon process, registers the tool window instance, and constructs
 * the content tabs (Assets gallery panel and shared UI panels for Preview, Findings, Duplicates, and Cleanup).
 */
class AnimoriaToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(
        project: Project,
        toolWindow: ToolWindow,
    ) {
        val processManager = project.getService(CoreProcessManager::class.java)
        processManager.start()

        AnimoriaToolWindows.register(project, toolWindow)

        // Mount native asset tree gallery tab
        val gallery = AnimoriaGalleryPanel(project, toolWindow.disposable)
        AnimoriaGalleryPanel.register(project, gallery)
        toolWindow.contentManager.addContent(
            ContentFactory.getInstance().createContent(gallery.component, "Assets", false),
        )

        // One capability per content tab — JetBrains' own idiom, and the reason this
        // is not the shared UI's internal tab bar: a tab strip inside a tab strip made
        // every surface compete for one panel's width and did none of them well.
        val surfaces =
            listOf(
                "inspector" to "Preview",
                "findings" to "Findings",
                "duplicates" to "Duplicates",
                "cleanup" to "Cleanup",
            )

        val panels =
            surfaces.map { (surface, title) ->
                val created = AnimoriaSharedUiPanel(project, toolWindow.disposable, surface)
                AnimoriaSharedUiPanel.register(project, created)
                val content = ContentFactory.getInstance().createContent(created.component, title, false)
                toolWindow.contentManager.addContent(content)
                created
            }

        // Wire daemon push events → panel. The daemon updates AnimoriaAnalysisHolder
        // on every `analysis-completed` event, but the panel's publishAnalysis() must
        // also be called so the UI actually receives the new data. Without this, the
        // panel stays on "Waiting for the Animoria engine…" for the lifetime of the
        // tool window even though the analysis is sitting in the holder ready to read.
        processManager.onReady = {
            // Every surface, not the first one: a developer looking at Duplicates must
            // not have to visit Findings to make the analysis arrive.
            gallery.publishAnalysis()
            panels.forEach { it.publishAnalysis() }
        }
        processManager.onGovernanceResult = { _ ->
            gallery.publishAnalysis()
            panels.forEach { it.publishAnalysis() }
        }
        processManager.onDaemonUnavailable = { message ->
            // A dead engine belongs in the gallery, where the developer is looking,
            // rather than only in the log.
            gallery.showUnavailable(message)
        }

        Disposer.register(toolWindow.disposable) {
            // Clear callbacks before stopping to avoid a call into a disposed panel
            // after the tool window's Disposer tree has already run dispose().
            processManager.onReady = null
            processManager.onGovernanceResult = null
            processManager.onDaemonUnavailable = null
            AnimoriaToolWindows.unregister(project)
            AnimoriaGalleryPanel.unregister(project)
            AnimoriaSharedUiPanel.unregister(project)
            processManager.stop()
        }
    }
}
