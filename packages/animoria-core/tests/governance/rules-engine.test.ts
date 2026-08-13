import { describe, expect, it } from 'vitest';
import { RulesEngine } from '../../src/governance/rules-engine';
import { RuleRegistry } from '../../src/governance/rules/rule-registry';
import { evaluated, skipped } from '../../src/governance/rules/types';
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
      evaluate: (context) =>
        evaluated(context.assets.map((asset) => ({ asset, message: 'always fails' }))),
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
    expect(report).toMatchObject({
      diagnostics: [],
      configErrors: [],
      evaluatedRuleIds: [],
      skippedRules: [],
    });
  });

  describe('skipped rules are never reported as evaluated', () => {
    function registryWith(outcome: 'evaluated' | 'skipped'): RuleRegistry {
      const registry = new RuleRegistry();
      registry.register({
        id: 'needs-a-signal',
        description: 'test rule',
        parseOptions: () => ({ valid: true, severity: 'error', options: undefined }),
        evaluate: () =>
          outcome === 'skipped'
            ? skipped('missing-signal', 'the signal was not supplied')
            : evaluated([]),
      });
      return registry;
    }

    it('records a skipped rule with its reason, and excludes it from evaluatedRuleIds', () => {
      const engine = new RulesEngine({
        workspacePath: '/w',
        assets: [asset({ path: '/w/a.json' })],
        rulesConfig: { 'needs-a-signal': 'error' },
        registry: registryWith('skipped'),
      });

      const report = engine.run();

      expect(report.evaluatedRuleIds).not.toContain('needs-a-signal');
      expect(report.skippedRules).toHaveLength(1);
      expect(report.skippedRules[0]).toMatchObject({
        ruleId: 'needs-a-signal',
        severity: 'error',
        reason: { code: 'missing-signal', message: 'the signal was not supplied' },
      });
    });

    it('records an evaluated rule with no violations as evaluated, not skipped', () => {
      const engine = new RulesEngine({
        workspacePath: '/w',
        assets: [asset({ path: '/w/a.json' })],
        rulesConfig: { 'needs-a-signal': 'error' },
        registry: registryWith('evaluated'),
      });

      const report = engine.run();

      // "Looked, found nothing" and "never looked" produce identical diagnostic
      // lists; only these two fields tell them apart.
      expect(report.evaluatedRuleIds).toContain('needs-a-signal');
      expect(report.skippedRules).toHaveLength(0);
    });

    it('keeps evaluatedRuleIds and skippedRules disjoint for the built-in rule set', () => {
      const engine = new RulesEngine({
        workspacePath: '/w',
        assets: [asset({ path: '/w/a.gif', format: 'gif', name: 'a.gif', stem: 'a' })],
        // Every built-in rule active, with no signals supplied at all — the state in
        // which a reference-dependent rule must declare that it could not run.
        rulesConfig: {
          'no-gif': 'warning',
          'max-file-size-kb': ['warning', 512],
          'no-duplicate-names': 'warning',
          'no-unreferenced-assets': 'error',
          'allowed-formats': ['warning', ['lottie']],
        },
      });

      const report = engine.run();
      const skippedIds = report.skippedRules.map((r) => r.ruleId);

      expect(skippedIds).toContain('no-unreferenced-assets');
      for (const id of skippedIds) {
        expect(report.evaluatedRuleIds).not.toContain(id);
      }
    });
  });
});
