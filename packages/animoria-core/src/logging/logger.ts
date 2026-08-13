/**
 * Diagnostic logging for intentionally silent failure paths.
 *
 * ## Why this exists
 * Several places in this codebase — parsers, scanners, the config
 * loader, the thumbnail engine — deliberately swallow an error and
 * converge to an absent/skipped state rather than surface it to the
 * user (a missing file, an unreadable directory, a malformed asset).
 * That behavior is correct: the user should never see a toast for "one
 * file among thousands couldn't be read." But a maintainer investigating
 * a report like "some assets never get thumbnails" needs a trail that
 * currently doesn't exist. This module is that trail — additive only,
 * never changing what a caller returns or whether it throws.
 *
 * ## IDE-agnosticism
 * `@animoria/core` has no IDE dependencies (see the repository's
 * architecture rules), so it cannot reach for `vscode.OutputChannel`
 * directly. Instead, core defines the {@link Logger} contract and a
 * `NullLogger` default; the consuming extension supplies a concrete
 * implementation via {@link setLogger} once, at activation. Every
 * `@animoria/core` call site logs through {@link logDebug}/
 * {@link logWarn}/{@link logError} without ever knowing what — if
 * anything — is listening.
 *
 * ## Levels
 * - `debug` — an expected, recoverable situation where the product
 *   intentionally converges to an absent or skipped state (a file
 *   vanished between listing and reading it, a directory isn't
 *   readable, a value didn't match an expected shape).
 * - `warn` — an unexpected but recoverable situation: functionality
 *   degrades (a feature falls back to a lesser result) but execution
 *   safely continues.
 * - `error` — an unexpected situation that compromises an operation or
 *   violates an internal invariant, even though the failure stays
 *   isolated to that operation and does not crash the process.
 *
 * ## Operation-oriented, not event-oriented
 * Every log entry carries an {@link OperationId} identifying which
 * product workflow it belongs to (`thumbnail-generation`, `usage-scan`,
 * `config-load`, ...), in addition to the originating `component`. A
 * consumer rendering these entries (e.g. an `OutputChannel`) can then
 * read them as a sequence of product operations — "here is everything
 * that happened during this thumbnail generation pass" — rather than an
 * unordered pile of unrelated exceptions distinguished only by whichever
 * message text a given call site happened to write.
 */

/** Severity of a diagnostic entry. See the module doc comment for the semantics of each. */
export type LogLevel = 'debug' | 'warn' | 'error';

/**
 * The fixed vocabulary of product workflows a diagnostic entry can
 * belong to. Deliberately closed (not a free-text field) so entries from
 * every call site group consistently regardless of which developer
 * wrote them.
 */
export type OperationId =
  | 'asset-parse'
  | 'file-scan'
  | 'usage-scan'
  | 'config-load'
  | 'rule-option-parse'
  | 'duplicate-resolution-validate'
  | 'duplicate-resolution-execute'
  | 'thumbnail-generation'
  | 'cli-watch'
  | 'cli-check'
  | 'preview-render'
  | 'integration-registry'
  | 'governance-run'
  | 'extension-deactivate'
  | 'asset-card-render'
  | 'trash-cleanup'
  | 'daemon-protocol'
  | 'daemon-lifecycle'
  /**
   * A host adapter translating between the shared UI and the platform.
   *
   * Its own workflow rather than a sub-case of the others: a message that reached
   * the bridge and failed there is a *connectivity* failure, and grouping it under
   * `governance-run` would hide it among the analysis it was merely asking about.
   */
  | 'host-bridge';

/** Structured context for a single diagnostic entry. */
export interface LogContext {
  /** The product workflow this entry belongs to. */
  readonly operation: OperationId;
  /** The class or module emitting this entry (e.g. `'FileScanner'`). */
  readonly component: string;
  /** A specific, actionable description of what happened — never a generic "operation failed". */
  readonly message: string;
  /** The asset or file path this entry concerns, if any. */
  readonly assetPath?: string;
  /** Why the operation could not proceed normally, in a few words. */
  readonly reason?: string;
  /** The original error or thrown value, if this entry originated from a catch block. */
  readonly error?: unknown;
  /** What the caller did instead — the state the operation converged to (e.g. `'returned null'`, `'skipped file'`). */
  readonly recovery?: string;

  // ── Daemon correlation ─────────────────────────────────────────────────────
  //
  // A daemon failure is only diagnosable if it can be tied to the request that
  // caused it and the session it happened in. Without these, a log line saying
  // "request handler threw" in a process serving several workspaces over a long
  // session is an observation nobody can act on.
  //
  // Deliberately *identifiers*, not payloads: a session id, a request id, a
  // workspace id and a method name are enough to correlate, and none of them
  // carries file contents, asset data or an analysis object into the log.

  /** The daemon session this entry belongs to. */
  readonly sessionId?: string;
  /** The protocol request id, when the entry arose while serving one. */
  readonly requestId?: string;
  /** The protocol method being served. */
  readonly method?: string;
  /** The workspace identity — the hashed id, never the developer's directory layout. */
  readonly workspaceId?: string;
}

/** Receives structured diagnostic entries. Implemented by the consuming host (e.g. the VS Code extension); core only ever calls through this contract. */
export interface Logger {
  log(level: LogLevel, context: LogContext): void;
}

/** Default logger: discards every entry. Keeps `@animoria/core` fully functional — and silent — when no host has installed a real logger (e.g. under test, or before extension activation completes). */
class NullLogger implements Logger {
  log(): void {
    // Intentionally does nothing — see class doc comment.
  }
}

let activeLogger: Logger = new NullLogger();

/** Installs the logger every subsequent `logDebug`/`logWarn`/`logError` call routes through. Call once, early (e.g. extension activation). */
export function setLogger(logger: Logger): void {
  activeLogger = logger;
}

/** Returns the currently installed logger. Exposed mainly for tests that need to restore the previous logger after installing a spy. */
export function getLogger(): Logger {
  return activeLogger;
}

type EntryFields = Omit<LogContext, 'operation' | 'component' | 'message'>;

function emit(
  level: LogLevel,
  operation: OperationId,
  component: string,
  message: string,
  fields?: EntryFields
): void {
  activeLogger.log(level, { operation, component, message, ...fields });
}

export function logDebug(
  operation: OperationId,
  component: string,
  message: string,
  fields?: EntryFields
): void {
  emit('debug', operation, component, message, fields);
}

export function logWarn(
  operation: OperationId,
  component: string,
  message: string,
  fields?: EntryFields
): void {
  emit('warn', operation, component, message, fields);
}

export function logError(
  operation: OperationId,
  component: string,
  message: string,
  fields?: EntryFields
): void {
  emit('error', operation, component, message, fields);
}
