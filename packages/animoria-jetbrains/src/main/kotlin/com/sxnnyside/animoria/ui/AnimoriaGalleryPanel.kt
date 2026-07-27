package com.sxnnyside.animoria.ui

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.SearchTextField
import com.intellij.ui.treeStructure.SimpleTree
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.StaticAssetData
import com.sxnnyside.animoria.cleanup.CleanupReviewDialog
import com.sxnnyside.animoria.duplicates.DuplicateResolverDialog
import com.sxnnyside.animoria.governance.ExportGovernanceReportAction
import com.sxnnyside.animoria.governance.GovernanceReportEditor
import com.sxnnyside.animoria.logging.AnimoriaLogger
import com.sxnnyside.animoria.settings.AnimoriaSettings
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import java.awt.BorderLayout
import java.awt.event.KeyAdapter
import java.awt.event.KeyEvent
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.JPanel
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.TreePath

class AnimoriaGalleryPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {
    private val treeModel = AnimoriaTreeModel()
    private val tree = SimpleTree(treeModel)
    private val searchField = SearchTextField()
    private val processManager: CoreProcessManager get() = project.getService(CoreProcessManager::class.java)

    init {
        layout = BorderLayout()
        setupTree()
        setupSearch()
        setupToolbar()

        val scrollPane = ScrollPaneFactory.createScrollPane(tree)
        setContent(scrollPane)

        // Setup process manager listeners
        setupProcessListeners()
    }

    private fun setupTree() {
        tree.cellRenderer = AnimoriaTreeCellRenderer()
        tree.isRootVisible = false
        tree.showsRootHandles = true

        tree.addMouseListener(
            object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.clickCount == 2) {
                        val path = tree.getPathForLocation(e.x, e.y) ?: return
                        val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return
                        handleNodeDoubleClick(node.userObject)
                    }
                }

                override fun mousePressed(e: MouseEvent) {
                    if (e.isPopupTrigger) {
                        showPopupMenu(e)
                    }
                }

                override fun mouseReleased(e: MouseEvent) {
                    if (e.isPopupTrigger) {
                        showPopupMenu(e)
                    }
                }
            },
        )
    }

    private fun setupSearch() {
        val searchPanel = JPanel(BorderLayout())
        searchPanel.add(searchField, BorderLayout.CENTER)
        searchField.textEditor.addKeyListener(
            object : KeyAdapter() {
                override fun keyReleased(e: KeyEvent) {
                    ApplicationManager.getApplication().invokeLater {
                        treeModel.setSearchQuery(searchField.text)
                    }
                }
            },
        )
        add(searchPanel, BorderLayout.NORTH)
    }

    private fun setupToolbar() {
        val group = DefaultActionGroup()
        group.add(RefreshAction())
        group.add(RunGovernanceAction())
        group.add(CleanupAction())
        group.add(ToggleViewModeAction())

        val toolbar = ActionManager.getInstance().createActionToolbar("AnimoriaToolbar", group, true)
        toolbar.targetComponent = this
        setToolbar(toolbar.component)
    }

    private fun setupProcessListeners() {
        processManager.onScanComplete = { scanDataJson ->
            ApplicationManager.getApplication().invokeLater {
                try {
                    val json = Json.parseToJsonElement(scanDataJson).jsonObject
                    val assets = json["assets"]?.let { Json.decodeFromJsonElement<List<JetBrainsAsset>>(it) } ?: emptyList()
                    treeModel.setAssets(assets)

                    // Start generating thumbnails for assets in background
                    val settings = AnimoriaSettings.getInstance(project)
                    if (settings.enableThumbnails) {
                        assets.forEach { asset ->
                            if (asset.thumbnailPath == null) {
                                triggerThumbnailGeneration(asset)
                            } else {
                                treeModel.setThumbnail(asset.path, asset.thumbnailPath)
                            }
                        }
                    }
                } catch (e: Exception) {
                    AnimoriaLogger.error("Animoria: Failed to process scanComplete event", e)
                }
            }
        }

        processManager.onGovernanceResult = { govResult ->
            ApplicationManager.getApplication().invokeLater {
                treeModel.setGovernanceResult(govResult)
            }
        }

        processManager.onThumbnailResult = { thumbResult ->
            ApplicationManager.getApplication().invokeLater {
                if (thumbResult.thumbnailPath != null) {
                    treeModel.setThumbnail(thumbResult.assetPath, thumbResult.thumbnailPath)
                } else {
                    treeModel.markThumbnailFailed(thumbResult.assetPath)
                }
            }
        }

        processManager.onWatcherEvent = { watcherEventJson ->
            // Trigger scanner refresh
            triggerScan()
        }

        processManager.onDaemonUnavailable = { message ->
            ApplicationManager.getApplication().invokeLater {
                treeModel.setDaemonUnavailable(message)
            }
        }
    }

    private fun triggerScan() {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                // Command: getSnapshot to retrieve updated indexing state
                val snapshot = processManager.sendCommand("getSnapshot")
                val assets = Json.decodeFromJsonElement<List<JetBrainsAsset>>(snapshot.jsonObject["assets"]!!)
                ApplicationManager.getApplication().invokeLater {
                    treeModel.setAssets(assets)
                }
            } catch (e: Exception) {
                AnimoriaLogger.error("Animoria: Failed to refresh the asset snapshot", e)
            }
        }
    }

    private fun triggerThumbnailGeneration(asset: JetBrainsAsset) {
        treeModel.markThumbnailPending(asset.path)
        GlobalScope.launch(Dispatchers.IO) {
            try {
                processManager.sendCommand(
                    "generateThumbnail",
                    Json.parseToJsonElement("""{"assetPath":"${asset.path}"}""").jsonObject,
                )
            } catch (e: Exception) {
                AnimoriaLogger.error("Animoria: Failed to generate thumbnail for ${asset.name}", e)
            }
        }
    }

    private fun handleNodeDoubleClick(userObject: Any?) {
        when (userObject) {
            is AnimatedAssetNode -> {
                AnimoriaPreviewPanel.showPreview(project, userObject.asset)
            }
            is StaticAssetNode -> {
                AnimoriaPreviewPanel.showStaticPreview(project, userObject.asset)
            }
            is GovernanceIssueNode -> {
                AnimoriaPreviewPanel.showPreview(project, userObject.asset)
            }
        }
    }

    private fun showPopupMenu(e: MouseEvent) {
        val path: TreePath = tree.getPathForLocation(e.x, e.y) ?: return
        val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return
        val userObject = node.userObject ?: return

        val group = DefaultActionGroup()
        when (userObject) {
            is AnimatedAssetNode -> {
                group.add(OpenPreviewAction(userObject.asset))
                group.add(GenerateSnippetAction(userObject.asset))
            }
            is StaticAssetNode -> {
                group.add(OpenStaticPreviewAction(userObject.asset))
            }
            is GovernanceIssueNode -> {
                group.add(OpenPreviewAction(userObject.asset))
                if (userObject.category == "duplicate") {
                    group.add(ResolveDuplicateAction(userObject))
                } else if (userObject.category == "unused") {
                    group.add(DeleteAssetAction(userObject.asset))
                }
            }
            is GovernanceSectionNode -> {
                group.add(ViewGovernanceReportAction())
                group.add(ExportGovernanceReportAction(project))
            }
        }

        if (group.childrenCount > 0) {
            val menu = ActionManager.getInstance().createActionPopupMenu("AnimoriaContextMenu", group)
            menu.component.show(e.component, e.x, e.y)
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    inner class RefreshAction : AnAction("Refresh Gallery", "Rescan files and reload index", AllIcons.Actions.Refresh) {
        override fun actionPerformed(e: AnActionEvent) {
            triggerScan()
        }
    }

    inner class RunGovernanceAction : AnAction("Run Governance", "Run unused, duplicate, and overused checks", AllIcons.Actions.Checked) {
        override fun actionPerformed(e: AnActionEvent) {
            val settings = AnimoriaSettings.getInstance(project)
            GlobalScope.launch(Dispatchers.IO) {
                try {
                    val threshold = settings.overusedThreshold
                    processManager.sendCommand(
                        "runGovernance",
                        Json.parseToJsonElement("""{"overusedThreshold":$threshold}""").jsonObject,
                    )
                } catch (e: Exception) {
                    AnimoriaLogger.error("Animoria: Failed to run governance analysis", e)
                }
            }
        }
    }

    inner class CleanupAction : AnAction("Cleanup Panel", "Review cleanup opportunities", AllIcons.Actions.GC) {
        override fun actionPerformed(e: AnActionEvent) {
            CleanupReviewDialog(project).show()
        }
    }

    inner class ToggleViewModeAction : AnAction(
        "Toggle View Mode",
        "Switch between Directory Tree / Flat View",
        AllIcons.Actions.ShowAsTree,
    ) {
        override fun actionPerformed(e: AnActionEvent) {
            treeModel.toggleViewMode()
        }
    }

    // ── Context Actions ───────────────────────────────────────────────────────

    inner class OpenPreviewAction(private val asset: JetBrainsAsset) : AnAction("Open Preview") {
        override fun actionPerformed(e: AnActionEvent) {
            AnimoriaPreviewPanel.showPreview(project, asset)
        }
    }

    inner class OpenStaticPreviewAction(private val asset: StaticAssetData) : AnAction("Open Preview") {
        override fun actionPerformed(e: AnActionEvent) {
            AnimoriaPreviewPanel.showStaticPreview(project, asset)
        }
    }

    inner class GenerateSnippetAction(private val asset: JetBrainsAsset) : AnAction("Generate Code Snippet") {
        override fun actionPerformed(e: AnActionEvent) {
            com.sxnnyside.animoria.snippet.GenerateSnippetAction.execute(project, asset)
        }
    }

    inner class ResolveDuplicateAction(private val node: GovernanceIssueNode) : AnAction("Resolve Duplicates") {
        override fun actionPerformed(e: AnActionEvent) {
            DuplicateResolverDialog(project, node).show()
        }
    }

    inner class ViewGovernanceReportAction : AnAction("View Governance Report") {
        override fun actionPerformed(e: AnActionEvent) {
            GovernanceReportEditor.open(project)
        }
    }

    inner class DeleteAssetAction(private val asset: JetBrainsAsset) : AnAction(
        "Delete Asset",
        "Moves the asset to .animoria/trash/",
        AllIcons.Actions.GC,
    ) {
        override fun actionPerformed(e: AnActionEvent) {
            val confirm =
                com.intellij.openapi.ui.Messages.showYesNoDialog(
                    project,
                    "Move ${asset.name} to .animoria/trash/? It can be recovered from there afterward.",
                    "Delete Asset",
                    "Delete",
                    "Cancel",
                    AllIcons.General.Warning,
                )
            if (confirm != com.intellij.openapi.ui.Messages.YES) return

            GlobalScope.launch(Dispatchers.IO) {
                try {
                    val response =
                        processManager.sendCommand(
                            "executeCleanup",
                            Json.parseToJsonElement(
                                """{"assetPaths":["${asset.path.replace("\\", "\\\\")}"]}""",
                            ).jsonObject,
                        )
                    val summary =
                        Json.decodeFromJsonElement<com.sxnnyside.animoria.backend.CleanupSummaryData>(response)
                    ApplicationManager.getApplication().invokeLater {
                        treeModel.removeAsset(asset.path)
                        if (summary.removedAssetPaths.isEmpty()) {
                            AnimoriaLogger.warn("Animoria: ${asset.name} was not moved to trash — it may already be gone.")
                        }
                    }
                } catch (ex: Exception) {
                    AnimoriaLogger.error("Animoria: Failed to delete ${asset.name}", ex)
                }
            }
        }
    }
}
