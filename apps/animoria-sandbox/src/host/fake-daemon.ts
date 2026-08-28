export const PROTOCOL_VERSION = 1;

export interface DaemonError {
  code: string;
  message: string;
  retryable?: boolean;
}

export type DaemonErrorCode =
  | 'invalid-params'
  | 'unsupported-version'
  | 'unsupported-method'
  | 'internal-error'
  | 'unknown-method'
  | 'scan-failed'
  | 'workspace-not-found'
  | 'analysis-failed'
  | 'analysis-incomplete'
  | 'stale-plan'
  | 'timeout'
  | 'cancelled';

export interface DaemonEvent {
  protocol: number;
  event: string;
  sequence?: number;
  sessionId?: string;
  payload?: any;
  data?: any;
}

export type DaemonEventName =
  | 'indexing-started'
  | 'indexing-progress'
  | 'analysis-started'
  | 'analysis-progress'
  | 'analysis-completed'
  | 'analysis-failed'
  | 'fatal'
  | 'ready'
  | 'stale'
  | 'watcher-event';

export interface DaemonResponse<T = any> {
  protocol: number;
  id: string;
  result?: T;
  error?: DaemonError;
}

export interface DaemonCapabilities {
  analysis?: boolean;
  watch?: boolean;
  cleanup?: boolean;
  restore?: boolean;
  duplicateResolution?: boolean;
  cancellation?: boolean;
  multiRoot?: boolean;
  thumbnails?: boolean;
  snippets?: boolean;
  [key: string]: any;
}

export function checkProtocolCompatibility(version: number): {
  compatible: boolean;
  reason?: string;
} {
  return version === PROTOCOL_VERSION
    ? { compatible: true }
    : { compatible: false, reason: `Unsupported protocol version: ${version}` };
}

export type DaemonScenario =
  | 'healthy'
  | 'unavailable'
  | 'protocol-mismatch'
  | 'never-ready'
  | 'fatal-workspace'
  | 'analysis-failed'
  | 'analysis-incomplete'
  | 'stale-plan'
  | 'cancelled';

export interface FakeDaemonOptions {
  readonly scenario: DaemonScenario;
  readonly analysisPayload?: unknown;
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

  start(): void {
    if (this._scenario === 'unavailable' || this._scenario === 'never-ready') {
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

  request(id: string, method: string, protocol: number = PROTOCOL_VERSION): void {
    const compatibility = checkProtocolCompatibility(protocol);
    if (!compatibility.compatible) {
      this._error(id, 'unsupported-version', compatibility.reason ?? 'Protocol mismatch.');
      return;
    }

    if (this._scenario === 'never-ready') return;

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
