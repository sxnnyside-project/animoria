import { describe, expect, it } from 'vitest';
import { determineCheckOutcome } from '../../src/cli/check-outcome';
import type { RuleDiagnostic } from '../../src/governance/rules-engine';
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

function diagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  return { ruleId: 'no-gif', severity: 'error', asset: asset(), message: 'test', ...overrides };
}

describe('determineCheckOutcome', () => {
  it('passes with no diagnostics and no health score policy', () => {
    expect(determineCheckOutcome([], null)).toEqual({
      passed: true,
      failureReasons: [],
      incomplete: false,
    });
  });

  it('fails when any diagnostic is "error" severity', () => {
    const outcome = determineCheckOutcome([diagnostic({ severity: 'error' })], 100);
    expect(outcome.passed).toBe(false);
    expect(outcome.failureReasons).toHaveLength(1);
  });

  it('passes when diagnostics are only "warning" severity', () => {
    const outcome = determineCheckOutcome([diagnostic({ severity: 'warning' })], 100);
    expect(outcome.passed).toBe(true);
  });

  it('does not gate on health score when minHealthScore is not configured', () => {
    const outcome = determineCheckOutcome([], 10);
    expect(outcome.passed).toBe(true);
  });

  it('fails when health score is below the configured minimum', () => {
    const outcome = determineCheckOutcome([], 50, { minHealthScore: 80 });
    expect(outcome.passed).toBe(false);
    expect(outcome.failureReasons[0]).toContain('50');
    expect(outcome.failureReasons[0]).toContain('80');
  });

  it('passes when health score meets the configured minimum exactly', () => {
    const outcome = determineCheckOutcome([], 80, { minHealthScore: 80 });
    expect(outcome.passed).toBe(true);
  });

  it('does not gate on health score when the score is null (could not be computed)', () => {
    const outcome = determineCheckOutcome([], null, { minHealthScore: 80 });
    expect(outcome.passed).toBe(true);
  });

  it('combines multiple failure reasons when both gates fail', () => {
    const outcome = determineCheckOutcome([diagnostic()], 10, { minHealthScore: 90 });
    expect(outcome.passed).toBe(false);
    expect(outcome.failureReasons).toHaveLength(2);
  });

  it('counts multiple error diagnostics in a single failure reason', () => {
    const outcome = determineCheckOutcome([diagnostic(), diagnostic()], null);
    expect(outcome.failureReasons[0]).toContain('2');
  });
});
