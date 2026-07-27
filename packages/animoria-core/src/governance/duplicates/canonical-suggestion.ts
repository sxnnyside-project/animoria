import type { AnimoriaAsset } from '../../types/asset.js';
import type { DuplicateGroup } from './types.js';

/**
 * Suggests which candidate in a {@link DuplicateGroup} a developer
 * should probably keep — a *default*, never a decision.
 *
 * ## Why this exists, and why it never deletes anything
 * "Explain before asking" and "never surprise the developer" mean the
 * UI should not present a duplicate group as a blank choice — a
 * pre-selected, well-reasoned default lets a developer confirm quickly
 * in the common case while still seeing and being free to override the
 * reasoning. This function supplies that default; it has no authority
 * to act on it. Every caller must still route the actual choice through
 * an explicit developer confirmation before `resolution-plan.js` builds
 * anything executable.
 *
 * ## The heuristic
 * `detectDuplicateGroups` already orders each group's candidates by
 * reference count (descending), then path length (ascending), then
 * alphabetically — precisely so that "the asset most of the codebase
 * already depends on, or failing that, the one that looks like the
 * primary copy" is simply the first candidate. This function is
 * intentionally a thin, named wrapper around that ordering rather than
 * its own scoring logic, so there is exactly one place duplicate
 * ordering is decided.
 *
 * @returns The suggested candidate's asset. Always a member of
 *   `group.candidates`.
 */
export function suggestCanonicalAsset(group: DuplicateGroup): AnimoriaAsset {
  return group.candidates[0]!.asset;
}
