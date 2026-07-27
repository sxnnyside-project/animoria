import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from '../../src/utils/concurrency.js';

describe('runWithConcurrency', () => {
  it('calls fn for every item exactly once', async () => {
    const seen: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      seen.push(n);
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('never runs more than `concurrency` calls at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await runWithConcurrency(items, 3, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('resolves immediately for an empty item list', async () => {
    let called = false;
    await runWithConcurrency([], 4, async () => {
      called = true;
    });
    expect(called).toBe(false);
  });
});
