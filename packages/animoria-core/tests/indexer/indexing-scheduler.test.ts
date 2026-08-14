import { describe, expect, it } from 'vitest';
import { IndexingScheduler } from '../../src/indexer/indexing-scheduler';
import type { FileChangeKind } from '../../src/indexer/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('IndexingScheduler', () => {
  it('applies a single requested batch', async () => {
    const applied: ReadonlyMap<string, FileChangeKind>[] = [];
    const scheduler = new IndexingScheduler({
      apply: async (changes) => {
        applied.push(changes);
      },
    });

    scheduler.request(new Map([['/a.json', 'changed']]));
    await flushMicrotasks();

    expect(applied).toHaveLength(1);
    expect(scheduler.isRunning).toBe(false);
  });

  it('never runs two applies concurrently, merging requests that arrive mid-run', async () => {
    const runs: ReadonlyMap<string, FileChangeKind>[] = [];
    let concurrentCalls = 0;
    let maxConcurrent = 0;
    const first = deferred<void>();

    const scheduler = new IndexingScheduler({
      apply: async (changes) => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        runs.push(changes);
        if (runs.length === 1) {
          await first.promise;
        }
        concurrentCalls--;
      },
    });

    scheduler.request(new Map([['/a.json', 'changed']]));
    // Arrives while the first run is still in flight — must merge, not race.
    scheduler.request(new Map([['/b.json', 'created']]));
    scheduler.request(new Map([['/a.json', 'deleted']])); // overwrites /a.json's kind

    expect(scheduler.isRunning).toBe(true);
    first.resolve();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(maxConcurrent).toBe(1);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(new Map([['/a.json', 'changed']]));
    expect(runs[1]).toEqual(
      new Map([
        ['/b.json', 'created'],
        ['/a.json', 'deleted'],
      ])
    );
  });

  it('reports errors via onApplyError without stopping the scheduler', async () => {
    const errors: unknown[] = [];
    let callCount = 0;
    const scheduler = new IndexingScheduler({
      apply: async () => {
        callCount++;
        if (callCount === 1) throw new Error('boom');
      },
      onApplyError: (err) => errors.push(err),
    });

    scheduler.request(new Map([['/a.json', 'changed']]));
    await flushMicrotasks();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');

    // The scheduler must still accept and run subsequent batches.
    scheduler.request(new Map([['/b.json', 'changed']]));
    await flushMicrotasks();
    expect(callCount).toBe(2);
    expect(scheduler.isRunning).toBe(false);
  });

  it('exposes pendingCount for observability', () => {
    const scheduler = new IndexingScheduler({ apply: () => new Promise(() => {}) });
    scheduler.request(new Map([['/a.json', 'changed']]));
    expect(scheduler.pendingCount).toBe(0); // drained into the in-flight run synchronously
  });
});

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
