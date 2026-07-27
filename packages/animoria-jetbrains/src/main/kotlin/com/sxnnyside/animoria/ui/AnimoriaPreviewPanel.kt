package com.sxnnyside.animoria.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextArea
import com.intellij.ui.content.ContentFactory
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.StaticAssetData
import com.sxnnyside.animoria.backend.UsageReferenceData
import com.sxnnyside.animoria.backend.UsageReferencesResultData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import java.awt.BorderLayout
import java.awt.Image
import java.io.File
import javax.swing.BoxLayout
import javax.swing.ImageIcon
import javax.swing.JButton
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

/**
 * Opens a detail tab for one asset inside the Animoria Tool Window: thumbnail,
 * metadata grid, usage references (clickable, jumps to the source line), and
 * a snippet-generation button. Mirrors VS Code's Preview Panel.
 *
 * ## Rendering strategy
 * The daemon already renders a representative static frame for every
 * animated asset (vector SVG for Lottie/dotLottie, source bytes reused for
 * GIF/APNG/SVG, a format badge fallback otherwise — see `ThumbnailEngine`
 * in `@animoria/core`). This panel displays that frame via `ImageIcon`
 * rather than re-embedding a JS animation player: true frame-by-frame
 * playback would require bundling a Lottie/Rive runtime into the plugin,
 * which is a larger, separately-scoped enhancement — not required for
 * feature parity on metadata, references, and snippet generation, which
 * are this panel's actual job.
 */
object AnimoriaPreviewPanel {
    private const val TOOL_WINDOW_ID = "Animoria"

    fun showPreview(
        project: Project,
        asset: JetBrainsAsset,
    ) {
        val panel = buildAnimatedAssetPanel(project, asset)
        showInTab(project, "${asset.stem} · ${asset.format.uppercase()}", panel)
        loadUsageReferences(project, asset)
    }

    fun showStaticPreview(
        project: Project,
        asset: StaticAssetData,
    ) {
        val panel = buildStaticAssetPanel(asset)
        showInTab(project, "${asset.stem} · ${asset.format.uppercase()}", panel)
    }

    private fun showInTab(
        project: Project,
        title: String,
        component: JPanel,
    ) {
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID) ?: return
        val contentManager = toolWindow.contentManager

        // Reuse an existing tab with the same title instead of piling up duplicates.
        contentManager.contents.find { it.displayName == title }?.let {
            contentManager.setSelectedContent(it)
            return
        }

        val content = ContentFactory.getInstance().createContent(component, title, true)
        content.isCloseable = true
        contentManager.addContent(content)
        contentManager.setSelectedContent(content)
    }

    private fun buildAnimatedAssetPanel(
        project: Project,
        asset: JetBrainsAsset,
    ): JPanel {
        val root = JPanel(BorderLayout())

        val thumbnailLabel = JLabel("", SwingConstants.CENTER)
        thumbnailLabel.icon = loadScaledIcon(asset.thumbnailPath, 220)
        root.add(thumbnailLabel, BorderLayout.NORTH)

        val metadataPanel = JPanel()
        metadataPanel.layout = BoxLayout(metadataPanel, BoxLayout.Y_AXIS)
        metadataPanel.add(JBLabel("Format: ${asset.format.uppercase()}"))
        metadataPanel.add(JBLabel("Size: ${formatBytes(asset.sizeBytes)}"))
        metadataPanel.add(JBLabel("Status: ${asset.status}"))
        asset.error?.let { metadataPanel.add(JBLabel("Error: $it")) }

        val referencesArea = JBTextArea("Loading usage references…")
        referencesArea.isEditable = false
        referencesArea.name = REFERENCES_AREA_NAME

        val snippetButton = JButton("Generate Code Snippet")
        snippetButton.addActionListener {
            com.sxnnyside.animoria.snippet.GenerateSnippetAction.execute(project, asset)
        }

        val south = JPanel(BorderLayout())
        south.add(metadataPanel, BorderLayout.NORTH)
        south.add(ScrollPaneFactory.createScrollPane(referencesArea), BorderLayout.CENTER)
        south.add(snippetButton, BorderLayout.SOUTH)

        root.add(south, BorderLayout.CENTER)
        root.putClientProperty(REFERENCES_AREA_KEY, referencesArea)
        root.putClientProperty(PROJECT_KEY, project)
        return root
    }

    private fun buildStaticAssetPanel(asset: StaticAssetData): JPanel {
        val root = JPanel(BorderLayout())
        val imageLabel = JLabel("", SwingConstants.CENTER)
        imageLabel.icon = loadScaledIcon(asset.path, 220)
        root.add(imageLabel, BorderLayout.NORTH)

        val metadataPanel = JPanel()
        metadataPanel.layout = BoxLayout(metadataPanel, BoxLayout.Y_AXIS)
        metadataPanel.add(JBLabel("Format: ${asset.format.uppercase()}"))
        metadataPanel.add(JBLabel("Size: ${formatBytes(asset.sizeBytes)}"))
        root.add(metadataPanel, BorderLayout.CENTER)
        return root
    }

    private fun loadUsageReferences(
        project: Project,
        asset: JetBrainsAsset,
    ) {
        val processManager = project.getService(CoreProcessManager::class.java)
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val response =
                    processManager.sendCommand(
                        "getUsageReferences",
                        Json.parseToJsonElement("""{"assetPath":"${asset.path.replace("\\", "\\\\")}"}""").jsonObject,
                    )
                val result = Json.decodeFromJsonElement<UsageReferencesResultData>(response)
                ApplicationManager.getApplication().invokeLater {
                    updateReferencesArea(project, asset, result)
                }
            } catch (e: Exception) {
                com.sxnnyside.animoria.logging.AnimoriaLogger.error(
                    "Animoria: Failed to load usage references for ${asset.name}",
                    e,
                )
            }
        }
    }

    private fun updateReferencesArea(
        project: Project,
        asset: JetBrainsAsset,
        result: UsageReferencesResultData,
    ) {
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID) ?: return
        val title = "${asset.stem} · ${asset.format.uppercase()}"
        val content = toolWindow.contentManager.contents.find { it.displayName == title } ?: return
        val root = content.component as? JPanel ?: return
        val referencesArea = root.getClientProperty(REFERENCES_AREA_KEY) as? JBTextArea ?: return

        if (result.error != null) {
            referencesArea.text = "Could not load usage references: ${result.error}"
            return
        }
        if (result.references.isEmpty()) {
            referencesArea.text = "No usage references found."
            return
        }

        referencesArea.text =
            result.references.joinToString("\n") { ref ->
                "${File(ref.file).name}:${ref.line}  ${ref.content}"
            }

        // Clicking a reference line opens the file at that line.
        referencesArea.addMouseListener(
            object : java.awt.event.MouseAdapter() {
                override fun mouseClicked(e: java.awt.event.MouseEvent) {
                    val lineIndex =
                        try {
                            referencesArea.getLineOfOffset(referencesArea.viewToModel2D(e.point))
                        } catch (ex: Exception) {
                            return
                        }
                    val reference = result.references.getOrNull(lineIndex) ?: return
                    openReference(project, reference)
                }
            },
        )
    }

    private fun openReference(
        project: Project,
        reference: UsageReferenceData,
    ) {
        val vFile = LocalFileSystem.getInstance().findFileByPath(reference.file) ?: return
        val descriptor = OpenFileDescriptor(project, vFile, (reference.line - 1).coerceAtLeast(0), 0)
        descriptor.navigate(true)
    }

    private fun loadScaledIcon(
        path: String?,
        size: Int,
    ): ImageIcon? {
        if (path == null || !File(path).exists()) return null
        return try {
            val raw = ImageIcon(path)
            val scaled = raw.image.getScaledInstance(size, size, Image.SCALE_SMOOTH)
            ImageIcon(scaled)
        } catch (e: Exception) {
            null
        }
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", bytes / 1024.0)
        return String.format(java.util.Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0))
    }

    private const val REFERENCES_AREA_NAME = "animoria.referencesArea"
    private const val REFERENCES_AREA_KEY = "animoria.referencesAreaComponent"
    private const val PROJECT_KEY = "animoria.project"
}
