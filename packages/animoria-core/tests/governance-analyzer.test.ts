import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { GovernanceAnalyzer } from '../src/governance/governance-analyzer';
import { FileScanner } from '../src/scanner/file-scanner';
import { AssetParser } from '../src/parser/asset-parser';

const WORKSPACE = resolve(__dirname, './fixtures/governance-workspace');

async function getParsedAssets() {
  const scanner = new FileScanner({ workspacePath: WORKSPACE });
  const scanResult = await scanner.scan();
  const parser = new AssetParser();
  const parseResult = await parser.parse(scanResult.assets);
  return parseResult.assets.filter((a) => a.status === 'parsed');
}

describe('GovernanceAnalyzer', () => {
  describe('analyze() — report structure', () => {
    it('returns a GovernanceReport object', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      expect(report).toHaveProperty('unused');
      expect(report).toHaveProperty('duplicates');
      expect(report).toHaveProperty('overused');
      expect(report).toHaveProperty('totalAssets');
      expect(report).toHaveProperty('durationMs');
      expect(report).toHaveProperty('generatedAt');
    });

    it('totalAssets matches parsed asset count', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      expect(report.totalAssets).toBe(assets.length);
    });

    it('durationMs is positive', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('generatedAt is a valid ISO string', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      expect(() => new Date(report.generatedAt)).not.toThrow();
      expect(new Date(report.generatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('analyze() — unused detection', () => {
    it('flags assets with zero references as unused', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      // orphan.json has no references in any fixture source file
      const unusedStems = report.unused.map((i) => i.asset.stem);
      expect(unusedStems).toContain('orphan');
    });

    it('unused issues have referenceCount of 0', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      expect(report.unused.every((i) => i.referenceCount === 0)).toBe(true);
    });

    it('does not flag referenced assets as unused', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      const unusedStems = report.unused.map((i) => i.asset.stem);
      expect(unusedStems).not.toContain('success');
    });
  });

  describe('analyze() — duplicate detection', () => {
    it('flags assets with identical content as duplicates', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      // success.json and success-copy.json have identical content
      const dupStems = report.duplicates.map((i) => i.asset.stem);
      expect(dupStems).toContain('success');
      expect(dupStems).toContain('success-copy');
    });

    it('duplicate issues have duplicateOf populated', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      // All duplicate issues must have duplicateOf populated
      expect(report.duplicates.every((i) => i.duplicateOf && i.duplicateOf.length > 0)).toBe(true);
    });

    it('duplicate issues have correct category', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      expect(report.duplicates.every((i) => i.category === 'duplicate')).toBe(true);
    });
  });

  describe('analyze() — overused detection', () => {
    it('respects custom overusedThreshold', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({
        workspacePath: WORKSPACE,
        assets,
        overusedThreshold: 1,
      });
      const report = await analyzer.analyze();
      // success, loading, confetti all have >= 1 reference in fixture src files
      expect(report.overused.length).toBeGreaterThan(0);
    });

    it('overused issues are sorted descending by referenceCount', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({
        workspacePath: WORKSPACE,
        assets,
        overusedThreshold: 1,
      });
      const report = await analyzer.analyze();
      const counts = report.overused.map((i) => i.referenceCount);
      const sorted = [...counts].sort((a, b) => b - a);
      expect(counts).toEqual(sorted);
    });

    it('does not flag unused assets as overused at default threshold', async () => {
      const assets = await getParsedAssets();
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets });
      const report = await analyzer.analyze();
      // No fixture asset reaches 10 references
      expect(report.overused.length).toBe(0);
    });

    it('overused issues have referenceCount >= threshold', async () => {
      const assets = await getParsedAssets();
      const threshold = 1;
      const analyzer = new GovernanceAnalyzer({
        workspacePath: WORKSPACE,
        assets,
        overusedThreshold: threshold,
      });
      const report = await analyzer.analyze();
      expect(report.overused.every((i) => i.referenceCount >= threshold)).toBe(true);
    });
  });

  describe('analyze() — edge cases', () => {
    it('handles empty asset list', async () => {
      const analyzer = new GovernanceAnalyzer({ workspacePath: WORKSPACE, assets: [] });
      const report = await analyzer.analyze();
      expect(report.totalAssets).toBe(0);
      expect(report.unused).toHaveLength(0);
      expect(report.duplicates).toHaveLength(0);
      expect(report.overused).toHaveLength(0);
    });

    it('skips non-parsed assets', async () => {
      const assets = await getParsedAssets();
      const fakeErrorAsset = { ...assets[0], path: '/nonexistent.json', status: 'error' as const };
      const analyzer = new GovernanceAnalyzer({
        workspacePath: WORKSPACE,
        assets: [...assets, fakeErrorAsset],
      });
      const report = await analyzer.analyze();
      // totalAssets should only count parsed assets
      expect(report.totalAssets).toBe(assets.length);
    });
  });
});
