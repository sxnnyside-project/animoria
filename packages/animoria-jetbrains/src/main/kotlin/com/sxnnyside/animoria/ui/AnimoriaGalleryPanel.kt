package com.sxnnyside.animoria.ui

import com.intellij.icons.AllIcons
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.DocumentAdapter
import com.intellij.ui.PopupHandler
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.SearchTextField
import com.intellij.ui.treeStructure.Tree
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.logging.AnimoriaLogger
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.awt.BorderLayout
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.io.File
import java.util.Base64
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.event.DocumentEvent
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.TreeSelectionModel

/**
 * The asset gallery — a native tree, and the thing Animoria is for.
 *
 * ## Why this had to be written
 * `AnimoriaTreeModel` and `AnimoriaTreeCellRenderer` were complete: sections for
 * animated and static assets, folder grouping, a health node, governance nodes,
 * per-asset thumbnails with pending and failed states, search, and a flat/tree
 * toggle. **Nothing ever constructed a `JTree` from them.** Their only references in
 * the repository were their own unit tests, so the JetBrains tool window shipped
 * findings, duplicates and cleanup — and no way to see the assets those findings are
 * about.
 *
 * That is not a missing polish item. Browsing animated assets is the product's
 * premise, and it is what the VS Code TreeView has provided since before Wave 1.
 *
 * ## Why native rather than the shared UI
 * A tree with lazy thumbnails, type-ahead, folder collapse and the platform's own
 * selection and keyboard behaviour is something Swing already does and a webview
 * would only imitate. `CLAUDE.md`'s layer table puts native tree views on the host
 * side for exactly this reason. The shared UI renders the *inspector*; this renders
 * the list.
 *
 * ## What it decides
 * Nothing. Sections, ordering, badge text and governance grouping are
 * `AnimoriaTreeModel`'s, fed from the analysis Core produced. This class builds the
 * component, routes a selection to the inspector, and asks the daemon for thumbnails.
 */
class AnimoriaGalleryPanel(
    private val project: Project,
    parentDisposable: Disposable,
) : Disposable {
    private val model = AnimoriaTreeModel()
    private val tree = Tree(model)
    private val search = SearchTextField()
    private val scope = AnimoriaCoroutineScope.of(project)

    /** Assets already asked about, so scrolling does not re-request the same thumbnail. */
    private val requested = mutableSetOf<String>()

    val component: JComponent = JPanel(BorderLayout())

    init {
        Disposer.register(parentDisposable, this)

        tree.isRootVisible = false
        tree.showsRootHandles = true
        tree.cellRenderer = AnimoriaTreeCellRenderer()
        tree.selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION

        // Selection keeps the Preview tab in step, but does not steal focus.
        //
        // Selecting used to be the *only* way to preview, and it posted a message to a
        // panel on a tab the developer was not looking at — so nothing appeared to
        // happen and the control read as dead. Now selection updates the preview
        // quietly, and there is an explicit button that brings it forward.
        tree.addTreeSelectionListener { onSelected(reveal = false) }
        tree.addMouseListener(
            object : MouseAdapter() {
                override fun mouseClicked(event: MouseEvent) {
                    if (event.clickCount == 2) onSelected(reveal = true)
                }
            },
        )

        search.addDocumentListener(
            object : DocumentAdapter() {
                override fun textChanged(event: DocumentEvent) {
                    model.setSearchQuery(search.text)
                }
            },
        )

        component.add(buildHeader(), BorderLayout.NORTH)
        component.add(ScrollPaneFactory.createScrollPane(tree), BorderLayout.CENTER)
    }

    /**
     * The search field, with the explicit actions beside it.
     *
     * An action toolbar rather than selection alone: VS Code's tree carries an inline
     * "Open Preview" icon, and a developer needs a control they can *see* rather than
     * a side effect they have to discover. `ActionToolbar` is the platform's own
     * version of that, so the buttons also appear in Find Action and can be bound in
     * the keymap.
     */
    private fun buildHeader(): JComponent {
        val actions =
            DefaultActionGroup(
                object : AnAction("Open Preview", "Show this asset in the Preview tab", AllIcons.Actions.Preview) {
                    override fun actionPerformed(event: AnActionEvent) = onSelected(reveal = true)

                    override fun update(event: AnActionEvent) {
                        event.presentation.isEnabled = selectedAsset() != null
                    }

                    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT
                },
                object : AnAction("Open File", "Open this asset in the editor", AllIcons.Actions.MenuOpen) {
                    override fun actionPerformed(event: AnActionEvent) = openSelectedInEditor()

                    override fun update(event: AnActionEvent) {
                        event.presentation.isEnabled = selectedAsset() != null
                    }

                    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT
                },
            )

        val toolbar = ActionManager.getInstance().createActionToolbar("AnimoriaGallery", actions, true)
        toolbar.targetComponent = tree

        // The same two actions on right-click, because a developer who has just
        // clicked an asset is already holding the mouse over it.
        PopupHandler.installPopupMenu(tree, actions, "AnimoriaGalleryPopup")

        val header = JPanel(BorderLayout())
        header.add(search, BorderLayout.CENTER)
        header.add(toolbar.component, BorderLayout.EAST)
        return header
    }

    /** Renders the analysis Core produced, then fills in thumbnails behind it. */
    fun publishAnalysis() {
        val holder = AnimoriaAnalysisHolder.of(project)
        val analysis = holder.current()

        if (analysis == null) {
            model.setDaemonUnavailable("Waiting for the Animoria engine…")
            return
        }

        model.setAssets(analysis.assets)
        model.setAnalysis(analysis)
        requestThumbnails(analysis.assets)
    }

    /** Shows a terminal daemon failure in the tree rather than an empty gallery. */
    fun showUnavailable(message: String) {
        model.setDaemonUnavailable(message)
    }

    override fun dispose() {
        requested.clear()
    }

    // ── Selection ──────────────────────────────────────────────────────────────

    private fun selectedAsset(): JetBrainsAsset? {
        val node = tree.lastSelectedPathComponent as? DefaultMutableTreeNode ?: return null
        return (node.userObject as? AnimatedAssetNode)?.asset
    }

    /**
     * Routes the selection to the inspector tab.
     *
     * Through the shared UI's `focus` message rather than by reaching into the panel,
     * so selecting an asset here and arriving at it from a command take the same path.
     */
    private fun onSelected(reveal: Boolean) {
        val asset = selectedAsset() ?: return
        AnimoriaSharedUiPanel.of(project, "inspector")?.focus(
            AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = asset.path),
        )
        // Telling the panel what to show and *showing the panel* are two different
        // things, and only the first was ever done. A webview cannot select the IDE
        // tab that contains it.
        if (reveal) AnimoriaToolWindows.show(project, "Preview")
    }

    private fun openSelectedInEditor() {
        val asset = selectedAsset() ?: return
        val file = LocalFileSystem.getInstance().findFileByIoFile(File(asset.path)) ?: return
        ApplicationManager.getApplication().invokeLater {
            if (!project.isDisposed) OpenFileDescriptor(project, file).navigate(true)
        }
    }

    // ── Thumbnails ─────────────────────────────────────────────────────────────

    /**
     * Asks the daemon for a thumbnail per asset, and settles every one.
     *
     * Every request ends in `setThumbnail` or `markThumbnailFailed` — an asset left in
     * the pending state renders an animated spinner forever, which is the regression
     * the VS Code tree had and the reason the model distinguishes the two at all.
     */
    private fun requestThumbnails(assets: List<JetBrainsAsset>) {
        val pending = assets.filter { requested.add(it.path) }
        if (pending.isEmpty()) return

        for (asset in pending) model.markThumbnailPending(asset.path)

        scope.launch {
            val manager = project.getService(CoreProcessManager::class.java)
            for (asset in pending) {
                val dataUri =
                    runCatching {
                        manager.sendCommand(
                            "generateThumbnail",
                            buildJsonObject { put("assetPath", asset.path) },
                        )
                    }.getOrNull()?.jsonObject?.get("dataUri")?.jsonPrimitive?.contentOrNull

                val file = dataUri?.let { cacheThumbnail(asset.path, it) }
                if (file != null) model.setThumbnail(asset.path, file) else model.markThumbnailFailed(asset.path)
            }
        }
    }

    /**
     * Writes a `data:` URI to a file, because Swing renders an icon from a path.
     *
     * The daemon returns a data URI — the shape a webview needs — and `ImageIcon`
     * needs bytes on disk or in memory. Cached under the IDE's own system directory,
     * keyed by the asset path, so a second analysis reuses it.
     */
    private fun cacheThumbnail(
        assetPath: String,
        dataUri: String,
    ): String? {
        val base64 = dataUri.substringAfter("base64,", missingDelimiterValue = "")
        if (base64.isEmpty()) return null

        return runCatching {
            val root =
                File(
                    com.intellij.openapi.application.PathManager.getSystemPath(),
                    "animoria/thumbnails/${project.locationHash}",
                )
            root.mkdirs()
            val destination = File(root, "${assetPath.hashCode().toUInt()}.webp")
            destination.writeBytes(Base64.getDecoder().decode(base64))
            destination.absolutePath
        }.onFailure {
            AnimoriaLogger.warn("Animoria: could not cache a thumbnail for $assetPath — ${it.message}")
        }.getOrNull()
    }

    companion object {
        private val mounted = mutableMapOf<String, AnimoriaGalleryPanel>()

        fun register(
            project: Project,
            panel: AnimoriaGalleryPanel,
        ) {
            mounted[project.locationHash] = panel
        }

        fun unregister(project: Project) {
            mounted.remove(project.locationHash)
        }

        fun of(project: Project): AnimoriaGalleryPanel? = mounted[project.locationHash]
    }
}
