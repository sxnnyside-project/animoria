import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import fg from 'fast-glob';
import { logDebug } from '../logging/logger.js';
import type { UsageReference, UsageSearchConfig, UsageSearchResult } from '../types/asset.js';
import { type ReferenceMatchStrategy, lineMatchesAsset } from './reference-patterns.js';

/**
 * Source file extensions scanned for asset references when a caller
 * does not supply its own list. Exported (rather than kept module-private)
 * so other subsystems that need to know "is this a source file Animoria
 * scans for references" — notably the incremental indexer's path
 * classifier — stay in sync with this scanner's own definition instead
 * of maintaining a second, potentially-drifting copy.
 */
export const DEFAULT_USAGE_SCAN_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.swift',
  '.kt',
  '.dart',
  '.vue',
  '.svelte',
  '.py',
  '.cs',
];

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.turbo/**',
];

const BATCH_SIZE = 8;

/**
 * Traces file references in code files recursively.
 * Uses strategy patterns to detect asset references based on file stem or filename.
 */
export class UsageScanner {
  constructor(private config: UsageSearchConfig) {}

  /**
   * Searches the workspace files for occurrences/imports matching the asset signature.
   * Leverages fast-glob and read-streaming in batched parallel queries.
   *
   * @returns A promise resolving to the list of discovered usage references.
   */
  async search(): Promise<UsageSearchResult> {
    const start = performance.now();
    const {
      workspacePath,
      asset,
      strategy = 'pattern',
      extensions = DEFAULT_USAGE_SCAN_EXTENSIONS,
      exclude = [],
      scopePath,
    } = this.config;

    const extList = extensions.map((e) => e.replace(/^\./, '')).join(',');
    const pattern = `**/*.{${extList}}`;
    const ignorePatterns = [...DEFAULT_EXCLUDE, ...exclude];

    const files = await fg(pattern, {
      cwd: workspacePath,
      absolute: true,
      ignore: ignorePatterns,
    });

    let references: UsageReference[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((file) => this._searchFile(file, asset.name, asset.stem, strategy))
      );
      for (const refs of batchResults) {
        references.push(...refs);
      }
    }

    if (scopePath) {
      const scope = resolve(scopePath);
      references = references.filter((r) => r.file.startsWith(scope));
    }

    return {
      asset,
      references,
      searchedFiles: files.length,
      durationMs: performance.now() - start,
    };
  }

  private async _searchFile(
    file: string,
    filename: string,
    stem: string,
    strategy: ReferenceMatchStrategy
  ): Promise<UsageReference[]> {
    try {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');
      const refs: UsageReference[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (lineMatchesAsset(line, filename, stem, strategy)) {
          refs.push({
            file,
            line: i + 1,
            content: line.trim(),
          });
        }
      }

      return refs;
    } catch (err) {
      logDebug('usage-scan', 'UsageScanner', 'Could not read source file during usage scan', {
        assetPath: file,
        reason: 'file vanished or unreadable',
        error: err,
        recovery: 'reported zero references for this file',
      });
      return [];
    }
  }
}
