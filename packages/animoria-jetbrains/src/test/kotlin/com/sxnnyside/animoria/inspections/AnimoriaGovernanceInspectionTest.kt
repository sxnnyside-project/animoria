package com.sxnnyside.animoria.inspections

import com.intellij.codeInspection.ProblemHighlightType
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.RuleDiagnosticData
import com.sxnnyside.animoria.backend.UsageReferenceData
import com.sxnnyside.animoria.backend.WorkspaceAnalysisData
import com.sxnnyside.animoria.ui.AnimoriaAssetTransferable
import kotlinx.serialization.json.buildJsonObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.awt.datatransfer.DataFlavor
import java.io.File

@DisplayName("Animoria JetBrains Inspections, Indexing and Native Presentation Tests")
class AnimoriaGovernanceInspectionTest {
    @Test
    @DisplayName("AnimoriaAnalysisHolder indexes assets and diagnostics for O(1) synchronous lookups")
    fun holderIndexesAssetsAndDiagnostics() {
        val holder = AnimoriaAnalysisHolder()

        val asset1 =
            JetBrainsAsset(
                path = "/workspace/assets/anim1.json",
                name = "anim1.json",
                stem = "anim1",
                format = "lottie",
                kind = "motion",
                sizeBytes = 12000,
            )
        val asset2 =
            JetBrainsAsset(
                path = "/workspace/assets/unused.riv",
                name = "unused.riv",
                stem = "unused",
                format = "rive",
                kind = "motion",
                sizeBytes = 45000,
            )

        val diagUnused =
            RuleDiagnosticData(
                ruleId = "no-unreferenced-assets",
                severity = "warning",
                targetAssetPath = asset2.path,
                asset = asset2,
                message = "Asset has zero references",
            )
        val diagError =
            RuleDiagnosticData(
                ruleId = "oversized-asset",
                severity = "error",
                targetAssetPath = asset1.path,
                asset = asset1,
                message = "Asset exceeds size limit",
            )

        val analysis =
            WorkspaceAnalysisData(
                assets = listOf(asset1, asset2),
                diagnostics = listOf(diagUnused, diagError),
            )

        holder.update(analysis, buildJsonObject {})

        // O(1) asset lookup
        assertEquals(asset1, holder.assetForPath(asset1.path))
        assertEquals(asset2, holder.assetForPath(asset2.path))
        assertNull(holder.assetForPath("/workspace/unknown.json"))

        // O(1) diagnostics lookup
        val asset1Diags = holder.diagnosticsFor(asset1.path)
        assertEquals(1, asset1Diags.size)
        assertEquals("oversized-asset", asset1Diags[0].ruleId)

        val asset2Diags = holder.diagnosticsFor(asset2.path)
        assertEquals(1, asset2Diags.size)
        assertEquals("no-unreferenced-assets", asset2Diags[0].ruleId)
    }

    @Test
    @DisplayName("AnimoriaAnalysisHolder indexes references by file and line for O(1) gutter lookups")
    fun holderIndexesReferences() {
        val holder = AnimoriaAnalysisHolder()
        val ref1 =
            AnimoriaAnalysisHolder.AssetReference(
                assetPath = "/workspace/assets/anim1.json",
                reference =
                    UsageReferenceData(
                        file = "/workspace/src/App.kt",
                        line = 42,
                        content = "AnimoriaAnimation(res = anim1)",
                        kind = "code",
                    ),
            )

        holder.updateReferences(1, listOf(ref1))

        assertEquals(1, holder.referencesInFile("/workspace/src/App.kt").size)
        val matchedRef = holder.referenceInFileAtLine("/workspace/src/App.kt", 42)
        assertNotNull(matchedRef)
        assertEquals("/workspace/assets/anim1.json", matchedRef?.assetPath)
        assertNull(holder.referenceInFileAtLine("/workspace/src/App.kt", 99))
    }

    @Test
    @DisplayName("Inspection highlights no-unreferenced-assets as LIKE_UNUSED_SYMBOL and errors as GENERIC_ERROR")
    fun inspectionHighlightMapping() {
        val inspection = AnimoriaGovernanceInspection()

        // Test highlightFor via reflection since it is private
        val method =
            AnimoriaGovernanceInspection::class.java
                .getDeclaredMethod(
                    "highlightFor",
                    RuleDiagnosticData::class.java,
                ).apply { isAccessible = true }

        val unusedDiag =
            RuleDiagnosticData(
                ruleId = "no-unreferenced-assets",
                severity = "warning",
                message = "Unused",
            )
        val errorDiag =
            RuleDiagnosticData(
                ruleId = "corrupt-file",
                severity = "error",
                message = "Corrupt",
            )
        val warningDiag =
            RuleDiagnosticData(
                ruleId = "no-duplicate-assets",
                severity = "warning",
                message = "Duplicate",
            )

        val unusedHighlight = method.invoke(inspection, unusedDiag) as ProblemHighlightType
        val errorHighlight = method.invoke(inspection, errorDiag) as ProblemHighlightType
        val warningHighlight = method.invoke(inspection, warningDiag) as ProblemHighlightType

        assertEquals(ProblemHighlightType.LIKE_UNUSED_SYMBOL, unusedHighlight)
        assertEquals(ProblemHighlightType.GENERIC_ERROR, errorHighlight)
        assertEquals(ProblemHighlightType.GENERIC_ERROR_OR_WARNING, warningHighlight)
    }

    @Test
    @DisplayName("Inspection provides safe LocalQuickFixes for unreferenced and duplicate assets")
    fun quickFixesInstantiation() {
        val cleanupFix = AnimoriaReviewCleanupQuickFix()
        assertEquals("Review Safe Cleanup in Animoria…", cleanupFix.name)
        assertEquals("Animoria Governance", cleanupFix.familyName)

        val duplicateFix = AnimoriaResolveDuplicatesQuickFix("/workspace/assets/dup.json")
        assertEquals("Resolve Duplicates in Animoria…", duplicateFix.name)
        assertEquals("Animoria Governance", duplicateFix.familyName)

        val galleryFix = AnimoriaShowInGalleryQuickFix("/workspace/assets/hero.json")
        assertEquals("Show in Animoria Gallery", galleryFix.name)
        assertEquals("Animoria Governance", galleryFix.familyName)
    }

    @Test
    @DisplayName("AnimoriaAssetTransferable supports Java File List and String DataFlavors")
    fun assetTransferableDataFlavors() {
        val asset =
            JetBrainsAsset(
                path = "/workspace/assets/logo.svg",
                name = "logo.svg",
                stem = "logo",
                relativePath = "assets/logo.svg",
                format = "svg",
            )

        val transferable = AnimoriaAssetTransferable(asset)

        assertTrue(transferable.isDataFlavorSupported(DataFlavor.javaFileListFlavor))
        assertTrue(transferable.isDataFlavorSupported(DataFlavor.stringFlavor))

        @Suppress("UNCHECKED_CAST")
        val files = transferable.getTransferData(DataFlavor.javaFileListFlavor) as List<File>
        assertEquals(1, files.size)
        assertEquals(File("/workspace/assets/logo.svg"), files[0])

        val str = transferable.getTransferData(DataFlavor.stringFlavor) as String
        assertEquals("assets/logo.svg", str)
    }
}
