import { describe, expect, it } from 'vitest';
import { evaluateAssetBadges } from '../../src/governance/badges/evaluate-asset-badges';
import type { RuleDiagnostic } from '../../src/governance/rules-engine';
import type { AnimoriaAsset } from '../../src/types/asset';

function asset(path = '/w/hero.json'): AnimoriaAsset {
  const name = path.split('/').pop()!;
  return {
    path,
    name,
    stem: name.replace(/\.\w+$/, ''),
    format: 'lottie',
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed',
  };
}

function diagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  return { ruleId: 'no-gif', severity: 'error', asset: asset(), message: 'msg', ...overrides };
}

describe('evaluateAssetBadges', () => {
  it('returns no badges when no context signal applies', () => {
    expect(evaluateAssetBadges(asset(), {})).toEqual([]);
  });

  it('flags an asset with zero references as orphaned', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, { referenceCounts: new Map([[a.path, 0]]) });
    expect(badges).toHaveLength(1);
    expect(badges[0]!.kind).toBe('orphaned');
    expect(badges[0]!.severity).toBe('warning');
  });

  it('does not flag an asset with references as orphaned', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, { referenceCounts: new Map([[a.path, 3]]) });
    expect(badges).toHaveLength(0);
  });

  it('does not flag an asset absent from referenceCounts (unknown, not zero)', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, { referenceCounts: new Map() });
    expect(badges).toHaveLength(0);
  });

  it('flags an asset present in duplicateAssetPaths as duplicate', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, { duplicateAssetPaths: new Set([a.path]) });
    expect(badges).toHaveLength(1);
    expect(badges[0]!.kind).toBe('duplicate');
    expect(badges[0]!.severity).toBe('info');
  });

  it('flags an asset with rule diagnostics as rule-violation', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, {
      diagnosticsByAssetPath: new Map([[a.path, [diagnostic({ asset: a })]]]),
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]!.kind).toBe('rule-violation');
    expect(badges[0]!.severity).toBe('error');
  });

  it('uses "warning" severity for rule-violation when no diagnostic is error-severity', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, {
      diagnosticsByAssetPath: new Map([[a.path, [diagnostic({ asset: a, severity: 'warning' })]]]),
    });
    expect(badges[0]!.severity).toBe('warning');
  });

  it('combines multiple applicable badges in a fixed, deterministic order', () => {
    const a = asset();
    const badges = evaluateAssetBadges(a, {
      referenceCounts: new Map([[a.path, 0]]),
      duplicateAssetPaths: new Set([a.path]),
      diagnosticsByAssetPath: new Map([[a.path, [diagnostic({ asset: a })]]]),
    });
    expect(badges.map((b) => b.kind)).toEqual(['orphaned', 'duplicate', 'rule-violation']);
  });

  it('never inspects assets other than the one it was called for', () => {
    const a = asset('/w/a.json');
    const b = asset('/w/b.json');
    const badges = evaluateAssetBadges(a, {
      referenceCounts: new Map([[b.path, 0]]),
    });
    expect(badges).toHaveLength(0);
  });
});
