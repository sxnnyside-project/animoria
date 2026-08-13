package com.sxnnyside.animoria.ui

import com.intellij.icons.AllIcons
import com.intellij.ui.ColoredTreeCellRenderer
import com.intellij.ui.SimpleTextAttributes
import java.awt.Image
import java.io.File
import javax.swing.ImageIcon
import javax.swing.JTree
import javax.swing.tree.DefaultMutableTreeNode

/**
 * Renders nodes inside the Animoria Gallery tree view.
 * Displays local thumbnails if generated, fallback file type icons, status labels,
 * and colored badges driven by each finding's severity, as Core reports it.
 */
class AnimoriaTreeCellRenderer : ColoredTreeCellRenderer() {
    override fun customizeCellRenderer(
        tree: JTree,
        value: Any?,
        selected: Boolean,
        expanded: Boolean,
        leaf: Boolean,
        row: Int,
        hasFocus: Boolean,
    ) {
        val node = value as? DefaultMutableTreeNode ?: return
        val userObject = node.userObject ?: return

        when (userObject) {
            is DaemonUnavailableNode -> {
                icon = AllIcons.General.Error
                append("Animoria daemon unavailable", SimpleTextAttributes.ERROR_ATTRIBUTES)
                append(" — see Event Log", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is EmptyStateNode -> {
                icon = AllIcons.General.Information
                append("No visual assets found yet", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is HealthScoreNode -> {
                icon = AllIcons.General.InspectionsEye
                append(userObject.label, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
                userObject.details?.let {
                    append(" ($it)", SimpleTextAttributes.GRAYED_ATTRIBUTES)
                }
            }

            is AnimatedAssetsSectionNode -> {
                icon = AllIcons.Nodes.ModuleGroup
                append("Animated Assets", SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
                append(" (${userObject.count})", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is StaticAssetsSectionNode -> {
                icon = AllIcons.FileTypes.Image
                append("Static Assets", SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
                append(" (${userObject.count})", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is AnimatedAssetNode -> {
                val asset = userObject.asset
                icon =
                    when {
                        // `AnimatedIcon.FS` is marked `@ApiStatus.Internal`, which the
                        // IntelliJ Plugin Verifier reports as an internal API usage —
                        // the exact class of finding this plugin was rejected for
                        // before. `AllIcons.Process.Step_passive` is a public icon and
                        // reads the same way in a tree row: something is happening here.
                        userObject.thumbnailLoading -> AllIcons.Process.Step_passive
                        userObject.thumbnailFailed -> AllIcons.General.Warning
                        userObject.thumbnailPath != null && File(userObject.thumbnailPath).exists() -> {
                            try {
                                val raw = ImageIcon(userObject.thumbnailPath)
                                val scaled = raw.image.getScaledInstance(16, 16, Image.SCALE_SMOOTH)
                                ImageIcon(scaled)
                            } catch (e: Exception) {
                                AllIcons.FileTypes.Json
                            }
                        }
                        else -> AllIcons.FileTypes.Json
                    }
                append(asset.stem)
                val formatText = asset.format.uppercase()
                append(" · $formatText", SimpleTextAttributes.GRAYED_ATTRIBUTES)
                if (asset.status == "error") {
                    append(" (Error)", SimpleTextAttributes.ERROR_ATTRIBUTES)
                }
            }

            is StaticAssetNode -> {
                val asset = userObject.asset
                icon = AllIcons.FileTypes.Image
                append(asset.stem)
                val formatText = asset.format.uppercase()
                val sizeText = formatBytesShort(asset.sizeBytes)
                append(" · $formatText · $sizeText", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is FolderNode -> {
                icon = AllIcons.Nodes.Folder
                append(userObject.name)
            }

            is GovernanceSectionNode -> {
                icon =
                    when (userObject.category) {
                        "unreferenced" -> AllIcons.Actions.Cancel
                        "duplicate" -> AllIcons.Actions.Copy
                        else -> AllIcons.General.BalloonWarning
                    }
                append(userObject.label, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
                append(" (${userObject.count})", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is GovernanceIssueNode -> {
                val diagnostic = userObject.diagnostic
                // Severity comes from Core, so the icon reflects the same judgement the
                // CLI prints and the Problems panel shows — it is not re-derived from a
                // locally-invented category.
                icon =
                    if (diagnostic.severity == "error") {
                        AllIcons.General.Error
                    } else {
                        AllIcons.General.Warning
                    }
                append(userObject.asset.stem)
                append(
                    " · ${diagnostic.evidence.summary}",
                    if (diagnostic.severity == "error") {
                        SimpleTextAttributes.ERROR_ATTRIBUTES
                    } else {
                        SimpleTextAttributes.GRAYED_ATTRIBUTES
                    },
                )
            }
        }
    }

    private fun formatBytesShort(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", bytes / 1024.0)
        return String.format(java.util.Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0))
    }
}
