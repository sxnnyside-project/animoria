/**
 * `@animoria/core/contracts` — the browser-safe semantic surface.
 *
 * ## Why this entry point exists
 * `@animoria/core`'s main entry is a Node package: it pulls in `fast-glob`,
 * `node:fs`, the parsers, the thumbnail renderer and the scanner. `@animoria/ui`
 * needs none of that — it needs the *shapes* Core produces and the handful of pure
 * functions that interpret them.
 *
 * Importing the main entry from the UI bundled a filesystem scanner into a webview:
 * 292 kB, most of it `micromatch` and `picomatch` reached through the asset scanner,
 * plus a set of `node:` builtins the bundler had to stub because a browser cannot
 * provide them. A UI bundle that contains a directory walker is not merely large; it
 * is evidence that the layer boundary is not real.
 *
 * ## The rule for what may be exported here
 * **Types, and pure functions over them.** Nothing in this file's transitive imports
 * may touch `node:*`, the filesystem, or a network. `contracts-purity.test.ts`
 * enforces that by walking the import graph, so a future addition that drags in the
 * scanner fails at build time rather than at bundle time.
 *
 * Functions that *decide* things — `buildCleanupCandidates`, `buildResolutionPlan`,
 * `executeCleanupPlan` — are deliberately absent even where they are pure, because
 * they are the host's job to call. The UI receives their results.
 */

// ── Assets and references ─────────────────────────────────────────────────────
export type {
  AnimatedFormat,
  AnimoriaAsset,
  UsageReference,
  UsageReferenceKind,
} from './types/asset.js';
export type { AnimoriaMetadata } from './types/metadata.js';
export type { AnimoriaStaticAsset } from './types/static-asset.js';

// ── Coverage ──────────────────────────────────────────────────────────────────
export type { CoverageStatus, ScanCoverage } from './types/scan-coverage.js';

// ── Findings ──────────────────────────────────────────────────────────────────
export type {
  Confidence,
  DiagnosticEvidence,
  EvidenceKind,
  EvidenceLocation,
  Remediation,
  RuleSeverity,
} from './governance/rules/types.js';
export type {
  RuleConfigError,
  RuleDiagnostic,
  SkippedRule,
} from './governance/rules-engine.js';

// ── Health ────────────────────────────────────────────────────────────────────
export type {
  HealthScoreCategoryBreakdown,
  HealthScoreOutcome,
  HealthScoreQualification,
  HealthScoreRecommendation,
  HealthScoreReport,
} from './governance/health-score.js';
export type { HealthState } from './governance/health/health-state.js';
/** Core's own banding. Re-exported so no client invents a second one. */
export { describeHealthState } from './governance/health/health-state.js';

// ── Duplicates ────────────────────────────────────────────────────────────────
export type {
  DuplicateCandidate,
  DuplicateGroup,
  DuplicateMatchKind,
  PlanValidationIssue,
  ReferenceUpdate,
  ResolutionPlan,
  ResolutionSummary,
} from './governance/duplicates/types.js';
export type {
  RewriteRefusalReason,
  UnrewritableReference,
} from './governance/duplicates/reference-rewrite.js';

// ── Badges ────────────────────────────────────────────────────────────────────
export type { AssetBadge, AssetBadgeKind } from './governance/badges/types.js';

// ── Analysis ──────────────────────────────────────────────────────────────────
export type {
  AnalysisFailure,
  AnalysisFreshness,
  AnalysisReadiness,
  WorkspaceAnalysis,
} from './analysis/workspace-analysis.js';
export type {
  AnalysisLifecycle,
  AnalysisLifecycleState,
} from './analysis/analysis-lifecycle.js';
/** Pure derivation over an analysis. The one definition of the six states. */
export { deriveAnalysisLifecycle, isEmptyWorkspace } from './analysis/analysis-lifecycle.js';

// ── Cleanup ───────────────────────────────────────────────────────────────────
export type {
  CleanupCandidate,
  CleanupProposal,
  CleanupReason,
} from './analysis/cleanup-candidates.js';
export type {
  CleanupBlockReason,
  CleanupEligibility,
  CleanupExecutionResult,
  CleanupPlan,
  CleanupPlanEntry,
  CleanupPlanSafety,
  CleanupRefusal,
  ReviewableCleanupCandidate,
  ReviewableCleanupProposal,
} from './cleanup/cleanup-plan.js';
export type {
  RestoreFailure,
  RestoreResult,
  SessionManifest,
  TrashManifestEntry,
} from './cleanup/trash.js';

// ── Workspace identity and multi-root ─────────────────────────────────────────
export type {
  WorkspaceIdentity,
  WorkspaceRoot,
} from './workspace/workspace-identity.js';
export type {
  AggregateHealth,
  AttributedAsset,
  AttributedDiagnostic,
  MultiRootAnalysis,
  RootAnalysis,
} from './workspace/multi-root-analysis.js';

// ── Daemon protocol ───────────────────────────────────────────────────────────
// Types and the two pure predicates only. `DaemonServer` is deliberately absent:
// it owns indexers and touches the filesystem, and a UI able to construct one
// would be a UI that can serve itself.
export type {
  DaemonCapabilities,
  DaemonError,
  DaemonErrorCode,
  DaemonEvent,
  DaemonEventName,
  DaemonMethod,
  DaemonRequest,
  DaemonResponse,
  HelloResult,
  PingResult,
} from './daemon/protocol.js';
export {
  MIN_SUPPORTED_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
  checkProtocolCompatibility,
} from './daemon/protocol.js';

// ── Terminology ───────────────────────────────────────────────────────────────
export type { TerminologyEntry } from './terminology/canon.js';
export {
  BANNED_TERMS,
  CLEANUP_REASON_LABELS,
  CONFIDENCE_LABELS,
  COVERAGE_LABELS,
  LIFECYCLE_LABELS,
  TERMINOLOGY_CANON,
  entryForBannedTerm,
} from './terminology/canon.js';
