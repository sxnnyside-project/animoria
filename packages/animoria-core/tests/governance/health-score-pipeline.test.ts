import { describe, expect, it } from 'vitest';
import { buildCategoryBreakdown } from '../../src/governance/health/category-breakdown';
import { DEFAULT_HEALTH_SCORE_WEIGHTS } from '../../src/governance/health/default-weights';
import { calculatePenalties } from '../../src/governance/health/penalty-calculator';
import { buildRecommendations } from '../../src/governance/health/recommendation-builder';
import { normalizeScore } from '../../src/governance/health/score-normalizer';
import type { HealthScoreWeights } from '../../src/governance/health/types';
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

describe('calculatePenalties', () => {
  it('applies a flat per-rule weight for rules configured with a number', () => {
    const weights: HealthScoreWeights = {
      perRule: { 'no-gif': 4 },
      defaultWeight: 1,
      severityMultiplier: { error: 1, warning: 0.5 },
    };
    const [result] = calculatePenalties([diagnostic({ ruleId: 'no-gif' })], weights);
    expect(result?.penalty).toBe(4);
  });

  it('applies the default weight for a rule id absent from the table', () => {
    const weights: HealthScoreWeights = {
      perRule: {},
      defaultWeight: 7,
      severityMultiplier: { error: 1, warning: 0.5 },
    };
    const [result] = calculatePenalties([diagnostic({ ruleId: 'some-future-rule' })], weights);
    expect(result?.penalty).toBe(7);
  });

  it('scales penalty by the severity multiplier', () => {
    const weights: HealthScoreWeights = {
      perRule: { 'no-gif': 10 },
      defaultWeight: 1,
      severityMultiplier: { error: 1, warning: 0.25 },
    };
    const [error, warning] = calculatePenalties(
      [
        diagnostic({ ruleId: 'no-gif', severity: 'error' }),
        diagnostic({ ruleId: 'no-gif', severity: 'warning' }),
      ],
      weights
    );
    expect(error?.penalty).toBe(10);
    expect(warning?.penalty).toBe(2.5);
  });

  it('invokes a function-form weight with the diagnostic itself', () => {
    const weights: HealthScoreWeights = {
      perRule: { 'no-unreferenced-assets': (d) => d.asset.sizeBytes / 1000 },
      defaultWeight: 1,
      severityMultiplier: { error: 1, warning: 0.5 },
    };
    const [result] = calculatePenalties(
      [diagnostic({ ruleId: 'no-unreferenced-assets', asset: asset({ sizeBytes: 5000 }) })],
      weights
    );
    expect(result?.penalty).toBe(5);
  });

  it('returns an empty array for an empty diagnostics list', () => {
    expect(calculatePenalties([], DEFAULT_HEALTH_SCORE_WEIGHTS)).toEqual([]);
  });
});

describe('buildCategoryBreakdown', () => {
  it('groups penalties by rule id and sums them', () => {
    const penalties = [
      { diagnostic: diagnostic({ ruleId: 'no-gif' }), penalty: 2 },
      { diagnostic: diagnostic({ ruleId: 'no-gif' }), penalty: 3 },
      { diagnostic: diagnostic({ ruleId: 'allowed-formats' }), penalty: 5 },
    ];

    const categories = buildCategoryBreakdown(penalties);

    expect(categories).toHaveLength(2);
    const noGif = categories.find((c) => c.ruleId === 'no-gif');
    expect(noGif).toMatchObject({ diagnosticCount: 2, totalPenalty: 5 });
  });

  it('sorts categories by totalPenalty descending', () => {
    const penalties = [
      { diagnostic: diagnostic({ ruleId: 'small' }), penalty: 1 },
      { diagnostic: diagnostic({ ruleId: 'big' }), penalty: 10 },
    ];
    const categories = buildCategoryBreakdown(penalties);
    expect(categories.map((c) => c.ruleId)).toEqual(['big', 'small']);
  });

  it('computes shareOfDeduction proportional to the grand total', () => {
    const penalties = [
      { diagnostic: diagnostic({ ruleId: 'a' }), penalty: 25 },
      { diagnostic: diagnostic({ ruleId: 'b' }), penalty: 75 },
    ];
    const categories = buildCategoryBreakdown(penalties);
    expect(categories.find((c) => c.ruleId === 'a')?.shareOfDeduction).toBeCloseTo(0.25);
    expect(categories.find((c) => c.ruleId === 'b')?.shareOfDeduction).toBeCloseTo(0.75);
  });

  it('returns shareOfDeduction 0 for every category when the grand total is 0', () => {
    const penalties = [{ diagnostic: diagnostic({ ruleId: 'a' }), penalty: 0 }];
    const categories = buildCategoryBreakdown(penalties);
    expect(categories[0]?.shareOfDeduction).toBe(0);
  });

  it('returns an empty array for no penalties', () => {
    expect(buildCategoryBreakdown([])).toEqual([]);
  });
});

describe('normalizeScore', () => {
  it('returns 100 for zero penalty', () => {
    expect(normalizeScore(0)).toBe(100);
  });

  it('subtracts penalty linearly', () => {
    expect(normalizeScore(30)).toBe(70);
  });

  it('clamps at 0 for penalty exceeding 100', () => {
    expect(normalizeScore(500)).toBe(0);
  });

  it('clamps at 100 for a negative penalty (defensive)', () => {
    expect(normalizeScore(-10)).toBe(100);
  });
});

describe('buildRecommendations', () => {
  it('ranks recommendations by totalPenalty descending', () => {
    const categories = buildCategoryBreakdown([
      { diagnostic: diagnostic({ ruleId: 'minor' }), penalty: 2 },
      { diagnostic: diagnostic({ ruleId: 'major' }), penalty: 20 },
    ]);
    const recommendations = buildRecommendations(categories);
    expect(recommendations[0]?.ruleId).toBe('major');
    expect(recommendations[1]?.ruleId).toBe('minor');
  });

  it('breaks ties deterministically by ruleId', () => {
    const categories = buildCategoryBreakdown([
      { diagnostic: diagnostic({ ruleId: 'zeta' }), penalty: 5 },
      { diagnostic: diagnostic({ ruleId: 'alpha' }), penalty: 5 },
    ]);
    const recommendations = buildRecommendations(categories);
    expect(recommendations.map((r) => r.ruleId)).toEqual(['alpha', 'zeta']);
  });

  it('caps recommendations at maxRecommendations', () => {
    const categories = buildCategoryBreakdown([
      { diagnostic: diagnostic({ ruleId: 'a' }), penalty: 3 },
      { diagnostic: diagnostic({ ruleId: 'b' }), penalty: 2 },
      { diagnostic: diagnostic({ ruleId: 'c' }), penalty: 1 },
    ]);
    expect(buildRecommendations(categories, 2)).toHaveLength(2);
  });

  it('excludes zero-penalty categories', () => {
    const categories = buildCategoryBreakdown([
      { diagnostic: diagnostic({ ruleId: 'free' }), penalty: 0 },
    ]);
    expect(buildRecommendations(categories)).toHaveLength(0);
  });

  it('produces a human-readable message mentioning the count and recoverable points', () => {
    const categories = buildCategoryBreakdown([
      { diagnostic: diagnostic({ ruleId: 'no-gif' }), penalty: 2 },
      { diagnostic: diagnostic({ ruleId: 'no-gif' }), penalty: 2 },
    ]);
    const [recommendation] = buildRecommendations(categories);
    expect(recommendation?.message).toContain('2');
    expect(recommendation?.message).toContain('no gif');
    expect(recommendation?.potentialScoreRecovery).toBe(4);
  });

  it('returns an empty array for no categories', () => {
    expect(buildRecommendations([])).toEqual([]);
  });
});
