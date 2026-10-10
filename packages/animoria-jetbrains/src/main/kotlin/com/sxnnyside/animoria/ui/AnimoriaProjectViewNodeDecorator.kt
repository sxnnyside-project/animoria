package com.sxnnyside.animoria.ui

import com.intellij.ide.projectView.PresentationData
import com.intellij.ide.projectView.ProjectViewNode
import com.intellij.ide.projectView.ProjectViewNodeDecorator
import com.intellij.packageDependencies.ui.PackageDependenciesNode
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder

/**
 * Decorates visual asset nodes in IntelliJ's native Project View file tree with governance badges.
 *
 * Appends badges like `[unused]`, `[duplicate]`, and `[issue]` in the node's location string and sets
 * informative hover tooltips without blocking EDT.
 */
class AnimoriaProjectViewNodeDecorator : ProjectViewNodeDecorator {
    override fun decorate(
        node: ProjectViewNode<*>,
        data: PresentationData,
    ) {
        val project = node.project ?: return
        val virtualFile = node.virtualFile ?: return
        val holder = AnimoriaAnalysisHolder.of(project)
        val asset = holder.assetForPath(virtualFile.path) ?: return

        val diagnostics = holder.diagnosticsFor(asset.path)
        if (diagnostics.isNotEmpty()) {
            val hasUnused = diagnostics.any { it.ruleId == "no-unreferenced-assets" }
            val hasDuplicate = diagnostics.any { it.ruleId == "no-duplicate-assets" }
            val hasError = diagnostics.any { it.severity == "error" }

            val badge =
                when {
                    hasUnused -> "[unused]"
                    hasDuplicate -> "[duplicate]"
                    hasError -> "[issue]"
                    else -> "[warning]"
                }

            val existingLocation = data.locationString
            data.locationString =
                if (existingLocation.isNullOrBlank()) {
                    badge
                } else {
                    "$existingLocation $badge"
                }

            data.tooltip = "Animoria: $badge ${diagnostics.first().message}"
        }
    }

    @Deprecated("Deprecated in ProjectViewNodeDecorator")
    override fun decorate(
        node: PackageDependenciesNode,
        cellRenderer: com.intellij.ui.ColoredTreeCellRenderer,
    ) {
        // No-op for dependency graph view
    }
}
