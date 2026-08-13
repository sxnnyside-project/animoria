import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { buildCleanupCandidates } from '../analysis/cleanup-candidates.js';
import {
  buildCleanupPlan,
  buildReviewableProposal,
  executeCleanupPlan,
} from '../cleanup/cleanup-plan.js';
import type { CleanupPlan } from '../cleanup/cleanup-plan.js';
import { listTrashSessions, restoreTrashSession } from '../cleanup/trash.js';
import { buildResolutionPlan } from '../governance/duplicates/resolution-plan.js';
import { executeResolutionPlan } from '../governance/duplicates/resolution-executor.js';
import type { ResolutionPlan } from '../governance/duplicates/types.js';
import { buildJsonReport, buildMarkdownReport } from '../governance/report-formatter.js';
import { logWarn } from '../logging/logger.js';
import type { MultiRootAnalysis } from '../workspace/multi-root-analysis.js';
import { WorkspaceSession } from '../workspace/workspace-session.js';
import { resolveWithinWorkspace } from '../workspace/workspace-identity.js';
import { readLottieDocument } from '../parsers/lottie-document.js';
import { ThumbnailEngine } from '../thumbnails/thumbnail-engine.js';
import { integrationRegistry } from '../integration/index.js';
import { computeWorkspaceRelativePath, toImportSpecifier } from '../integration/path-resolution.js';
import type {
  DaemonCapabilities,
  DaemonError,
  DaemonEvent,
  DaemonEventName,
  DaemonMethod,
  DaemonRequest,
  DaemonResponse,
  HelloResult,
  PingResult,
} from './protocol.js';
import {
  CAPABILITY_BY_METHOD,
  DAEMON_CAPABILITIES,
  IMPLEMENTED_METHODS,
  MUTATING_METHODS,
  PRE_READY_METHODS,
  PROTOCOL_VERSION,
  MIN_SUPPORTED_PROTOCOL_VERSION,
  daemonError,
  optionalBoolean,
  optionalString,
  optionalStringArray,
  requireString,
  requireStringArray,
  validateRequest,
} from './protocol.js';
import { RequestRegistry } from './request-registry.js';

/**
 * The daemon runtime: protocol v1 over a caller-supplied transport.
 *
 * ## Why this is a class in Core and not inline in `cli.ts`
 * The protocol used to be ~300 lines of `switch` inside the CLI's watch command,
 * reachable only by spawning a subprocess. So the only way to test "does a duplicate
 * request id get rejected" was to boot a real daemon and race it. Everything here is
 * transport-agnostic: `handleLine` takes a string and `emit` is injected, which means
 * the entire protocol — handshake, lifecycle, cancellation, session isolation — is
 * testable in-process, and the subprocess test is left to prove only that the wiring
 * is connected.
 *
 * ## Session isolation
 * One `DaemonServer` is one session with one `sessionId`, one `WorkspaceSession`, and
 * one `RequestRegistry`. Nothing is module-scoped. Two servers in one process — which
 * is exactly what the tests do — cannot see each other's requests, plans, events or
 * analyses. That property is what makes "a response cannot reach the wrong client"
 * structural rather than a claim about how the CLI happens to spawn processes.
 *
 * ## Plans are held here, keyed by id
 * A `CleanupPlan` or `ResolutionPlan` is built, stored against its id, and applied by
 * that id. A plan id from another session does not exist in this map, so it cannot be
 * applied — which is the cross-session guarantee §12 asks for, enforced by the same
 * mechanism that already made "what you saw is what ran" structural.
 */

/**
 * Why a path cannot serve as a workspace root, or `null` when it can.
 *
 * Synchronous by design: it runs before anything is indexed, once per root, and an
 * async check here would let `start()` interleave with a client's first request.
 */
function describeRootProblem(rootPath: string): string | null {
  if (!existsSync(rootPath)) return `Workspace root does not exist: ${rootPath}`;
  try {
    if (!statSync(rootPath).isDirectory()) {
      return `Workspace root is not a directory: ${rootPath}`;
    }
  } catch (error) {
    return `Workspace root could not be read: ${rootPath} (${
      error instanceof Error ? error.message : String(error)
    })`;
  }
  return null;
}

export interface DaemonServerOptions {
  /** Absolute paths. One for a single-root workspace, several for multi-root. */
  readonly rootPaths: readonly string[];
  /** Writes one outbound message. The transport's only responsibility. */
  readonly emit: (message: DaemonResponse | DaemonEvent) => void;
  /** Overridden in tests; defaults to the real package versions. */
  readonly coreVersion?: string;
  readonly daemonVersion?: string;
}

export class DaemonServer {
  readonly sessionId: string = randomUUID();

  private readonly _emit: (message: DaemonResponse | DaemonEvent) => void;
  private readonly _registry = new RequestRegistry();
  private readonly _coreVersion: string;
  private readonly _daemonVersion: string;
  private readonly _startedAt = Date.now();

  private readonly _cleanupPlans = new Map<string, CleanupPlan>();
  private readonly _resolutionPlans = new Map<string, ResolutionPlan>();
  private _planCounter = 0;

  private _session: WorkspaceSession | null = null;
  private _sequence = 0;
  private _handshakeComplete = false;
  private _ready = false;
  private _fatal: DaemonError | null = null;
  private _stopped = false;
  /** Set by `shutdown`; acted on once its response has been written. */
  private _stopRequested = false;

  private readonly _rootPaths: readonly string[];

  constructor(options: DaemonServerOptions) {
    this._rootPaths = options.rootPaths;
    this._emit = options.emit;
    this._coreVersion = options.coreVersion ?? 'unknown';
    this._daemonVersion = options.daemonVersion ?? options.coreVersion ?? 'unknown';
  }

  get capabilities(): DaemonCapabilities {
    return DAEMON_CAPABILITIES;
  }

  get isReady(): boolean {
    return this._ready;
  }

  /** The workspace being served, once started. */
  get workspaceSession(): WorkspaceSession | null {
    return this._session;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Establishes the workspace and reaches `ready`.
   *
   * Emits `indexing-started` → `analysis-started` → `analysis-completed` → `ready`,
   * in that order, with monotonic sequence numbers. A client that asserts ordering
   * therefore notices a dropped event instead of rendering around it.
   *
   * A workspace that cannot be analysed produces `fatal` and leaves the daemon
   * permanently un-ready — it does not silently index a nonexistent path and report a
   * clean workspace, which is what P4 exists to stop.
   */
  async start(): Promise<void> {
    if (this._rootPaths.length === 0) {
      this._fail(daemonError('workspace-not-found', 'No workspace root was provided.'));
      return;
    }

    // Checked before constructing the session. `WorkspaceIndexer` records a failure
    // for an unreadable root but does not throw, so without this the daemon would
    // reach `ready` over a nonexistent path and report a clean workspace — the exact
    // behaviour P4 exists to remove.
    for (const rootPath of this._rootPaths) {
      const problem = describeRootProblem(rootPath);
      if (problem) {
        this._fail(daemonError('workspace-not-found', problem));
        return;
      }
    }

    try {
      this._session = new WorkspaceSession(this._rootPaths);
    } catch (error) {
      this._fail(
        daemonError('workspace-invalid', 'The workspace roots could not be resolved.', {
          detail: error instanceof Error ? error.message : String(error),
        })
      );
      return;
    }

    this._event('indexing-started', {
      workspaceId: this._session.identity.id,
      roots: this._session.roots.map((root) => ({ id: root.id, name: root.name, path: root.path })),
    });
    this._event('analysis-started', { workspaceId: this._session.identity.id });

    try {
      const analysis = await this._session.initialize();
      this._event('analysis-completed', this._analysisPayload(analysis));
      this._ready = true;
      this._event('ready', {
        sessionId: this.sessionId,
        workspaceId: this._session.identity.id,
        capabilities: DAEMON_CAPABILITIES,
      });
    } catch (error) {
      this._event('analysis-failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      this._fail(
        daemonError('analysis-failed', 'The initial analysis could not be completed.', {
          detail: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Stops the daemon: aborts in-flight work, answers every waiting request, disposes
   * the workspace.
   *
   * Answering the outstanding requests is the part that is easy to skip and wrong to
   * skip — a client left waiting on a request the daemon has abandoned cannot tell
   * shutdown from a hang.
   */
  stop(): void {
    if (this._stopped) return;
    this._stopped = true;

    for (const outstanding of this._registry.close()) {
      this._respondError(
        outstanding.id,
        daemonError('cancelled', 'The daemon shut down before this request completed.')
      );
    }

    this._session?.dispose();
    this._session = null;
    this._cleanupPlans.clear();
    this._resolutionPlans.clear();
    this._ready = false;
  }

  /** Notifies the owning root of a filesystem change. */
  notifyFileChanged(path: string, kind: 'created' | 'changed' | 'deleted'): void {
    this._session?.notifyFileChanged(path, kind);
  }

  /** Publishes a fresh analysis after a change settles. */
  publishAnalysis(): void {
    const session = this._session;
    if (!session) return;
    const analysis = session.getAnalysis();
    this._event(
      analysis.freshness === 'stale' ? 'analysis-stale' : 'analysis-completed',
      this._analysisPayload(analysis)
    );
  }

  // ── Inbound ────────────────────────────────────────────────────────────────

  /**
   * Handles one inbound line.
   *
   * Never throws. Every failure path produces a response carrying the request's id
   * whenever the id could be read, because a client that gets nothing back cannot
   * distinguish a rejected request from a hung daemon.
   */
  async handleLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // No id is recoverable from an unparseable line, so this is the one case with
      // no correlatable response. Emitted as a diagnostic event so it is at least
      // visible rather than silently dropped, which is what the old daemon did.
      this._event('diagnostics', {
        severity: 'error',
        message: 'Received a line that is not valid JSON.',
      });
      return;
    }

    const validation = validateRequest(parsed);
    if (!validation.ok) {
      if (validation.id) this._respondError(validation.id, validation.error);
      else this._event('diagnostics', { severity: 'error', message: validation.error.message });
      return;
    }

    await this._dispatch(validation.request);
  }

  private async _dispatch(request: DaemonRequest): Promise<void> {
    const { id, method } = request;

    // A fatal workspace is terminal: answering `analysis-failed` to every request is
    // more useful than answering each one differently, and stops a client retrying
    // its way through the whole method surface.
    if (this._fatal && !PRE_READY_METHODS.includes(method)) {
      this._respondError(id, this._fatal);
      return;
    }

    if (!this._ready && !PRE_READY_METHODS.includes(method)) {
      this._respondError(
        id,
        daemonError(
          'analysis-incomplete',
          'The daemon has not finished starting. Wait for the "ready" event before sending this request.',
          { retryable: true }
        )
      );
      return;
    }

    const required = CAPABILITY_BY_METHOD[method];
    if (required && !DAEMON_CAPABILITIES[required]) {
      this._respondError(
        id,
        daemonError('unsupported-capability', `This daemon does not support "${required}".`)
      );
      return;
    }

    const registration = this._registry.register(id, method);
    if (!registration.ok || !registration.request) {
      this._respondError(
        id,
        registration.error ?? daemonError('internal-error', 'Registration failed.')
      );
      return;
    }

    const signal = registration.request.controller.signal;

    try {
      const result = await this._execute(request, signal);

      if (signal.aborted) {
        this._registry.settle(id, 'cancelled');
        this._respondError(id, daemonError('cancelled', 'The request was cancelled.'));
        return;
      }

      if ('error' in result) {
        this._registry.settle(id, 'failed');
        this._respondError(id, result.error);
        return;
      }

      this._registry.settle(id, 'completed');
      this._respond(id, result.value);

      // Deferred until the response is on the wire — see the `shutdown` case.
      if (this._stopRequested) this.stop();
    } catch (error) {
      this._registry.settle(id, 'failed');
      // The raw message goes to `detail`, never to the primary message: a developer
      // shown `Cannot read properties of undefined` learns nothing about their
      // workspace.
      logWarn('daemon-protocol', 'DaemonServer._dispatch', 'Request handler threw', {
        sessionId: this.sessionId,
        requestId: id,
        method,
        error,
      });
      this._respondError(
        id,
        daemonError('internal-error', `The "${method}" operation failed unexpectedly.`, {
          detail: error instanceof Error ? (error.stack ?? error.message) : String(error),
        })
      );
    }
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  private async _execute(
    request: DaemonRequest,
    signal: AbortSignal
  ): Promise<{ value: unknown } | { error: DaemonError }> {
    const { method, params } = request;

    switch (method) {
      case 'hello':
        return { value: this._hello() };

      case 'ping':
        // Excludes this ping itself. A liveness probe that always reports "1 in
        // flight" cannot answer the question it exists to answer — "is the daemon
        // busy, or is it stuck?".
        return { value: this._ping() };

      case 'cancel': {
        const target = requireString(params, 'requestId');
        if (!target.ok) return { error: target.error };
        if (target.value === request.id) {
          return {
            error: daemonError('invalid-params', 'A request cannot cancel itself.'),
          };
        }
        if (!this._registry.cancel(target.value)) {
          return {
            error: daemonError(
              'unknown-request-id',
              `No request with id "${target.value}" is in flight.`
            ),
          };
        }
        return { value: { cancelled: target.value } };
      }

      case 'shutdown':
        // Flagged, not executed. `stop()` answers every in-flight request with
        // `cancelled` — including this one, if it ran here — so the client asking for
        // shutdown would be told its own request was cancelled. `_dispatch` stops the
        // server *after* this response is written.
        this._stopRequested = true;
        return { value: { stopping: true } };

      case 'analyze': {
        const session = this._requireSession();
        if ('error' in session) return session;
        const analysis = await session.value.analyzeComplete();
        if (signal.aborted) return { error: daemonError('cancelled', 'Analysis was cancelled.') };
        this._event('analysis-completed', this._analysisPayload(analysis));
        return { value: this._analysisPayload(analysis) };
      }

      case 'getAnalysis': {
        const session = this._requireSession();
        if ('error' in session) return session;
        return { value: this._analysisPayload(session.value.getAnalysis()) };
      }

      case 'buildCleanupProposal': {
        // Dismissals travel in as a parameter, because they are the *host's* state:
        // Core reports that an asset is unreferenced and that stays true regardless
        // of whether a developer has already decided about it. The option existed on
        // `buildCleanupCandidates` from the start and no caller ever filled it.
        const dismissed = optionalStringArray(params, 'dismissedPaths');
        const perRoot = await this._perRootCleanupProposals(new Set(dismissed));
        if ('error' in perRoot) return perRoot;
        return { value: { roots: perRoot.value } };
      }

      case 'buildCleanupPlan': {
        const paths = requireStringArray(params, 'assetPaths');
        if (!paths.ok) return { error: paths.error };
        // The plan is built from the same proposal the developer was shown, which
        // means it must be built under the same dismissals.
        return this._buildCleanupPlan(
          paths.value,
          new Set(optionalStringArray(params, 'dismissedPaths'))
        );
      }

      case 'applyCleanupPlan': {
        const planId = requireString(params, 'planId');
        if (!planId.ok) return { error: planId.error };
        return this._applyCleanupPlan(planId.value, optionalBoolean(params, 'allowPartial', false));
      }

      case 'buildResolutionPlan': {
        const groupId = requireString(params, 'groupId');
        if (!groupId.ok) return { error: groupId.error };
        const keepPath = requireString(params, 'keepPath');
        if (!keepPath.ok) return { error: keepPath.error };
        return this._buildResolutionPlan(groupId.value, keepPath.value);
      }

      case 'applyResolutionPlan': {
        const planId = requireString(params, 'planId');
        if (!planId.ok) return { error: planId.error };
        return this._applyResolutionPlan(
          planId.value,
          optionalBoolean(params, 'allowPartial', false)
        );
      }

      case 'listTrashSessions': {
        const session = this._requireSession();
        if ('error' in session) return session;
        const perRoot = await Promise.all(
          session.value.roots.map(async (root) => ({
            rootId: root.id,
            sessions: await listTrashSessions(root.path),
          }))
        );
        return { value: { roots: perRoot } };
      }

      case 'restoreTrashSession': {
        const sessionId = requireString(params, 'sessionId');
        if (!sessionId.ok) return { error: sessionId.error };
        const rootId = requireString(params, 'rootId');
        if (!rootId.ok) return { error: rootId.error };
        return this._restore(rootId.value, sessionId.value);
      }

      case 'exportReport': {
        // Implemented, not declared-and-refused.
        //
        // The JetBrains client's "Governance Report" and "Export Report" actions both
        // reach this method, and it answered `unsupported-method` — which the client
        // then failed to decode, so the report simply never opened. A protocol method
        // that no build implements is a promise the vocabulary makes and the product
        // cannot keep.
        const session = this._requireSession();
        if ('error' in session) return session;

        const format = optionalString(params, 'format', 'markdown');
        if (format !== 'markdown' && format !== 'json') {
          return {
            error: daemonError('invalid-params', `"${format}" is not a report format.`, {
              detail: 'expected "markdown" or "json"',
            }),
          };
        }

        const analysis = session.value.getAnalysis();

        // One section per root, never merged: the roots may govern themselves under
        // different `.animoriarc` policies, and a single merged report would have to
        // pick one to describe.
        if (format === 'json') {
          return {
            value: {
              format,
              content: JSON.stringify(
                {
                  workspace: analysis.workspace,
                  roots: analysis.roots.map(({ root, analysis: rootAnalysis }) => ({
                    root,
                    report: JSON.parse(buildJsonReport(rootAnalysis)) as unknown,
                  })),
                },
                null,
                2
              ),
            },
          };
        }

        const sections = analysis.roots.map(({ root, analysis: rootAnalysis }) =>
          analysis.workspace.isSingleRoot
            ? buildMarkdownReport(rootAnalysis)
            : `## ${root.name}\n\n${buildMarkdownReport(rootAnalysis)}`
        );
        return { value: { format, content: sections.join('\n\n---\n\n') } };
      }

      case 'getUsageReferences': {
        // Usage References — where an asset is actually used — is the capability
        // D-04 names as the highest priority after the core flow, and it was declared
        // here and refused. Two real consumers depend on it: the shared UI's
        // inspector, which lists the locations a developer can jump to, and the
        // JetBrains editor hover, whose deleted implementation matched asset stems
        // against source text in Kotlin because it had no authoritative answer to ask.
        //
        // Two lookups, one method: `assetPath` answers "where is this used?",
        // `file` answers "what does this line refer to?". The second is the reverse
        // index a hover needs, and computing it in a client would be exactly the
        // reimplementation of `reference-patterns.ts` the layer rule forbids.
        const session = this._requireSession();
        if ('error' in session) return session;

        const assetPath = optionalString(params, 'assetPath', '');
        const file = optionalString(params, 'file', '');
        const analysis = session.value.getAnalysis();
        // Reported alongside the result, never folded into it: an empty list from a
        // scan that has not finished is not the same claim as "used nowhere", and a
        // client that cannot tell them apart will eventually say the wrong one.
        const complete = analysis.readiness.referencesResolved;

        if (assetPath !== '') {
          const resolved = resolveWithinWorkspace(session.value.identity, assetPath);
          if (!resolved) {
            return {
              error: daemonError(
                'permission-denied',
                `"${assetPath}" does not resolve to a file inside this workspace.`
              ),
            };
          }
          const indexer = session.value.indexerForRoot(resolved.root.id);
          if (!indexer) {
            return { error: daemonError('workspace-invalid', 'That root is no longer open.') };
          }
          return {
            value: {
              assetPath: resolved.path,
              rootId: resolved.root.id,
              complete,
              references: indexer.usageReferencesFor(resolved.path),
            },
          };
        }

        if (file !== '') {
          const located = session.value.indexerForPath(file);
          if (!located) {
            // A file outside every root has no references *by definition*, which is a
            // real answer rather than an error — a hover over a `node_modules` file
            // must not surface a failure.
            return { value: { file, rootId: '', complete, references: [] } };
          }
          return {
            value: {
              file,
              rootId: located.root.id,
              complete,
              references: located.indexer.referencesInFile(file),
            },
          };
        }

        // Neither parameter: every reference in the workspace, so a client that needs
        // to answer synchronously — an editor hover firing on every mouse move — can
        // fetch once per analysis generation instead of once per pixel. The payload is
        // bounded by the reference count the scan already produced.
        const all: { rootId: string; assetPath: string; reference: unknown }[] = [];
        for (const root of session.value.roots) {
          const indexer = session.value.indexerForRoot(root.id);
          if (!indexer) continue;
          for (const entry of indexer.getAnalysis().assets) {
            for (const reference of indexer.usageReferencesFor(entry.path)) {
              all.push({ rootId: root.id, assetPath: entry.path, reference });
            }
          }
        }
        return { value: { complete, generation: analysis.generation, references: all } };
      }

      case 'getLottieDocument': {
        // The animation itself, so a JCEF panel can play it rather than display a
        // frame of it. `generateThumbnail` answers "what does it look like"; this
        // answers "what is it", and only the second can be scrubbed.
        const assetPath = requireString(params, 'assetPath');
        if (!assetPath.ok) return { error: assetPath.error };

        const session = this._requireSession();
        if ('error' in session) return session;

        const resolved = resolveWithinWorkspace(session.value.identity, assetPath.value);
        if (!resolved) {
          return {
            error: daemonError(
              'permission-denied',
              `"${assetPath.value}" does not resolve to a file inside this workspace.`
            ),
          };
        }

        // `null` rather than an error for an unreadable document: the client falls
        // back to the rendered still, which is a better answer for an unusual file
        // than a failure the developer can do nothing about.
        return { value: (await readLottieDocument(resolved.path)) ?? { animation: null } };
      }

      case 'generateThumbnail': {
        const assetPath = requireString(params, 'assetPath');
        if (!assetPath.ok) return { error: assetPath.error };

        const session = this._requireSession();
        if ('error' in session) return session;

        const analysis = session.value.getAnalysis();
        const attributedAsset = analysis.assets.find((a) => a.asset.path === assetPath.value);
        if (!attributedAsset) return { value: { dataUri: null } };

        const rootId = attributedAsset.rootId;
        const rootInfo = session.value.roots.find((r) => r.id === rootId);
        if (!rootInfo) return { value: { dataUri: null } };

        try {
          const generator = new ThumbnailEngine({
            workspacePath: rootInfo.path,
            frame: 'middle',
          });
          const batch = await generator.generateBatch([attributedAsset.asset]);
          const result = batch.results[0];

          if (!result?.thumbnailPath) {
            return { value: { dataUri: null } };
          }

          const fs = await import('node:fs/promises');
          const buffer = await fs.readFile(result.thumbnailPath);
          const dataUri = `data:image/webp;base64,${buffer.toString('base64')}`;
          return { value: { dataUri } };
        } catch (error) {
          return { error: daemonError('internal-error', String(error)) };
        }
      }

      case 'generateSnippet': {
        const assetPath = requireString(params, 'assetPath');
        if (!assetPath.ok) return { error: assetPath.error };

        const session = this._requireSession();
        if ('error' in session) return session;

        const analysis = session.value.getAnalysis();
        const attributedAsset = analysis.assets.find((a) => a.asset.path === assetPath.value);
        if (!attributedAsset)
          return { error: daemonError('invalid-params', 'Asset not found in analysis.') };

        const rootId = attributedAsset.rootId;
        const rootInfo = session.value.roots.find((r) => r.id === rootId);
        if (!rootInfo) return { error: daemonError('internal-error', 'Root not found.') };

        const workspacePath = rootInfo.path;
        const workspaceRelativePath = computeWorkspaceRelativePath(
          workspacePath,
          attributedAsset.asset.path
        );
        const importPath = toImportSpecifier(workspaceRelativePath);

        const context = {
          asset: attributedAsset.asset,
          importPath,
          workspaceRelativePath,
          pathResolutionBasis: 'workspace-root' as const,
          workspacePath,
        };

        // Every generator that applies, not the first one.
        //
        // This used to collapse the list to `results[0]` and return one joined
        // string, which meant the JetBrains snippet picker — a native chooser built
        // to offer the frameworks — had exactly one item it could not decode, while
        // the VS Code path (which calls `integrationRegistry` directly) offered all
        // of them. The same product action produced a choice in one IDE and a silent
        // failure in the other.
        const results = integrationRegistry.generate(context);
        if (results.length === 0) {
          return {
            value: {
              results: [],
              error: `No snippet generator supports ${attributedAsset.asset.format} assets.`,
            },
          };
        }

        return {
          value: {
            results: results.map((result) => ({
              label: result.label,
              code: result.code,
              imports: result.imports ?? null,
              installHint: result.installHint ?? null,
            })),
            error: null,
          },
        };
      }

      default: {
        const exhaustive: never = method;
        return {
          error: daemonError('unsupported-method', `Unhandled method "${String(exhaustive)}".`),
        };
      }
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  private _hello(): HelloResult {
    this._handshakeComplete = true;
    const identity = this._session?.identity;

    return {
      protocol: PROTOCOL_VERSION,
      minProtocol: MIN_SUPPORTED_PROTOCOL_VERSION,
      // What this build answers, not what the vocabulary names. `IMPLEMENTED_METHODS`
      // is derived from the dispatch below, so a method that is declared and refused
      // cannot appear here and mislead a client into calling it.
      methods: IMPLEMENTED_METHODS,
      coreVersion: this._coreVersion,
      daemonVersion: this._daemonVersion,
      sessionId: this.sessionId,
      capabilities: DAEMON_CAPABILITIES,
      workspace: {
        id: identity?.id ?? '',
        roots:
          identity?.roots.map((root) => ({ id: root.id, path: root.path, name: root.name })) ?? [],
      },
    };
  }

  private _ping(): PingResult {
    return {
      sessionId: this.sessionId,
      uptimeMs: Date.now() - this._startedAt,
      // The ping being served is not work the client cares about.
      inFlight: Math.max(0, this._registry.inFlightCount - 1),
      ready: this._ready,
    };
  }

  private _requireSession(): { value: WorkspaceSession } | { error: DaemonError } {
    if (!this._session) {
      return { error: daemonError('workspace-invalid', 'No workspace is loaded.') };
    }
    return { value: this._session };
  }

  private async _perRootCleanupProposals(
    dismissedPaths: ReadonlySet<string> = new Set()
  ): Promise<{ value: unknown[] } | { error: DaemonError }> {
    const session = this._requireSession();
    if ('error' in session) return session;

    const proposals: unknown[] = [];
    for (const root of session.value.roots) {
      const indexer = session.value.indexerForRoot(root.id);
      if (!indexer) continue;
      const analysis = indexer.getAnalysis();
      const proposal = await buildReviewableProposal(
        buildCleanupCandidates(analysis, { dismissedPaths }),
        analysis
      );
      proposals.push({ rootId: root.id, rootName: root.name, proposal });
    }
    return { value: proposals };
  }

  /**
   * Builds a cleanup plan, grouped by the root each asset belongs to.
   *
   * ## Why one plan per root
   * `executeCleanupPlan` validates against one root's analysis generation and stages
   * into that root's `.animoria/trash/`. A plan spanning roots would have to pick one
   * generation to validate against, and would stage another root's files into the
   * wrong trash directory — restorable, but to a location the developer has no reason
   * to look in.
   *
   * A selection touching several roots therefore yields several plans, each applied
   * separately, each independently stale-checked.
   */
  private async _buildCleanupPlan(
    assetPaths: readonly string[],
    dismissedPaths: ReadonlySet<string> = new Set()
  ): Promise<{ value: unknown } | { error: DaemonError }> {
    const session = this._requireSession();
    if ('error' in session) return session;
    const workspace = session.value.identity;

    const byRoot = new Map<string, string[]>();
    for (const requested of assetPaths) {
      const resolved = resolveWithinWorkspace(workspace, requested);
      if (!resolved) {
        // Refused, never guessed. In a multi-root workspace `assets/logo.json` names a
        // different file under each root, and picking the first match is exactly the
        // ambiguity V2 exists to remove.
        return {
          error: daemonError(
            'permission-denied',
            `"${requested}" does not resolve to a file inside this workspace.`,
            {
              detail: workspace.isSingleRoot
                ? 'path escapes the workspace root'
                : 'a relative path is ambiguous across multiple roots — send an absolute path',
            }
          ),
        };
      }
      const existing = byRoot.get(resolved.root.id);
      if (existing) existing.push(resolved.path);
      else byRoot.set(resolved.root.id, [resolved.path]);
    }

    const plans: unknown[] = [];
    for (const [rootId, paths] of byRoot) {
      const indexer = session.value.indexerForRoot(rootId);
      if (!indexer) continue;

      const analysis = indexer.getAnalysis();
      const proposal = await buildReviewableProposal(
        buildCleanupCandidates(analysis, { dismissedPaths }),
        analysis
      );
      const root = session.value.roots.find((candidate) => candidate.id === rootId);
      const plan = buildCleanupPlan(
        proposal,
        analysis,
        paths,
        root ? { id: root.id, name: root.name } : null
      );

      this._planCounter += 1;
      const scopedId = `${this.sessionId}:${rootId}:${this._planCounter}`;
      this._cleanupPlans.set(scopedId, plan);
      // The plan carries its own root; the wrapper repeats it so a client can index
      // by root without unwrapping every plan.
      plans.push({ planId: scopedId, rootId, rootName: root?.name ?? '', plan });
    }

    return { value: { plans } };
  }

  private async _applyCleanupPlan(
    planId: string,
    allowPartial: boolean
  ): Promise<{ value: unknown } | { error: DaemonError }> {
    const plan = this._cleanupPlans.get(planId);
    if (!plan) {
      // A plan id from another session is simply not in this map. The cross-session
      // guarantee needs no separate check.
      return {
        error: daemonError(
          'stale-plan',
          'That cleanup preview is no longer available. Build a fresh plan.',
          { retryable: true }
        ),
      };
    }

    const session = this._requireSession();
    if ('error' in session) return session;

    const located = session.value.indexerForPath(plan.workspacePath);
    if (!located) {
      return {
        error: daemonError('stale-plan', 'The root this plan belongs to is no longer open.'),
      };
    }

    const result = await executeCleanupPlan(plan, {
      analysis: located.indexer.getAnalysis(),
      allowPartial,
    });

    this._cleanupPlans.delete(planId);

    if (result.status === 'rejected') {
      return {
        error: daemonError('stale-plan', result.reason ?? 'The plan could not be applied.', {
          retryable: true,
        }),
      };
    }
    if (result.status === 'failed') {
      return {
        error: daemonError(
          'internal-error',
          'The cleanup failed part-way.',
          result.reason === null ? {} : { detail: result.reason }
        ),
      };
    }

    this.publishAnalysis();
    return { value: result };
  }

  private async _buildResolutionPlan(
    groupId: string,
    keepPath: string
  ): Promise<{ value: unknown } | { error: DaemonError }> {
    const session = this._requireSession();
    if ('error' in session) return session;

    const resolved = resolveWithinWorkspace(session.value.identity, keepPath);
    if (!resolved) {
      return {
        error: daemonError(
          'permission-denied',
          `"${keepPath}" does not resolve to a file inside this workspace.`
        ),
      };
    }

    const analysis = session.value.getAnalysis();
    const group = analysis.duplicateGroups.find((candidate) => candidate.id === groupId);
    if (!group) {
      return { error: daemonError('stale-plan', 'That duplicate group no longer exists.') };
    }

    const canonical = group.candidates.find(
      (candidate) => candidate.asset.path === resolved.path
    )?.asset;
    if (!canonical) {
      return {
        error: daemonError('invalid-params', 'The chosen asset is not a member of that group.'),
      };
    }

    const plan = await buildResolutionPlan({
      workspacePath: resolved.root.path,
      group,
      canonicalAsset: canonical,
      root: { id: resolved.root.id, name: resolved.root.name },
    });

    this._planCounter += 1;
    const scopedId = `${this.sessionId}:res:${this._planCounter}`;
    this._resolutionPlans.set(scopedId, plan);
    return {
      value: {
        planId: scopedId,
        rootId: resolved.root.id,
        rootName: resolved.root.name,
        plan,
      },
    };
  }

  private async _applyResolutionPlan(
    planId: string,
    allowPartial: boolean
  ): Promise<{ value: unknown } | { error: DaemonError }> {
    const plan = this._resolutionPlans.get(planId);
    if (!plan) {
      return {
        error: daemonError(
          'stale-plan',
          'That resolution preview is no longer available. Select a copy again.',
          { retryable: true }
        ),
      };
    }

    const session = this._requireSession();
    if ('error' in session) return session;

    const located = session.value.indexerForPath(plan.canonicalAsset.path);
    if (!located) {
      return {
        error: daemonError('stale-plan', 'The root this plan belongs to is no longer open.'),
      };
    }

    const result = await executeResolutionPlan(plan, {
      workspacePath: located.root.path,
      allowPartial,
    });

    this._resolutionPlans.delete(planId);

    if (result.status === 'rejected') {
      return {
        error: daemonError(
          'stale-plan',
          result.issues[0]?.message ?? 'The plan no longer matches the workspace.',
          { retryable: true }
        ),
      };
    }
    if (result.status === 'failed') {
      return {
        error: daemonError(
          'internal-error',
          'The resolution failed part-way.',
          result.error === null ? {} : { detail: result.error }
        ),
      };
    }

    this.publishAnalysis();
    return { value: result };
  }

  private async _restore(
    rootId: string,
    trashSessionId: string
  ): Promise<{ value: unknown } | { error: DaemonError }> {
    const session = this._requireSession();
    if ('error' in session) return session;

    const root = session.value.roots.find((candidate) => candidate.id === rootId);
    if (!root) {
      return { error: daemonError('invalid-params', `No root with id "${rootId}".`) };
    }

    const result = await restoreTrashSession(root.path, trashSessionId);
    this.publishAnalysis();
    return { value: result };
  }

  // ── Emission ───────────────────────────────────────────────────────────────

  private _respond(id: string, result: unknown): void {
    this._emit({ protocol: PROTOCOL_VERSION, id, result });
  }

  private _respondError(id: string, error: DaemonError): void {
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

  private _fail(error: DaemonError): void {
    this._fatal = error;
    this._ready = false;
    this._event('fatal', error);
  }

  /**
   * The wire form of a multi-root analysis.
   *
   * `Map`s do not survive JSON, so `referenceCounts` becomes an entry array. Done
   * here rather than by changing the contract: a `Map` is the right shape for every
   * consumer, and JSON is the wrong place to express that.
   */
  private _analysisPayload(analysis: MultiRootAnalysis): Record<string, unknown> {
    return {
      workspace: analysis.workspace,
      generatedAt: analysis.generatedAt,
      generation: analysis.generation,
      readiness: analysis.readiness,
      freshness: analysis.freshness,
      lifecycle: analysis.lifecycle,
      assets: analysis.assets,
      diagnostics: analysis.diagnostics,
      duplicateGroups: analysis.duplicateGroups,
      health: analysis.health,
      totalDurationMs: analysis.totalDurationMs,
      roots: analysis.roots.map(({ root, analysis: rootAnalysis }) => ({
        root,
        analysis: {
          ...rootAnalysis,
          referenceCounts: Array.from(rootAnalysis.referenceCounts.entries()),
        },
      })),
    };
  }

  /** True once `hello` has been answered. Exposed for tests asserting handshake order. */
  get handshakeComplete(): boolean {
    return this._handshakeComplete;
  }
}
