import { describe, expect, it } from 'vitest';
import { allowedFormatsRule } from '../../src/governance/rules/builtins/allowed-formats.rule';
import { maxFileSizeRule } from '../../src/governance/rules/builtins/max-file-size.rule';
import { noDuplicateNamesRule } from '../../src/governance/rules/builtins/no-duplicate-names.rule';
import { noGifRule } from '../../src/governance/rules/builtins/no-gif.rule';
import { noUnreferencedAssetsRule } from '../../src/governance/rules/builtins/no-unreferenced-assets.rule';
import type { RuleOutcome } from '../../src/governance/rules/types';
import type { AnimoriaAsset } from '../../src/types/asset';

function asset(overrides: Partial<AnimoriaAsset>): AnimoriaAsset {
  return {
    path: '/workspace/asset.json',
    name: 'asset.json',
    stem: 'asset',
    format: 'lottie',
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed',
    ...overrides,
  };
}

const baseContext = { workspacePath: '/workspace', signals: {} };

/**
 * Unwraps an `evaluated` outcome, failing loudly if the rule skipped.
 *
 * Asserting the status here rather than in each test keeps every existing
 * expectation meaningful: a rule that silently began skipping would otherwise
 * satisfy `toHaveLength(0)` and look like "found nothing".
 */
function violationsOf(outcome: RuleOutcome) {
  if (outcome.status !== 'evaluated') {
    throw new Error(`expected rule to evaluate, but it skipped: ${outcome.reason.message}`);
  }
  return outcome.violations;
}

describe('maxFileSizeRule', () => {
  it('accepts a bare number as options with implied "error" severity', () => {
    const parsed = maxFileSizeRule.parseOptions(1);
    expect(parsed).toEqual({ valid: true, severity: 'error', options: { limitKb: 1 } });
  });

  it('accepts an explicit [severity, limitKb] tuple', () => {
    const parsed = maxFileSizeRule.parseOptions(['warning', 2]);
    expect(parsed).toEqual({ valid: true, severity: 'warning', options: { limitKb: 2 } });
  });

  it('rejects non-numeric and non-positive values', () => {
    expect(maxFileSizeRule.parseOptions('big').valid).toBe(false);
    expect(maxFileSizeRule.parseOptions(0).valid).toBe(false);
    expect(maxFileSizeRule.parseOptions(-5).valid).toBe(false);
  });

  it('flags assets exceeding the limit and leaves smaller ones alone', () => {
    const oversized = asset({ path: '/w/big.json', sizeBytes: 2 * 1024 * 1024 });
    const fine = asset({ path: '/w/small.json', sizeBytes: 10 * 1024 });

    const violations = violationsOf(
      maxFileSizeRule.evaluate({
        ...baseContext,
        assets: [oversized, fine],
        options: { limitKb: 1024 },
      })
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/big.json');
    expect(violations[0]?.details).toEqual({ limitKb: 1024, actualKb: 2048 });
  });
});

describe('noGifRule', () => {
  it('flags gif assets only', () => {
    const gif = asset({ path: '/w/a.gif', format: 'gif' });
    const lottie = asset({ path: '/w/b.json', format: 'lottie' });

    const violations = violationsOf(
      noGifRule.evaluate({
        ...baseContext,
        assets: [gif, lottie],
        options: undefined,
      })
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/a.gif');
  });
});

describe('noDuplicateNamesRule', () => {
  it('flags every asset sharing a case-insensitive stem', () => {
    const a = asset({ path: '/w/icons/Success.json', name: 'Success.json', stem: 'Success' });
    const b = asset({ path: '/w/anim/success.lottie', name: 'success.lottie', stem: 'success' });
    const c = asset({ path: '/w/unique.json', name: 'unique.json', stem: 'unique' });

    const violations = violationsOf(
      noDuplicateNamesRule.evaluate({
        ...baseContext,
        assets: [a, b, c],
        options: undefined,
      })
    );

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.asset.path).sort()).toEqual(
      ['/w/anim/success.lottie', '/w/icons/Success.json'].sort()
    );
  });

  it('reports no violations when every stem is unique', () => {
    const violations = violationsOf(
      noDuplicateNamesRule.evaluate({
        ...baseContext,
        assets: [asset({ path: '/w/a.json', stem: 'a' }), asset({ path: '/w/b.json', stem: 'b' })],
        options: undefined,
      })
    );
    expect(violations).toHaveLength(0);
  });
});

describe('noUnreferencedAssetsRule', () => {
  it('flags assets with zero references when signals are provided', () => {
    const used = asset({ path: '/w/used.json' });
    const unused = asset({ path: '/w/unused.json' });

    const violations = violationsOf(
      noUnreferencedAssetsRule.evaluate({
        workspacePath: '/workspace',
        assets: [used, unused],
        options: undefined,
        signals: {
          referenceCounts: new Map([
            ['/w/used.json', 3],
            ['/w/unused.json', 0],
          ]),
        },
      })
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/unused.json');
  });

  it('reports itself as skipped — not as clean — when the referenceCounts signal is absent', () => {
    const outcome = noUnreferencedAssetsRule.evaluate({
      ...baseContext,
      assets: [asset({ path: '/w/a.json' })],
      options: undefined,
    });

    // Returning an empty violation list here would be indistinguishable from
    // "checked, and everything is referenced" — the exact ambiguity that let
    // `animoria check` report PASS on a workspace of unreferenced assets.
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') throw new Error('unreachable');
    expect(outcome.reason.code).toBe('missing-signal');
    expect(outcome.reason.message).toMatch(/reference evidence/i);
  });

  it('attaches scan coverage to each violation so an absence can be judged', () => {
    const outcome = noUnreferencedAssetsRule.evaluate({
      workspacePath: '/workspace',
      assets: [asset({ path: '/w/unused.json' })],
      options: undefined,
      signals: {
        referenceCounts: new Map([['/w/unused.json', 0]]),
        scanCoverage: {
          status: 'partial',
          scannedExtensions: ['.ts'],
          unscannedExtensions: ['.json'],
          filesScanned: 12,
          referencesDetected: 4,
          excludedPatterns: [],
          scopePath: '/workspace',
        },
      },
    });

    const violations = violationsOf(outcome);
    expect(violations).toHaveLength(1);

    // Coverage is a first-class field on the violation, not a bag of keys buried in
    // `details` that each consumer would have to know the shape of.
    expect(violations[0]?.coverage).toMatchObject({
      status: 'partial',
      filesScanned: 12,
      unscannedExtensions: ['.json'],
    });
    expect(violations[0]?.evidence.kind).toBe('absence');
    expect(violations[0]?.remediation.summary).toMatch(/\.json/);
  });

  it('caps confidence at what the coverage supports', () => {
    const cases = [
      { status: 'complete', unscannedExtensions: [], expected: 'high' },
      { status: 'partial', unscannedExtensions: ['.json'], expected: 'moderate' },
      { status: 'none', unscannedExtensions: [], expected: 'low' },
    ] as const;

    for (const { status, unscannedExtensions, expected } of cases) {
      const outcome = noUnreferencedAssetsRule.evaluate({
        workspacePath: '/workspace',
        assets: [asset({ path: '/w/unused.json' })],
        options: undefined,
        signals: {
          referenceCounts: new Map([['/w/unused.json', 0]]),
          scanCoverage: {
            status,
            scannedExtensions: ['.ts'],
            unscannedExtensions,
            filesScanned: status === 'none' ? 0 : 12,
            referencesDetected: 0,
            excludedPatterns: [],
            scopePath: '/workspace',
          },
        },
      });
      expect(violationsOf(outcome)[0]?.confidence).toBe(expected);
    }
  });

  it('declines entirely when the scan did not finish', () => {
    // An interrupted scan describes an unknown fraction of the workspace, so its
    // silence is not evidence of absence at any confidence.
    const outcome = noUnreferencedAssetsRule.evaluate({
      workspacePath: '/workspace',
      assets: [asset({ path: '/w/unused.json' })],
      options: undefined,
      signals: {
        referenceCounts: new Map([['/w/unused.json', 0]]),
        scanCoverage: {
          status: 'unknown',
          scannedExtensions: ['.ts'],
          unscannedExtensions: [],
          filesScanned: 3,
          referencesDetected: 0,
          excludedPatterns: [],
          scopePath: '/workspace',
        },
      },
    });

    expect(outcome.status).toBe('skipped');
  });
});

describe('allowedFormatsRule', () => {
  it('accepts a bare array of formats with implied "error" severity', () => {
    const parsed = allowedFormatsRule.parseOptions(['lottie', 'rive']);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.severity).toBe('error');
      expect(Array.from(parsed.options.formats).sort()).toEqual(['lottie', 'rive']);
    }
  });

  it('rejects unrecognized format names', () => {
    const parsed = allowedFormatsRule.parseOptions(['lottie', 'flash']);
    expect(parsed.valid).toBe(false);
  });

  it('rejects an empty array', () => {
    expect(allowedFormatsRule.parseOptions([]).valid).toBe(false);
  });

  it('flags assets outside the allowed set', () => {
    const lottie = asset({ path: '/w/a.json', format: 'lottie' });
    const gif = asset({ path: '/w/b.gif', format: 'gif' });

    const violations = violationsOf(
      allowedFormatsRule.evaluate({
        ...baseContext,
        assets: [lottie, gif],
        options: { formats: new Set(['lottie']) },
      })
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/b.gif');
  });
});
