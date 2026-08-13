import { performance } from 'node:perf_hooks';
import type { UsageSearchConfig, UsageSearchResult } from '../types/asset.js';
import { buildReferenceIndex } from './reference-index.js';

export { DEFAULT_USAGE_SCAN_EXTENSIONS } from './scan-extensions.js';

/**
 * Answers "which source files reference this one asset".
 *
 * ## Why this is now a thin wrapper
 * This class used to own a complete scanning implementation: glob the workspace,
 * read every source file, test every line. That is the right answer to a
 * single-asset question asked once — a "show usages" lookup, a hover card — and
 * exactly the wrong one when the caller has a whole workspace of assets, because
 * running it per asset re-globs and re-reads the entire source tree once per asset.
 * That is how a governance pass over 60 assets came to take 28 seconds.
 *
 * The scanning implementation now lives in {@link buildReferenceIndex}, which walks
 * the tree once for any number of assets. This class remains as the single-asset
 * entry point — same inputs, same results, same public shape — so on-demand lookups
 * keep working unchanged while every whole-workspace caller uses the index directly.
 */
export class UsageScanner {
  constructor(private config: UsageSearchConfig) {}

  /**
   * Searches the workspace for references to this scanner's asset.
   *
   * @returns The discovered references, plus how many source files were examined.
   */
  async search(): Promise<UsageSearchResult> {
    const start = performance.now();
    const { workspacePath, asset, strategy, extensions, exclude, scopePath } = this.config;

    const index = await buildReferenceIndex({
      workspacePath,
      assets: [asset],
      strategy,
      extensions,
      exclude,
      // A single-asset scan resolves its scope directly from the config rather than
      // through a resolver callback.
      scopeResolver: scopePath ? () => scopePath : undefined,
    });

    return {
      asset,
      references: [...index.referencesFor(asset.path)],
      searchedFiles: index.summary.filesScanned,
      durationMs: performance.now() - start,
    };
  }
}
