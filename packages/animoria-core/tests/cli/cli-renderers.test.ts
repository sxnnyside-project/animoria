import { describe, expect, it } from 'vitest';
import type { GovernanceCheckReport } from '../../src/cli/report/governance-check-report';
import { jsonRenderer } from '../../src/cli/report/renderers/json-renderer';
import { markdownRenderer } from '../../src/cli/report/renderers/markdown-renderer';
import {
  RendererRegistry,
  createDefaultRendererRegistry,
} from '../../src/cli/report/renderers/renderer-registry';
import { terminalRenderer } from '../../src/cli/report/renderers/terminal-renderer';
import type { AnimoriaAsset } from '../../src/types/asset';

function asset(): AnimoriaAsset {
  return {
    path: '/w/a.gif',
    name: 'a.gif',
    stem: 'a',
    format: 'gif',
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed',
  };
}

function report(overrides: Partial<GovernanceCheckReport> = {}): GovernanceCheckReport {
  return {
    workspacePath: '/w',
    generatedAt: '2026-01-01T00:00:00.000Z',
    durationMs: 42,
    totalAssetCount: 1,
    healthScore: null,
    diagnostics: [],
    diagnosticCountBySeverity: { error: 0, warning: 0 },
    configErrors: [],
    evaluatedRuleIds: [],
    outcome: { passed: true, failureReasons: [] },
    ...overrides,
  };
}

describe('terminalRenderer', () => {
  it('renders PASS for a passing report', () => {
    const output = terminalRenderer.render(report());
    expect(output).toContain('Result: PASS');
  });

  it('renders FAIL and each failure reason for a failing report', () => {
    const output = terminalRenderer.render(
      report({ outcome: { passed: false, failureReasons: ['1 rule violation(s)'] } })
    );
    expect(output).toContain('Result: FAIL');
    expect(output).toContain('1 rule violation(s)');
  });

  it('includes each diagnostic message and severity', () => {
    const output = terminalRenderer.render(
      report({
        diagnostics: [
          { ruleId: 'no-gif', severity: 'error', asset: asset(), message: 'a.gif is a GIF' },
        ],
        diagnosticCountBySeverity: { error: 1, warning: 0 },
      })
    );
    expect(output).toContain('[ERROR] no-gif: a.gif is a GIF');
  });

  it('includes the health score when present', () => {
    const output = terminalRenderer.render(
      report({
        healthScore: {
          score: 87,
          totalAssetCount: 1,
          totalDiagnosticCount: 0,
          categories: [],
          recommendations: [],
          generatedAt: '2026-01-01T00:00:00.000Z',
          durationMs: 1,
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
      report({ outcome: { passed: false, failureReasons: ['too many violations'] } })
    );
    expect(output).toContain('❌ Failed');
    expect(output).toContain('too many violations');
  });

  it('renders a table row per diagnostic', () => {
    const output = markdownRenderer.render(
      report({
        diagnostics: [{ ruleId: 'no-gif', severity: 'error', asset: asset(), message: 'msg' }],
      })
    );
    expect(output).toContain('`no-gif`');
    expect(output).toContain('`a.gif`');
  });

  it('is valid, well-formed Markdown with a title heading', () => {
    expect(markdownRenderer.render(report())).toMatch(/^## Animoria Governance Check/);
  });
});

describe('jsonRenderer', () => {
  it('round-trips the report through JSON.parse', () => {
    const input = report({ totalAssetCount: 7 });
    const parsed = JSON.parse(jsonRenderer.render(input));
    expect(parsed.totalAssetCount).toBe(7);
    expect(parsed.outcome).toEqual({ passed: true, failureReasons: [] });
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
