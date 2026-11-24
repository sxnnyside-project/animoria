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

    /**
     * Retrieves the latest flattened analysis snapshot, or `null` when no analysis has arrived yet.
     *
     * @return The cached [WorkspaceAnalysisData], or `null` if the initial daemon scan is pending.
     */
    fun current(): WorkspaceAnalysisData? = analysis

    /**
     * Retrieves the latest canonical multi-root payload as JSON, formatted for `@animoria/ui` consumption.
     *
     * @return The raw [JsonElement] payload matching the core contracts, or `null` if unavailable.
     */
    fun currentCanonical(): JsonElement? = canonical

    /**
     * Updates the held analysis snapshot, pre-indexes assets and diagnostics for O(1) lookups,
     * and notifies UI listeners (status bar widget, editor notification banners) on the EDT.
     *
     * @param next The parsed workspace analysis data model.
     * @param canonicalPayload The raw JSON payload for webview transport.
     */
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

    /**
     * Retrieves all cached asset usage references located inside the specified source file.
     *
     * @param filePath The absolute path of the source code file.
     * @return List of [AssetReference] occurrences within the file, or an empty list if none exist.
     */
    fun referencesInFile(filePath: String): List<AssetReference> = referencesByFile[filePath].orEmpty()

    /**
     * Performs a synchronous O(1) lookup of an asset reference located at a specific 1-based line.
     *
     * @param filePath The absolute path of the source code file.
     * @param line The 1-based line number inside the file.
     * @return The [AssetReference] present at the line, or `null` if no reference is indexed.
     */
    fun referenceInFileAtLine(
        filePath: String,
        line: Int,
    ): AssetReference? = referencesByFileAndLine[filePath]?.get(line)

    /**
     * Synchronously resolves all references pointing to the given visual asset path across the project.
     *
     * @param assetPath The canonical absolute or relative path of the asset.
     * @return List of matching [AssetReference] instances across all scanned source files.
     */
    fun referencesForAsset(assetPath: String): List<AssetReference> = referencesByFile.values.flatten().filter { it.assetPath == assetPath }

    /**
     * Verifies whether the cached usage reference set matches the generation of the active analysis snapshot.
     *
     * @return `true` if references are synchronized with the active analysis; `false` otherwise.
     */
    fun referencesAreCurrent(): Boolean = analysis != null && referencesGeneration == (analysis?.generation ?: -1)

    /**
     * Atomically replaces the indexed usage references with a new generation payload.
     *
     * @param generation The monotonically increasing scan sequence identifier.
     * @param references The complete list of usage references extracted from the codebase.
     */
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

    /**
     * Synchronously looks up the asset record attributed to the specified path in O(1) time.
     *
     * @param assetPath The exact canonical path of the asset.
     * @return The corresponding [JetBrainsAsset], or `null` if unindexed.
     */
    fun assetForPath(assetPath: String): JetBrainsAsset? = assetsByPath[assetPath]

    /**
     * Synchronously looks up all governance diagnostics associated with the specified asset path in O(1) time.
     *
     * @param assetPath The exact canonical path of the asset.
     * @return List of [RuleDiagnosticData] findings, or an empty list if clean or unindexed.
     */
    fun diagnosticsFor(assetPath: String): List<RuleDiagnosticData> = diagnosticsByAssetPath[assetPath].orEmpty()

    companion object {
        /**
         * Resolves the project-level [AnimoriaAnalysisHolder] service instance.
         *
         * @param project The active project.
         * @return The bound [AnimoriaAnalysisHolder] instance.
         */
        fun of(project: Project): AnimoriaAnalysisHolder = project.service()
    }
}
