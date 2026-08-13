import type { FileChangeEvent, FileChangeKind } from './types.js';

/** Constructor options for {@link ChangeCoalescer}. */
export interface ChangeCoalescerOptions {
  /**
   * How long to wait after the *most recent* event before flushing, in
   * milliseconds. Each new event resets this timer — this is what turns
   * "the user is saving repeatedly while iterating" into one flush
   * instead of one per keystroke-triggered save. Default: 400.
   */
  settleMs?: number | undefined;
  /**
   * Hard ceiling, in milliseconds, measured from the *first* event in
   * the current pending batch. Flushes even if events are still
   * arriving. Without this, a pure trailing debounce never fires during
   * sustained activity (a large `git checkout` can emit events for many
   * seconds continuously), leaving the index stale for the whole
   * operation instead of converging incrementally. Default: 2000.
   */
  maxWaitMs?: number | undefined;
  /** Invoked with the settled, deduplicated batch of net changes. */
  onFlush: (changes: ReadonlyMap<string, FileChangeKind>) => void;
}

const DEFAULT_SETTLE_MS = 400;
const DEFAULT_MAX_WAIT_MS = 2000;

/**
 * Normalizes and coalesces raw, unreliable filesystem signals into a
 * settled batch of net-effect changes, keyed by path.
 *
 * ## The reliability problem this solves
 * Filesystem watchers do not report a clean, ordered, deduplicated
 * stream of "this is what changed". A single logical edit can produce
 * multiple raw events (some editors write via a temp file + atomic
 * rename, which watchers report as delete-then-create of the same
 * path); a `git checkout` across branches fires a burst of creates,
 * changes, and deletes with no guaranteed ordering relative to each
 * other; the same event can be delivered more than once. Treating each
 * raw event as an independent unit of work would mean re-parsing the
 * same asset five times for one save, or transiently "losing" an asset
 * that was actually just replaced atomically.
 *
 * `ChangeCoalescer` fixes this with one rule: **only the most recent
 * event for a given path within a settle window matters.** Because a
 * true delete-then-recreate sequence necessarily delivers its `created`
 * event *after* its `deleted` event, "last write wins" naturally
 * resolves that sequence to `'changed'` (re-parse) rather than
 * `'deleted'` — no special-casing required. The mirror case
 * (create-then-delete, e.g. a build tool writing and immediately
 * cleaning up a scratch file) naturally resolves to `'deleted'`.
 *
 * This class never inspects the filesystem itself — it only tracks
 * *intent* (should this path end up parsed, or removed, once things
 * settle). The consumer (`WorkspaceIndexer`) re-verifies actual
 * filesystem state when it applies a flushed batch, which is what
 * protects against a stray, unmatched event claiming a path was
 * deleted when it demonstrably still exists.
 *
 * ## Flushing
 * A batch flushes when either timer fires, whichever comes first:
 * - `settleMs` after the most recent event (typical case — activity has
 *   quieted down), or
 * - `maxWaitMs` after the first event in the batch (guarantees forward
 *   progress under continuous, sustained activity, such as a large
 *   repository checkout).
 *
 * `onFlush` is called synchronously from a timer callback; it must not
 * throw. What happens with the flushed batch (parsing, scheduling) is
 * entirely the caller's concern — see {@link "./indexing-scheduler.js"}.
 */
export class ChangeCoalescer {
  private readonly _settleMs: number;
  private readonly _maxWaitMs: number;
  private readonly _onFlush: (changes: ReadonlyMap<string, FileChangeKind>) => void;

  private _pending = new Map<string, FileChangeKind>();
  private _settleTimer: NodeJS.Timeout | undefined;
  private _ceilingTimer: NodeJS.Timeout | undefined;
  private _disposed = false;

  constructor(options: ChangeCoalescerOptions) {
    this._settleMs = options.settleMs ?? DEFAULT_SETTLE_MS;
    this._maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
    this._onFlush = options.onFlush;
  }

  /**
   * Records one raw filesystem event. Cheap and synchronous — safe to
   * call directly from a watcher callback with no debouncing of your
   * own.
   */
  /**
   * Whether filesystem signals have arrived that no committed analysis reflects
   * yet.
   *
   * This is the mechanical basis of the product's staleness answer: an analysis is
   * stale exactly when the workspace has produced changes the analysis predates.
   * Exposed rather than inferred by clients because a client comparing timestamps
   * or diffing asset lists would be re-deriving — differently — something the
   * coalescer already knows for certain.
   */
  hasPendingChanges(): boolean {
    return this._pending.size > 0;
  }

  record(event: FileChangeEvent): void {
    if (this._disposed) return;

    const isFirstInBatch = this._pending.size === 0;
    this._pending.set(event.path, event.kind);

    if (isFirstInBatch) {
      this._ceilingTimer = setTimeout(() => this._flush(), this._maxWaitMs);
    }

    if (this._settleTimer) clearTimeout(this._settleTimer);
    this._settleTimer = setTimeout(() => this._flush(), this._settleMs);
  }

  /**
   * Forces an immediate flush of whatever is currently pending, even if
   * neither timer has elapsed. Intended for deterministic testing and
   * for an explicit "sync now" command; production code should let the
   * timers govern normal operation.
   */
  flushNow(): void {
    this._flush();
  }

  /** Stops all pending timers. Any not-yet-flushed changes are discarded. */
  dispose(): void {
    this._disposed = true;
    this._clearTimers();
    this._pending.clear();
  }

  private _flush(): void {
    this._clearTimers();
    if (this._pending.size === 0) return;

    const batch = this._pending;
    this._pending = new Map();
    this._onFlush(batch);
  }

  private _clearTimers(): void {
    if (this._settleTimer) clearTimeout(this._settleTimer);
    if (this._ceilingTimer) clearTimeout(this._ceilingTimer);
    this._settleTimer = undefined;
    this._ceilingTimer = undefined;
  }
}
