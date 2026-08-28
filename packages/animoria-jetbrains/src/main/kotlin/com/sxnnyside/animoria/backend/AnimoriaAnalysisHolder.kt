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
class AnimoriaAnalysisHolder {
    @Volatile
    private var analysis: WorkspaceAnalysisData? = null

    /**
     * The raw canonical payload as received from the daemon, forwarded directly to the JCEF webview.
     */
    @Volatile
    private var canonical: JsonElement? = null

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

    /** Whether the cached reference set describes the analysis currently held. */
    fun referencesAreCurrent(): Boolean = analysis != null && referencesGeneration == (analysis?.generation ?: -1)

    fun updateReferences(
        generation: Int,
        references: List<AssetReference>,
    ) {
        referencesByFile = references.groupBy { it.reference.file }
        referencesGeneration = generation
    }

    /** The asset Core attributed to this path, or `null`. Never re-derived from the path. */
    fun assetForPath(assetPath: String): JetBrainsAsset? = analysis?.assets?.firstOrNull { it.path == assetPath }

    /** Diagnostics concerning one asset path, or empty when there are none or nothing is known. */
    fun diagnosticsFor(assetPath: String): List<RuleDiagnosticData> =
        analysis?.diagnostics?.filter { it.asset.path == assetPath } ?: emptyList()

    companion object {
        fun of(project: Project): AnimoriaAnalysisHolder = project.service()
    }
}
