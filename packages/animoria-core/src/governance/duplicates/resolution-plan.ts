import { readFile } from 'node:fs/promises';
import type { AnimoriaAsset, UsageReference } from '../../types/asset.js';
import { UsageScanner } from '../../usage/usage-scanner.js';
import type { DuplicateGroup, ReferenceUpdate, ResolutionPlan } from './types.js';

/** Options for {@link buildResolutionPlan}. */
export interface BuildResolutionPlanConfig {
  readonly workspacePath: string;
  readonly group: DuplicateGroup;
  /** The asset the developer has chosen to keep — must be a member of `group.candidates`. */
  readonly canonicalAsset: AnimoriaAsset;
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
  const { workspacePath, group, canonicalAsset, scopeResolver } = config;

  const assetsToDelete = group.candidates
    .map((c) => c.asset)
    .filter((asset) => asset.path !== canonicalAsset.path);

  const referenceUpdateLists = await Promise.all(
    assetsToDelete.map((duplicate) =>
      buildReferenceUpdatesForAsset(workspacePath, duplicate, canonicalAsset, scopeResolver)
    )
  );

  const referenceUpdates = referenceUpdateLists.flat();
  const estimatedSavingsBytes = assetsToDelete.reduce((sum, a) => sum + a.sizeBytes, 0);

  return { group, canonicalAsset, assetsToDelete, referenceUpdates, estimatedSavingsBytes };
}

async function buildReferenceUpdatesForAsset(
  workspacePath: string,
  duplicate: AnimoriaAsset,
  canonicalAsset: AnimoriaAsset,
  scopeResolver: ((asset: AnimoriaAsset) => string) | undefined
): Promise<ReferenceUpdate[]> {
  const scanner = new UsageScanner({
    workspacePath,
    asset: duplicate,
    strategy: 'pattern',
    scopePath: scopeResolver?.(duplicate) ?? workspacePath,
  });

  const { references } = await scanner.search();
  return buildUpdatesFromRawLines(references, duplicate, canonicalAsset);
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
  duplicate: AnimoriaAsset,
  canonicalAsset: AnimoriaAsset
): Promise<ReferenceUpdate[]> {
  const rawLinesByFile = new Map<string, string[]>();
  const updates: ReferenceUpdate[] = [];

  for (const reference of references) {
    let lines = rawLinesByFile.get(reference.file);
    if (!lines) {
      lines = (await readFile(reference.file, 'utf-8')).split('\n');
      rawLinesByFile.set(reference.file, lines);
    }

    const rawLine = lines[reference.line - 1];
    if (rawLine === undefined) continue;

    const newText = substituteAssetReference(rawLine, duplicate, canonicalAsset);
    if (newText === null) continue;

    updates.push({ file: reference.file, line: reference.line, oldText: rawLine, newText });
  }

  return updates;
}

/**
 * Rewrites a single line of source code to reference the canonical
 * asset instead of the duplicate, by substituting the duplicate's
 * filename and stem for the canonical asset's.
 *
 * Returns `null` when neither the duplicate's filename nor its stem
 * actually appears in the line — meaning the line matched one of
 * `UsageScanner`'s broader heuristic patterns (see
 * `usage/reference-patterns.js`) without containing literal text this
 * simple substitution can safely rewrite. Skipping those lines rather
 * than guessing is deliberate: a wrong rewrite of a reference line is
 * far worse than leaving one line for the developer to fix by hand,
 * which is why every line this *does* rewrite is still shown in the
 * plan preview before anything executes.
 */
function substituteAssetReference(
  line: string,
  duplicate: AnimoriaAsset,
  canonical: AnimoriaAsset
): string | null {
  if (line.includes(duplicate.name)) {
    return line.split(duplicate.name).join(canonical.name);
  }
  if (line.includes(duplicate.stem)) {
    return line.split(duplicate.stem).join(canonical.stem);
  }
  return null;
}
