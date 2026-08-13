import type {
  DaemonCapabilities,
  DaemonError,
  DaemonErrorCode,
  DaemonEvent,
  DaemonEventName,
  DaemonResponse,
} from '@animoria/core/contracts';
import { PROTOCOL_VERSION, checkProtocolCompatibility } from '@animoria/core/contracts';

/**
 * A deterministic protocol daemon that touches no filesystem.
 *
 * ## Why the harness needs one
 * The states Wave 5 added are all *protocol* states: a version mismatch, a daemon
 * that never becomes ready, a cancelled request, a stale plan. None of them can be
 * produced by the read-only HTTP bridge, and none of them is reachable by pointing
 * the sandbox at a real workspace — you cannot make a healthy daemon claim protocol
 * 99 on demand.
 *
 * So the harness gains a second host: the same `HostBridge` the IDEs implement,
 * backed by a scripted daemon whose scenario is chosen up front. That is what makes
 * "what does the UI do when the engine is a version too old?" a question a developer
 * can answer by clicking, rather than by imagining.
 *
 * ## What it is not
 * It is not a mock of Core. It replays fixture analyses and scripted protocol
 * outcomes; it never classifies an asset, scores a workspace, or decides what is
 * removable. A fake that invented governance would be the fourth engine this
 * migration spent three waves removing.
 */

/** The failure modes the harness can put the UI into. */
export type DaemonScenario =
  /** Everything works: handshake, ready, analysis. */
  | 'healthy'
  /** The daemon never starts — the binary is missing or the process died. */
  | 'unavailable'
  /** The daemon answers, but speaks a version this client cannot talk to. */
  | 'protocol-mismatch'
  /** The workspace cannot be analysed at all. */
  | 'fatal-workspace'
  /** Analysis ran and failed. */
  | 'analysis-failed'
  /** Analysis finished but coverage is insufficient for absence claims. */
  | 'analysis-incomplete'
  /** Every plan the UI applies is rejected as stale. */
  | 'stale-plan'
  /** Every request is cancelled before it completes. */
  | 'cancelled'
  /** Requests are accepted but never answered — the "is it slow or dead?" case. */
  | 'never-ready';

export interface FakeDaemonOptions {
  readonly scenario: DaemonScenario;
  /** The analysis payload replayed on success. A fixture, never computed here. */
  readonly analysisPayload?: unknown;
  /** Called for every outbound message, so the harness console can render it. */
  readonly onMessage?: (message: DaemonResponse | DaemonEvent) => void;
}

const CAPABILITIES: DaemonCapabilities = {
  analysis: true,
  watch: false,
  cleanup: true,
  restore: true,
  duplicateResolution: true,
  cancellation: true,
  multiRoot: true,
  thumbnails: false,
  snippets: false,
};

/** The error each failure scenario produces for a request. */
const SCENARIO_ERROR: Partial<Record<DaemonScenario, { code: DaemonErrorCode; message: string }>> =
  {
    unavailable: {
      code: 'internal-error',
      message: 'The Animoria engine is not running.',
    },
    'protocol-mismatch': {
      code: 'unsupported-version',
      message: `This client expects protocol ${PROTOCOL_VERSION}, but the engine speaks 99. Reinstall so both are updated together.`,
    },
    'fatal-workspace': {
      code: 'workspace-not-found',
      message: 'Workspace root does not exist.',
    },
    'analysis-failed': {
      code: 'analysis-failed',
      message: 'The analysis could not be completed.',
    },
    'analysis-incomplete': {
      code: 'analysis-incomplete',
      message: 'No source files could be read, so reference findings are withheld.',
    },
    'stale-plan': {
      code: 'stale-plan',
      message: 'The workspace changed after this plan was built. Refresh and review again.',
    },
    cancelled: {
      code: 'cancelled',
      message: 'The request was cancelled.',
    },
  };

export class FakeDaemon {
  private readonly _scenario: DaemonScenario;
  private readonly _analysisPayload: unknown;
  private readonly _onMessage: ((message: DaemonResponse | DaemonEvent) => void) | undefined;

  readonly sessionId = `sandbox-${Math.random().toString(36).slice(2, 10)}`;

  private _sequence = 0;
  private _ready = false;

  constructor(options: FakeDaemonOptions) {
    this._scenario = options.scenario;
    this._analysisPayload = options.analysisPayload ?? null;
    this._onMessage = options.onMessage;
  }

  get scenario(): DaemonScenario {
    return this._scenario;
  }

  get isReady(): boolean {
    return this._ready;
  }

  /**
   * Emits the startup sequence for the configured scenario.
   *
   * Sequence numbers are monotonic in every scenario, including the failing ones —
   * a daemon that fails still owes its client an ordered account of how it failed.
   */
  start(): void {
    if (this._scenario === 'unavailable' || this._scenario === 'never-ready') {
      // Nothing at all. This is the case a client can only distinguish from "slow"
      // by asking — which is what `ping` exists for.
      return;
    }

    this._event('indexing-started', { roots: [] });

    if (this._scenario === 'fatal-workspace') {
      this._event('fatal', SCENARIO_ERROR['fatal-workspace']);
      return;
    }

    this._event('analysis-started', {});

    if (this._scenario === 'analysis-failed') {
      this._event('analysis-failed', SCENARIO_ERROR['analysis-failed']);
      return;
    }

    this._event('analysis-completed', this._analysisPayload);
    this._ready = true;
    this._event('ready', { sessionId: this.sessionId, capabilities: CAPABILITIES });
  }

  /** Answers one request, according to the scenario. */
  request(id: string, method: string, protocol: number = PROTOCOL_VERSION): void {
    const compatibility = checkProtocolCompatibility(protocol);
    if (!compatibility.compatible) {
      this._error(id, 'unsupported-version', compatibility.message ?? 'Protocol mismatch.');
      return;
    }

    if (this._scenario === 'never-ready') return; // Deliberately no answer.

    const scripted = SCENARIO_ERROR[this._scenario];
    if (scripted && method !== 'ping') {
      this._error(id, scripted.code, scripted.message);
      return;
    }

    switch (method) {
      case 'hello':
        this._respond(id, {
          protocol: PROTOCOL_VERSION,
          minProtocol: PROTOCOL_VERSION,
          coreVersion: 'sandbox',
          daemonVersion: 'sandbox',
          sessionId: this.sessionId,
          capabilities: CAPABILITIES,
          workspace: { id: 'sandbox', roots: [] },
        });
        return;
      case 'ping':
        this._respond(id, {
          sessionId: this.sessionId,
          uptimeMs: 0,
          inFlight: 0,
          ready: this._ready,
        });
        return;
      case 'getAnalysis':
      case 'analyze':
        this._respond(id, this._analysisPayload);
        return;
      default:
        this._error(id, 'unsupported-method', `The sandbox daemon does not implement "${method}".`);
    }
  }

  private _respond(id: string, result: unknown): void {
    this._emit({ protocol: PROTOCOL_VERSION, id, result });
  }

  private _error(id: string, code: DaemonErrorCode, message: string): void {
    const error: DaemonError = { code, message, retryable: code !== 'unsupported-version' };
    this._emit({ protocol: PROTOCOL_VERSION, id, error });
  }

  private _event(event: DaemonEventName, payload: unknown): void {
    this._sequence += 1;
    this._emit({
      protocol: PROTOCOL_VERSION,
      event,
      sequence: this._sequence,
      sessionId: this.sessionId,
      payload,
    });
  }

  private _emit(message: DaemonResponse | DaemonEvent): void {
    this._onMessage?.(message);
  }
}
