import { describe, expect, it } from 'vitest';
import { allowedFormatsRule } from '../../src/governance/rules/builtins/allowed-formats.rule';
import { maxFileSizeRule } from '../../src/governance/rules/builtins/max-file-size.rule';
import { noDuplicateNamesRule } from '../../src/governance/rules/builtins/no-duplicate-names.rule';
import { noGifRule } from '../../src/governance/rules/builtins/no-gif.rule';
import { noUnreferencedAssetsRule } from '../../src/governance/rules/builtins/no-unreferenced-assets.rule';
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

    const violations = maxFileSizeRule.evaluate({
      ...baseContext,
      assets: [oversized, fine],
      options: { limitKb: 1024 },
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/big.json');
    expect(violations[0]?.details).toEqual({ limitKb: 1024, actualKb: 2048 });
  });
});

describe('noGifRule', () => {
  it('flags gif assets only', () => {
    const gif = asset({ path: '/w/a.gif', format: 'gif' });
    const lottie = asset({ path: '/w/b.json', format: 'lottie' });

    const violations = noGifRule.evaluate({
      ...baseContext,
      assets: [gif, lottie],
      options: undefined,
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/a.gif');
  });
});

describe('noDuplicateNamesRule', () => {
  it('flags every asset sharing a case-insensitive stem', () => {
    const a = asset({ path: '/w/icons/Success.json', name: 'Success.json', stem: 'Success' });
    const b = asset({ path: '/w/anim/success.lottie', name: 'success.lottie', stem: 'success' });
    const c = asset({ path: '/w/unique.json', name: 'unique.json', stem: 'unique' });

    const violations = noDuplicateNamesRule.evaluate({
      ...baseContext,
      assets: [a, b, c],
      options: undefined,
    });

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.asset.path).sort()).toEqual(
      ['/w/anim/success.lottie', '/w/icons/Success.json'].sort()
    );
  });

  it('reports no violations when every stem is unique', () => {
    const violations = noDuplicateNamesRule.evaluate({
      ...baseContext,
      assets: [asset({ path: '/w/a.json', stem: 'a' }), asset({ path: '/w/b.json', stem: 'b' })],
      options: undefined,
    });
    expect(violations).toHaveLength(0);
  });
});

describe('noUnreferencedAssetsRule', () => {
  it('flags assets with zero references when signals are provided', () => {
    const used = asset({ path: '/w/used.json' });
    const unused = asset({ path: '/w/unused.json' });

    const violations = noUnreferencedAssetsRule.evaluate({
      workspacePath: '/workspace',
      assets: [used, unused],
      options: undefined,
      signals: {
        referenceCounts: new Map([
          ['/w/used.json', 3],
          ['/w/unused.json', 0],
        ]),
      },
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/unused.json');
  });

  it('reports nothing when referenceCounts signal is absent', () => {
    const violations = noUnreferencedAssetsRule.evaluate({
      ...baseContext,
      assets: [asset({ path: '/w/a.json' })],
      options: undefined,
    });
    expect(violations).toHaveLength(0);
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

    const violations = allowedFormatsRule.evaluate({
      ...baseContext,
      assets: [lottie, gif],
      options: { formats: new Set(['lottie']) },
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.asset.path).toBe('/w/b.gif');
  });
});
