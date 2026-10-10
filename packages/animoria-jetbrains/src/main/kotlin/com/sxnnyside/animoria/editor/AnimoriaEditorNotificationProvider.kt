package com.sxnnyside.animoria.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.EditorNotificationPanel
import com.intellij.ui.EditorNotificationProvider
import com.sxnnyside.animoria.actions.AnimoriaActionHost
import com.sxnnyside.animoria.actions.ShowInGalleryContextAction
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import com.sxnnyside.animoria.ui.AnimoriaToolWindows
import java.util.function.Function
import javax.swing.JComponent

/**
 * Displays an editor notification banner at the top of opened asset files when
 * governance findings (unreferenced, duplicates, format violations, etc.) are detected.
 */
class AnimoriaEditorNotificationProvider : EditorNotificationProvider {
    override fun collectNotificationData(
        project: Project,
        file: VirtualFile,
    ): Function<in FileEditor, out JComponent?>? {
        val asset = ShowInGalleryContextAction.resolveAsset(project, file) ?: return null
        val holder = AnimoriaAnalysisHolder.of(project)
        val diagnostics = holder.diagnosticsFor(asset.path)
        if (diagnostics.isEmpty()) return null

        return Function { fileEditor ->
            val status =
                if (diagnostics.any { it.severity.equals("error", ignoreCase = true) }) {
                    EditorNotificationPanel.Status.Error
                } else {
                    EditorNotificationPanel.Status.Warning
                }

            val panel = EditorNotificationPanel(fileEditor, status)
            val issuesSummary = diagnostics.joinToString(", ") { it.ruleId }
            panel.text = "Animoria: Asset '${asset.name}' has ${diagnostics.size} governance finding(s) ($issuesSummary)"

            panel.createActionLabel("Show in Gallery") {
                AnimoriaToolWindows.show(project, "Preview")
                AnimoriaSharedUiPanel.of(project, "preview")?.focus(
                    AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = asset.path),
                )
            }

            panel.createActionLabel("Review Cleanup") {
                AnimoriaActionHost.of(project).reviewCleanup()
            }

            panel.createActionLabel("Open Report") {
                AnimoriaActionHost.of(project).openGovernanceReport()
            }

            panel
        }
    }
}
