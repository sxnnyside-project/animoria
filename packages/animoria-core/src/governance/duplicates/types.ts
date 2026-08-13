import type { AnimoriaAsset } from '../../types/asset.js';
import type { UnrewritableReference } from './reference-rewrite.js';

export type {
  ReferenceRewrite,
  RewriteRefusalReason,
  UnrewritableReference,
} from './reference-rewrite.js';

/**
 * Contracts for the Assist Duplicate Resolution domain.
 *
 * ## Why a collection model, not a pair
 * Content-hash duplicate groups are not guaranteed to have exactly two
 * members — a copy-pasted asset can spread to three, five, or twenty
 * locations across a large monorepo. Every type here is expressed as a
 * list of *candidates*, never a fixed `{ a, b }` pair, so the comparison
 * UI, the plan builder, and the workspace-edit generator all
 * naturally scale from 2 to N without a redesign. See
 * `duplicate-group-detector.js` for how a group is discovered and
 * `resolution-plan.js` for how one is turned into an executable plan.
 *
 * ## Where this fits
 * This module is pure data — no filesystem access, no VS Code API. The
 * workflow's actual steps live in sibling modules, each independently
 * testable:
 * - Discovery: `duplicate-group-detector.js`
 * - Default suggestion: `canonical-suggestion.js`
 * - Plan generation: `resolution-plan.js`
 * - Pre-execution safety check: `resolution-plan-validator.js`
 * - Post-execution reporting: `resolution-summary.js`
 *
 * Nothing here decides *how* a plan gets executed — building a real
 * `vscode.WorkspaceEdit` from a {@link ResolutionPlan} is IDE-specific
 * glue that belongs to the consuming extension, not this package (see
 * the repository's "zero IDE dependencies" rule for `@animoria/core`).
 */

/**
 * One asset competing to be the canonical copy within a
 * {@link DuplicateGroup}.
 */
export interface DuplicateCandidate {
  readonly asset: AnimoriaAsset;
  /** Source-code reference count for this asset, as already known by the caller (e.g. `WorkspaceIndexSnapshot.referenceCounts`) — never recomputed here. */
  readonly referenceCount: number;
}

/**
 * A set of assets whose file contents are byte-identical.
 *
 * Every candidate in a group is interchangeable from a *content*
 * perspective — the only meaningful differences between them are
 * incidental: where they live, what they're named, and how much of the
 * codebase already points at each one. Those incidental differences are
 * exactly what a developer needs surfaced to decide which copy should
 * survive; see `canonical-suggestion.js` for the default this data
 * supports and the comparison UI for how it's presented.
 */
/**
 * What made a set of assets "the same".
 *
 * Three distinct relations are easy to conflate and must not be:
 * - **`content-hash`** — the files are byte-identical. Certain, and the only basis
 *   on which one copy can be deleted in favour of another.
 * - **`filename`** — the files share a name. A *naming* collision that confuses
 *   developers and searches; it says nothing about the bytes, and two files named
 *   `logo.json` may be completely different images.
 *
 * They are reported by different rules (`no-duplicate-content` and
 * `no-duplicate-names`) precisely because acting on them differs: one is safe to
 * deduplicate, the other is safe only to rename.
 */
export type DuplicateMatchKind = 'content-hash' | 'filename';

export interface DuplicateGroup {
  /** Content hash shared by every candidate — stable identity for this group across a single analysis run. */
  readonly id: string;
  /**
   * How membership was established. Present so a consumer never has to infer the
   * basis from which field happens to be populated — see {@link DuplicateMatchKind}
   * for why the distinction is load-bearing.
   */
  readonly matchKind: DuplicateMatchKind;
  /** The shared content hash. Identical to {@link id} for content-hash groups; named separately so the basis is explicit rather than implied by a field being reused as an identifier. */
  readonly contentHash: string;
  /** Every asset sharing this content hash, in deterministic order (highest reference count first, then shortest path, then alphabetical). */
  readonly candidates: readonly DuplicateCandidate[];
  /** Byte size shared by every candidate (content-identical assets are necessarily the same size). */
  readonly sizeBytes: number;
  /** Storage recovered if all but one candidate is deleted: `(candidates.length - 1) * sizeBytes`. */
  readonly potentialSavingsBytes: number;
}

/**
 * One line of source code that needs to change so a reference to a
 * duplicate asset points at the canonical one instead.
 *
 * Deliberately line-oriented and string-based rather than AST-aware:
 * Animoria's usage detection (`UsageScanner`) already operates at the
 * line level (see `UsageReference`), and a targeted string replacement
 * of the old asset's name/stem for the new one's, confined to the exact
 * line a reference was found on, is precise enough for the import/path
 * literals this workflow deals with without taking on a per-language
 * parser dependency. See `resolution-plan.js` for how this is derived
 * and `resolution-plan-validator.js` for how it is re-verified before
 * execution.
 */
export interface ReferenceUpdate {
  readonly file: string;
  readonly line: number;
  /** The exact current line content this update expects to find and replace. */
  readonly oldText: string;
  /** The line content after repointing its reference target at the canonical asset. */
  readonly newText: string;
  /** The reference target as it is spelled in the source today. */
  readonly oldTarget: string;
  /** The target that replaces it — a complete path recomputed from the referencing file. */
  readonly newTarget: string;
}

/**
 * The complete, executable description of one duplicate-resolution
 * decision — which asset to keep, which files to delete, and which
 * source lines to rewrite.
 *
 * A `ResolutionPlan` is inert data: producing one
 * ({@link "./resolution-plan.js" | buildResolutionPlan}) never touches
 * the filesystem beyond reading it, and nothing about *executing* the
 * plan lives on this type. That separation is what lets the plan be
 * previewed, diffed, and re-validated as many times as needed before a
 * developer commits to it — building it is cheap and side-effect-free,
 * so there is no cost to generating one just to show a preview and
 * discarding it if the developer picks a different canonical asset.
 */
export interface ResolutionPlan {
  readonly group: DuplicateGroup;
  /**
   * The root the canonical asset lives in, when the caller supplied one.
   *
   * A duplicate group may span roots — two byte-identical files in different
   * projects — so "which root am I keeping the copy in?" is a question the plan must
   * answer rather than one a client re-derives from a path. `null` for a caller with
   * no workspace context (the CLI's single-root path).
   */
  readonly root: { readonly id: string; readonly name: string } | null;
  /** The asset the developer chose to keep. Always a member of `group.candidates`. */
  readonly canonicalAsset: AnimoriaAsset;
  /** Every other candidate — these files move to Core trash on execution, never a permanent delete. */
  readonly assetsToDelete: readonly AnimoriaAsset[];
  /** Every source line that will be rewritten to reference `canonicalAsset` instead of a removed duplicate. */
  readonly referenceUpdates: readonly ReferenceUpdate[];
  /**
   * Every reference that points at a removed duplicate but which Animoria refuses
   * to rewrite mechanically, each with the reason.
   *
   * This list existing — and being non-empty — is a feature, not a shortfall. A
   * reference Animoria cannot repoint with certainty is one a developer must
   * handle, and saying so plainly is the only honest option: the alternative is a
   * plausible-looking edit derived from a string coincidence. See
   * {@link ResolutionPlan.safety} for what a non-empty list means for execution.
   */
  readonly unrewritableReferences: readonly UnrewritableReference[];
  /**
   * Whether executing this plan leaves the workspace fully repointed.
   *
   * `complete` — every reference to every removed asset will be rewritten.
   * `partial` — some references cannot be rewritten mechanically; executing the
   * plan will leave them pointing at files that have moved to trash, so the
   * developer must fix them by hand. A client must surface this distinction
   * before asking for confirmation.
   */
  readonly safety: 'complete' | 'partial';
  /** Bytes recovered by this specific plan (`assetsToDelete` summed). */
  readonly estimatedSavingsBytes: number;
}

/** One problem found while re-validating a {@link ResolutionPlan} immediately before execution. */
export interface PlanValidationIssue {
  readonly kind: 'asset-missing' | 'asset-changed' | 'reference-changed' | 'reference-missing';
  readonly message: string;
  readonly path: string;
}

/**
 * The result of re-checking a plan's assumptions against the current
 * filesystem state, immediately before execution.
 *
 * A plan can go stale between the moment it's built (and shown to the
 * developer for review) and the moment they click confirm — another
 * process could have edited a referencing file, or the duplicate could
 * already have been deleted by something else. Executing a stale plan
 * anyway risks corrupting a file the developer never agreed to change.
 * `valid: false` means the workflow must abort atomically and let the
 * developer re-run analysis — see `resolution-plan-validator.js` for
 * exactly what is re-checked.
 */
export type PlanValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: readonly PlanValidationIssue[] };

/**
 * The developer-facing report shown after a plan has been executed
 * successfully — the workflow's closing statement, not just its
 * mechanical result.
 *
 * Reporting *impact* (recovered storage, updated references, and the
 * Health Score delta) rather than only "done" is what turns file
 * deletion into a governance action the developer can trust enough to
 * repeat, rather than a destructive operation they have to double-guess.
 */
export interface ResolutionSummary {
  readonly removedAssetCount: number;
  readonly updatedReferenceCount: number;
  readonly recoveredBytes: number;
  /** Health Score immediately before this resolution was applied, or `null` if unavailable. */
  readonly healthScoreBefore: number | null;
  /** Health Score immediately after, once the index re-converged, or `null` if unavailable. */
  readonly healthScoreAfter: number | null;
  /** `healthScoreAfter - healthScoreBefore`, or `null` if either score is unavailable. */
  readonly healthScoreDelta: number | null;
  /** Diagnostics remaining that concern the canonical asset kept by this resolution, if any. */
  readonly remainingDiagnosticCount: number;
}
