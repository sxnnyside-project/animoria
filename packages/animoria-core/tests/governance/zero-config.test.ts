import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultRuleRegistry } from '../../src/governance/rules/builtins/index';
import { DEFAULT_POLICY, resolveRulePolicy } from '../../src/governance/rules/default-policy';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';

/**
 * Animoria works before anyone configures it.
 *
 * ## The regression
 * `RulesEngine.run()` iterates `Object.entries(config.rulesConfig)`, and `rulesConfig`
 * was `.animoriarc`'s `rules` object verbatim — `{}` when there was no file. A fresh
 * workspace therefore ran **zero rules**: no findings, no diagnostics, and a Health
 * Score reported `unavailable` with "Add a `.animoriarc` to define a policy".
 *
 * A developer installing the extension on an existing repository got a working index,
 * a working reference scan, and a governance surface stating it had nothing to say.
 * Configuration had become a prerequisite for the product rather than an override on
 * it.
 *
 * ## What these assert
 * Not that particular rules fire — that is each rule's own suite. That Animoria
 * *reaches a verdict at all* with no configuration present, and that adding a config
 * changes the policy rather than replacing it.
 */

const workspaces: string[] = [];

function makeWorkspace(withConfig?: string): string {
  const root = mkdtempSync(join(tmpdir(), 'animoria-zeroconf-'));
  workspaces.push(root);
  mkdirSync(join(root, 'assets'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'assets', 'orphan.json'),
    JSON.stringify({ v: '5.7.4', fr: 30, ip: 0, op: 60, w: 100, h: 100, layers: [] })
  );
  writeFileSync(join(root, 'src', 'app.ts'), 'export const nothing = 1;\n');
  if (withConfig !== undefined) writeFileSync(join(root, '.animoriarc.json'), withConfig);
  return root;
}

afterEach(() => {
  for (const root of workspaces.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('zero-config — the default policy is the baseline', () => {
  it('names only rules that are actually registered', () => {
    // A default naming a rule that does not exist surfaces as a *config error* on a
    // workspace whose author wrote no config — the worst possible first impression,
    // and one only this check can catch, since no fixture would ever reproduce it.
    const registry = createDefaultRuleRegistry();
    for (const ruleId of Object.keys(DEFAULT_POLICY)) {
      expect(registry.get(ruleId), `"${ruleId}" is not a registered rule`).toBeDefined();
    }
  });

  it('parses cleanly against every rule it names', () => {
    // Each default must satisfy its own rule's `parseOptions`. `allowed-formats` is
    // absent from the policy precisely because it has a required payload and no
    // defensible default; listing it as `'off'` produced a parse error out of the box.
    const registry = createDefaultRuleRegistry();
    for (const [ruleId, value] of Object.entries(DEFAULT_POLICY)) {
      const parsed = registry.get(ruleId)!.parseOptions(value);
      expect(parsed.valid, `"${ruleId}": ${parsed.valid ? '' : parsed.errors.join(', ')}`).toBe(
        true
      );
    }
  });

  it('extends a loaded config rather than being replaced by it', () => {
    // "I configured one rule" and "I disabled every rule I did not name" are very
    // different statements, and the old behaviour could only ever see the second.
    const merged = resolveRulePolicy({ 'no-duplicate-content': 'warning' });

    expect(merged['no-duplicate-content'], 'the override wins').toBe('warning');
    expect(merged['no-unreferenced-assets'], 'the unmentioned default survives').toBe(
      DEFAULT_POLICY['no-unreferenced-assets']
    );
  });

  it('lets a project switch a default off explicitly', () => {
    expect(resolveRulePolicy({ 'no-duplicate-content': 'off' })['no-duplicate-content']).toBe(
      'off'
    );
  });
});

describe('zero-config — a workspace with no configuration reaches a verdict', () => {
  it('evaluates rules and computes health with no .animoriarc at all', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: makeWorkspace() });
    try {
      const analysis = await indexer.analyzeComplete();

      expect(analysis.assets.length, 'the asset is indexed').toBe(1);
      expect(analysis.evaluatedRuleIds.length, 'rules ran without configuration').toBeGreaterThan(
        0
      );
      expect(analysis.health.status, 'a health score is reachable with no configuration').toBe(
        'computed'
      );
      // Zero-config must not look like a broken config.
      expect(analysis.configErrors, 'the defaults produce no config errors').toEqual([]);
    } finally {
      indexer.dispose();
    }
  });

  it('reaches a verdict on an entirely empty workspace', async () => {
    // No assets, no config, no source. The emptiest case there is, and the one most
    // likely to reach a code path nobody exercised.
    const root = mkdtempSync(join(tmpdir(), 'animoria-empty-'));
    workspaces.push(root);

    const indexer = new WorkspaceIndexer({ workspacePath: root });
    try {
      const analysis = await indexer.analyzeComplete();
      expect(analysis.assets).toEqual([]);
      expect(analysis.configErrors).toEqual([]);
      expect(analysis.failure, 'an empty workspace is not a failed one').toBeNull();
      expect(analysis.readiness.complete).toBe(true);
    } finally {
      indexer.dispose();
    }
  });

  it('survives a malformed config by falling back to the defaults', async () => {
    // A broken `.animoriarc` used to mean `rulesConfig = {}` — the same silence as no
    // config at all. Warning and continuing is the useful behaviour: the developer is
    // told their file is wrong *and* still sees governance.
    const indexer = new WorkspaceIndexer({ workspacePath: makeWorkspace('{ not json') });
    try {
      const analysis = await indexer.analyzeComplete();
      expect(analysis.evaluatedRuleIds.length, 'the defaults still run').toBeGreaterThan(0);
      expect(analysis.health.status).toBe('computed');
    } finally {
      indexer.dispose();
    }
  });

  it('applies a project config over the defaults', async () => {
    const indexer = new WorkspaceIndexer({
      workspacePath: makeWorkspace('{"rules":{"no-unreferenced-assets":"off"}}'),
    });
    try {
      const analysis = await indexer.analyzeComplete();
      expect(analysis.evaluatedRuleIds).not.toContain('no-unreferenced-assets');
      // …and the rules the project did not mention are still enforced.
      expect(analysis.evaluatedRuleIds.length).toBeGreaterThan(0);
    } finally {
      indexer.dispose();
    }
  });
});
