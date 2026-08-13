import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCheckCommand } from '../../src/cli/check-command';
import { CLI_EXIT_CODES } from '../../src/cli/exit-codes';

/**
 * End-to-end truthfulness of `animoria check`.
 *
 * ## Why these cross the whole seam
 * Every rule in this repository was already unit-tested, and every one of those
 * tests passed while `animoria check` reported `PASS · 100/100 · exit 0` on a
 * workspace whose only asset was unreferenced. The defect lived *between* the
 * tested units: the command asked the indexer for a snapshot that did not yet
 * contain reference evidence, the rule correctly declined to run against it, and
 * the report presented the resulting empty diagnostic list as a clean bill of
 * health.
 *
 * So these tests deliberately exercise the real path — argv → workspace
 * initialization → rule engine → report → exit code — against real fixture
 * workspaces on disk. A rule-level unit test cannot observe this class of bug, and
 * adding more of them would not have caught it.
 */
const FIXTURES = resolve(process.cwd(), '../../fixtures');
const fixture = (name: string) => resolve(FIXTURES, name);

/**
 * Parses the JSON rendering of a run, which is the machine-facing contract.
 *
 * `analysis` is returned alongside the report because every governance *fact* now
 * lives there — the report itself carries only the verdict and timing. Assertions
 * below read facts from `analysis` and the pass/fail decision from `report`, which
 * is exactly the separation the unified aggregate exists to enforce.
 */
async function checkJson(name: string) {
  const result = await runCheckCommand([fixture(name), '--format', 'json']);
  const report = JSON.parse(result.output);
  return { exitCode: result.exitCode, report, analysis: report.analysis };
}

describe('animoria check — reference-dependent rules actually run', () => {
  it('fails with exit 1 when a configured "error" rule finds an unreferenced asset', async () => {
    // THE regression test for the audit's primary P0. Before the lifecycle fix this
    // returned exit 0 with zero diagnostics and a perfect score.
    const { exitCode, report, analysis } = await checkJson('unreferenced-assets');

    expect(exitCode).toBe(CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS);
    expect(report.outcome.passed).toBe(false);
    expect(analysis.diagnostics).toHaveLength(1);
    expect(analysis.diagnostics[0].ruleId).toBe('no-unreferenced-assets');
    expect(analysis.diagnostics[0].severity).toBe('error');
    expect(analysis.diagnostics[0].asset.path).toContain('hero-v2.json');
  });

  it('reports the rule as evaluated, never as skipped, once evidence exists', async () => {
    const { report, analysis } = await checkJson('unreferenced-assets');

    expect(analysis.evaluatedRuleIds).toContain('no-unreferenced-assets');
    expect(analysis.skippedRules).toHaveLength(0);
  });

  it('guarantees the analysis behind the verdict is complete', async () => {
    const { report, analysis } = await checkJson('unreferenced-assets');

    // A verdict rendered from an incomplete analysis is exactly what produced the
    // false green; the report now states which it is.
    expect(analysis.readiness.complete).toBe(true);
    expect(analysis.readiness.referencesResolved).toBe(true);
  });

  it('passes a genuinely clean workspace, and says what it checked', async () => {
    const { exitCode, report, analysis } = await checkJson('clean-workspace');

    expect(exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(analysis.diagnostics).toHaveLength(0);
    expect(analysis.evaluatedRuleIds).toEqual(
      expect.arrayContaining(['no-gif', 'no-unreferenced-assets', 'max-file-size-kb'])
    );
    expect(analysis.skippedRules).toHaveLength(0);
  });

  it('detects referenced and unreferenced assets in the same workspace', async () => {
    const { exitCode, report, analysis } = await checkJson('mixed-governance');

    expect(exitCode).toBe(CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS);
    const byRule = (id: string) =>
      analysis.diagnostics.filter((d: { ruleId: string }) => d.ruleId === id);

    expect(byRule('no-gif')).toHaveLength(1);
    expect(byRule('max-file-size-kb')).toHaveLength(1);
    // `ok.json`, `oversized.json` and `legacy.gif` are imported; only `forgotten.json` is not.
    expect(byRule('no-unreferenced-assets')).toHaveLength(1);
    expect(byRule('no-unreferenced-assets')[0].asset.path).toContain('forgotten.json');
  });
});

describe('animoria check — every finding names its file', () => {
  it('includes the asset path, not just its name, in human-readable output', async () => {
    const result = await runCheckCommand([fixture('unreferenced-assets'), '--format', 'terminal']);

    expect(result.output).toContain('fixtures/unreferenced-assets/assets/hero-v2.json');
  });

  it('includes the asset path in the Markdown rendering used by PR bots', async () => {
    const result = await runCheckCommand([fixture('unreferenced-assets'), '--format', 'markdown']);

    expect(result.output).toContain('assets/hero-v2.json');
  });
});

describe('animoria check — absence findings disclose their coverage', () => {
  it('states which extensions were scanned and which were not', async () => {
    const { report, analysis } = await checkJson('reference-edge-cases');

    // Markup, style and markdown are now read, so they must no longer appear as
    // skipped — the disclosure tracks what the scanner actually does.
    expect(analysis.coverage.scannedExtensions).toEqual(
      expect.arrayContaining(['.ts', '.html', '.css', '.scss', '.md', '.mdx', '.astro', '.vue'])
    );
    expect(analysis.coverage.unscannedExtensions).toEqual(
      expect.arrayContaining(['.json', '.yaml', '.xml'])
    );
    for (const nowScanned of ['.html', '.css', '.md']) {
      expect(analysis.coverage.unscannedExtensions).not.toContain(nowScanned);
    }
  });

  it('reports coverage as partial while any reference-bearing format is unread', async () => {
    const { report, analysis } = await checkJson('reference-edge-cases');

    expect(analysis.coverage.status).toBe('partial');
    expect(analysis.coverage.referencesDetected).toBeGreaterThan(0);
  });

  it('surfaces the unscanned extensions in terminal output alongside the findings', async () => {
    const result = await runCheckCommand([fixture('reference-edge-cases'), '--format', 'terminal']);

    expect(result.output).toContain('not scanned:');
    expect(result.output).toContain('.css');
  });

  it('detects references from markup, style and markdown, not only from code', async () => {
    const { report, analysis } = await checkJson('reference-edge-cases');
    const flagged = analysis.diagnostics.map((d: { asset: { name: string } }) => d.asset.name);

    // Each of these was reported as unreferenced before format handlers existed.
    for (const nowFound of [
      'from-ts.json',
      'from-html.json',
      'from-css.json',
      'from-markdown.json',
    ]) {
      expect(flagged).not.toContain(nowFound);
    }
  });

  it('still declines to guess at formats it cannot read reliably', async () => {
    const { report, analysis } = await checkJson('reference-edge-cases');
    const flagged = analysis.diagnostics.map((d: { asset: { name: string } }) => d.asset.name);

    // Named inside a .json data file, where no syntax distinguishes a reference from
    // an arbitrary string. Reported as unreferenced, and the coverage says why.
    expect(flagged).toContain('only-in-json-data.json');
    // Named in Markdown inline code — prose *about* a file, not a use of it.
    expect(flagged).toContain('only-in-inline-code.json');
  });

  it('caps confidence at "moderate" while coverage is partial', async () => {
    const { report, analysis } = await checkJson('reference-edge-cases');

    for (const diagnostic of analysis.diagnostics) {
      expect(diagnostic.confidence).toBe('moderate');
    }
  });

  it('honours an inline // animoria-ignore directive', async () => {
    const { report, analysis } = await checkJson('reference-edge-cases');
    const flagged = analysis.diagnostics.map((d: { asset: { name: string } }) => d.asset.name);

    expect(flagged).toContain('only-in-comment.json');
  });
});

describe('animoria check — empty and unconfigured workspaces', () => {
  it('does not present an empty workspace as perfectly healthy', async () => {
    const { report, analysis } = await checkJson('empty-workspace');

    expect(analysis.assets).toHaveLength(0);
    expect(analysis.health.status).toBe('unavailable');
    expect(analysis.health.reason).toBe('no-assets-discovered');
  });

  it('renders "not available" instead of a score for an empty workspace', async () => {
    const result = await runCheckCommand([fixture('empty-workspace'), '--format', 'terminal']);

    expect(result.output).toContain('Health Score: not available');
    expect(result.output).not.toMatch(/Health Score: \d+\/100/);
  });

  it('does not invent a violation just to force a non-zero exit', async () => {
    const { exitCode, report, analysis } = await checkJson('empty-workspace');

    expect(analysis.diagnostics).toHaveLength(0);
    expect(exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
  });

  it('reports a malformed workspace without crashing', async () => {
    const { exitCode, report, analysis } = await checkJson('malformed-assets');

    expect(exitCode).not.toBe(CLI_EXIT_CODES.INTERNAL_ERROR);
    expect(analysis.assets.length).toBeGreaterThanOrEqual(0);
  });
});

describe('animoria check — invalid workspace', () => {
  it('reports a nonexistent path as a workspace error, never as a clean result', async () => {
    const result = await runCheckCommand([resolve(FIXTURES, '__does_not_exist__')]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.WORKSPACE_ERROR);
    expect(result.output).toContain('does not exist or is not accessible');
    expect(result.output).not.toContain('PASS');
  });
});
