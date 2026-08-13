import type { DaemonError } from './protocol.js';
import { daemonError } from './protocol.js';

/**
 * Every in-flight request, and the one place a request's lifecycle is decided.
 *
 * ## The states, and why none of them is "no state"
 * ```
 * received → validated → accepted → executing → completed
 *                              ↘ rejected
 *                    executing → cancelled
 *                    executing → failed
 * ```
 * The previous daemon had no registry at all: a command was dispatched and its
 * handler eventually called `emit`, or did not. A request that threw before reaching
 * its `try` block, or one whose handler returned without emitting, produced **no
 * response ever** — and the host could only distinguish that from a slow scan by
 * timing out. "The engine is slow" was the message for a request that had already
 * silently died.
 *
 * Registering here makes "no response" unreachable: every accepted id is either
 * settled or in flight, and shutdown settles the remainder.
 */

export type RequestState = 'executing' | 'completed' | 'failed' | 'cancelled' | 'rejected';

export interface InFlightRequest {
  readonly id: string;
  readonly method: string;
  readonly startedAt: number;
  /** Aborted on `cancel` or shutdown. Handlers that can stop early observe this. */
  readonly controller: AbortController;
}

export interface RegistrationResult {
  readonly ok: boolean;
  readonly error?: DaemonError;
  readonly request?: InFlightRequest;
}

export class RequestRegistry {
  private readonly _inFlight = new Map<string, InFlightRequest>();
  /**
   * Ids already settled in this session.
   *
   * Kept so a replayed or duplicated id is rejected as `duplicate-request-id` rather
   * than silently accepted as a new request. A client that retries an id after a
   * timeout would otherwise get two executions of a mutating operation.
   */
  private readonly _settled = new Set<string>();
  private _closed = false;

  /** How many requests are executing. Reported by `ping`. */
  get inFlightCount(): number {
    return this._inFlight.size;
  }

  get isClosed(): boolean {
    return this._closed;
  }

  /**
   * Claims an id, or explains why it cannot be claimed.
   *
   * Ids are checked against both in-flight and settled sets. Uniqueness is *within a
   * session*: a restarted daemon has a fresh registry, which is correct because it
   * also has a fresh `sessionId` and a client must have discarded its old state.
   */
  register(id: string, method: string): RegistrationResult {
    if (this._closed) {
      return {
        ok: false,
        error: daemonError(
          'cancelled',
          'The daemon is shutting down and is not accepting requests.'
        ),
      };
    }

    if (this._inFlight.has(id) || this._settled.has(id)) {
      return {
        ok: false,
        error: daemonError(
          'duplicate-request-id',
          `Request id "${id}" has already been used in this session.`,
          { detail: this._inFlight.has(id) ? 'still executing' : 'already settled' }
        ),
      };
    }

    const request: InFlightRequest = {
      id,
      method,
      startedAt: Date.now(),
      controller: new AbortController(),
    };
    this._inFlight.set(id, request);
    return { ok: true, request };
  }

  /** Moves a request out of flight. Safe to call for an id that is already settled. */
  settle(id: string, _state: RequestState): void {
    this._inFlight.delete(id);
    this._settled.add(id);
  }

  /**
   * Cancels an in-flight request.
   *
   * Returns `false` for an id that is not in flight, so `cancel` can answer
   * `unknown-request-id` rather than silently succeeding — a client that believes it
   * cancelled something that was never running will not wait for the cancellation it
   * expects.
   */
  cancel(id: string): boolean {
    const request = this._inFlight.get(id);
    if (!request) return false;
    request.controller.abort();
    return true;
  }

  /** The abort signal for an id, for a handler that wants to observe cancellation. */
  signalFor(id: string): AbortSignal | null {
    return this._inFlight.get(id)?.controller.signal ?? null;
  }

  /**
   * Aborts everything and refuses further registration.
   *
   * The caller is responsible for emitting a `cancelled` response for each returned
   * id. Shutdown that simply exits leaves every waiting client to time out, which is
   * the same "no response ever" failure in a different costume.
   */
  close(): readonly InFlightRequest[] {
    this._closed = true;
    const outstanding = [...this._inFlight.values()];
    for (const request of outstanding) request.controller.abort();
    this._inFlight.clear();
    return outstanding;
  }
}
