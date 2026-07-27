package com.sxnnyside.animoria.ui

import com.sxnnyside.animoria.backend.GovernanceResultData
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.StaticAssetData
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeModel

// ── Domain node types ──────────────────────────────────────────────────────────

/** Root node for the gallery tree — not rendered directly. */
data object GalleryRoot

/** Shown in place of every section when the workspace has no discovered assets yet. */
data object EmptyStateNode

/**
 * Shown instead of every other section when the daemon could not be
 * started at all — every feature depends on it, so surfacing this
 * prominently (not just as a dismissible notification) is what tells a
 * user "nothing works" actually means something specific and diagnosable,
 * rather than looking like a silently broken plugin.
 */
data class DaemonUnavailableNode(val message: String)

/** Section header: Health Score. */
data class HealthScoreNode(val score: Int, val label: String, val details: String?)

/** Section header: Animated Assets. */
data class AnimatedAssetsSectionNode(val count: Int)

/** Section header: Static Assets. */
data class StaticAssetsSectionNode(val count: Int)

/** A single animated asset leaf. */
data class AnimatedAssetNode(
    val asset: JetBrainsAsset,
    val referenceCount: Int = 0,
    val thumbnailPath: String? = null,
    val thumbnailLoading: Boolean = false,
    val thumbnailFailed: Boolean = false,
    val badgePrefix: String = "",
)

/** A single static asset leaf. */
data class StaticAssetNode(val asset: StaticAssetData)

/** A directory folder node (Tree view mode only). */
data class FolderNode(val name: String, val relativePath: String)

/** Section header: Governance category. */
data class GovernanceSectionNode(val label: String, val count: Int, val category: String)

/** A single governance issue leaf. */
data class GovernanceIssueNode(
    val asset: JetBrainsAsset,
    val category: String,
    val referenceCount: Int = 0,
    val duplicateOf: List<String> = emptyList(),
)

// ── Tree model ─────────────────────────────────────────────────────────────────

/**
 * `DefaultTreeModel`-backed model for the Animoria gallery `JTree`.
 *
 * Mirrors `AnimoriaTreeProvider` (VS Code): holds asset and governance state,
 * builds the tree structure on demand from push-event data delivered by the
 * daemon. Business logic (badge evaluation, governance computation) lives in
 * `@animoria/core`; this model is a presentation adapter over the daemon's
 * serialized results.
 *
 * ## View modes
 * `flat` — all assets sorted alphabetically, no folders.
 * `tree` — assets grouped by directory hierarchy.
 *
 * ## Thread safety
 * All mutations must be dispatched on the EDT by the caller (typically
 * `invokeLater` in `AnimoriaGalleryPanel`).
 */
class AnimoriaTreeModel : DefaultTreeModel(DefaultMutableTreeNode(GalleryRoot)) {
    enum class ViewMode { FLAT, TREE }

    private var viewMode = ViewMode.FLAT
    private var searchQuery = ""

    private var healthScore: HealthScoreNode? = null
    private var assets: List<JetBrainsAsset> = emptyList()
    private var staticAssets: List<StaticAssetData> = emptyList()
    private var governanceResult: GovernanceResultData? = null
    private var daemonUnavailableMessage: String? = null

    // Per-asset thumbnail state
    private val thumbnails = HashMap<String, String>()
    private val thumbnailFailures = HashSet<String>()
    private val thumbnailPending = HashSet<String>()

    init {
        // Without this, the tree shows a bare root with zero children — and
        // zero explanation — for however long it takes the daemon to emit
        // its first scan event, rather than the empty-state message below.
        rebuildTree()
    }

    // ── Public mutators ────────────────────────────────────────────────────────

    fun setHealthScore(
        score: Int,
        label: String,
        details: String?,
    ) {
        healthScore = HealthScoreNode(score, label, details)
        rebuildTree()
    }

    /** Records that the daemon could not be started; overrides every other section until cleared. */
    fun setDaemonUnavailable(message: String) {
        daemonUnavailableMessage = message
        rebuildTree()
    }

    fun setAssets(newAssets: List<JetBrainsAsset>) {
        // Real data arriving is definitive proof the daemon is actually running.
        daemonUnavailableMessage = null
        assets = newAssets
        thumbnails.clear()
        thumbnailFailures.clear()
        thumbnailPending.clear()
        governanceResult = null
        rebuildTree()
    }

    fun updateAsset(asset: JetBrainsAsset) {
        val idx = assets.indexOfFirst { it.path == asset.path }
        if (idx == -1) {
            assets = assets + asset
        } else {
            assets = assets.toMutableList().also { it[idx] = asset }
        }
        rebuildTree()
    }

    fun removeAsset(path: String) {
        assets = assets.filter { it.path != path }
        thumbnails.remove(path)
        thumbnailFailures.remove(path)
        thumbnailPending.remove(path)
        rebuildTree()
    }

    fun setStaticAssets(newStaticAssets: List<StaticAssetData>) {
        staticAssets = newStaticAssets
        rebuildTree()
    }

    fun setGovernanceResult(result: GovernanceResultData) {
        governanceResult = result
        rebuildTree()
    }

    fun setThumbnail(
        assetPath: String,
        thumbPath: String,
    ) {
        thumbnails[assetPath] = thumbPath
        thumbnailPending.remove(assetPath)
        thumbnailFailures.remove(assetPath)
        rebuildTree()
    }

    fun markThumbnailPending(assetPath: String) {
        thumbnailPending.add(assetPath)
    }

    fun markThumbnailFailed(assetPath: String) {
        thumbnailPending.remove(assetPath)
        thumbnailFailures.add(assetPath)
        rebuildTree()
    }

    fun setViewMode(mode: ViewMode) {
        viewMode = mode
        rebuildTree()
    }

    fun toggleViewMode(): ViewMode {
        viewMode = if (viewMode == ViewMode.FLAT) ViewMode.TREE else ViewMode.FLAT
        rebuildTree()
        return viewMode
    }

    fun setSearchQuery(query: String) {
        searchQuery = query
        rebuildTree()
    }

    fun getThumbnail(path: String): String? = thumbnails[path]

    fun isThumbnailPending(path: String): Boolean = thumbnailPending.contains(path)

    fun isThumbnailFailed(path: String): Boolean = thumbnailFailures.contains(path)

    fun getAssets(): List<JetBrainsAsset> = assets

    fun getStaticAssets(): List<StaticAssetData> = staticAssets

    fun getGovernanceResult(): GovernanceResultData? = governanceResult

    // ── Tree construction ──────────────────────────────────────────────────────

    /**
     * Rebuilds the entire tree from current state.
     * Must only be called on the EDT.
     */
    fun rebuildTree() {
        val root = root as DefaultMutableTreeNode
        root.removeAllChildren()

        daemonUnavailableMessage?.let {
            root.add(DefaultMutableTreeNode(DaemonUnavailableNode(it)))
            reload()
            return
        }

        // 1. Health Score
        healthScore?.let {
            root.add(DefaultMutableTreeNode(it))
        }

        // 2. Animated Assets section
        val filtered = filteredAssets()
        if (filtered.isNotEmpty()) {
            val section = DefaultMutableTreeNode(AnimatedAssetsSectionNode(filtered.size))
            when (viewMode) {
                ViewMode.FLAT -> filtered.forEach { asset -> section.add(DefaultMutableTreeNode(toAssetNode(asset))) }
                ViewMode.TREE -> buildTreeNodes(filtered, section)
            }
            root.add(section)
        }

        // 3. Governance sections
        governanceResult?.let { addGovernanceSections(root, it) }

        // 4. Static Assets section
        if (staticAssets.isNotEmpty()) {
            val section = DefaultMutableTreeNode(StaticAssetsSectionNode(staticAssets.size))
            staticAssets.forEach { section.add(DefaultMutableTreeNode(StaticAssetNode(it))) }
            root.add(section)
        }

        // 5. Empty state — nothing discovered yet in this workspace.
        if (root.childCount == 0) {
            root.add(DefaultMutableTreeNode(EmptyStateNode))
        }

        reload()
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private fun addGovernanceSections(
        root: DefaultMutableTreeNode,
        gov: GovernanceResultData,
    ) {
        addGovernanceCategory(root, gov.unused, "Unused Assets", "unused")
        addGovernanceCategory(root, gov.duplicates, "Duplicates", "duplicate")
        addGovernanceCategory(root, gov.overused, "Overused Assets", "overused")
    }

    private fun addGovernanceCategory(
        root: DefaultMutableTreeNode,
        issues: List<com.sxnnyside.animoria.backend.GovernanceIssueData>,
        label: String,
        category: String,
    ) {
        if (issues.isEmpty()) return

        val section = DefaultMutableTreeNode(GovernanceSectionNode(label, issues.size, category))
        issues.forEach { issue ->
            val asset =
                assets.find { it.path == issue.assetPath }
                    ?: JetBrainsAsset(issue.assetPath, issue.assetName, issue.assetName, "unknown", 0, 0.0, "parsed")
            section.add(
                DefaultMutableTreeNode(
                    GovernanceIssueNode(
                        asset,
                        category,
                        referenceCount = issue.referenceCount ?: 0,
                        duplicateOf = issue.duplicateOf ?: emptyList(),
                    ),
                ),
            )
        }
        root.add(section)
    }

    private fun filteredAssets(): List<JetBrainsAsset> {
        val q = searchQuery.lowercase()
        return if (q.isEmpty()) {
            assets
        } else {
            assets.filter { it.name.lowercase().contains(q) || it.stem.lowercase().contains(q) }
        }
    }

    private fun toAssetNode(asset: JetBrainsAsset): AnimatedAssetNode =
        AnimatedAssetNode(
            asset = asset,
            thumbnailPath = thumbnails[asset.path],
            thumbnailLoading = thumbnailPending.contains(asset.path),
            thumbnailFailed = thumbnailFailures.contains(asset.path),
        )

    private fun buildTreeNodes(
        assetList: List<JetBrainsAsset>,
        parent: DefaultMutableTreeNode,
    ) {
        // Group by first path segment relative to the shallowest common prefix
        val grouped =
            assetList.groupBy { asset ->
                asset.path.substringBeforeLast("/").let { dir ->
                    dir.substringAfterLast("/")
                }
            }
        grouped.entries.sortedBy { it.key }.forEach { (folder, folderAssets) ->
            if (folderAssets.size == 1 || grouped.size == 1) {
                // Flat inside single folder
                folderAssets.forEach { parent.add(DefaultMutableTreeNode(toAssetNode(it))) }
            } else {
                val folderNode = DefaultMutableTreeNode(FolderNode(folder, folder))
                folderAssets.forEach { folderNode.add(DefaultMutableTreeNode(toAssetNode(it))) }
                parent.add(folderNode)
            }
        }
    }
}
