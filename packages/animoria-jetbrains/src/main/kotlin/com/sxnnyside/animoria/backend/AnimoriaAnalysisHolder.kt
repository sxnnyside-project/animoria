package com.sxnnyside.animoria.backend

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import kotlinx.serialization.json.JsonElement

/**
 * Project-level service providing thread-safe, synchronous access to the latest
 * canonical analysis received from the daemon.
 *
 * Used by IntelliJ extension points (such as `LocalInspectionTool`) that execute on
 * read actions during editor highlighting passes and cannot perform asynchronous subprocess I/O.
 */
@Service(Service.Level.PROJECT)
class AnimoriaAnalysisHolder(
    private val project: Project? = null,
) {
    @Volatile
    private var analysis: WorkspaceAnalysisData? = null

    /**
     * The raw canonical payload as received from the daemon, forwarded directly to the JCEF webview.
     */
    @Volatile
    private var canonical: JsonElement? = null

    /**
     * Pre-indexed map of assets keyed by canonical path for O(1) synchronous lookup.
     */
    @Volatile
    private var assetsByPath: Map<String, JetBrainsAsset> = emptyMap()

    /**
     * Pre-indexed map of diagnostics keyed by asset path for O(1) synchronous lookup.
     */
    @Volatile
    private var diagnosticsByAssetPath: Map<String, List<RuleDiagnosticData>> = emptyMap()

    /** The latest flattened analysis, or `null` when none has arrived yet. */
    fun current(): WorkspaceAnalysisData? = analysis

    /** The latest canonical multi-root payload, for the shared UI. */
    fun currentCanonical(): JsonElement? = canonical

    fun update(
        next: WorkspaceAnalysisData,
        canonicalPayload: JsonElement,
    ) {
        analysis = next
        canonical = canonicalPayload
        assetsByPath = next.assets.associateBy { it.path }
        diagnosticsByAssetPath = next.diagnostics.groupBy { it.asset.path }

        project?.let { proj ->
            com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                if (!proj.isDisposed) {
                    val statusBar =
                        com.intellij.openapi.wm.WindowManager
                            .getInstance()
                            .getStatusBar(proj)
                    (
                        statusBar?.getWidget(
                            com.sxnnyside.animoria.ui.AnimoriaStatusBarWidget.ID,
                        ) as? com.sxnnyside.animoria.ui.AnimoriaStatusBarWidget
                    )?.update()
                    com.intellij.ui.EditorNotifications
                        .getInstance(proj)
                        .updateAllNotifications()
                }
            }
        }
    }

    /**
     * Every usage reference in the workspace, keyed by the file containing it.
     *
     * Held so the editor hover can answer synchronously. A hover fires continuously
     * while the pointer moves; awaiting a subprocess per movement would stutter, and
     * the previous answer to that was to match asset stems against document text in
     * Kotlin — the client-side reimplementation the layer rule forbids, which its own
     * doc comment admitted was not authoritative. Fetched once per analysis generation
     * instead, and served from here.
     */
    @Volatile
    private var referencesByFile: Map<String, List<AssetReference>> = emptyMap()

    /**
     * Pre-indexed references keyed by (filePath -> (lineNumber -> AssetReference)) for O(1) gutter lookups.
     */
    @Volatile
    private var referencesByFileAndLine: Map<String, Map<Int, AssetReference>> = emptyMap()

    /** The generation `referencesByFile` describes, so a stale set is never served. */
    @Volatile
    private var referencesGeneration: Int = -1

    /** One reference, with the asset it points at. */
    data class AssetReference(
        val assetPath: String,
        val reference: UsageReferenceData,
    )

    /** References inside one source file, or empty when none are known yet. */
    fun referencesInFile(filePath: String): List<AssetReference> = referencesByFile[filePath].orEmpty()

    /** Synchronous O(1) lookup of asset reference at a specific 1-based line inside a file. */
    fun referenceInFileAtLine(
        filePath: String,
        line: Int,
    ): AssetReference? = referencesByFileAndLine[filePath]?.get(line)

    /** Synchronous lookup of all references pointing to a given asset path. */
    fun referencesForAsset(assetPath: String): List<AssetReference> = referencesByFile.values.flatten().filter { it.assetPath == assetPath }

    /** Whether the cached reference set describes the analysis currently held. */
    fun referencesAreCurrent(): Boolean = analysis != null && referencesGeneration == (analysis?.generation ?: -1)

    fun updateReferences(
        generation: Int,
        references: List<AssetReference>,
    ) {
        val groupedByFile = references.groupBy { it.reference.file }
        referencesByFile = groupedByFile
        referencesByFileAndLine =
            groupedByFile.mapValues { (_, refs) ->
                refs.associateBy { it.reference.line }
            }
        referencesGeneration = generation
    }

    /** The asset Core attributed to this path, or `null`. Never re-derived from the path. O(1) lookup. */
    fun assetForPath(assetPath: String): JetBrainsAsset? = assetsByPath[assetPath]

    /** Diagnostics concerning one asset path, or empty when there are none or nothing is known. O(1) lookup. */
    fun diagnosticsFor(assetPath: String): List<RuleDiagnosticData> = diagnosticsByAssetPath[assetPath].orEmpty()

    companion object {
        fun of(project: Project): AnimoriaAnalysisHolder = project.service()
    }
}
