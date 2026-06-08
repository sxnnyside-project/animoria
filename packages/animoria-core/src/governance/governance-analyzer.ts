import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { UsageScanner } from '../usage/usage-scanner.js';
import type {
  GovernanceConfig,
  GovernanceReport,
  GovernanceIssue,
  AnimoriaAsset,
} from '../types/asset.js';

const BATCH_SIZE = 4;

export class GovernanceAnalyzer {
  constructor(private config: GovernanceConfig) {}

  async analyze(): Promise<GovernanceReport> {
    const start = Date.now();
    const threshold = this.config.overusedThreshold ?? 10;

    const parsed = this.config.assets.filter(a => a.status === 'parsed');

    // STEP A — Usage count per asset (batched concurrency)
    const usageCounts = new Map<string, number>();

    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      const batch = parsed.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (asset) => {
          const scopePath =
            this.config.scopeResolver?.(asset) ?? this.config.workspacePath;
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

    // STEP B — Content hashing for duplicate detection (batched)
    const hashMap = new Map<string, AnimoriaAsset[]>();

    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      const batch = parsed.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (asset) => {
          const hash = await this._computeHash(asset);
          const group = hashMap.get(hash) ?? [];
          group.push(asset);
          hashMap.set(hash, group);
        })
      );
    }

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
            duplicateOf: group.filter(a => a.path !== asset.path),
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

  private async _computeHash(asset: AnimoriaAsset): Promise<string> {
    const content = await readFile(asset.path);
    return createHash('md5').update(content).digest('hex');
  }
}
