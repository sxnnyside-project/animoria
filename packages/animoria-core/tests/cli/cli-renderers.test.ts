import { describe, expect, it } from 'vitest';
import type { WorkspaceAnalysis } from '../../src/analysis/workspace-analysis';
import type { GovernanceCheckReport } from '../../src/cli/report/governance-check-report';
import { jsonRenderer } from '../../src/cli/report/renderers/json-renderer';
import { markdownRenderer } from '../../src/cli/report/renderers/markdown-renderer';
import {
  RendererRegistry,
  createDefaultRendererRegistry,
} from '../../src/cli/report/renderers/renderer-registry';
import { terminalRenderer } from '../../src/cli/report/renderers/terminal-renderer';
import { testAnalysis, testDiagnostic } from '../support/analysis.js';

/** A diagnostic carrying the full evidence contract every real diagnostic carries. */
function diagnostic(overrides: Parameters<typeof testDiagnostic>[0] = {}) {
  return testDiagnostic({
    message: 'a.gif is a GIF',
    evidence: { kind: 'file-metadata', summary: 'Format is "gif".' },
    remediation: { summary: 'Convert the asset to Lottie or Rive.' },
    helpUri: 'https://example.invalid/rules',
    ...overrides,
  });
}

/**
 * A report is now an analysis plus a verdict, so a renderer test overrides the
 * analysis rather than a flattened copy of its fields. That is the point of the
 * change: there is no longer a place to put a diagnostic count that disagrees
 * with the diagnostics.
 */
function report(
  overrides: Partial<Omit<GovernanceCheckReport, 'analysis'>> & {
    analysis?: Partial<WorkspaceAnalysis>;
  } = {}
): GovernanceCheckReport {
  const { analysis, ...rest } = overrides;
  return {
    analysis: testAnalysis({ evaluatedRuleIds: [], ...analysis }),
    durationMs: 42,
    generatedAt: '2026-01-01T00:00:00.000Z',
    outcome: { passed: true, failureReasons: [], incomplete: false },
    ...rest,
  };
}

describe('terminalRenderer', () => {
  it('renders PASS for a passing report', () => {
    const output = terminalRenderer.render(report());
    expect(output).toContain('Result: PASS');
  });

  it('renders FAIL and each failure reason for a failing report', () => {
    const output = terminalRenderer.render(
      report({
        outcome: { passed: false, incomplete: false, failureReasons: ['1 rule violation(s)'] },
      })
    );
    expect(output).toContain('Result: FAIL');
    expect(output).toContain('1 rule violation(s)');
  });

  it('includes each diagnostic message and severity', () => {
    const output = terminalRenderer.render(report({ analysis: { diagnostics: [diagnostic()] } }));
    // The asset's full path leads each finding: a bare `a.gif` is not actionable in
    // a repository that contains several files by that name.
    expect(output).toContain('/w/a.gif');
    expect(output).toContain('error  no-gif  a.gif is a GIF');
    // Evidence and remediation are rendered from the diagnostic's own fields.
    expect(output).toContain('Format is "gif".');
    expect(output).toContain('Convert the asset to Lottie or Rive.');
    expect(output).toContain('confidence  certain');
  });

  it('includes the health score when present', () => {
    const output = terminalRenderer.render(
      report({
        analysis: {
          health: {
            status: 'computed',
            report: {
              score: 87,
              totalAssetCount: 1,
              totalDiagnosticCount: 0,
              categories: [],
              recommendations: [],
              qualifications: [],
              generatedAt: '2026-01-01T00:00:00.000Z',
              durationMs: 1,
            },
          },
        },
      })
    );
    expect(output).toContain('Health Score: 87/100');
  });

  it('produces deterministic output for the same report', () => {
    const r = report();
    expect(terminalRenderer.render(r)).toBe(terminalRenderer.render(r));
  });
});

describe('markdownRenderer', () => {
  it('renders a passing badge for a passing report', () => {
    expect(markdownRenderer.render(report())).toContain('✅ Passed');
  });

  it('renders a failing badge and reasons for a failing report', () => {
    const output = markdownRenderer.render(
      report({
        outcome: { passed: false, incomplete: false, failureReasons: ['too many violations'] },
      })
    );
    expect(output).toContain('❌ Failed');
    expect(output).toContain('too many violations');
  });

  it('renders a table row per diagnostic', () => {
    const output = markdownRenderer.render(
      report({ analysis: { diagnostics: [diagnostic({ message: 'msg' })] } })
    );
    expect(output).toContain('`no-gif`');
    expect(output).toContain('`/w/a.gif`');
  });

  it('is valid, well-formed Markdown with a title heading', () => {
    expect(markdownRenderer.render(report())).toMatch(/^## Animoria Governance Check/);
  });
});

describe('jsonRenderer', () => {
  it('round-trips the report through JSON.parse', () => {
    const input = report({ analysis: { generation: 7 } });
    const parsed = JSON.parse(jsonRenderer.render(input));
    expect(parsed.analysis.generation).toBe(7);
    expect(parsed.outcome).toEqual({ passed: true, failureReasons: [], incomplete: false });
  });

  it('produces pretty-printed, human-diffable JSON', () => {
    expect(jsonRenderer.render(report())).toContain('\n');
  });
});

describe('RendererRegistry', () => {
  it('registers and retrieves a renderer by format', () => {
    const registry = new RendererRegistry();
    registry.register(jsonRenderer);
    expect(registry.get('json')).toBe(jsonRenderer);
  });

  it('returns undefined for an unregistered format', () => {
    expect(new RendererRegistry().get('sarif')).toBeUndefined();
  });

  it('lists every registered format', () => {
    expect(createDefaultRendererRegistry().formats().sort()).toEqual([
      'json',
      'markdown',
      'terminal',
    ]);
  });
});
