import { describe, expect, it } from 'vitest';
import { HealthScoreEngine } from '../../src/governance/health-score';
import type { HealthScoreEvaluationInput } from '../../src/governance/health/types';
import { testAsset, testDiagnostic } from '../support/analysis.js';
import { expectComputedHealth, expectUnavailableHealth } from '../support/health.js';

/**
 * When the Health Score exists, and what it admits about itself when it does.
 *
 * ## Why this is a separate suite
 * The score used to be a bare `number | null`, and every consumer that read it
 * treated `null` as "not computed yet" — so an empty workspace, a workspace with
 * no rules configured, and a workspace whose analysis was cut short all rendered
 * as either a blank or, worse, a confident `100/100`. Each of those is a
 * different fact about the workspace, and only one of them ("every configured
 * rule ran and found nothing") means healthy.
 *
 * The outcome union encodes that distinction. These tests pin every state it can
 * take, because the states are the contract — a regression here reintroduces the
 * exact class of false reassurance the audit found.
 */

function evaluate(overrides: Partial<HealthScoreEvaluationInput> = {}) {
  const input: HealthScoreEvaluationInput = {
    diagnostics: [],
    totalAssetCount: 10,
    evaluatedRuleCount: 3,
    skippedRuleCount: 0,
    analysisComplete: true,
    ...overrides,
  };
  return new HealthScoreEngine().evaluate(input);
}

describe('Health Score availability', () => {
  describe('states in which no score is produced', () => {
    it('reports an incomplete analysis as unavailable, before anything else', () => {
      // Ordering matters: an interrupted run over an empty asset map is
      // *interrupted*, not empty. Reporting `no-assets-discovered` would send the
      // reader to check their workspace path for a problem that is not there.
      const outcome = evaluate({
        analysisComplete: false,
        totalAssetCount: 0,
        evaluatedRuleCount: 0,
      });

      expect(expectUnavailableHealth(outcome).reason).toBe('incomplete-analysis');
    });

    it('reports a workspace with no assets as unavailable, not as 100', () => {
      const outcome = evaluate({ totalAssetCount: 0 });
      const unavailable = expectUnavailableHealth(outcome);

      expect(unavailable.reason).toBe('no-assets-discovered');
      // The message has to be actionable on its own: it is rendered verbatim in
      // the terminal, the Problems panel and the JetBrains tool window.
      expect(unavailable.message).toMatch(/\.animoriaignore/);
    });

    it('reports a workspace with no rules configured as unavailable, not as 100', () => {
      // Zero diagnostics from zero rules is an absent policy, not a clean
      // workspace. This is the case that made `animoria check` print a perfect
      // score for a repository it had never actually examined.
      const outcome = evaluate({ evaluatedRuleCount: 0 });
      const unavailable = expectUnavailableHealth(outcome);

      expect(unavailable.reason).toBe('no-rules-configured');
      expect(unavailable.message).toMatch(/\.animoriarc/);
    });
  });

  describe('states in which a score is produced', () => {
    it('scores a clean workspace as 100, with no qualifications', () => {
      const report = expectComputedHealth(evaluate());

      expect(report.score).toBe(100);
      expect(report.qualifications).toEqual([]);
    });

    it('scores a workspace with violations below 100', () => {
      const report = expectComputedHealth(evaluate({ diagnostics: [testDiagnostic()] }));

      expect(report.score).toBeLessThan(100);
      expect(report.totalDiagnosticCount).toBe(1);
    });

    it('qualifies a score computed while some configured rules were skipped', () => {
      const report = expectComputedHealth(evaluate({ skippedRuleCount: 2 }));

      // Still 100 — nothing that ran found anything — but the score now carries
      // the caveat that part of the policy went unchecked, so a reader is not
      // told a partial examination was a complete one.
      expect(report.score).toBe(100);
      expect(report.qualifications.map((q) => q.code)).toContain('rules-skipped');
      expect(report.qualifications[0]?.message).toContain('2 configured rule(s)');
    });

    it('qualifies a score computed on partial reference coverage', () => {
      const report = expectComputedHealth(evaluate({ coverageStatus: 'partial' }));

      expect(report.qualifications.map((q) => q.code)).toContain('partial-coverage');
    });

    it('does not qualify a score computed on complete reference coverage', () => {
      const report = expectComputedHealth(evaluate({ coverageStatus: 'complete' }));

      expect(report.qualifications).toEqual([]);
    });

    it('records every applicable qualification, not just the first', () => {
      const report = expectComputedHealth(
        evaluate({ skippedRuleCount: 1, coverageStatus: 'partial' })
      );

      expect(report.qualifications.map((q) => q.code).sort()).toEqual([
        'partial-coverage',
        'rules-skipped',
      ]);
    });

    it('treats unknown coverage as no qualification, because the dependent rules already skipped', () => {
      // `unknown` means the reference scan did not run at all. Any rule that
      // needed it declared itself skipped, and that skip is already reported
      // through `rules-skipped`. A second caveat for the same fact would be
      // noise, not information.
      const report = expectComputedHealth(evaluate({ coverageStatus: 'unknown' }));

      expect(report.qualifications).toEqual([]);
    });
  });

  it('passes the asset count through for display without letting it affect the score', () => {
    const diagnostics = [testDiagnostic({ asset: testAsset({ path: '/w/x.gif' }) })];
    const few = expectComputedHealth(evaluate({ diagnostics, totalAssetCount: 2 }));
    const many = expectComputedHealth(evaluate({ diagnostics, totalAssetCount: 2000 }));

    expect(few.totalAssetCount).toBe(2);
    expect(many.totalAssetCount).toBe(2000);
    // One violation costs the same whether the workspace has 2 assets or 2000:
    // the score describes what was found, not a ratio the engine invented.
    expect(many.score).toBe(few.score);
  });
});
