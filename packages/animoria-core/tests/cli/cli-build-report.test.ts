import { describe, expect, it } from 'vitest';
import { diagnosticCountBySeverity, totalAssetCount } from '../../src/analysis/workspace-analysis';
import { buildGovernanceCheckReport } from '../../src/cli/report/build-report';
import { testAnalysis, testDiagnostic } from '../support/analysis.js';

/**
 * `buildGovernanceCheckReport` is a projection, not a computation: it attaches a
 * pass/fail verdict and timing to an analysis it does not otherwise touch. These
 * tests assert exactly that — that facts arrive unaltered, and that the only new
 * value is the outcome.
 */
describe('buildGovernanceCheckReport', () => {
  it('carries the analysis through unmodified', () => {
    const analysis = testAnalysis();
    const report = buildGovernanceCheckReport(analysis, 123, {});

    // Identity, not deep equality: a copy would be a second source of truth.
    expect(report.analysis).toBe(analysis);
    expect(report.durationMs).toBe(123);
    expect(report.analysis.workspacePath).toBe('/w');
    expect(totalAssetCount(report.analysis)).toBe(1);
    expect(report.analysis.evaluatedRuleIds).toEqual(['no-gif']);
  });

  it('counts diagnostics by severity off the analysis', () => {
    const report = buildGovernanceCheckReport(
      testAnalysis({
        diagnostics: [
          testDiagnostic({ severity: 'error' }),
          testDiagnostic({ severity: 'error' }),
          testDiagnostic({ severity: 'warning' }),
        ],
      }),
      0,
      {}
    );

    expect(diagnosticCountBySeverity(report.analysis)).toEqual({ error: 2, warning: 1 });
  });

  it('reports an analysis that ran no rules as empty rather than as clean', () => {
    const report = buildGovernanceCheckReport(
      testAnalysis({ diagnostics: [], evaluatedRuleIds: [], configErrors: [] }),
      0,
      {}
    );

    expect(report.analysis.diagnostics).toEqual([]);
    expect(report.analysis.configErrors).toEqual([]);
    expect(report.analysis.evaluatedRuleIds).toEqual([]);
    // An empty diagnostic list with no rules evaluated is not a health score of
    // 100 — see the health outcome union.
    expect(report.analysis.health.status).toBe('unavailable');
  });

  it('surfaces config errors from the analysis in order', () => {
    const report = buildGovernanceCheckReport(
      testAnalysis({
        evaluatedRuleIds: [],
        configErrors: [
          { ruleId: '<.animoriarc>', errors: ['Invalid JSON in .animoriarc.json'] },
          { ruleId: 'unknown-rule', errors: ['not registered'] },
        ],
      }),
      0,
      {}
    );

    expect(report.analysis.configErrors).toHaveLength(2);
    expect(report.analysis.configErrors[0]?.errors).toEqual(['Invalid JSON in .animoriarc.json']);
    expect(report.analysis.configErrors[1]?.ruleId).toBe('unknown-rule');
  });

  it('computes the outcome via determineCheckOutcome using the analysis health score', () => {
    const failing = buildGovernanceCheckReport(
      testAnalysis({ diagnostics: [testDiagnostic({ severity: 'error' })] }),
      0,
      {}
    );
    expect(failing.outcome.passed).toBe(false);

    const passing = buildGovernanceCheckReport(testAnalysis(), 0, {});
    expect(passing.outcome.passed).toBe(true);
  });
});
