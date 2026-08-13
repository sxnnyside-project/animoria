package com.sxnnyside.animoria.ui

import com.sxnnyside.animoria.backend.DiagnosticEvidenceData
import com.sxnnyside.animoria.backend.EvidenceLocationData
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.RemediationData
import com.sxnnyside.animoria.backend.RuleDiagnosticData
import com.sxnnyside.animoria.backend.StaticAssetData
import com.sxnnyside.animoria.backend.WorkspaceAnalysisData
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
    fun `governance sections only appear for rules with at least one diagnostic`() {
        val model = AnimoriaTreeModel()
        model.setAssets(listOf(asset("/ws/a.json", "a"), asset("/ws/b.json", "b")))
        model.setAnalysis(
            WorkspaceAnalysisData(
                assets = listOf(asset("/ws/a.json", "a"), asset("/ws/b.json", "b")),
                diagnostics = listOf(diagnostic("no-unreferenced-assets", asset("/ws/a.json", "a"))),
                evaluatedRuleIds = listOf("no-unreferenced-assets", "no-duplicate-content"),
            ),
        )

        // `no-duplicate-content` was evaluated and found nothing. A section for it
        // would imply findings that do not exist, so evaluation alone must not
        // create one.
        val sections = rootChildren(model).filterIsInstance<GovernanceSectionNode>()
        assertEquals(listOf("no-unreferenced-assets"), sections.map { it.category })
    }

    @Test
    fun `an issue node carries the diagnostic verbatim rather than a re-derived category`() {
        val model = AnimoriaTreeModel()
        val subject = asset("/ws/a.json", "a")
        model.setAssets(listOf(subject))
        val published = diagnostic("max-file-size-kb", subject, severity = "error", confidence = "certain")
        model.setAnalysis(
            WorkspaceAnalysisData(assets = listOf(subject), diagnostics = listOf(published)),
        )

        val node = governanceIssues(model, "max-file-size-kb").single()
        assertEquals(published, node.diagnostic)
        assertEquals("max-file-size-kb", node.category)
        assertEquals("error", node.diagnostic.severity)
        assertEquals("certain", node.diagnostic.confidence)
    }

    @Test
    fun `a duplicate issue exposes its sibling locations from the diagnostic evidence`() {
        val model = AnimoriaTreeModel()
        val subject = asset("/ws/a.json", "a")
        model.setAssets(listOf(subject))
        model.setAnalysis(
            WorkspaceAnalysisData(
                assets = listOf(subject),
                diagnostics =
                    listOf(
                        diagnostic(
                            "no-duplicate-content",
                            subject,
                            locations = listOf(EvidenceLocationData(file = "/ws/a-copy.json")),
                        ),
                    ),
            ),
        )

        val node = governanceIssues(model, "no-duplicate-content").single()
        assertEquals(listOf("/ws/a-copy.json"), node.duplicateOf)
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

    private fun diagnostic(
        ruleId: String,
        asset: JetBrainsAsset,
        severity: String = "warning",
        confidence: String = "high",
        locations: List<EvidenceLocationData> = emptyList(),
    ) = RuleDiagnosticData(
        ruleId = ruleId,
        severity = severity,
        asset = asset,
        message = "$ruleId on ${asset.path}",
        evidence = DiagnosticEvidenceData(kind = "absence", summary = "observed", locations = locations),
        confidence = confidence,
        remediation = RemediationData(summary = "do something"),
        helpUri = "https://example.invalid/$ruleId",
    )

    private fun governanceIssues(
        model: AnimoriaTreeModel,
        ruleId: String,
    ): List<GovernanceIssueNode> {
        val root = model.root as DefaultMutableTreeNode
        val section =
            (0 until root.childCount)
                .map { root.getChildAt(it) as DefaultMutableTreeNode }
                .first { (it.userObject as? GovernanceSectionNode)?.category == ruleId }
        return (0 until section.childCount)
            .map { (section.getChildAt(it) as DefaultMutableTreeNode).userObject as GovernanceIssueNode }
    }
}

/**
 * The gallery exists as a *mounted component*, not merely as a model.
 *
 * ## The defect this exists for
 * `AnimoriaTreeModel` and `AnimoriaTreeCellRenderer` were complete — sections, folder
 * grouping, health and governance nodes, per-asset thumbnails with pending and failed
 * states, search, a flat/tree toggle — and **nothing ever constructed a `JTree` from
 * them**. Their only references in the repository were the tests above. The tool
 * window shipped findings, duplicates and cleanup, and no way to see the assets those
 * findings are about; the "Asset" tab invited the developer to select something with
 * nothing to select from.
 *
 * A unit-tested model with no surface passes every test and ships no feature. That is
 * the exact shape of failure this repository has been bitten by repeatedly, and it is
 * only visible from outside the class.
 */
class GalleryMountedTest {
    private val mainRoot = java.io.File("src/main/kotlin")

    private fun mainSources(): String =
        mainRoot
            .walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { file ->
                file.readText()
                    .replace(Regex("""/\*[\s\S]*?\*/""")) { it.value.replace(Regex("[^\n]"), " ") }
                    .lines()
                    .joinToString("\n") { line -> line.substringBefore("//") }
            }

    @org.junit.jupiter.api.Test
    @org.junit.jupiter.api.DisplayName("something in main builds a tree from the model")
    fun theModelIsMounted() {
        val source = mainSources()
        assertTrue(
            source.contains("Tree(model)") || Regex("""Tree\(\s*AnimoriaTreeModel""").containsMatchIn(source),
            "AnimoriaTreeModel must be mounted in a real tree component, not only in tests",
        )
        assertTrue(
            source.contains("AnimoriaTreeCellRenderer()"),
            "the renderer must be attached to that tree",
        )
    }

    @org.junit.jupiter.api.Test
    @org.junit.jupiter.api.DisplayName("the tool window opens the gallery")
    fun theGalleryIsAToolWindowTab() {
        val factory =
            java.io.File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaToolWindowFactory.kt")
                .readText()
        assertTrue(factory.contains("AnimoriaGalleryPanel"), "the gallery must be a tool window tab")
        assertTrue(
            factory.contains("\"Assets\""),
            "the gallery tab must be named for what it holds",
        )
    }

    @org.junit.jupiter.api.Test
    @org.junit.jupiter.api.DisplayName("every thumbnail request settles")
    fun thumbnailsSettle() {
        // Pending renders an animated spinner. An asset left there shows it forever,
        // which is the regression the VS Code tree had for the same reason.
        val gallery =
            java.io.File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaGalleryPanel.kt").readText()
        assertTrue(gallery.contains("markThumbnailPending"), "a request must mark the asset pending")
        assertTrue(gallery.contains("setThumbnail"), "success must settle it")
        assertTrue(gallery.contains("markThumbnailFailed"), "failure must settle it too")
    }

    @org.junit.jupiter.api.Test
    @org.junit.jupiter.api.DisplayName("the gallery offers an explicit preview action")
    fun previewIsAnExplicitAction() {
        // Selection alone was the only way to preview, and it posted a message to a
        // panel on a tab the developer was not looking at — so nothing appeared to
        // happen and the control read as dead. A capability a user cannot see is a
        // capability they do not have.
        val gallery =
            java.io.File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaGalleryPanel.kt").readText()

        assertTrue(gallery.contains("\"Open Preview\""), "the gallery must offer a visible preview action")
        assertTrue(gallery.contains("createActionToolbar"), "it belongs on a toolbar the developer can see")
        assertTrue(gallery.contains("installPopupMenu"), "and on the context menu, where the mouse already is")
    }

    @org.junit.jupiter.api.Test
    @org.junit.jupiter.api.DisplayName("routing to a surface also brings that surface forward")
    fun routingRevealsTheSurface() {
        // Telling a panel what to show and *showing the panel* are two different
        // things. A webview cannot select the IDE tab that contains it, so a host that
        // only posts the message leaves the developer where they were.
        val gallery =
            java.io.File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaGalleryPanel.kt").readText()
        assertTrue(
            gallery.contains("AnimoriaToolWindows.show"),
            "a preview request must activate the Preview tab, not only message it",
        )

        val windows =
            java.io.File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaToolWindows.kt").readText()
        assertTrue(windows.contains("setSelectedContent"), "the tab must actually be selected")
        assertTrue(windows.contains("invokeLater"), "content selection is a UI operation")
    }
}
