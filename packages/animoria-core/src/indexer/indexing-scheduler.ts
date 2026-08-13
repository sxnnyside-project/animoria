import type { FileChangeKind } from './types.js';

/** Constructor options for {@link IndexingScheduler}. */
export interface IndexingSchedulerOptions {
  /**
   * Applies one settled batch of changes to the index. Called with at
   * most one invocation in flight at any time — see the class docs for
   * the guarantee this provides.
   */
  apply: (changes: ReadonlyMap<string, FileChangeKind>) => Promise<void>;
  /**
   * Invoked if `apply` throws. The scheduler swallows the error (a
   * failed batch must not crash the host process or corrupt scheduling
   * state) and continues on to any batches merged in the meantime — the
   * next successful batch naturally re-establishes a consistent index.
   */
  onApplyError?: (error: unknown, changes: ReadonlyMap<string, FileChangeKind>) => void;
}

/**
 * Serializes indexing work so that filesystem-change batches are applied
 * one at a time, merging new changes into whichever batch hasn't started
 * yet rather than ever running two `apply` calls concurrently.
 *
 * ## The concurrency problem this solves
 * `WorkspaceIndexer` mutates shared, in-memory state (the asset map,
 * reference counts, the last rule report) while applying a batch. If two
 * batches were allowed to apply concurrently, their reads and writes
 * could interleave arbitrarily: batch A could read the asset map, batch
 * B could delete an asset from it, and batch A could then write back a
 * now-stale copy that resurrects the deleted asset. Under heavy
 * filesystem activity (a branch switch, a large checkout) this is not a
 * theoretical edge case — it is the common case.
 *
 * ## The guarantee
 * At most one `apply` call is ever in flight. While one is running,
 * calls to {@link request} do not start a second, parallel `apply` —
 * they merge their changes into a pending batch that begins as soon as
 * the current `apply` resolves. This means:
 *
 * - **No overlapping runs.** `apply` never needs its own internal
 *   locking; the scheduler is the only lock the system has, and it is
 *   the only one it needs.
 * - **No stale writes.** Because batches run strictly one after another
 *   and each one merges the latest known intent per path (see
 *   {@link "./change-coalescer.js"} for how "intent" is resolved), a
 *   change that arrives *during* a run is never lost — it lands in the
 *   next run, which is guaranteed to happen.
 * - **Bounded queue depth.** However many `request` calls arrive while
 *   a batch is running, they collapse into exactly one follow-up batch
 *   (their changes are merged by path, last-writer-wins), not one queued
 *   run per call. This is what keeps the scheduler from falling
 *   arbitrarily far behind during a burst of thousands of file events.
 *
 * ## Error handling
 * A failed `apply` does not stop the scheduler or leave it wedged. It is
 * reported via `onApplyError` and then the loop proceeds exactly as if
 * the batch had succeeded — any changes merged in while it was running
 * still get their own run. Combined with the fact that filesystem events
 * keep arriving independently of indexer health, this means a transient
 * failure (e.g. a file briefly locked by another process) self-heals on
 * the next relevant event without any special recovery code.
 */
export class IndexingScheduler {
  private readonly _apply: (changes: ReadonlyMap<string, FileChangeKind>) => Promise<void>;
  private readonly _onApplyError:
    | ((error: unknown, changes: ReadonlyMap<string, FileChangeKind>) => void)
    | undefined;

  private _pending = new Map<string, FileChangeKind>();
  private _isRunning = false;
  /**
   * The run currently in flight, so a caller can wait for it.
   *
   * `isRunning` answered "is work happening?" and nothing answered "tell me when it
   * has stopped", so `whenIdle()` could only wait for the *reference* pass. A change
   * a host had just notified was therefore still queued when the next
   * `analyzeComplete()` returned, and the caller had no way to distinguish that from
   * "nothing changed".
   */
  private _run: Promise<void> = Promise.resolve();

  constructor(options: IndexingSchedulerOptions) {
    this._apply = options.apply;
    this._onApplyError = options.onApplyError;
  }

  /**
   * Merges a settled batch of changes into the scheduler's pending set
   * and ensures a run is (or will soon be) in progress to handle it.
   *
   * Merging is per-path last-write-wins: if the same path appears in two
   * batches submitted before either has run, only the more recent kind
   * for that path survives — consistent with how {@link ChangeCoalescer}
   * already resolves intent within a single batch.
   */
  request(changes: ReadonlyMap<string, FileChangeKind>): void {
    for (const [path, kind] of changes) {
      this._pending.set(path, kind);
    }

    if (!this._isRunning) {
      this._run = this._runLoop();
    }
  }

  /**
   * Resolves once every queued change has been applied.
   *
   * Loops rather than awaiting once: applying a batch can enqueue more work — a
   * config change that invalidates assets, for instance — and returning after the
   * first run would report idle while the follow-up was still pending.
   */
  async whenSettled(): Promise<void> {
    while (this._isRunning || this._pending.size > 0) {
      await this._run;
      if (this._pending.size > 0 && !this._isRunning) this._run = this._runLoop();
    }
    await this._run;
  }

  /** Whether a batch is currently being applied. Exposed for diagnostics/tests. */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /** Number of paths currently queued for the next run. Exposed for diagnostics/tests. */
  get pendingCount(): number {
    return this._pending.size;
  }

  private async _runLoop(): Promise<void> {
    this._isRunning = true;
    try {
      // Loop rather than recurse: any changes merged in while `apply`
      // was running are picked up by the next iteration, guaranteeing
      // they are eventually applied without spawning a second run.
      while (this._pending.size > 0) {
        const batch = this._pending;
        this._pending = new Map();

        try {
          await this._apply(batch);
        } catch (error) {
          this._onApplyError?.(error, batch);
        }
      }
    } finally {
      this._isRunning = false;
    }
  }
}
