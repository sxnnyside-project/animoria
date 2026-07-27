/**
 * A minimal, IDE-agnostic typed event emitter.
 *
 * ## Why this exists instead of `vscode.EventEmitter`
 * `packages/animoria-core` must have zero IDE dependencies (see the
 * repository's architectural rules). `vscode.EventEmitter` is the
 * natural shape for "subscribe to updates" — a `.event` subscription
 * function plus a `.fire()` — so this class reproduces that exact shape
 * without importing `vscode`, letting IDE integrations bridge it to
 * their native event system with a one-line adapter instead of the core
 * package depending on any of them.
 */
export class Emitter<T> {
  private readonly _listeners = new Set<(value: T) => void>();

  /**
   * Subscribes to future emissions. Returns a disposer; call it to stop
   * receiving events. Safe to call from within a listener callback.
   */
  readonly event = (listener: (value: T) => void): { dispose: () => void } => {
    this._listeners.add(listener);
    return { dispose: () => this._listeners.delete(listener) };
  };

  /** Synchronously notifies every current subscriber, in registration order. */
  fire(value: T): void {
    for (const listener of Array.from(this._listeners)) {
      listener(value);
    }
  }

  /** Removes every subscriber. The emitter remains usable afterward. */
  dispose(): void {
    this._listeners.clear();
  }
}
