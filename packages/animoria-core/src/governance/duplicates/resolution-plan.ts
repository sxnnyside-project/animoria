import { readFile } from 'node:fs/promises';
import type { AnimoriaAsset, UsageReference } from '../../types/asset.js';
import { UsageScanner } from '../../usage/usage-scanner.js';
import { planLineRewrite } from './reference-rewrite.js';
import type { UnrewritableReference } from './reference-rewrite.js';
import type { DuplicateGroup, ReferenceUpdate, ResolutionPlan } from './types.js';

/** Options for {@link buildResolutionPlan}. */
export interface BuildResolutionPlanConfig {
  readonly workspacePath: string;
  readonly group: DuplicateGroup;
  /** The asset the developer has chosen to keep — must be a member of `group.candidates`. */
  readonly canonicalAsset: AnimoriaAsset;
  /**
   * The root the canonical asset lives in. Carried onto the plan so a client never
   * re-derives root attribution from a path — see `ResolutionPlan.root`.
   */
  readonly root?: { readonly id: string; readonly name: string } | null;
  /** Resolves the usage-search scope for a given asset — mirrors `GovernanceConfig.scopeResolver`. Defaults to the whole workspace. */
  readonly scopeResolver?: (asset: AnimoriaAsset) => string;
}

/**
 * Builds a complete, executable {@link ResolutionPlan} for a chosen
 * canonical asset within a duplicate group.
 *
 * ## What this function does and does not decide
 * The *group* and the *canonical choice* are both given, not derived —
 * this function's only job is figuring out the mechanical consequences
 * of that choice: which files disappear, and which source lines need
 * their reference rewritten. It does not re-evaluate whether the assets
 * are really duplicates (that was `duplicate-group-detector.js`'s job,
 * already done) and it does not recommend a canonical asset (that is
 * `canonical-suggestion.js`'s, entirely optional, job — a UI is free to
 * call this with any candidate the developer actually picked).
 *
 * ## Why this never mutates anything
 * Building a plan only *reads* — it runs `UsageScanner` against every
 * non-canonical candidate to find every line that references it. No
 * file is written, moved, or deleted here. This is what makes it safe
 * to call speculatively (e.g. once per candidate, to power a live
 * "here's what would happen if you kept this one instead" preview)
 * without any cleanup or rollback concern — there is nothing to roll
 * back from a function that only reads.
 *
 * @param config - See {@link BuildResolutionPlanConfig}.
 * @returns A plan ready for {@link "./resolution-plan-validator.js" |
 *   validateResolutionPlan} and, once confirmed, execution by the
 *   consuming IDE integration.
 */
export async function buildResolutionPlan(
  config: BuildResolutionPlanConfig
): Promise<ResolutionPlan> {
  const { workspacePath, group, canonicalAsset, scopeResolver, root = null } = config;

  const assetsToDelete = group.candidates
    .map((c) => c.asset)
    .filter((asset) => asset.path !== canonicalAsset.path);

  const outcomes = await Promise.all(
    assetsToDelete.map((duplicate) =>
      buildReferenceUpdatesForAsset(workspacePath, duplicate, canonicalAsset, scopeResolver)
    )
  );

  const referenceUpdates = outcomes.flatMap((o) => o.updates);
  const unrewritableReferences = outcomes.flatMap((o) => o.unrewritable);
  const estimatedSavingsBytes = assetsToDelete.reduce((sum, a) => sum + a.sizeBytes, 0);

  return {
    group,
    root,
    canonicalAsset,
    assetsToDelete,
    referenceUpdates,
    unrewritableReferences,
    safety: unrewritableReferences.length === 0 ? 'complete' : 'partial',
    estimatedSavingsBytes,
  };
}

interface AssetRewriteOutcome {
  readonly updates: ReferenceUpdate[];
  readonly unrewritable: UnrewritableReference[];
}

async function buildReferenceUpdatesForAsset(
  workspacePath: string,
  duplicate: AnimoriaAsset,
  canonicalAsset: AnimoriaAsset,
  scopeResolver: ((asset: AnimoriaAsset) => string) | undefined
): Promise<AssetRewriteOutcome> {
  const scanner = new UsageScanner({
    workspacePath,
    asset: duplicate,
    strategy: 'pattern',
    scopePath: scopeResolver?.(duplicate) ?? workspacePath,
  });

  const { references } = await scanner.search();
  return buildUpdatesFromRawLines(references, workspacePath, duplicate, canonicalAsset);
}

/**
 * Re-reads each referenced file's exact (untrimmed) line before
 * substituting, rather than trusting `UsageReference.content` — which
 * `UsageScanner` deliberately trims for display purposes. Substituting
 * within the raw line means the edit only ever touches the matched
 * asset name/stem, leaving original indentation and surrounding code
 * untouched; substituting within the trimmed line would silently strip
 * that indentation when the edit is applied. Files are read at most
 * once each, regardless of how many references they contain.
 */
async function buildUpdatesFromRawLines(
  references: readonly UsageReference[],
  workspacePath: string,
  duplicate: AnimoriaAsset,
  canonicalAsset: AnimoriaAsset
): Promise<AssetRewriteOutcome> {
  const rawLinesByFile = new Map<string, string[]>();
  const updates: ReferenceUpdate[] = [];
  const unrewritable: UnrewritableReference[] = [];

  for (const reference of references) {
    let lines = rawLinesByFile.get(reference.file);
    if (!lines) {
      lines = (await readFile(reference.file, 'utf-8')).split('\n');
      rawLinesByFile.set(reference.file, lines);
    }

    const rawLine = lines[reference.line - 1];
    if (rawLine === undefined) continue;

    const outcome = planLineRewrite({
      line: rawLine,
      lineNumber: reference.line,
      sourceFile: reference.file,
      workspacePath,
      duplicate,
      canonical: canonicalAsset,
    });

    if (outcome.kind === 'rewrite') {
      updates.push({
        file: outcome.rewrite.file,
        line: outcome.rewrite.line,
        oldText: outcome.rewrite.oldText,
        newText: outcome.rewrite.newText,
        oldTarget: outcome.rewrite.oldTarget,
        newTarget: outcome.rewrite.newTarget,
      });
    } else if (outcome.kind === 'refused') {
      unrewritable.push(outcome.refusal);
    }
    // `already-valid` needs no entry in either list: the line survives the
    // resolution unchanged and correct, so it is neither work nor a warning.
  }

  return { updates, unrewritable };
}
