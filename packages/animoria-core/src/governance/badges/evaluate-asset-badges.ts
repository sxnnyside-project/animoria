import type { AnimoriaAsset } from '../../types/asset.js';
import type { AssetBadge, AssetBadgeContext } from './types.js';

/**
 * Determines which governance badges apply to a single asset.
 *
 * ## What this function does not do
 * It never reads a file, never runs a rule, never hashes content, and
 * never scans source code. Every fact it needs — reference counts,
 * duplicate membership, rule diagnostics — is supplied by the caller via
 * {@link AssetBadgeContext}, already computed by the systems whose job
 * that actually is (`WorkspaceIndexer`, `GovernanceAnalyzer`,
 * `RulesEngine`). This function's only job is composing those
 * already-known facts into a badge list for one asset — the evaluation
 * half of the badge system described in `./types.js`.
 *
 * ## Adding a new badge kind
 * 1. Add the new kind to `AssetBadgeKind` (`./types.js`).
 * 2. Add whatever pre-computed signal it needs to
 *    `AssetBadgeContext` — never have this function fetch it directly.
 * 3. Add one `if` block here appending the badge when the signal
 *    indicates it applies.
 * No existing badge kind's logic, and no presentation-layer code
 * anywhere, needs to change.
 *
 * @returns Badges in a fixed, deterministic order (`'orphaned'` →
 *   `'duplicate'` → `'rule-violation'`) regardless of the order facts
 *   were supplied in `context` — callers that render multiple badges
 *   per asset get a stable visual order for free.
 */
export function evaluateAssetBadges(
  asset: AnimoriaAsset,
  context: AssetBadgeContext
): readonly AssetBadge[] {
  const badges: AssetBadge[] = [];

  const referenceCount = context.referenceCounts?.get(asset.path);
  if (referenceCount === 0) {
    badges.push({
      kind: 'orphaned',
      severity: 'warning',
      message: `"${asset.name}" has no detected references in source code.`,
    });
  }

  if (context.duplicateAssetPaths?.has(asset.path)) {
    badges.push({
      kind: 'duplicate',
      severity: 'info',
      message: `"${asset.name}" is identical in content to another asset in the workspace.`,
    });
  }

  const diagnostics = context.diagnosticsByAssetPath?.get(asset.path);
  if (diagnostics && diagnostics.length > 0) {
    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    badges.push({
      kind: 'rule-violation',
      severity: errorCount > 0 ? 'error' : 'warning',
      message:
        diagnostics.length === 1
          ? diagnostics[0]!.message
          : `${diagnostics.length} governance rule violation(s) found for "${asset.name}".`,
    });
  }

  return badges;
}
