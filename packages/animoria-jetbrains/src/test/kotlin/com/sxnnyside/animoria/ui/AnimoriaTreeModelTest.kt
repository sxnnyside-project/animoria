package com.sxnnyside.animoria.ui

import com.sxnnyside.animoria.backend.GovernanceIssueData
import com.sxnnyside.animoria.backend.GovernanceResultData
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.StaticAssetData
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import javax.swing.tree.DefaultMutableTreeNode

/**
 * Covers [AnimoriaTreeModel]'s state transitions directly — no IntelliJ
 * Platform test fixture needed, since the model itself only depends on
 * plain `javax.swing.tree` classes. Prioritizes the paths that feed
 * destructive/safety-relevant UI (governance sections, duplicate groups,
 * asset removal) over incidental coverage, per the reliability sprint's
 * "behavioral correctness over raw coverage" goal.
 */
class AnimoriaTreeModelTest {
    private fun asset(
        path: String,
        stem: String = path.substringAfterLast('/'),
    ): JetBrainsAsset =
        JetBrainsAsset(
            path = path,
            name = "$stem.json",
            stem = stem,
            format = "lottie",
            sizeBytes = 100,
            mtime = 0.0,
            status = "parsed",
        )

    private fun rootChildren(model: AnimoriaTreeModel): List<Any?> {
        val root = model.root as DefaultMutableTreeNode
        return (0 until root.childCount).map { (root.getChildAt(it) as DefaultMutableTreeNode).userObject }
    }

    @Test
    fun `a fresh model with nothing discovered shows the empty state`() {
        val model = AnimoriaTreeModel()
        assertEquals(listOf(EmptyStateNode), rootChildren(model))
    }

    @Test
    fun `setDaemonUnavailable replaces every other section, including a populated one`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))

        model.setDaemonUnavailable("no native daemon for this platform")

        assertEquals(listOf(DaemonUnavailableNode("no native daemon for this platform")), rootChildren(model))
    }

    @Test
    fun `real asset data arriving afterward clears the daemon-unavailable state`() {
        val model = AnimoriaTreeModel()
        model.setDaemonUnavailable("no native daemon for this platform")

        model.setAssets(listOf(asset("/ws/a.json", "a")))

        val children = rootChildren(model)
        assertTrue(children.none { it is DaemonUnavailableNode })
        assertTrue(children.any { it is AnimatedAssetsSectionNode })
    }

    @Test
    fun `setAssets replaces the empty state with an Animated Assets section`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))

        val children = rootChildren(model)
        assertTrue(children.none { it == EmptyStateNode })
        assertTrue(children.any { it is AnimatedAssetsSectionNode && it.count == 1 })
    }

    @Test
    fun `removing the only asset restores the empty state`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))
        model.removeAsset("/ws/a.json")

        assertEquals(listOf(EmptyStateNode), rootChildren(model))
    }

    @Test
    fun `updateAsset adds a new asset and replaces an existing one by path`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))

        model.updateAsset(asset("/ws/b.json", "b"))
        assertEquals(2, model.getAssets().size)

        model.updateAsset(asset("/ws/a.json", "a-renamed"))
        assertEquals(2, model.getAssets().size)
        assertEquals("a-renamed", model.getAssets().first { it.path == "/ws/a.json" }.stem)
    }

    @Test
    fun `governance sections only appear for categories with at least one issue`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a"), asset("/ws/b.json", "b")))
        model.setGovernanceResult(
            GovernanceResultData(
                unused = listOf(GovernanceIssueData(assetPath = "/ws/a.json", assetName = "a.json", category = "unused")),
            ),
        )

        val sections = rootChildren(model).filterIsInstance<GovernanceSectionNode>()
        assertEquals(listOf("unused"), sections.map { it.category })
    }

    @Test
    fun `a duplicate issue carries its duplicateOf group into the tree`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))
        model.setGovernanceResult(
            GovernanceResultData(
                duplicates =
                    listOf(
                        GovernanceIssueData(
                            assetPath = "/ws/a.json",
                            assetName = "a.json",
                            category = "duplicate",
                            duplicateOf = listOf("/ws/a-copy.json"),
                        ),
                    ),
            ),
        )

        val root = model.root as DefaultMutableTreeNode
        val duplicatesSection =
            (0 until root.childCount)
                .map { root.getChildAt(it) as DefaultMutableTreeNode }
                .first { (it.userObject as? GovernanceSectionNode)?.category == "duplicate" }
        val issueNode = (duplicatesSection.getChildAt(0) as DefaultMutableTreeNode).userObject as GovernanceIssueNode

        assertEquals(listOf("/ws/a-copy.json"), issueNode.duplicateOf)
    }

    @Test
    fun `setStaticAssets adds a Static Assets section independent of animated assets`() {
        val model = AnimoriaTreeModel()
        model.setStaticAssets(
            listOf(StaticAssetData(path = "/ws/icon.png", name = "icon.png", stem = "icon", format = "png", sizeBytes = 10)),
        )

        assertTrue(rootChildren(model).any { it is StaticAssetsSectionNode && it.count == 1 })
    }

    @Test
    fun `search query filters the Animated Assets section without touching the underlying asset list`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/success.json", "success"), asset("/ws/failure.json", "failure")))

        model.setSearchQuery("succ")

        val root = model.root as DefaultMutableTreeNode
        val section =
            (0 until root.childCount)
                .map { root.getChildAt(it) as DefaultMutableTreeNode }
                .first { it.userObject is AnimatedAssetsSectionNode }
        assertEquals(1, section.childCount)
        assertEquals(2, model.getAssets().size, "the underlying asset list must be untouched by a search filter")
    }

    @Test
    fun `thumbnail state transitions from pending to resolved clear the pending flag`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))

        model.markThumbnailPending("/ws/a.json")
        assertTrue(model.isThumbnailPending("/ws/a.json"))

        model.setThumbnail("/ws/a.json", "/ws/.animoria/thumbnails/a.svg")
        assertFalse(model.isThumbnailPending("/ws/a.json"))
        assertEquals("/ws/.animoria/thumbnails/a.svg", model.getThumbnail("/ws/a.json"))
    }

    @Test
    fun `a failed thumbnail is flagged and never reported as pending`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a")))

        model.markThumbnailPending("/ws/a.json")
        model.markThumbnailFailed("/ws/a.json")

        assertTrue(model.isThumbnailFailed("/ws/a.json"))
        assertFalse(model.isThumbnailPending("/ws/a.json"))
    }

    @Test
    fun `toggleViewMode flips between flat and tree and back`() {
        val model = AnimoriaTreeModel()
        val first = model.toggleViewMode()
        val second = model.toggleViewMode()

        assertEquals(AnimoriaTreeModel.ViewMode.TREE, first)
        assertEquals(AnimoriaTreeModel.ViewMode.FLAT, second)
    }
}
