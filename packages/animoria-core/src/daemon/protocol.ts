/**
 * Animoria daemon protocol, version 1.
 *
 * ## What this replaces
 * An untagged envelope — `{event, data, requestId?}` — with no version, no
 * handshake, no error taxonomy, no cancellation and no session identity. A host and
 * a daemon of different vintages could exchange messages indefinitely, each
 * interpreting the other's payloads under its own assumptions, and the first visible
 * symptom was a deserialization stack trace or a field silently arriving `undefined`.
 *
 * ## The three message kinds, and why they are disjoint
 *
 * ```
 * request  { protocol, id, method, params }      client → daemon
 * response { protocol, id, result | error }      daemon → client, exactly one per request
 * event    { protocol, event, sequence, payload } daemon → client, unsolicited
 * ```
 *
 * They are separate types with separate discriminators because collapsing them is
 * how the previous protocol became unanalysable: a `commandError` was an event that
 * carried a `requestId`, so it was really a response wearing an event's shape, and
 * nothing in the format said which messages a caller could wait for.
 *
 * **Requests return results. Events communicate asynchronous state.** An event is
 * never the answer to a request, and a response is never pushed unsolicited.
 *
 * ## Versioning
 * `protocol` is a required integer on every message in both directions. A client
 * that cannot agree on it gets `unsupported-version` and stops — it never proceeds
 * on a guess. There is no legacy fallback: a daemon binary older than its plugin is
 * a broken installation, and pretending otherwise produces undefined behaviour that
 * surfaces as a governance bug weeks later.
 */

/** The protocol version this build speaks. Bump on any breaking envelope or method change. */
export const PROTOCOL_VERSION = 1 as const;

/**
 * The oldest protocol version this build can still serve.
 *
 * Equal to {@link PROTOCOL_VERSION} today: there is exactly one version, so there is
 * nothing to be compatible with. It exists as a distinct constant so the day a v2
 * lands, the compatibility window is a value to widen rather than a policy to invent.
 */
export const MIN_SUPPORTED_PROTOCOL_VERSION = 1 as const;

// ── Errors ────────────────────────────────────────────────────────────────────

/**
 * Every way a request can fail, as a closed set.
 *
 * Closed because a client must be able to branch exhaustively: "show a retry", "tell
 * the user to reinstall", "refresh the analysis first" are different responses, and a
 * free-form string forces every client to pattern-match prose — differently.
 *
 * `internal-error` is the only catch-all, and carries the diagnostic separately from
 * the message so a stack trace reaches the log without reaching the user.
 */
export type DaemonErrorCode =
  /** The envelope itself was malformed — not an object, missing `id`, missing `method`. */
  | 'invalid-request'
  /** The client's `protocol` is outside this daemon's supported window. */
  | 'unsupported-version'
  /** A well-formed request naming a method this daemon does not implement. */
  | 'unsupported-method'
  /** The method exists; its `params` did not validate. */
  | 'invalid-params'
  /** Two in-flight requests claimed the same `id`. */
  | 'duplicate-request-id'
  /** A `cancel` naming an `id` that is not in flight. */
  | 'unknown-request-id'
  /** The named workspace root does not exist or is not a directory. */
  | 'workspace-not-found'
  /** The workspace exists but cannot be analysed (unreadable, not a workspace). */
  | 'workspace-invalid'
  /** Analysis ran and could not produce a usable result. */
  | 'analysis-failed'
  /** Analysis produced a result too incomplete to answer this request. */
  | 'analysis-incomplete'
  /** A plan was built against a workspace state that has since changed. */
  | 'stale-plan'
  /** The operation requires a capability this daemon did not advertise. */
  | 'unsupported-capability'
  /** The request would mutate, and mutation is refused for a stated reason. */
  | 'mutation-refused'
  /** A path escaped its workspace root, or the caller may not read it. */
  | 'permission-denied'
  /** The request was cancelled, by the client or by shutdown. */
  | 'cancelled'
  /** Anything unforeseen. Carries `detail` for the log. */
  | 'internal-error';

/** A structured failure. Never a stack trace in `message`. */
export interface DaemonError {
  readonly code: DaemonErrorCode;
  /**
   * One sentence, safe to show a developer verbatim.
   *
   * The previous protocol surfaced `err.message` directly, so a user could be shown
   * `Cannot read properties of undefined (reading 'path')` as the explanation for
   * why their cleanup failed.
   */
  readonly message: string;
  /**
   * Diagnostic context for the log — stack, offending value, upstream cause.
   * Never rendered as the primary message.
   */
  readonly detail?: string;
  /**
   * Whether retrying the identical request could succeed. `false` for
   * `unsupported-method` and `unsupported-version`; `true` for `stale-plan` once the
   * client refreshes.
   */
  readonly retryable: boolean;
}

export function daemonError(
  code: DaemonErrorCode,
  message: string,
  options: { detail?: string; retryable?: boolean } = {}
): DaemonError {
  const error: { -readonly [K in keyof DaemonError]: DaemonError[K] } = {
    code,
    message,
    retryable: options.retryable ?? DEFAULT_RETRYABLE[code],
  };
  if (options.detail !== undefined) error.detail = options.detail;
  return error;
}

/**
 * Whether retrying the same request unchanged could plausibly succeed.
 *
 * Encoded here rather than decided per call site so two daemons cannot disagree
 * about whether a `stale-plan` is worth retrying.
 */
const DEFAULT_RETRYABLE: Readonly<Record<DaemonErrorCode, boolean>> = {
  'invalid-request': false,
  'unsupported-version': false,
  'unsupported-method': false,
  'invalid-params': false,
  'duplicate-request-id': false,
  'unknown-request-id': false,
  'workspace-not-found': false,
  'workspace-invalid': false,
  'analysis-failed': true,
  'analysis-incomplete': true,
  // Retryable only after the client refreshes and rebuilds — see `stale-plan`'s
  // handling in the executors, which is why the client is told to re-derive rather
  // than told to try again.
  'stale-plan': true,
  'unsupported-capability': false,
  'mutation-refused': false,
  'permission-denied': false,
  cancelled: true,
  'internal-error': true,
};

// ── Capabilities ──────────────────────────────────────────────────────────────

/**
 * What this daemon can do, declared in the handshake.
 *
 * ## Why declared rather than discovered
 * Clients previously determined support by sending a command and seeing whether it
 * errored — which cannot distinguish "not implemented" from "implemented and it
 * failed", produces a user-visible error for a capability probe, and mutates state
 * on any command that is not read-only.
 *
 * This is **not** a competing model to `HostCapabilities`. They answer different
 * questions on different sides of the bridge: `DaemonCapabilities` is what the
 * *engine* can do, `HostCapabilities` is what the *IDE* can do. A host intersects
 * them — VS Code can delete files, but if the daemon cannot build a cleanup plan,
 * cleanup is unavailable regardless.
 */
export interface DaemonCapabilities {
  readonly analysis: boolean;
  readonly watch: boolean;
  readonly cleanup: boolean;
  readonly restore: boolean;
  readonly duplicateResolution: boolean;
  readonly cancellation: boolean;
  readonly multiRoot: boolean;
  readonly thumbnails: boolean;
  readonly snippets: boolean;
}

/** Everything this build implements. */
export const DAEMON_CAPABILITIES: DaemonCapabilities = {
  analysis: true,
  watch: true,
  cleanup: true,
  restore: true,
  duplicateResolution: true,
  cancellation: true,
  multiRoot: true,
  thumbnails: true,
  snippets: true,
};

// ── Methods ───────────────────────────────────────────────────────────────────

/**
 * Every method a client may call.
 *
 * A closed union rather than a string: an unknown method is a protocol error a
 * client can branch on, not a silently-dropped line. The previous daemon returned
 * nothing at all for an unrecognized command, so a host waited out its timeout and
 * reported "the engine is slow".
 */
export type DaemonMethod =
  // ── Session ──
  | 'hello'
  | 'ping'
  | 'cancel'
  | 'shutdown'
  // ── Analysis ──
  | 'analyze'
  | 'getAnalysis'
  | 'getUsageReferences'
  | 'generateThumbnail'
  | 'getLottieDocument'
  | 'generateSnippet'
  | 'exportReport'
  // ── Cleanup ──
  | 'buildCleanupProposal'
  | 'buildCleanupPlan'
  | 'applyCleanupPlan'
  // ── Duplicates ──
  | 'buildResolutionPlan'
  | 'applyResolutionPlan'
  // ── Trash ──
  | 'listTrashSessions'
  | 'restoreTrashSession';

export const DAEMON_METHODS: readonly DaemonMethod[] = [
  'hello',
  'ping',
  'cancel',
  'shutdown',
  'analyze',
  'getAnalysis',
  'getUsageReferences',
  'generateThumbnail',
  'getLottieDocument',
  'generateSnippet',
  'exportReport',
  'buildCleanupProposal',
  'buildCleanupPlan',
  'applyCleanupPlan',
  'buildResolutionPlan',
  'applyResolutionPlan',
  'listTrashSessions',
  'restoreTrashSession',
];

/**
 * Methods accepted before the handshake completes.
 *
 * Everything else gets `invalid-request` until `hello` has been answered and the
 * first analysis has been established. Deterministic by construction: there is no
 * window in which a request's behaviour depends on how fast the initial scan ran.
 */
export const PRE_READY_METHODS: readonly DaemonMethod[] = ['hello', 'ping', 'shutdown'];

/**
 * Methods this build declares *and* answers.
 *
 * Currently every declared method: `getUsageReferences` and `exportReport` were the
 * last two that were declared and refused, and both had clients depending on them.
 * The list stays separate from `DAEMON_METHODS` because the distinction is real —
 * a name may be shipped in a protocol version before a build implements it — and
 * because `hello` must report what is *answerable*, not what is nameable.
 */
export const IMPLEMENTED_METHODS: readonly DaemonMethod[] = DAEMON_METHODS;

/** The capability each method requires, when it requires one. */
export const CAPABILITY_BY_METHOD: Readonly<
  Partial<Record<DaemonMethod, keyof DaemonCapabilities>>
> = {
  analyze: 'analysis',
  getAnalysis: 'analysis',
  getUsageReferences: 'analysis',
  generateThumbnail: 'thumbnails',
  generateSnippet: 'snippets',
  buildCleanupProposal: 'cleanup',
  buildCleanupPlan: 'cleanup',
  applyCleanupPlan: 'cleanup',
  buildResolutionPlan: 'duplicateResolution',
  applyResolutionPlan: 'duplicateResolution',
  listTrashSessions: 'restore',
  restoreTrashSession: 'restore',
  cancel: 'cancellation',
};

/** Methods that mutate the filesystem. Gated, logged, and stale-checked. */
export const MUTATING_METHODS: readonly DaemonMethod[] = [
  'applyCleanupPlan',
  'applyResolutionPlan',
  'restoreTrashSession',
];

// ── Events ────────────────────────────────────────────────────────────────────

/**
 * Unsolicited daemon state.
 *
 * Ordered within a session by `sequence`. `analysis-completed` cannot arrive before
 * `analysis-started` for the same operation, because both carry the sequence counter
 * and a client can assert monotonicity — which is the only way to notice reordering
 * rather than silently rendering a stale analysis over a fresh one.
 */
export type DaemonEventName =
  | 'hello'
  | 'ready'
  | 'fatal'
  | 'indexing-started'
  | 'indexing-progress'
  | 'analysis-started'
  | 'analysis-progress'
  | 'analysis-completed'
  | 'analysis-stale'
  | 'analysis-failed'
  | 'workspace-changed'
  | 'diagnostics';

export const DAEMON_EVENTS: readonly DaemonEventName[] = [
  'hello',
  'ready',
  'fatal',
  'indexing-started',
  'indexing-progress',
  'analysis-started',
  'analysis-progress',
  'analysis-completed',
  'analysis-stale',
  'analysis-failed',
  'workspace-changed',
  'diagnostics',
];

// ── Envelopes ─────────────────────────────────────────────────────────────────

/** Client → daemon. */
export interface DaemonRequest {
  readonly protocol: number;
  /** Unique within a session. Echoed exactly on the response. */
  readonly id: string;
  readonly method: DaemonMethod;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Daemon → client, exactly one per request. */
export interface DaemonResponse {
  readonly protocol: number;
  readonly id: string;
  /** Present on success. Mutually exclusive with `error`. */
  readonly result?: unknown;
  /** Present on failure. Mutually exclusive with `result`. */
  readonly error?: DaemonError;
}

/** Daemon → client, unsolicited. */
export interface DaemonEvent {
  readonly protocol: number;
  readonly event: DaemonEventName;
  /**
   * Monotonically increasing within a session, from 1.
   *
   * Present so a client can assert ordering rather than assume it. A dropped or
   * reordered event is then a detectable gap instead of a silently wrong screen.
   */
  readonly sequence: number;
  /** The session this event belongs to. Events never cross sessions. */
  readonly sessionId: string;
  readonly payload: unknown;
}

/** Anything the daemon writes. */
export type DaemonOutbound = DaemonResponse | DaemonEvent;

export function isDaemonEvent(message: DaemonOutbound): message is DaemonEvent {
  return 'event' in message;
}

export function isDaemonResponse(message: DaemonOutbound): message is DaemonResponse {
  return 'id' in message && !('event' in message);
}

// ── Handshake ─────────────────────────────────────────────────────────────────

/**
 * What `hello` establishes, in one round trip.
 *
 * Every field is something a client would otherwise have to guess, and every guess
 * was a real defect: the plugin could not tell an old daemon from a slow one, could
 * not tell which Core produced an analysis, and had no session identity at all — so
 * a response from a restarted daemon was indistinguishable from a late response from
 * the dead one.
 */
export interface HelloResult {
  readonly protocol: number;
  readonly minProtocol: number;
  /**
   * The methods this build actually answers.
   *
   * The protocol version alone cannot express "this binary is older than the plugin
   * that bundled it": a stale daemon speaks v1 perfectly and simply refuses a method
   * the client now depends on. That is exactly what shipped — a plugin calling
   * `getUsageReferences` against a daemon built before it existed, producing a
   * per-call error message that named a symptom rather than the cause.
   *
   * Declared once, at handshake, so a client can say "your bundled engine is out of
   * date" the moment it connects instead of one confusing failure per feature.
   */
  readonly methods: readonly DaemonMethod[];
  /** `@animoria/core`'s version — the engine that produced every analysis. */
  readonly coreVersion: string;
  /** The daemon binary's own version. Differs from `coreVersion` for a SEA build. */
  readonly daemonVersion: string;
  /** Unique per daemon process. A client discards state tagged with any other. */
  readonly sessionId: string;
  readonly capabilities: DaemonCapabilities;
  /** The workspace this daemon serves — see `WorkspaceIdentity`. */
  readonly workspace: {
    readonly id: string;
    readonly roots: readonly {
      readonly id: string;
      readonly path: string;
      readonly name: string;
    }[];
  };
}

/** `ping` — liveness, and a way to tell "slow" from "dead". */
export interface PingResult {
  readonly sessionId: string;
  /** Daemon uptime in milliseconds. */
  readonly uptimeMs: number;
  /** How many requests are executing right now. */
  readonly inFlight: number;
  /** Whether the handshake completed and the first analysis is established. */
  readonly ready: boolean;
}

// ── Compatibility ─────────────────────────────────────────────────────────────

/** Why a client and daemon cannot talk. */
export type IncompatibilityReason = 'client-too-old' | 'client-too-new' | 'malformed-version';

export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly reason: IncompatibilityReason | null;
  /**
   * What to tell the developer.
   *
   * Written here, once, so every client says the same thing — and so it says what to
   * *do* ("reinstall the plugin") rather than what happened ("protocol mismatch").
   */
  readonly message: string | null;
}

/**
 * Whether a client's protocol version can be served.
 *
 * Never silently downgrades. A client outside the window is told which direction it
 * is wrong in, because "your plugin is old" and "your engine is old" have opposite
 * fixes and a single "mismatch" message sends half the users to the wrong one.
 */
export function checkProtocolCompatibility(clientProtocol: unknown): CompatibilityResult {
  if (typeof clientProtocol !== 'number' || !Number.isInteger(clientProtocol)) {
    return {
      compatible: false,
      reason: 'malformed-version',
      message:
        'Animoria could not read the protocol version from this client. Reinstall the extension or plugin.',
    };
  }

  if (clientProtocol < MIN_SUPPORTED_PROTOCOL_VERSION) {
    return {
      compatible: false,
      reason: 'client-too-old',
      message: `Animoria's background engine speaks protocol ${PROTOCOL_VERSION}, but this client speaks ${clientProtocol}. Update the extension or plugin.`,
    };
  }

  if (clientProtocol > PROTOCOL_VERSION) {
    return {
      compatible: false,
      reason: 'client-too-new',
      message: `This client expects protocol ${clientProtocol}, but Animoria's background engine speaks ${PROTOCOL_VERSION}. Reinstall the extension or plugin so both are updated together.`,
    };
  }

  return { compatible: true, reason: null, message: null };
}

// ── Request validation ────────────────────────────────────────────────────────

export type RequestValidation =
  | { readonly ok: true; readonly request: DaemonRequest }
  | { readonly ok: false; readonly error: DaemonError; readonly id: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates one inbound line against the envelope contract.
 *
 * Returns the `id` alongside the error whenever it could be read, so a malformed
 * request still gets a correlatable response. A client that sent a bad request and
 * receives nothing back cannot distinguish that from a hung daemon — which is the
 * behaviour the previous protocol had for every unparseable line.
 */
export function validateRequest(raw: unknown): RequestValidation {
  if (!isRecord(raw)) {
    return {
      ok: false,
      id: null,
      error: daemonError('invalid-request', 'Request is not a JSON object.'),
    };
  }

  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : null;

  const compatibility = checkProtocolCompatibility(raw.protocol);
  if (!compatibility.compatible) {
    return {
      ok: false,
      id,
      error: daemonError('unsupported-version', compatibility.message ?? 'Protocol mismatch.', {
        detail: `client=${String(raw.protocol)} daemon=${PROTOCOL_VERSION}`,
      }),
    };
  }

  if (id === null) {
    return {
      ok: false,
      id: null,
      error: daemonError('invalid-request', 'Request is missing a non-empty string "id".'),
    };
  }

  if (typeof raw.method !== 'string') {
    return {
      ok: false,
      id,
      error: daemonError('invalid-request', 'Request is missing a string "method".'),
    };
  }

  if (!(DAEMON_METHODS as readonly string[]).includes(raw.method)) {
    return {
      ok: false,
      id,
      error: daemonError('unsupported-method', `Unknown method "${raw.method}".`, {
        detail: `known methods: ${DAEMON_METHODS.join(', ')}`,
      }),
    };
  }

  if (raw.params !== undefined && !isRecord(raw.params)) {
    return {
      ok: false,
      id,
      error: daemonError('invalid-params', '"params" must be an object when present.'),
    };
  }

  const request: DaemonRequest = {
    protocol: raw.protocol as number,
    id,
    method: raw.method as DaemonMethod,
    ...(raw.params === undefined ? {} : { params: raw.params as Record<string, unknown> }),
  };

  return { ok: true, request };
}

// ── Param helpers ─────────────────────────────────────────────────────────────

/**
 * Reads a required string param, or produces the error explaining which one.
 *
 * Named per-field rather than validating a whole shape because the error a developer
 * needs is "`assetPath` is required", not "params did not validate".
 */
export function requireString(
  params: Readonly<Record<string, unknown>> | undefined,
  name: string
): { ok: true; value: string } | { ok: false; error: DaemonError } {
  const value = params?.[name];
  if (typeof value !== 'string' || value.length === 0) {
    return {
      ok: false,
      error: daemonError('invalid-params', `"${name}" is required and must be a non-empty string.`),
    };
  }
  return { ok: true, value };
}

export function requireStringArray(
  params: Readonly<Record<string, unknown>> | undefined,
  name: string
): { ok: true; value: readonly string[] } | { ok: false; error: DaemonError } {
  const value = params?.[name];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    return {
      ok: false,
      error: daemonError(
        'invalid-params',
        `"${name}" is required and must be an array of strings.`
      ),
    };
  }
  return { ok: true, value: value as readonly string[] };
}

export function optionalBoolean(
  params: Readonly<Record<string, unknown>> | undefined,
  name: string,
  fallback: boolean
): boolean {
  const value = params?.[name];
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * A `string[]` parameter that may be absent.
 *
 * Absent and empty mean the same thing here — no dismissals — so a missing parameter
 * is not an error. A malformed one is: silently reading `["a", 3]` as `["a"]` would
 * make a client's bug look like a developer's decision.
 */
export function optionalStringArray(
  params: Readonly<Record<string, unknown>> | undefined,
  name: string
): readonly string[] {
  const value = params?.[name];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

export function optionalString(
  params: Readonly<Record<string, unknown>> | undefined,
  name: string,
  fallback: string
): string {
  const value = params?.[name];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
