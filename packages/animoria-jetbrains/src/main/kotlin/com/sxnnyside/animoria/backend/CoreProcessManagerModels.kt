package com.sxnnyside.animoria.backend

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// Wire-format DTOs CoreProcessManager decodes from the daemon's NDJSON events and requests.
@Serializable
data class CoreEvent(
    val event: String,
    val data: JsonElement,
    val requestId: String? = null,
)

@Serializable
data class ScanProgressData(
    val percent: Int,
    val message: String,
)

@Serializable
data class WatcherEventData(
    val type: String,
    val path: String,
    val asset: JetBrainsAsset? = null,
)

@Serializable
data class DimensionsData(
    val width: Int = 0,
    val height: Int = 0,
)

@Serializable
data class MotionMetadataData(
    @SerialName("frame_count") val frameCount: Int = 0,
    val fps: Double = 0.0,
    @SerialName("duration_secs") val durationSecs: Double = 0.0,
    @SerialName("is_animated") val isAnimated: Boolean = false,
    @SerialName("layers_count") val layersCount: Int? = null,
    @SerialName("assets_count") val assetsCount: Int? = null,
)

@Serializable
data class StaticMetadataData(
    val format: String = "",
    @SerialName("has_alpha") val hasAlpha: Boolean = false,
    @SerialName("color_space") val colorSpace: String? = null,
)

@Serializable
data class JetBrainsAsset(
    val id: String = "",
    val path: String = "",
    @SerialName("relative_path") val relativePath: String = "",
    val name: String = "",
    val stem: String = "",
    val extension: String = "",
    val format: String = "",
    val kind: String = "static",
    @SerialName("size_bytes") val sizeBytes: Long = 0,
    @SerialName("modified_timestamp") val modifiedTimestamp: Long = 0,
    @SerialName("is_valid") val isValid: Boolean = true,
    val dimensions: DimensionsData? = null,
    @SerialName("static_metadata") val staticMetadata: StaticMetadataData? = null,
    @SerialName("motion_metadata") val motionMetadata: MotionMetadataData? = null,
    val sha256: String? = null,
    val metadata: JsonElement? = null,
    val thumbnailPath: String? = null,
    val mtime: Double = modifiedTimestamp.toDouble(),
    val status: String = if (isValid) "parsed" else "error",
    val error: String? = if (isValid) null else "Invalid asset",
)

@Serializable
data class HealthScoreData(
    val score: Int,
    val label: String,
    val details: String? = null,
)

/**
 * Canonical analysis data classes matching Protocol v1 payload schemas.
 *
 * Deserialized with lenient JSON configuration to ignore unknown fields during core upgrades.
 */

@Serializable
data class EvidenceLocationData(
    val file: String,
    val line: Int? = null,
    val excerpt: String? = null,
)

@Serializable
data class DiagnosticEvidenceData(
    /** `reference` | `absence` | `content-hash` | `file-metadata` | `config`. */
    val kind: String = "reference",
    val summary: String = "",
    val locations: List<EvidenceLocationData> = emptyList(),
)

@Serializable
data class RemediationData(
    val summary: String = "Review asset",
)

@Serializable
data class ScanCoverageData(
    /** `complete` | `partial` | `none` | `unknown`. */
    val status: String = "complete",
    val scannedExtensions: List<String> = emptyList(),
    val unscannedExtensions: List<String> = emptyList(),
    val filesScanned: Int = 0,
    val referencesDetected: Int = 0,
)

@Serializable
data class RuleDiagnosticData(
    @SerialName("rule_id") val ruleId: String = "general",
    /** `error` | `warning`. Maps directly onto an IntelliJ inspection severity. */
    val severity: String = "warning",
    @SerialName("target_asset_path") val targetAssetPath: String = "",
    val asset: JetBrainsAsset = JetBrainsAsset(path = targetAssetPath),
    val message: String = "",
    val evidence: DiagnosticEvidenceData = DiagnosticEvidenceData(kind = "rule", summary = message),
    /** `certain` | `high` | `moderate` | `low`. */
    val confidence: String = "high",
    val remediation: RemediationData = RemediationData(summary = "Review asset"),
    val helpUri: String = "",
    val coverage: ScanCoverageData? = null,
    @SerialName("evidence_file") val evidenceFile: String? = null,
    @SerialName("evidence_line") val evidenceLine: Int? = null,
    @SerialName("evidence_excerpt") val evidenceExcerpt: String? = null,
)

@Serializable
data class SkippedRuleData(
    val ruleId: String,
    val severity: String,
    val reason: RuleSkipReasonData,
)

@Serializable
data class RuleSkipReasonData(
    val code: String,
    val message: String,
)

@Serializable
data class AnalysisReadinessData(
    val assetsIndexed: Boolean = true,
    val referencesResolved: Boolean = true,
    val duplicatesResolved: Boolean = true,
    val complete: Boolean = true,
)

@Serializable
data class CategoryScoreData(
    val category: String = "",
    val score: Int = 100,
    val weight: Double = 1.0,
    @SerialName("findings_count") val findingsCount: Int = 0,
)

@Serializable
data class HealthScoreReportData(
    val score: Double = 100.0,
    @SerialName("total_assets") val totalAssets: Int = 0,
    @SerialName("total_motion_assets") val totalMotionAssets: Int = 0,
    @SerialName("total_static_assets") val totalStaticAssets: Int = 0,
    @SerialName("total_findings") val totalFindings: Int = 0,
    @SerialName("category_scores") val categoryScores: List<CategoryScoreData> = emptyList(),
    val qualifications: List<HealthQualificationData> = emptyList(),
)

@Serializable
data class HealthQualificationData(
    val code: String,
    val message: String,
)

/**
 * The Health Score, or the reason there is none.
 */
@Serializable
data class HealthOutcomeData(
    val status: String = "computed",
    val report: HealthScoreReportData? = null,
    val reason: String? = null,
    val message: String? = null,
)

@Serializable
data class DuplicateCandidateData(
    val asset: JetBrainsAsset,
    val referenceCount: Int = 0,
)

@Serializable
data class DuplicateGroupData(
    val id: String = "",
    /** `content-hash` | `filename` — the basis on which membership was established. */
    val matchKind: String = "content-hash",
    val contentHash: String = "",
    val candidates: List<DuplicateCandidateData> = emptyList(),
    val sizeBytes: Long = 0,
    val potentialSavingsBytes: Long = 0,
)

// `assets`/`diagnostics` are the bare lists the daemon actually sends, never the attribution-wrapped
// {rootId, rootName, asset} shape — typing them as that previously threw MissingFieldException on every
// real payload, silently, so a live scan never reached AnimoriaAnalysisHolder.
@Serializable
data class MultiRootAnalysisData(
    val generatedAt: String = "",
    val generation: Int = 0,
    val readiness: AnalysisReadinessData = AnalysisReadinessData(),
    val roots: List<WorkspaceAnalysisData> = emptyList(),
    val assets: List<JetBrainsAsset> = emptyList(),
    val diagnostics: List<RuleDiagnosticData> = emptyList(),
    val duplicateGroups: List<DuplicateGroupData> = emptyList(),
) {
    /** The flattened view the tree, the inspections and the report editor read. */
    fun flatten(): WorkspaceAnalysisData =
        if (roots.isNotEmpty()) {
            WorkspaceAnalysisData(
                workspacePath = roots.firstOrNull()?.rootPath ?: "",
                rootPath = roots.firstOrNull()?.rootPath ?: "",
                rootId = roots.firstOrNull()?.rootId ?: "root",
                generatedAt = generatedAt,
                generation = generation,
                readiness = readiness,
                assets = roots.flatMap { it.assets },
                diagnostics = roots.flatMap { it.diagnostics },
                duplicateGroups = duplicateGroups,
                health = roots.firstOrNull()?.health ?: HealthOutcomeData(),
            )
        } else {
            WorkspaceAnalysisData(
                generatedAt = generatedAt,
                generation = generation,
                readiness = readiness,
                assets = assets,
                diagnostics = diagnostics,
                duplicateGroups = duplicateGroups,
            )
        }
}

/** The flattened workspace analysis the plugin's native surfaces consume. */
@Serializable
data class WorkspaceAnalysisData(
    @SerialName("root_id") val rootId: String = "root",
    @SerialName("root_path") val rootPath: String = "",
    val workspacePath: String = "",
    val generatedAt: String = "",
    val generation: Int = 0,
    val state: String = "ready",
    val readiness: AnalysisReadinessData = AnalysisReadinessData(),
    val assets: List<JetBrainsAsset> = emptyList(),
    val coverage: ScanCoverageData? = null,
    val diagnostics: List<RuleDiagnosticData> = emptyList(),
    val evaluatedRuleIds: List<String> = emptyList(),
    val skippedRules: List<SkippedRuleData> = emptyList(),
    val duplicateGroups: List<DuplicateGroupData> = emptyList(),
    @SerialName("health_score") val healthScore: HealthScoreReportData? = null,
    val health: HealthOutcomeData =
        HealthOutcomeData(
            status = if (healthScore != null) "computed" else "unavailable",
            report = healthScore,
        ),
)

@Serializable
data class ThumbnailResultData(
    val assetPath: String,
    val thumbnailPath: String? = null,
    val error: String? = null,
)

@Serializable
data class SnippetData(
    val label: String,
    val code: String,
    val imports: String? = null,
    val installHint: String? = null,
)

@Serializable
data class SnippetResultData(
    val results: List<SnippetData> = emptyList(),
    val error: String? = null,
)

@Serializable
data class CleanupCandidateData(
    val assetPath: String,
    val assetName: String,
    val sizeBytes: Long,
    val reasons: List<String> = emptyList(),
    /** Derived from the evidence behind the candidate. */
    val confidence: String,
    val referenceCount: Int,
)

@Serializable
data class CleanupProposalData(
    val candidates: List<CleanupCandidateData> = emptyList(),
    val totalSizeBytes: Long = 0,
    val affectedReferencesCount: Int = 0,
    val affectedFolders: List<String> = emptyList(),
    val generatedAt: String = "",
)

@Serializable
data class StaticAssetData(
    val path: String,
    val name: String,
    val stem: String,
    val format: String,
    val sizeBytes: Long,
)

@Serializable
data class CleanupSummaryData(
    val removedAssetPaths: List<String> = emptyList(),
    val bytesReclaimed: Long = 0,
    val healthScoreBefore: Int = 0,
    val remainingCandidates: Int = 0,
    val completedAt: String = "",
    val trashLocation: String? = null,
)

@Serializable
data class DuplicateResolutionResultData(
    val removedAssetPaths: List<String> = emptyList(),
    val trashLocation: String? = null,
    /** Session id for `restoreTrash` — how a resolution is undone. */
    val trashSessionId: String? = null,
    /** `applied` | `rejected` | `failed`. */
    val status: String = "applied",
    val error: String? = null,
)

// ── Duplicate resolution plan (S4) ────────────────────────────────────────────
//
// The plan a client previews *and* the plan execution consumes. Preview and
// execution reading from one shape is what makes "what you saw is what ran" a
// structural property rather than a convention two code paths have to honour.

@Serializable
data class PlannedAssetRemovalData(
    val path: String,
    val name: String = "",
    val sizeBytes: Long = 0,
)

@Serializable
data class ReferenceUpdateData(
    val file: String,
    val line: Int,
    /** The line as it stands today. */
    val oldText: String = "",
    /** The line after repointing. */
    val newText: String = "",
    /** The reference target being replaced. */
    val oldTarget: String = "",
    /** The target replacing it — a full path recomputed from the referencing file. */
    val newTarget: String = "",
)

@Serializable
data class UnrewritableReferenceData(
    val file: String,
    val line: Int,
    val text: String = "",
    /** Why Animoria will not rewrite this line. Never a guess — see Core's `RewriteRefusalReason`. */
    val reason: String = "",
    /** Plain-language explanation, safe to show a developer verbatim. */
    val explanation: String = "",
)

@Serializable
data class ResolutionPlanData(
    val canonicalAssetPath: String = "",
    val assetsToDelete: List<PlannedAssetRemovalData> = emptyList(),
    val referenceUpdates: List<ReferenceUpdateData> = emptyList(),
    val unrewritableReferences: List<UnrewritableReferenceData> = emptyList(),
    /**
     * `complete` — every reference will be repointed.
     * `partial` — some cannot be, and executing anyway leaves them pointing at
     * assets that have moved to trash. A client must show this before confirming.
     */
    val safety: String = "complete",
    val estimatedSavingsBytes: Long = 0,
)

@Serializable
data class ResolutionPlanResponseData(
    val plan: ResolutionPlanData? = null,
    val error: String? = null,
)

// ── Trash sessions (S2) ───────────────────────────────────────────────────────

@Serializable
data class TrashEntryData(
    val originalPath: String,
    val trashPath: String = "",
    val sizeBytes: Long = 0,
)

@Serializable
data class TrashSessionData(
    val sessionId: String,
    val movedAt: String = "",
    val entries: List<TrashEntryData> = emptyList(),
)

/**
 * One root's trash, as the daemon reports it.
 *
 * The daemon answers `listTrashSessions` with `{ roots: [{ rootId, sessions }] }`,
 * because a trash session lives under a root and restoring it needs that root's id.
 * This client used to decode the response as `{ sessions: [...] }` — a key the daemon
 * has never sent — so `sessions` was always empty and "Restore from Trash" reported
 * "Nothing in trash to restore" no matter how much was in it.
 */
@Serializable
data class TrashRootSessionsData(
    val rootId: String,
    val sessions: List<TrashSessionData> = emptyList(),
)

@Serializable
data class TrashSessionsData(
    val roots: List<TrashRootSessionsData> = emptyList(),
)

@Serializable
data class RestoreFailureData(
    val originalPath: String,
    /** `destination-occupied` | `trash-file-missing` | `move-failed`. */
    val reason: String = "",
)

@Serializable
data class RestoreResultData(
    val sessionId: String = "",
    val restoredPaths: List<String> = emptyList(),
    val failures: List<RestoreFailureData> = emptyList(),
    val error: String? = null,
)

@Serializable
data class GovernanceReportExportData(
    val content: String = "",
    val format: String = "markdown",
    val error: String? = null,
)

@Serializable
data class UsageReferenceData(
    val file: String,
    val line: Int,
    val content: String,
    /**
     * How the reference was established — `resolved-path`, `filename` or `code`.
     *
     * Carried because it is the strength of the evidence, and a surface that shows a
     * reference without it invites the reader to treat a filename guess and a resolved
     * path as the same claim.
     */
    val kind: String = "code",
)

/** One entry of the workspace-wide reference fetch. */
@Serializable
data class WorkspaceReferenceData(
    val rootId: String = "",
    val assetPath: String = "",
    val reference: UsageReferenceData,
)

/** The daemon's answer to `getUsageReferences` with no parameters. */
@Serializable
data class WorkspaceReferencesResultData(
    val complete: Boolean = false,
    val generation: Int = 0,
    val references: List<WorkspaceReferenceData> = emptyList(),
)

@Serializable
data class UsageReferencesResultData(
    val assetPath: String = "",
    val references: List<UsageReferenceData> = emptyList(),
    val durationMs: Double = 0.0,
    val error: String? = null,
)
