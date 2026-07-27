import { describe, expect, it } from 'vitest';
import { buildGovernanceCheckReport } from '../../src/cli/report/build-report';
import type { RuleDiagnostic } from '../../src/governance/rules-engine';
import type { WorkspaceIndexSnapshot } from '../../src/indexer/workspace-indexer';
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

function diagnostic(severity: 'error' | 'warning'): RuleDiagnostic {
  return { ruleId: 'no-gif', severity, asset: asset(), message: 'msg' };
}

function snapshot(overrides: Partial<WorkspaceIndexSnapshot> = {}): WorkspaceIndexSnapshot {
  return {
    assets: [asset()],
    ruleReport: {
      diagnostics: [],
      configErrors: [],
      evaluatedRuleIds: ['no-gif'],
      durationMs: 1,
    },
    healthScore: null,
    referenceCounts: new Map(),
    generation: 1,
    ...overrides,
  };
}

describe('buildGovernanceCheckReport', () => {
  it('passes through basic metadata', () => {
    const report = buildGovernanceCheckReport(snapshot(), '/w', 123, {});
    expect(report.workspacePath).toBe('/w');
    expect(report.durationMs).toBe(123);
    expect(report.totalAssetCount).toBe(1);
    expect(report.evaluatedRuleIds).toEqual(['no-gif']);
  });

  it('counts diagnostics by severity', () => {
    const report = buildGovernanceCheckReport(
      snapshot({
        ruleReport: {
          diagnostics: [diagnostic('error'), diagnostic('error'), diagnostic('warning')],
          configErrors: [],
          evaluatedRuleIds: ['no-gif'],
          durationMs: 1,
        },
      }),
      '/w',
      0,
      {}
    );
    expect(report.diagnosticCountBySeverity).toEqual({ error: 2, warning: 1 });
  });

  it('defaults empty diagnostics/configErrors/evaluatedRuleIds when ruleReport is null', () => {
    const report = buildGovernanceCheckReport(snapshot({ ruleReport: null }), '/w', 0, {});
    expect(report.diagnostics).toEqual([]);
    expect(report.configErrors).toEqual([]);
    expect(report.evaluatedRuleIds).toEqual([]);
  });

  it('merges config-load warnings ahead of rule-level config errors', () => {
    const report = buildGovernanceCheckReport(
      snapshot({
        ruleReport: {
          diagnostics: [],
          configErrors: [{ ruleId: 'unknown-rule', errors: ['not registered'] }],
          evaluatedRuleIds: [],
          durationMs: 1,
        },
      }),
      '/w',
      0,
      {},
      ['Invalid JSON in .animoriarc.json']
    );
    expect(report.configErrors).toHaveLength(2);
    expect(report.configErrors[0]?.errors).toEqual(['Invalid JSON in .animoriarc.json']);
    expect(report.configErrors[1]?.ruleId).toBe('unknown-rule');
  });

  it('computes outcome via determineCheckOutcome using the snapshot health score', () => {
    const failing = buildGovernanceCheckReport(
      snapshot({
        ruleReport: {
          diagnostics: [diagnostic('error')],
          configErrors: [],
          evaluatedRuleIds: ['no-gif'],
          durationMs: 1,
        },
      }),
      '/w',
      0,
      {}
    );
    expect(failing.outcome.passed).toBe(false);

    const passing = buildGovernanceCheckReport(snapshot(), '/w', 0, {});
    expect(passing.outcome.passed).toBe(true);
  });
});
