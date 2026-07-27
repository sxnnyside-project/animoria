import type { GovernanceConfig, GovernanceIssue, GovernanceReport } from '../types/asset.js';
import { UsageScanner } from '../usage/usage-scanner.js';
import { computeContentHashGroups } from './duplicates/content-hash.js';

const BATCH_SIZE = 4;

/**
 * Classifies a workspace's assets into three built-in governance
 * categories: unused (zero source-code references), duplicate
 * (byte-identical content shared by more than one asset), and overused
 * (referenced more often than a configurable threshold).
 *
 * ## Relationship to the Rule Engine
 * `RulesEngine` (`./rules-engine.js`) is Animoria's declarative,
 * user-configurable governance layer — rules a team opts into via
 * `.animoriarc`. `GovernanceAnalyzer` predates it and covers a fixed,
 * always-on set of heuristics that are not (yet) expressed as
 * `.animoriarc` rules, most notably content-hash duplicate detection,
 * which requires reading and hashing every asset's bytes. That cost is
 * why this analysis is invoked on demand (the "Run Governance" action)
 * rather than continuously on every filesystem event the way
 * `RulesEngine` is — see `WorkspaceIndexer` for the always-on path.
 *
 * @see RulesEngine for the declarative, continuously-evaluated governance layer.
 */
export class GovernanceAnalyzer {
  constructor(private config: GovernanceConfig) {}

  /** Runs the full classification pass and returns a {@link GovernanceReport}. */
  async analyze(): Promise<GovernanceReport> {
    const start = Date.now();
    const threshold = this.config.overusedThreshold ?? 10;

    const parsed = this.config.assets.filter((a) => a.status === 'parsed');

    // STEP A — Usage count per asset (batched concurrency)
    const usageCounts = new Map<string, number>();

    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      const batch = parsed.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (asset) => {
          const scopePath = this.config.scopeResolver?.(asset) ?? this.config.workspacePath;
          const scanner = new UsageScanner({
            workspacePath: this.config.workspacePath,
            asset,
            strategy: 'pattern',
            scopePath,
          });
          const result = await scanner.search();
          usageCounts.set(asset.path, result.references.length);
        })
      );
    }

    // STEP B — Content hashing for duplicate detection
    const hashMap = await computeContentHashGroups(parsed);

    // STEP C — Classify
    const unused: GovernanceIssue[] = [];
    const duplicates: GovernanceIssue[] = [];
    const overused: GovernanceIssue[] = [];

    for (const asset of parsed) {
      const refCount = usageCounts.get(asset.path) ?? 0;

      if (refCount === 0) {
        unused.push({ category: 'unused', asset, referenceCount: 0 });
      }

      if (refCount >= threshold) {
        overused.push({ category: 'overused', asset, referenceCount: refCount });
      }
    }

    for (const group of hashMap.values()) {
      if (group.length > 1) {
        for (const asset of group) {
          const refCount = usageCounts.get(asset.path) ?? 0;
          duplicates.push({
            category: 'duplicate',
            asset,
            duplicateOf: group.filter((a) => a.path !== asset.path),
            referenceCount: refCount,
          });
        }
      }
    }

    overused.sort((a, b) => b.referenceCount - a.referenceCount);

    return {
      unused,
      duplicates,
      overused,
      totalAssets: parsed.length,
      durationMs: Date.now() - start,
      generatedAt: new Date().toISOString(),
    };
  }
}
