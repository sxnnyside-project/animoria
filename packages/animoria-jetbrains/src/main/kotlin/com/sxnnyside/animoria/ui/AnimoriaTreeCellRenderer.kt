package com.sxnnyside.animoria.ui

import com.intellij.icons.AllIcons
import com.intellij.ui.AnimatedIcon
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
 * and colored badges for unused/duplicate/overused governance statuses.
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
                        userObject.thumbnailLoading -> AnimatedIcon.FS()
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
                        "unused" -> AllIcons.Actions.Cancel
                        "duplicate" -> AllIcons.Actions.Copy
                        else -> AllIcons.General.BalloonWarning
                    }
                append(userObject.label, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
                append(" (${userObject.count})", SimpleTextAttributes.GRAYED_ATTRIBUTES)
            }

            is GovernanceIssueNode -> {
                val asset = userObject.asset
                icon =
                    when (userObject.category) {
                        "unused" -> AllIcons.General.Warning
                        "duplicate" -> AllIcons.Actions.Copy
                        else -> AllIcons.General.BalloonWarning
                    }
                append(asset.stem)
                when (userObject.category) {
                    "unused" -> append(" · No references found", SimpleTextAttributes.ERROR_ATTRIBUTES)
                    "duplicate" -> append(" · Identical to ${userObject.duplicateOf.size} other(s)", SimpleTextAttributes.GRAYED_ATTRIBUTES)
                    "overused" -> append(" · ${userObject.referenceCount} references", SimpleTextAttributes.GRAYED_ATTRIBUTES)
                }
            }
        }
    }

    private fun formatBytesShort(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", bytes / 1024.0)
        return String.format(java.util.Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0))
    }
}
