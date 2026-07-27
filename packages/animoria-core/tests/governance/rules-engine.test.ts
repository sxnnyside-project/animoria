import { describe, expect, it } from 'vitest';
import { RulesEngine } from '../../src/governance/rules-engine';
import { RuleRegistry } from '../../src/governance/rules/rule-registry';
import type { AnimoriaAsset } from '../../src/types/asset';

function asset(overrides: Partial<AnimoriaAsset>): AnimoriaAsset {
  return {
    path: '/w/asset.json',
    name: 'asset.json',
    stem: 'asset',
    format: 'lottie',
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed',
    ...overrides,
  };
}

describe('RulesEngine', () => {
  it('runs built-in rules end-to-end and produces diagnostics', () => {
    const gif = asset({ path: '/w/a.gif', name: 'a.gif', stem: 'a', format: 'gif' });

    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [gif],
      rulesConfig: { 'no-gif': 'error' },
    });

    const report = engine.run();

    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]).toMatchObject({ ruleId: 'no-gif', severity: 'error' });
    expect(report.evaluatedRuleIds).toEqual(['no-gif']);
    expect(report.configErrors).toHaveLength(0);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('records a config error for an unknown rule id without aborting the run', () => {
    const gif = asset({ path: '/w/a.gif', format: 'gif' });

    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [gif],
      rulesConfig: { 'totally-made-up-rule': 'error', 'no-gif': 'error' },
    });

    const report = engine.run();

    expect(report.configErrors).toEqual([
      {
        ruleId: 'totally-made-up-rule',
        errors: ['No rule is registered with id "totally-made-up-rule".'],
      },
    ]);
    expect(report.diagnostics).toHaveLength(1); // no-gif still ran
  });

  it('records a config error for an invalid rule value without aborting the run', () => {
    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [asset({ path: '/w/a.json' })],
      rulesConfig: { 'max-file-size-kb': 'not-a-number', 'no-gif': 'error' },
    });

    const report = engine.run();

    expect(report.configErrors).toHaveLength(1);
    expect(report.configErrors[0]?.ruleId).toBe('max-file-size-kb');
    expect(report.evaluatedRuleIds).toEqual(['no-gif']);
  });

  it('does not evaluate a rule configured "off", and excludes it from evaluatedRuleIds', () => {
    const gif = asset({ path: '/w/a.gif', format: 'gif' });

    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [gif],
      rulesConfig: { 'no-gif': 'off' },
    });

    const report = engine.run();

    expect(report.diagnostics).toHaveLength(0);
    expect(report.evaluatedRuleIds).toHaveLength(0);
    expect(report.configErrors).toHaveLength(0);
  });

  it('produces the same report on repeated calls (deterministic)', () => {
    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [asset({ path: '/w/a.gif', format: 'gif' })],
      rulesConfig: { 'no-gif': 'warning' },
    });

    const first = engine.run();
    const second = engine.run();

    expect(second.diagnostics).toEqual(first.diagnostics);
    expect(second.evaluatedRuleIds).toEqual(first.evaluatedRuleIds);
  });

  it('passes signals through to rules that depend on them', () => {
    const unused = asset({ path: '/w/unused.json' });

    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [unused],
      rulesConfig: { 'no-unreferenced-assets': 'error' },
      signals: { referenceCounts: new Map([['/w/unused.json', 0]]) },
    });

    const report = engine.run();
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]?.ruleId).toBe('no-unreferenced-assets');
  });

  it('accepts a caller-supplied registry in place of the built-in default', () => {
    const registry = new RuleRegistry();
    registry.register({
      id: 'always-fails',
      description: 'test rule',
      parseOptions: () => ({ valid: true, severity: 'error', options: undefined }),
      evaluate: (context) => context.assets.map((asset) => ({ asset, message: 'always fails' })),
    });

    const engine = new RulesEngine({
      workspacePath: '/w',
      assets: [asset({ path: '/w/a.json' })],
      rulesConfig: { 'always-fails': 'error' },
      registry,
    });

    const report = engine.run();
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]?.message).toBe('always fails');
  });

  it('returns an empty report for an empty rulesConfig', () => {
    const engine = new RulesEngine({ workspacePath: '/w', assets: [], rulesConfig: {} });
    const report = engine.run();
    expect(report).toMatchObject({ diagnostics: [], configErrors: [], evaluatedRuleIds: [] });
  });
});
