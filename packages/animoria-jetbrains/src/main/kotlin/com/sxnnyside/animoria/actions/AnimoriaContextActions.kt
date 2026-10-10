package com.sxnnyside.animoria.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.vfs.VirtualFile
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.snippet.GenerateSnippetAction
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import com.sxnnyside.animoria.ui.AnimoriaToolWindows

/**
 * Context action to reveal and focus the selected asset in the Animoria Gallery / Preview panel.
 */
class ShowInGalleryContextAction :
    AnAction(
        "Show in Animoria Gallery",
        "Reveal and preview this asset in the Animoria tool window",
        AllIcons.Actions.Preview,
    ) {
    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)
        val isAsset = project != null && file != null && !file.isDirectory && resolveAsset(project, file) != null
        e.presentation.isEnabledAndVisible = isAsset
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return
        val asset = resolveAsset(project, file) ?: return

        AnimoriaToolWindows.show(project, "Preview")
        AnimoriaSharedUiPanel.of(project, "preview")?.focus(
            AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = asset.path),
        )
    }

    companion object {
        fun resolveAsset(
            project: com.intellij.openapi.project.Project,
            file: VirtualFile,
        ): JetBrainsAsset? {
            val holder = AnimoriaAnalysisHolder.of(project)
            val direct = holder.assetForPath(file.path)
            if (direct != null) return direct
            val canonical = file.canonicalPath
            return if (canonical != null) holder.assetForPath(canonical) else null
        }
    }
}

/**
 * Context action to request and copy code integration snippets for the selected asset.
 */
class CopySnippetContextAction :
    AnAction(
        "Copy Animoria Snippet...",
        "Generate and copy code integration snippet for this asset",
        AllIcons.Actions.Copy,
    ) {
    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)
        val isAsset = project != null && file != null && !file.isDirectory && ShowInGalleryContextAction.resolveAsset(project, file) != null
        e.presentation.isEnabledAndVisible = isAsset
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return
        val asset = ShowInGalleryContextAction.resolveAsset(project, file) ?: return
        GenerateSnippetAction.execute(project, asset)
    }
}
