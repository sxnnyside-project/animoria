package com.sxnnyside.animoria.ui

import com.intellij.icons.AllIcons
import com.intellij.ui.ColoredTreeCellRenderer
import com.intellij.ui.SimpleTextAttributes
import com.intellij.util.ui.ImageUtil
import com.intellij.util.ui.JBImageIcon
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import javax.imageio.ImageIO
import javax.swing.Icon
import javax.swing.JTree
import javax.swing.tree.DefaultMutableTreeNode

/**
 * Renders nodes inside the Animoria Gallery tree view.
 * Displays local thumbnails if generated, fallback file type icons, status labels,
 * and colored badges driven by each finding's severity, as Core reports it.
 */
class AnimoriaTreeCellRenderer : ColoredTreeCellRenderer() {
    companion object {
        private val iconCache = ConcurrentHashMap<String, Icon>()

        /**
         * Safely loads and scales a thumbnail from [path], ensuring it is an in-memory
         * [JBImageIcon] with positive width and height (16x16). Never returns an asynchronous
         * or unmeasured ImageIcon with dimensions -1x-1.
         */
        fun getSafeThumbnail(
            path: String,
            fallback: Icon,
        ): Icon {
            return iconCache.computeIfAbsent(path) { filePath ->
                try {
                    val file = File(filePath)
                    if (!file.exists() || !file.isFile) return@computeIfAbsent fallback
                    val img = ImageIO.read(file)
                    if (img != null && img.width > 0 && img.height > 0) {
                        val scaled = ImageUtil.createImage(16, 16, BufferedImage.TYPE_INT_ARGB)
                        val g = scaled.createGraphics()
                        try {
                            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
                            g.drawImage(img, 0, 0, 16, 16, null)
                        } finally {
                            g.dispose()
                        }
                        val jbIcon = JBImageIcon(scaled)
                        if (jbIcon.iconWidth > 0 && jbIcon.iconHeight > 0) jbIcon else fallback
                    } else {
                        fallback
                    }
                } catch (_: Throwable) {
                    fallback
                }
            }
        }
    }

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
                        userObject.thumbnailLoading -> AllIcons.Process.Step_passive
                        userObject.thumbnailFailed -> AllIcons.General.Warning
                        userObject.thumbnailPath != null -> {
                            getSafeThumbnail(userObject.thumbnailPath, AllIcons.FileTypes.Json)
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
                val fallbackIcon = AllIcons.FileTypes.Image
                icon =
                    if (asset.format.lowercase() in setOf("png", "jpg", "jpeg") && File(asset.path).exists()) {
                        getSafeThumbnail(asset.path, fallbackIcon)
                    } else {
                        fallbackIcon
                    }
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
