import { describe, expect, it } from 'vitest';
import { HealthScoreEngine } from '../../src/governance/health-score';
import { RulesEngine } from '../../src/governance/rules-engine';
import type { RuleDiagnostic } from '../../src/governance/rules-engine';
import type { AnimoriaAsset } from '../../src/types/asset';

function asset(overrides: Partial<AnimoriaAsset> = {}): AnimoriaAsset {
  return {
    path: '/w/asset.json',
    name: 'asset.json',
    stem: 'asset',
    format: 'lottie',
    sizeBytes: 1024,
    mtime: 0,
    status: 'parsed',
    ...overrides,
  };
}

function diagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  return {
    ruleId: 'no-gif',
    severity: 'error',
    asset: asset(),
    message: 'test diagnostic',
    ...overrides,
  };
}

describe('HealthScoreEngine', () => {
  it('scores a perfectly clean report as exactly 100', () => {
    const engine = new HealthScoreEngine();
    const report = engine.evaluate({ diagnostics: [], totalAssetCount: 42 });

    expect(report.score).toBe(100);
    expect(report.totalAssetCount).toBe(42);
    expect(report.totalDiagnosticCount).toBe(0);
    expect(report.categories).toEqual([]);
    expect(report.recommendations).toEqual([]);
  });

  it('deducts points proportional to diagnostic penalties', () => {
    const engine = new HealthScoreEngine({
      weights: {
        perRule: { 'no-gif': 10 },
        defaultWeight: 1,
        severityMultiplier: { error: 1, warning: 0.5 },
      },
    });

    const report = engine.evaluate({
      diagnostics: [diagnostic({ ruleId: 'no-gif' }), diagnostic({ ruleId: 'no-gif' })],
      totalAssetCount: 5,
    });

    expect(report.score).toBe(80);
    expect(report.totalDiagnosticCount).toBe(2);
  });

  it('is deterministic: the same input always produces the same score and category order', () => {
    const engine = new HealthScoreEngine();
    const diagnostics = [
      diagnostic({ ruleId: 'max-file-size-kb', details: { limitKb: 100, actualKb: 400 } }),
      diagnostic({ ruleId: 'no-gif' }),
      diagnostic({ ruleId: 'allowed-formats' }),
    ];

    const first = engine.evaluate({ diagnostics, totalAssetCount: 10 });
    const second = engine.evaluate({ diagnostics, totalAssetCount: 10 });

    expect(second.score).toBe(first.score);
    expect(second.categories.map((c) => c.ruleId)).toEqual(first.categories.map((c) => c.ruleId));
    expect(second.recommendations).toEqual(first.recommendations);
  });

  it('never produces a score outside [0, 100] even with many severe diagnostics', () => {
    const engine = new HealthScoreEngine();
    const diagnostics = Array.from({ length: 100 }, () =>
      diagnostic({ ruleId: 'allowed-formats', severity: 'error' })
    );
    const report = engine.evaluate({ diagnostics, totalAssetCount: 100 });
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('weights an unreferenced-asset penalty by asset size (default weighting policy)', () => {
    const engine = new HealthScoreEngine();
    const small = engine.evaluate({
      diagnostics: [
        diagnostic({ ruleId: 'no-unreferenced-assets', asset: asset({ sizeBytes: 1024 }) }),
      ],
      totalAssetCount: 1,
    });
    const large = engine.evaluate({
      diagnostics: [
        diagnostic({
          ruleId: 'no-unreferenced-assets',
          asset: asset({ sizeBytes: 5 * 1024 * 1024 }),
        }),
      ],
      totalAssetCount: 1,
    });

    expect(large.score).toBeLessThan(small.score);
  });

  it('recommends the highest-cost category first', () => {
    const engine = new HealthScoreEngine({
      weights: {
        perRule: { 'no-gif': 1, 'allowed-formats': 20 },
        defaultWeight: 1,
        severityMultiplier: { error: 1, warning: 0.5 },
      },
    });

    const report = engine.evaluate({
      diagnostics: [diagnostic({ ruleId: 'no-gif' }), diagnostic({ ruleId: 'allowed-formats' })],
      totalAssetCount: 2,
    });

    expect(report.recommendations[0]?.ruleId).toBe('allowed-formats');
  });

  it('falls back to defaultWeight for a rule id the weight table has never seen', () => {
    const engine = new HealthScoreEngine({
      weights: {
        perRule: {},
        defaultWeight: 9,
        severityMultiplier: { error: 1, warning: 0.5 },
      },
    });
    const report = engine.evaluate({
      diagnostics: [diagnostic({ ruleId: 'brand-new-future-rule' })],
      totalAssetCount: 1,
    });
    expect(report.score).toBe(91);
  });

  // ── Integration: consumes real RulesEngine output, never re-derives it ──

  it('consumes RuleEngineReport diagnostics directly from a real RulesEngine run', () => {
    const gifAsset = asset({ path: '/w/a.gif', name: 'a.gif', format: 'gif' });
    const rulesEngine = new RulesEngine({
      workspacePath: '/w',
      assets: [gifAsset],
      rulesConfig: { 'no-gif': 'error' },
    });

    const ruleReport = rulesEngine.run();
    const healthEngine = new HealthScoreEngine();
    const healthReport = healthEngine.evaluate({
      diagnostics: ruleReport.diagnostics,
      totalAssetCount: 1,
    });

    expect(healthReport.totalDiagnosticCount).toBe(1);
    expect(healthReport.score).toBeLessThan(100);
    expect(healthReport.categories[0]?.ruleId).toBe('no-gif');
  });

  it('scores 100 when the Rule Engine finds nothing to report', () => {
    const cleanAsset = asset({ path: '/w/clean.json', format: 'lottie' });
    const rulesEngine = new RulesEngine({
      workspacePath: '/w',
      assets: [cleanAsset],
      rulesConfig: { 'no-gif': 'error' },
    });

    const ruleReport = rulesEngine.run();
    const healthReport = new HealthScoreEngine().evaluate({
      diagnostics: ruleReport.diagnostics,
      totalAssetCount: 1,
    });

    expect(healthReport.score).toBe(100);
  });
});
