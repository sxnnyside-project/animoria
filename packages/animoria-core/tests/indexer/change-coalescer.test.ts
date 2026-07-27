import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangeCoalescer } from '../../src/indexer/change-coalescer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChangeCoalescer', () => {
  it('flushes a single event after the settle window', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 1000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'changed' });
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0]?.[0]).toEqual(new Map([['/a.json', 'changed']]));
  });

  it('resets the settle timer on each new event, deduplicating rapid saves', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 10_000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'changed' });
    vi.advanceTimersByTime(50);
    coalescer.record({ path: '/a.json', kind: 'changed' });
    vi.advanceTimersByTime(50);
    coalescer.record({ path: '/a.json', kind: 'changed' });
    vi.advanceTimersByTime(50);
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('resolves a delete-then-create of the same path to "changed" (last write wins)', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 1000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'deleted' });
    coalescer.record({ path: '/a.json', kind: 'created' });
    vi.advanceTimersByTime(100);

    expect(onFlush.mock.calls[0]?.[0]).toEqual(new Map([['/a.json', 'created']]));
  });

  it('resolves a create-then-delete of the same path to "deleted"', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 1000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'created' });
    coalescer.record({ path: '/a.json', kind: 'deleted' });
    vi.advanceTimersByTime(100);

    expect(onFlush.mock.calls[0]?.[0]).toEqual(new Map([['/a.json', 'deleted']]));
  });

  it('flushes at maxWaitMs even under sustained continuous activity', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 300, maxWaitMs: 1000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'changed' });
    // Keep resetting the settle timer every 200ms — it would never fire on
    // its own, but the ceiling must still force a flush at 1000ms.
    for (let elapsed = 0; elapsed < 1000; elapsed += 200) {
      vi.advanceTimersByTime(200);
      coalescer.record({ path: '/a.json', kind: 'changed' });
    }

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('batches distinct paths together into one flush', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 1000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'created' });
    coalescer.record({ path: '/b.json', kind: 'changed' });
    coalescer.record({ path: '/c.json', kind: 'deleted' });
    vi.advanceTimersByTime(100);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0]?.[0].size).toBe(3);
  });

  it('flushNow forces an immediate flush of pending changes', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 10_000, maxWaitMs: 20_000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'created' });
    coalescer.flushNow();

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('does not flush an empty pending set', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 1000, onFlush });
    coalescer.flushNow();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('discards pending changes and stops timers on dispose', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 100, maxWaitMs: 1000, onFlush });

    coalescer.record({ path: '/a.json', kind: 'created' });
    coalescer.dispose();
    vi.advanceTimersByTime(1000);

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('ignores events recorded after dispose', () => {
    const onFlush = vi.fn();
    const coalescer = new ChangeCoalescer({ settleMs: 10, maxWaitMs: 100, onFlush });
    coalescer.dispose();
    coalescer.record({ path: '/a.json', kind: 'created' });
    vi.advanceTimersByTime(200);
    expect(onFlush).not.toHaveBeenCalled();
  });
});
