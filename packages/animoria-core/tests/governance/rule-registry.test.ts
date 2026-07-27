import { describe, expect, it } from 'vitest';
import { createDefaultRuleRegistry } from '../../src/governance/rules/builtins/index';
import { RuleRegistry } from '../../src/governance/rules/rule-registry';
import type { GovernanceRule } from '../../src/governance/rules/types';

function fakeRule(id: string): GovernanceRule<void> {
  return {
    id,
    description: 'fake',
    parseOptions: () => ({ valid: true, severity: 'error', options: undefined }),
    evaluate: () => [],
  };
}

describe('RuleRegistry', () => {
  it('returns undefined for an unregistered id', () => {
    const registry = new RuleRegistry();
    expect(registry.get('nope')).toBeUndefined();
    expect(registry.has('nope')).toBe(false);
  });

  it('registers and retrieves a rule by id', () => {
    const registry = new RuleRegistry();
    const rule = fakeRule('my-rule');
    registry.register(rule);

    expect(registry.get('my-rule')).toBe(rule);
    expect(registry.has('my-rule')).toBe(true);
  });

  it('overwrites a previous registration under the same id', () => {
    const registry = new RuleRegistry();
    const first = fakeRule('dup');
    const second = fakeRule('dup');
    registry.register(first);
    registry.register(second);

    expect(registry.get('dup')).toBe(second);
    expect(registry.list()).toHaveLength(1);
  });

  it('lists every registered rule', () => {
    const registry = new RuleRegistry();
    registry.register(fakeRule('a'));
    registry.register(fakeRule('b'));
    expect(
      registry
        .list()
        .map((r) => r.id)
        .sort()
    ).toEqual(['a', 'b']);
  });
});

describe('createDefaultRuleRegistry', () => {
  it('registers all five built-in rules', () => {
    const registry = createDefaultRuleRegistry();
    const ids = registry
      .list()
      .map((r) => r.id)
      .sort();
    expect(ids).toEqual(
      [
        'allowed-formats',
        'max-file-size-kb',
        'no-duplicate-names',
        'no-gif',
        'no-unreferenced-assets',
      ].sort()
    );
  });

  it('returns a fresh, independent instance on each call', () => {
    const a = createDefaultRuleRegistry();
    const b = createDefaultRuleRegistry();
    a.register(fakeRule('only-in-a'));
    expect(b.has('only-in-a')).toBe(false);
  });
});
