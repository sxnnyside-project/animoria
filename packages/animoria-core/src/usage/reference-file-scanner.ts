import { readFile } from 'node:fs/promises';
import { logDebug } from '../logging/logger.js';
import type { AnimoriaAsset, UsageReference } from '../types/asset.js';
import { type ReferenceMatchStrategy, lineMatchesAsset } from './reference-patterns.js';

/**
 * Finds, for a single source file, which of a given set of assets it
 * references — the inverse of what {@link "./usage-scanner.js"} does.
 *
 * ## Why this exists
 * `UsageScanner` answers "which source files reference *this one*
 * asset", by walking every source file in the workspace. That is the
 * right question — and the right cost — for a full governance analysis
 * or an on-demand "show usages" lookup. It is the *wrong* cost for
 * reacting to a single source file being saved: re-walking the entire
 * workspace, once per asset, every time a developer edits one file,
 * does not scale to a workspace with thousands of assets and source
 * files.
 *
 * This function flips the direction: given the one file that just
 * changed, read it once and test it against every asset's reference
 * patterns. Cost is `O(lines in this file × assets)` instead of
 * `O(source files in workspace)` — the piece of work that is actually
 * proportional to what changed. This is what lets
 * `WorkspaceIndexer` keep per-asset reference counts incrementally
 * correct without ever re-scanning the workspace on a source edit.
 *
 * @param filePath - Absolute path to the single source file to scan.
 * @param assets - Candidate assets to test this file's lines against.
 * @param strategy - Match strategy — see `UsageSearchConfig.strategy`.
 *   Defaults to `'pattern'`, matching `UsageScanner`'s own default, so
 *   the two stay consistent unless a caller deliberately diverges.
 * @returns A map from asset path to the references found for that asset
 *   in this file. Assets with no references in this file are omitted
 *   entirely (never present with an empty array), so `map.size` is
 *   directly the count of assets this file references.
 */
export async function scanFileForAssetReferences(
  filePath: string,
  assets: readonly AnimoriaAsset[],
  strategy: ReferenceMatchStrategy = 'pattern'
): Promise<ReadonlyMap<string, UsageReference[]>> {
  const result = new Map<string, UsageReference[]>();
  if (assets.length === 0) return result;

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    logDebug(
      'usage-scan',
      'scanFileForAssetReferences',
      'Could not read source file for incremental reference scan',
      {
        assetPath: filePath,
        reason: 'file vanished or unreadable',
        error: err,
        recovery: 'reported zero references for this file',
      }
    );
    return result; // File vanished or is unreadable — no references to report.
  }

  const lines = content.split('\n');

  for (const asset of assets) {
    const refs: UsageReference[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (lineMatchesAsset(line, asset.name, asset.stem, strategy)) {
        refs.push({ file: filePath, line: i + 1, content: line.trim() });
      }
    }
    if (refs.length > 0) result.set(asset.path, refs);
  }

  return result;
}
