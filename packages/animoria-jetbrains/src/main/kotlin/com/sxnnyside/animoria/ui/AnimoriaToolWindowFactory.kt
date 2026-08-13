package com.sxnnyside.animoria.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.sxnnyside.animoria.backend.CoreProcessManager

/**
 * Mounts Animoria's one UI surface into the tool window.
 *
 * ## What changed
 * This used to mount `AnimoriaGalleryPanel` — a Swing shell around 279 lines of
 * inline HTML that reimplemented, badly, a screen that already existed twice
 * elsewhere. It now mounts [AnimoriaSharedUiPanel], which loads `@animoria/ui`: the
 * same components VS Code and the sandbox render, driven by the same host bridge.
 *
 * When JCEF is unavailable the panel is the single D-09 degraded screen, not a
 * second UI. That decision is made inside [AnimoriaSharedUiPanel] rather than here,
 * so there is exactly one place that branches on `JBCefApp.isSupported()`.
 *
 * ## Lifecycle
 * The daemon starts with the tool window and stops with it. `start()` is idempotent
 * and recreates its coroutine scope, so closing and reopening the tool window
 * produces a working plugin — it previously produced one whose every feature
 * silently did nothing, because a cancelled `CoroutineScope` rejects later launches
 * without error.
 */
class AnimoriaToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(
        project: Project,
        toolWindow: ToolWindow,
    ) {
        val processManager = project.getService(CoreProcessManager::class.java)
        processManager.start()

        // Held so a surface can bring another one forward. Telling a panel what to
        // show and showing that panel are two different things, and only a host can
        // do the second.
        AnimoriaToolWindows.register(project, toolWindow)

        // The gallery first, because it is the product's premise.
        //
        // `AnimoriaTreeModel` and its renderer were complete and mounted by nothing —
        // their only references were their own unit tests — so the tool window offered
        // findings, duplicates and cleanup and no way to see the assets those findings
        // are about. The "Asset" tab said "select an asset" with nothing to select.
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
