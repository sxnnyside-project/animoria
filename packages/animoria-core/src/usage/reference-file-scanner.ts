import { readFile } from 'node:fs/promises';
import { logDebug } from '../logging/logger.js';
import type { AnimoriaAsset, UsageReference } from '../types/asset.js';
import { collectFromFile, createReferenceEntry } from './reference-index.js';
import type { ReferenceMatchStrategy } from './reference-patterns.js';

/**
 * Finds, for a single source file, which of a given set of assets it references —
 * the inverse of a whole-workspace scan.
 *
 * ## Why this exists
 * `buildReferenceIndex` answers "which source files reference these assets" by
 * walking the whole tree. That is the right cost for an initial index or a CI run,
 * and the wrong cost for reacting to one file being saved. This function reads the
 * one file that changed and tests it against every asset, so an incremental update
 * costs `O(lines in this file × assets)` rather than a workspace walk.
 *
 * ## Why it delegates rather than implementing matching itself
 * The two paths must agree exactly. If the incremental scanner had its own notion of
 * what counts as a reference, an asset's count would depend on *when* the file was
 * read — during the cold scan or after a later edit — and the two would drift as
 * soon as either gained a format the other lacked. Both therefore call
 * {@link collectFromFile}: format dispatch, target extraction, path resolution, and
 * the inline-ignore directive all live in exactly one place.
 *
 * @param filePath - Absolute path to the single source file to scan.
 * @param assets - Candidate assets to test this file's lines against.
 * @param workspacePath - Workspace root, used to resolve root-absolute targets.
 * @param strategy - Match strategy for code-syntax files. See `UsageSearchConfig.strategy`.
 * @returns A map from asset path to the references found in this file. Assets with no
 *   references are omitted entirely, so `map.size` is the count of assets this file
 *   references.
 */
export async function scanFileForAssetReferences(
  filePath: string,
  assets: readonly AnimoriaAsset[],
  workspacePath: string,
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

  const entries = assets.map((asset) => createReferenceEntry(asset, strategy));
  collectFromFile(filePath, content, workspacePath, entries);

  for (const entry of entries) {
    if (entry.references.length > 0) result.set(entry.asset.path, entry.references);
  }

  return result;
}
