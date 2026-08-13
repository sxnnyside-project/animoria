package com.sxnnyside.animoria.backend

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import kotlinx.serialization.json.JsonElement

/**
 * The most recent canonical analysis, readable synchronously.
 *
 * ## Why this exists
 * The daemon is asynchronous and every governance fact arrives over NDJSON, but
 * some JetBrains extension points are not allowed to wait. A `LocalInspectionTool`
 * runs inside a read action on a highlighting pass: it must answer "does this file
 * have problems?" immediately, and it cannot block on a subprocess round-trip
 * without freezing the editor.
 *
 * The alternative — having the inspection compute findings itself — is the exact
 * thing this migration exists to prevent, so instead the analysis is cached here
 * as it arrives and read verbatim. Nothing in this class derives, scores, or
 * classifies anything; it is a mailbox, not a model.
 *
 * `null` means no analysis has arrived yet, which is deliberately distinct from an
 * analysis containing no diagnostics: the first means "not known yet", the second
 * means "checked, and clean".
 */
@Service(Service.Level.PROJECT)
class AnimoriaAnalysisHolder {
    @Volatile
    private var analysis: WorkspaceAnalysisData? = null

    /**
     * The canonical payload, exactly as the daemon sent it.
     *
     * Kept alongside the flattened view because the shared UI renders
     * `MultiRootAnalysis` and the flat projection is lossy — no `roots`, no
     * `lifecycle`, no `freshness`, no per-root `referenceCounts`. The JCEF bridge used
     * to re-encode the flat model and post *that* as `analysis`, so even a correct
     * decode would have handed the UI a shape its view model cannot build from.
     * Forwarding the original bytes is the only version of this that cannot drift.
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
