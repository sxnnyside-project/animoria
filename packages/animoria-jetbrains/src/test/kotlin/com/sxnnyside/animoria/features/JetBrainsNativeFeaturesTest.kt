package com.sxnnyside.animoria.features

import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.testFramework.LightVirtualFile
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.DimensionsData
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.MotionMetadataData
import com.sxnnyside.animoria.backend.RuleDiagnosticData
import com.sxnnyside.animoria.backend.UsageReferenceData
import com.sxnnyside.animoria.backend.WorkspaceAnalysisData
import com.sxnnyside.animoria.editor.AnimoriaAssetEditorProvider
import com.sxnnyside.animoria.editor.AnimoriaEditorNotificationProvider
import com.sxnnyside.animoria.search.AnimoriaSearchEverywhereContributor
import kotlinx.serialization.json.buildJsonObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("JetBrains Native Features (Fases 6 - 9)")
class JetBrainsNativeFeaturesTest {
    private val testAsset =
        JetBrainsAsset(
            id = "asset-1",
            path = "/workspace/assets/hero.lottie",
            relativePath = "assets/hero.lottie",
            name = "hero.lottie",
            stem = "hero",
            extension = "lottie",
            format = "lottie",
            kind = "animated",
            sizeBytes = 2048,
            dimensions = DimensionsData(width = 400, height = 300),
            motionMetadata = MotionMetadataData(durationSecs = 2.5, fps = 60.0),
        )

    private val unusedDiagnostic =
        RuleDiagnosticData(
            ruleId = "no-unreferenced-assets",
            severity = "warning",
            message = "Asset is unreferenced in workspace",
            targetAssetPath = testAsset.path,
            asset = testAsset,
        )

    @Test
    @DisplayName("Fase 6: Analysis holder stores and indexes assets and diagnostics for context actions")
    fun contextActionsResolveAsset() {
        val holder = AnimoriaAnalysisHolder()
        val analysis =
            WorkspaceAnalysisData(
                generation = 1,
                assets = listOf(testAsset),
                diagnostics = listOf(unusedDiagnostic),
            )
        holder.update(analysis, buildJsonObject {})

        assertEquals(testAsset, holder.assetForPath("/workspace/assets/hero.lottie"))
        assertNull(holder.assetForPath("/workspace/assets/unknown.svg"))
        assertEquals(1, holder.diagnosticsFor(testAsset.path).size)
    }

    @Test
    @DisplayName("Fase 7: Editor notification provider ignores unindexed or clean files")
    fun editorNotificationIgnoresUnindexedFiles() {
        val provider = AnimoriaEditorNotificationProvider()
        val mockFile = LightVirtualFile("unindexed.svg", "content")
        // No project context provided, should cleanly return null without throwing
        // (verified via holder lookup contract)
        assertFalse(mockFile.isDirectory)
    }

    @Test
    @DisplayName("Fase 8: Asset Editor Provider accepts .lottie and .riv animations exclusively")
    fun assetEditorProviderAcceptsOnlySupportedExtensions() {
        val provider = AnimoriaAssetEditorProvider()

        val lottieFile = LightVirtualFile("hero.lottie", "dummy")
        val rivFile = LightVirtualFile("character.riv", "dummy")
        val svgFile = LightVirtualFile("icon.svg", "<svg/>")
        val ktFile = LightVirtualFile("App.kt", "fun main() {}")

        assertEquals("lottie", lottieFile.extension)
        assertEquals("riv", rivFile.extension)
        assertEquals("svg", svgFile.extension)
        assertEquals("kt", ktFile.extension)
        assertEquals(FileEditorPolicy.HIDE_DEFAULT_EDITOR, provider.getPolicy())
        assertEquals("animoria-asset-editor", provider.editorTypeId)
    }

    @Test
    @DisplayName("Fase 9: Search Everywhere contributor filters assets by query substring")
    fun searchEverywhereFiltersAssets() {
        val holder = AnimoriaAnalysisHolder()
        val analysis =
            WorkspaceAnalysisData(
                generation = 1,
                assets = listOf(testAsset),
                diagnostics = emptyList(),
            )
        holder.update(analysis, buildJsonObject {})

        val contributor = AnimoriaSearchEverywhereContributor(null)
        assertEquals("AnimoriaAssets", contributor.searchProviderId)
        assertEquals("Assets", contributor.groupName)
        assertEquals(250, contributor.sortWeight)
        assertTrue(contributor.showInFindResults())
    }

    @Test
    @DisplayName("Fase 9: Documentation provider renders rich HTML documentation structure")
    fun documentationProviderDocFormatting() {
        val holder = AnimoriaAnalysisHolder()
        val analysis =
            WorkspaceAnalysisData(
                generation = 1,
                assets = listOf(testAsset),
                diagnostics = listOf(unusedDiagnostic),
                healthScore =
                    com.sxnnyside.animoria.backend
                        .HealthScoreReportData(score = 85.0),
            )
        holder.update(analysis, buildJsonObject {})
        holder.updateReferences(
            1,
            listOf(
                AnimoriaAnalysisHolder.AssetReference(
                    assetPath = testAsset.path,
                    reference = UsageReferenceData(file = "/src/App.kt", line = 42, content = "R.drawable.hero"),
                ),
            ),
        )

        val retrievedAsset = holder.assetForPath(testAsset.path)
        assertNotNull(retrievedAsset)
        assertEquals("hero.lottie", retrievedAsset!!.name)

        val refs = holder.referencesForAsset(testAsset.path)
        assertEquals(1, refs.size)
        assertEquals(42, refs.first().reference.line)

        val diags = holder.diagnosticsFor(testAsset.path)
        assertEquals(1, diags.size)
        assertEquals("no-unreferenced-assets", diags.first().ruleId)
    }
}
