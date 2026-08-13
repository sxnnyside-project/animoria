import { expect } from 'vitest';
import type { HealthScoreOutcome, HealthScoreReport } from '../../src/governance/health/types.js';

/**
 * Narrows a {@link HealthScoreOutcome} to its computed report, failing the test if
 * the score was unavailable.
 *
 * Tests used to read `snapshot.healthScore?.score`, which silently yielded
 * `undefined` when no score existed — so a test asserting on a score could pass
 * against a workspace that had none. The union makes that impossible in
 * production code; this helper makes it impossible in tests too, by turning
 * "unavailable" into an explicit failure with the reason attached.
 */
export function expectComputedHealth(outcome: HealthScoreOutcome): HealthScoreReport {
  expect(
    outcome.status,
    outcome.status === 'unavailable' ? `health unavailable: ${outcome.reason}` : ''
  ).toBe('computed');
  // Safe after the assertion above; `as` only because `expect` is not a type guard.
  return (outcome as Extract<HealthScoreOutcome, { status: 'computed' }>).report;
}

/** The reason a score was unavailable, failing the test if one was in fact computed. */
export function expectUnavailableHealth(
  outcome: HealthScoreOutcome
): Extract<HealthScoreOutcome, { status: 'unavailable' }> {
  expect(outcome.status).toBe('unavailable');
  return outcome as Extract<HealthScoreOutcome, { status: 'unavailable' }>;
}
