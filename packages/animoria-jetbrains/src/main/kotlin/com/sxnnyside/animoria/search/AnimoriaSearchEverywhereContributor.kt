package com.sxnnyside.animoria.search

import com.intellij.icons.AllIcons
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributorFactory
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.JBColor
import com.intellij.ui.SimpleTextAttributes
import com.intellij.util.Processor
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import com.sxnnyside.animoria.ui.AnimoriaToolWindows
import javax.swing.JList
import javax.swing.ListCellRenderer

/**
 * Factory creating Animoria Search Everywhere contributor for quick asset discovery.
 */
class AnimoriaSearchEverywhereContributorFactory : SearchEverywhereContributorFactory<JetBrainsAsset> {
    override fun createContributor(initEvent: AnActionEvent): SearchEverywhereContributor<JetBrainsAsset> =
        AnimoriaSearchEverywhereContributor(initEvent.project)
}

/**
 * Contributes workspace visual assets directly to IntelliJ's Search Everywhere dialog (Shift+Shift).
 */
class AnimoriaSearchEverywhereContributor(
    private val project: Project?,
) : SearchEverywhereContributor<JetBrainsAsset> {
    override fun getSearchProviderId(): String = "AnimoriaAssets"

    override fun getGroupName(): String = "Assets"

    override fun getSortWeight(): Int = 250

    override fun showInFindResults(): Boolean = true

    override fun fetchElements(
        pattern: String,
        progressIndicator: ProgressIndicator,
        consumer: Processor<in JetBrainsAsset>,
    ) {
        val proj = project ?: return
        val analysis = AnimoriaAnalysisHolder.of(proj).current() ?: return
        val cleanPattern = pattern.trim().lowercase()

        for (asset in analysis.assets) {
            if (progressIndicator.isCanceled) return
            val matches =
                cleanPattern.isEmpty() ||
                    asset.name.lowercase().contains(cleanPattern) ||
                    asset.stem.lowercase().contains(cleanPattern) ||
                    asset.format.lowercase().contains(cleanPattern) ||
                    asset.path.lowercase().contains(cleanPattern)

            if (matches && !consumer.process(asset)) {
                return
            }
        }
    }

    override fun processSelectedItem(
        selected: JetBrainsAsset,
        modifiers: Int,
        searchText: String,
    ): Boolean {
        val proj = project ?: return false
        val vf = LocalFileSystem.getInstance().findFileByPath(selected.path)
        if (vf != null) {
            FileEditorManager.getInstance(proj).openFile(vf, true)
        }
        AnimoriaToolWindows.show(proj, "Preview")
        AnimoriaSharedUiPanel.of(proj, "preview")?.focus(
            AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = selected.path),
        )
        return true
    }

    override fun getElementsRenderer(): ListCellRenderer<in JetBrainsAsset> =
        object : ColoredListCellRenderer<JetBrainsAsset>() {
            override fun customizeCellRenderer(
                list: JList<out JetBrainsAsset>,
                value: JetBrainsAsset?,
                index: Int,
                selected: Boolean,
                hasFocus: Boolean,
            ) {
                if (value == null) return
                icon = AllIcons.Actions.Preview
                append(value.name, SimpleTextAttributes.REGULAR_ATTRIBUTES)
                append("  (${value.format.uppercase()} · ${formatBytes(value.sizeBytes)})", SimpleTextAttributes.GRAYED_ATTRIBUTES)

                val proj = project ?: return
                val diagnostics = AnimoriaAnalysisHolder.of(proj).diagnosticsFor(value.path)
                if (diagnostics.isNotEmpty()) {
                    append("  [${diagnostics.size} issue(s)]", SimpleTextAttributes(SimpleTextAttributes.STYLE_PLAIN, JBColor.RED))
                }
            }
        }

    override fun getDataForItem(
        element: JetBrainsAsset,
        dataId: String,
    ): Any? {
        if (CommonDataKeys.PROJECT.`is`(dataId)) return project
        if (CommonDataKeys.VIRTUAL_FILE.`is`(dataId)) {
            return LocalFileSystem.getInstance().findFileByPath(element.path)
        }
        return null
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", kb)
        val mb = kb / 1024.0
        return String.format(java.util.Locale.ROOT, "%.2f MB", mb)
    }
}
