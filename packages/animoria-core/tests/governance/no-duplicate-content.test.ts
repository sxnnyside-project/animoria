import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WorkspaceAnalysis } from '../../src/analysis/workspace-analysis';
import type { RuleDiagnostic } from '../../src/governance/rules-engine';
import { noDuplicateContentRule } from '../../src/governance/rules/builtins/no-duplicate-content.rule';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';

/**
 * `no-duplicate-content` — the rule that replaced `GovernanceAnalyzer`'s duplicate
 * detection.
 *
 * ## What these tests are really guarding
 * Three claims used to be conflated under one word, "duplicate":
 *
 *   1. two files with the same *contents*  — deleting one is safe;
 *   2. two files with the same *name*      — deleting one loses data;
 *   3. two files that are simply both present.
 *
 * The old analyzer reported all of them through a single `category: 'duplicate'`
 * with no record of which test had actually been applied, and the cleanup UI
 * offered deletion for every one. So these tests run against a real workspace on
 * disk whose four cases are pulled apart deliberately, and assert that the rule
 * fires on exactly the content-identical ones and names its siblings.
 */
const FIXTURE = resolve(process.cwd(), '../../fixtures/duplicates');

async function analyzeFixture(): Promise<WorkspaceAnalysis> {
  const indexer = new WorkspaceIndexer({ workspacePath: FIXTURE });
  try {
    return await indexer.analyzeComplete();
  } finally {
    indexer.dispose();
  }
}

const named = (diagnostics: readonly RuleDiagnostic[], ruleId: string) =>
  diagnostics.filter((d) => d.ruleId === ruleId);

const pathsOf = (diagnostics: readonly RuleDiagnostic[]) =>
  diagnostics.map((d) => d.asset.path.slice(FIXTURE.length + 1)).sort();

describe('no-duplicate-content — against a real workspace', () => {
  it('flags every member of a byte-identical group, and nothing else', async () => {
    const analysis = await analyzeFixture();
    const flagged = pathsOf(named(analysis.diagnostics, 'no-duplicate-content'));

    // Both members of each group are reported: neither copy is privileged, and
    // deciding which one to keep is the developer's call, not the rule's.
    expect(flagged).toEqual([
      'assets/spinner.json',
      'packs/a/loader.json',
      'packs/b/loader.json',
      'vendor/spinner-copy.json',
    ]);
  });

  it('does not flag two assets that merely share a filename', async () => {
    const analysis = await analyzeFixture();
    const flagged = pathsOf(named(analysis.diagnostics, 'no-duplicate-content'));

    // `assets/logo.json` and `brand/logo.json` have the same name and different
    // contents. Offering to delete one of them would destroy an asset.
    expect(flagged).not.toContain('assets/logo.json');
    expect(flagged).not.toContain('brand/logo.json');
  });

  it('reports a name collision and a content collision as separate findings', async () => {
    const analysis = await analyzeFixture();

    const byName = pathsOf(named(analysis.diagnostics, 'no-duplicate-names'));
    const byContent = pathsOf(named(analysis.diagnostics, 'no-duplicate-content'));

    // `logo` collides by name only; `spinner`/`spinner-copy` by content only;
    // `loader` by both. Each rule answers its own question independently.
    expect(byName).toContain('assets/logo.json');
    expect(byContent).not.toContain('assets/logo.json');

    expect(byContent).toContain('vendor/spinner-copy.json');
    expect(byName).not.toContain('vendor/spinner-copy.json');

    expect(byName).toContain('packs/a/loader.json');
    expect(byContent).toContain('packs/a/loader.json');
  });

  it('names the siblings it found the asset identical to', async () => {
    const analysis = await analyzeFixture();
    const spinner = named(analysis.diagnostics, 'no-duplicate-content').find((d) =>
      d.asset.path.endsWith('assets/spinner.json')
    );

    expect(spinner).toBeDefined();
    expect(spinner?.evidence.kind).toBe('content-hash');
    expect(spinner?.evidence.locations?.map((l) => l.file)).toEqual([
      resolve(FIXTURE, 'vendor/spinner-copy.json'),
    ]);
    // The reader can verify the claim without re-running anything: the summary
    // states what was compared, not merely that a comparison happened.
    expect(spinner?.evidence.summary).toMatch(/^Content hash [0-9a-f]{12} is shared with 1 /);
  });

  it('claims certainty, because byte equality is not weakened by scan coverage', async () => {
    const analysis = await analyzeFixture();

    for (const diagnostic of named(analysis.diagnostics, 'no-duplicate-content')) {
      expect(diagnostic.confidence).toBe('certain');
      // Unlike an absence finding, this one does not depend on how much of the
      // workspace the reference scan managed to read.
      expect(diagnostic.coverage).toBeUndefined();
    }
  });

  it('carries the match basis in its evidence, so a client never has to guess', async () => {
    const analysis = await analyzeFixture();
    const [first] = named(analysis.diagnostics, 'no-duplicate-content');

    expect(first?.evidence.data?.matchKind).toBe('content-hash');
    expect(first?.evidence.data?.contentHash).toEqual(expect.any(String));
  });
});

describe('no-duplicate-content — when hashes are unavailable', () => {
  it('declares itself skipped rather than reporting no duplicates', () => {
    // The rule performs no I/O of its own. With no groups supplied, "there are no
    // duplicates" and "nobody looked" would be the same empty result — which is
    // precisely the confusion the outcome union exists to prevent.
    const outcome = noDuplicateContentRule.evaluate({
      assets: [],
      options: undefined,
      workspacePath: '/w',
      signals: {},
    } as never);

    expect(outcome.status).toBe('skipped');
    expect(outcome.status === 'skipped' && outcome.reason.code).toBe('missing-signal');
  });

  it('is reported as skipped, not as clean, on the fast pre-analysis snapshot', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: FIXTURE });
    try {
      const fast = await indexer.initializeFast();

      expect(fast.skippedRules.map((r) => r.ruleId)).toContain('no-duplicate-content');
      expect(fast.evaluatedRuleIds).not.toContain('no-duplicate-content');
      await indexer.whenIdle();
    } finally {
      indexer.dispose();
    }
  });
});
