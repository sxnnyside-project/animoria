import type { AnimoriaAsset } from '../../types/asset.js';

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
export interface DuplicateGroup {
  /** Content hash shared by every candidate — stable identity for this group across a single analysis run. */
  readonly id: string;
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
  /** The line content after substituting the canonical asset's name/stem. */
  readonly newText: string;
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
  /** The asset the developer chose to keep. Always a member of `group.candidates`. */
  readonly canonicalAsset: AnimoriaAsset;
  /** Every other candidate — these files will be deleted on execution. */
  readonly assetsToDelete: readonly AnimoriaAsset[];
  /** Every source line that will be rewritten to reference `canonicalAsset` instead of a deleted duplicate. */
  readonly referenceUpdates: readonly ReferenceUpdate[];
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
