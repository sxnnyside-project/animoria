import { existsSync } from 'node:fs';
import { basename, extname, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import type {
  AnalysisFailure,
  AnalysisReadiness,
  WorkspaceAnalysis,
} from '../analysis/workspace-analysis.js';
import type { UsageReference } from '../types/asset.js';
import { Animoria } from '../animoria.js';
import { ConfigLoader } from '../governance/config-loader.js';
import { detectDuplicateGroups } from '../governance/duplicates/duplicate-group-detector.js';
import type { DuplicateGroup } from '../governance/duplicates/types.js';
import { HealthScoreEngine, type HealthScoreWeights } from '../governance/health-score.js';
import type { HealthScoreOutcome } from '../governance/health-score.js';
import { type RuleEngineReport, RulesEngine } from '../governance/rules-engine.js';
import { compileIgnorePatterns, loadAnimoriaIgnore } from '../ignore/animoria-ignore.js';
import { isDefaultPolicy, resolveRulePolicy } from '../governance/rules/default-policy.js';
import type { AnimoriaAsset } from '../types/asset.js';
import { SUPPORTED_ASSET_EXTENSIONS } from '../types/formats.js';
import type { ScanCoverage } from '../types/scan-coverage.js';
import { deriveCoverageStatus, describeUnscannedExtensions } from '../types/scan-coverage.js';
import {
  DEFAULT_USAGE_SCAN_EXTENSIONS,
  UsageScanner,
  buildReferenceIndex,
  scanFileForAssetReferences,
} from '../usage/index.js';
import type { ReferenceIndexSummary } from '../usage/reference-index.js';
import { ChangeCoalescer } from './change-coalescer.js';
import { Emitter } from './emitter.js';
import { IndexingScheduler } from './indexing-scheduler.js';
import { resolveAndParseAsset } from './single-file-resolver.js';
import type { FileChangeKind, IndexerDiagnosticEntry, WorkspaceIndexUpdate } from './types.js';

export type {
  FileChangeEvent,
  FileChangeKind,
  IndexerDiagnosticEntry,
  WorkspaceIndexUpdate,
} from './types.js';
export { Emitter } from './emitter.js';

/** Sentinel rule id for a problem with the `.animoriarc` file itself rather than one rule in it. */
export const CONFIG_FILE_PSEUDO_RULE_ID = '<.animoriarc>';

const ANIMORIARC_BASENAME_PREFIX = '.animoriarc';
const ANIMORIAIGNORE_BASENAME = '.animoriaignore';
const DEFAULT_MAX_DIAGNOSTIC_ENTRIES = 50;
/** Concurrent `UsageScanner` runs during the initial reference-count pass — each one walks the whole source tree. */
const REFERENCE_COUNT_CONCURRENCY = 6;

/** Constructor options for {@link WorkspaceIndexer}. */
export interface WorkspaceIndexerConfig {
  /** Absolute path to the workspace root. */
  readonly workspacePath: string;
  /** Extensions classified as asset files. Defaults to Animoria's supported formats. */
  readonly assetExtensions?: readonly string[];
  /** Extensions classified as source files scanned for asset references. */
  readonly usageScanExtensions?: readonly string[];
  /**
   * Resolves the usage-search scope for a given asset — e.g. the nearest
   * monorepo package boundary. Defaults to the whole workspace. Mirrors
   * `GovernanceConfig.scopeResolver`.
   */
  readonly scopeResolver?: (asset: AnimoriaAsset) => string;
  /** Debounce tuning forwarded to the internal {@link ChangeCoalescer}. */
  readonly settleMs?: number;
  readonly maxWaitMs?: number;
  /** How many {@link IndexerDiagnosticEntry} records to retain. Default 50. */
  readonly maxDiagnosticEntries?: number;
  /**
   * Scoring policy forwarded to the internal {@link HealthScoreEngine}.
   * Defaults to Animoria's built-in weights — see
   * `../governance/health/default-weights.js`.
   */
  readonly healthScoreWeights?: HealthScoreWeights;
}

/**
 * The reactive backbone of Animoria: keeps an in-memory index of every
 * animated asset, its governance rule diagnostics, and its source-code
 * reference count continuously synchronized with the filesystem.
 *
 * ## Role in the architecture
 * Everything upstream of this class is intentionally dumb: an IDE
 * integration's only job is translating its native filesystem-watcher
 * callbacks into {@link "./types.js" | FileChangeEvent}s and calling
 * {@link notifyFileChanged}. Everything downstream — the governance
 * domain layer — is intentionally unaware that a filesystem exists:
 * `RulesEngine` (see `../governance/rules-engine.js`) evaluates a fixed
 * asset list synchronously and knows nothing about watching, debouncing,
 * or incremental re-parsing. `WorkspaceIndexer` is the piece in between
 * that turns "a pile of files changed, we don't know which, in what
 * order, or how many times" into "here is the current, correct
 * governance state" — reusable by any future IDE integration without
 * change, and swappable for a different rule/report engine without the
 * indexing machinery caring.
 *
 * ## Lifecycle
 * 1. Construct with a workspace path.
 * 2. Call {@link initialize} exactly once. This performs the only *full*
 *    scan this class ever does: a full asset scan/parse (via `Animoria`),
 *    an initial reference-count pass (one `UsageScanner` run per parsed
 *    asset), an `.animoriarc` load, and an initial `RulesEngine` run. It
 *    resolves with the first {@link WorkspaceAnalysis} and also
 *    fires it through {@link onDidUpdate}.
 * 3. For the rest of the instance's life, feed it filesystem signals via
 *    {@link notifyFileChanged} as they arrive — one call per raw event,
 *    no debouncing or deduplication required from the caller. Subscribe
 *    to {@link onDidUpdate} to react to settled batches.
 * 4. Call {@link dispose} when the workspace is closing (e.g. extension
 *    deactivation).
 *
 * ## Synchronization model
 * Raw events flow through two independent stages, each solving a
 * distinct problem (see their own docs for why they are separate
 * classes rather than one):
 *
 * - {@link ChangeCoalescer} — turns unreliable, duplicate-prone,
 *   possibly-out-of-order raw events into one settled, deduplicated
 *   batch of net-effect changes per path.
 * - {@link IndexingScheduler} — ensures settled batches are applied to
 *   this index one at a time, merging any batch that arrives while one
 *   is already being applied rather than running them concurrently.
 *
 * `WorkspaceIndexer` itself only ever mutates its state from inside a
 * scheduler-serialized `_applyBatch` call, which is what makes "no
 * overlapping indexing operations" and "no stale updates" guarantees
 * hold without any locking inside this class.
 *
 * ## Incrementality
 * A settled batch never triggers a full workspace rescan. Instead:
 * - Asset file changes are resolved individually via
 *   {@link resolveAndParseAsset} (stat + parse one file, not a directory
 *   walk).
 * - A brand-new asset gets exactly one `UsageScanner` run to establish
 *   its initial reference count. An asset edited in place does **not**
 *   — its identity (name/stem) cannot change without a path change,
 *   which surfaces as a separate delete+create, so its existing
 *   reference count remains valid.
 * - Source file changes update reference counts via
 *   {@link scanFileForAssetReferences}, which reads that one file once
 *   and diffs its contribution against what was previously recorded for
 *   it — never a workspace-wide usage rescan.
 * - `RulesEngine.run()` *is* re-run over the full current in-memory
 *   asset list on every applied batch — but this is a synchronous,
 *   I/O-free, pure-computation pass by explicit design (see
 *   `RulesEngine`'s own documentation), not a rescan of anything on
 *   disk. It is the one part of this pipeline that is deliberately
 *   "full" because doing so is cheap, not because it was left
 *   unoptimized.
 *
 * ## Error handling
 * No step in {@link _applyBatch} can throw in a way that corrupts state:
 * `resolveAndParseAsset` and `scanFileForAssetReferences` both swallow
 * their own I/O errors and report absence rather than raising. Loading
 * `.animoriarc` never throws (see `ConfigLoader`). Should something
 * still go wrong for an individual path, the failure is recorded as a
 * warning on that batch's {@link IndexerDiagnosticEntry} and processing
 * continues for the remaining paths — a single bad path never blocks
 * the rest of a batch, and the very next filesystem event naturally
 * gives the index another chance to converge.
 */
export class WorkspaceIndexer {
  private readonly _workspacePath: string;
  private readonly _assetExtensions: ReadonlySet<string>;
  private readonly _usageScanExtensions: ReadonlySet<string>;
  private readonly _scopeResolver: ((asset: AnimoriaAsset) => string) | undefined;
  private readonly _maxDiagnosticEntries: number;

  private readonly _assets = new Map<string, AnimoriaAsset>();
  private readonly _referenceCounts = new Map<string, number>();
  /** source file path -> (asset path -> reference count contributed by that file) */
  private readonly _fileContributions = new Map<string, Map<string, number>>();
  private _rulesConfig: Readonly<Record<string, unknown>> = resolveRulePolicy(undefined);
  /** Whether the policy in force is Animoria's own, with no project override. */
  private _usingDefaultPolicy = true;
  private _ignorePatterns: string[] = [];
  private _isIgnored: (relativePath: string) => boolean = compileIgnorePatterns([]);
  private _ruleReport: RuleEngineReport | null = null;
  private _health: HealthScoreOutcome = {
    status: 'unavailable',
    reason: 'incomplete-analysis',
    message: 'The workspace has not been analyzed yet.',
  };
  /**
   * Byte-identical asset groups, recomputed only when the asset set changes.
   *
   * Hashing reads every asset's bytes, so it belongs with the other async work
   * rather than inside the synchronous rule pass that runs on every batch.
   */
  private _duplicateGroups: readonly DuplicateGroup[] = [];
  private _duplicatesResolved = false;
  private _referenceIndexSummary: ReferenceIndexSummary | null = null;
  /**
   * Where each asset is actually used, not merely how often.
   *
   * The scan computed these locations and threw all but the count away, so the one
   * question a developer asks about an unreferenced-asset finding — *where is it
   * used?* — could only be answered by scanning again. Usage References is the
   * highest-priority capability after the core flow (D-04), and it cannot exist while
   * the only thing that survives the scan is an integer.
   *
   * Bounded by the workspace's total reference count, which the scan already held in
   * memory a moment earlier.
   */
  private _referencesByAsset = new Map<string, readonly UsageReference[]>();
  /** Wall-clock duration of the most recently applied batch, surfaced on the analysis. */
  private _lastBatchDurationMs = 0;
  /**
   * File-level `.animoriarc` problems — malformed JSON/YAML, wrong top-level shape.
   *
   * Distinct from a rule-level config error (a bad value for a known rule) but
   * surfaced through the same field on the analysis, so no consumer has to merge two
   * sources to answer "is this workspace's policy loadable?". The CLI used to do that
   * merge itself, which meant the daemon and VS Code never saw these at all.
   */
  private _configLoadWarnings: readonly string[] = [];
  /**
   * Whether reference evidence has been established. Gates whether
   * `referenceCounts` is passed to the rule engine at all: an empty map means
   * "confirmed zero references", while omitting the signal means "not known yet",
   * and only the second is honest before the reference pass completes.
   */
  private _referencesResolved = false;
  /**
   * Whether a full asset scan has completed at least once.
   *
   * `readiness.assetsIndexed` was previously the constant `true`, which made the
   * field unable to express the one state it existed to describe.
   */
  private _assetsIndexed = false;
  private _scanCoverage: ScanCoverage | null = null;
  /** The in-flight background reference pass started by {@link initializeFast}, if any. */
  private _backgroundReferencePass: Promise<void> | undefined;
  /** Aborts background analysis on {@link dispose}, so no work outlives this instance. */
  private readonly _lifetime = new AbortController();
  private readonly _healthScoreEngine: HealthScoreEngine;
  private _generation = 0;
  private readonly _diagnostics: IndexerDiagnosticEntry[] = [];
  private _isDisposed = false;
  /** Set when a scan could not run at all — see `WorkspaceAnalysis.failure`. */
  private _failure: AnalysisFailure | null = null;

  private readonly _coalescer: ChangeCoalescer;
  private readonly _scheduler: IndexingScheduler;
  private readonly _onDidUpdate = new Emitter<WorkspaceIndexUpdate>();
  /** Fires once per settled, applied batch — see the class docs for the delivery guarantees. */
  readonly onDidUpdate = this._onDidUpdate.event;

  constructor(config: WorkspaceIndexerConfig) {
    this._workspacePath = config.workspacePath;
    this._assetExtensions = new Set(config.assetExtensions ?? SUPPORTED_ASSET_EXTENSIONS);
    this._usageScanExtensions = new Set(
      config.usageScanExtensions ?? DEFAULT_USAGE_SCAN_EXTENSIONS
    );
    this._scopeResolver = config.scopeResolver;
    this._maxDiagnosticEntries = config.maxDiagnosticEntries ?? DEFAULT_MAX_DIAGNOSTIC_ENTRIES;
    this._healthScoreEngine = new HealthScoreEngine({ weights: config.healthScoreWeights });

    this._scheduler = new IndexingScheduler({
      apply: (changes) => this._applyBatch(changes),
    });
    this._coalescer = new ChangeCoalescer({
      settleMs: config.settleMs,
      maxWaitMs: config.maxWaitMs,
      onFlush: (changes) => this._scheduler.request(changes),
    });
  }

  /**
   * Performs the initial scan and produces the first snapshot, **without** waiting
   * for reference evidence.
   *
   * The returned snapshot has `readiness.referencesResolved === false`: it is the
   * list a tree view paints from, not a basis for a governance verdict. Reference
   * resolution continues in the background and fires a second `onDidUpdate` when it
   * lands. Consumers that need a verdict must call {@link initializeComplete}.
   */
  async initializeFast(): Promise<WorkspaceAnalysis> {
    const fastSnapshot = await this._scanAssets();
    this._backgroundReferencePass = this._establishInitialReferenceCounts(
      this._lifetime.signal
    ).catch(() => {
      // Failures are already recorded as batch warnings; a rejected background
      // promise must not become an unhandled rejection in the host process.
    });
    return fastSnapshot;
  }

  /**
   * Performs the initial scan **and** establishes reference evidence before
   * resolving.
   *
   * ## Why one-shot consumers must use this
   * `initializeFast` deliberately returns early, which is correct for a reactive
   * host and wrong for anything that renders a verdict and exits. The CLI used to
   * call the fast path, so `no-unreferenced-assets` found no reference signal,
   * declined to run, and the check reported `PASS` — on a workspace whose assets
   * were entirely unreferenced.
   *
   * On return, `readiness.complete` is `true` and no analysis work remains
   * scheduled: a caller may dispose the indexer immediately without losing results.
   *
   * @param options.signal Aborts the reference pass. The snapshot still resolves,
   *   with `readiness.referencesResolved === false` and `scanCoverage.complete === false`,
   *   so an interrupted run is reported as interrupted rather than as clean.
   */
  async initializeComplete(options?: { signal?: AbortSignal }): Promise<WorkspaceAnalysis> {
    await this._scanAssets();
    await this._establishInitialReferenceCounts(options?.signal);
    return this._buildAnalysis();
  }

  /**
   * @deprecated Use {@link initializeFast} (reactive hosts) or
   * {@link initializeComplete} (one-shot consumers). Retained so existing callers
   * keep their current behaviour while they migrate.
   */
  // MIGRATION-COMPAT(C3): delete when no caller remains — gate: Wave 3.
  async initialize(): Promise<WorkspaceAnalysis> {
    return this.initializeFast();
  }

  /** Scans and parses assets, loads config, runs rules, and commits the first snapshot. */
  private async _scanAssets(): Promise<WorkspaceAnalysis> {
    await this._reloadIgnore();
    const animoria = new Animoria({
      workspacePath: this._workspacePath,
      exclude: this._ignorePatterns,
    });

    let result: Awaited<ReturnType<Animoria['run']>>;
    try {
      result = await animoria.run();
      this._failure = null;
    } catch (err) {
      // A scan that throws used to leave `_assetsIndexed` false forever, which every
      // client rendered as an empty workspace — telling the developer they have no
      // animated assets because Animoria could not look. Recording the failure is
      // what lets `deriveAnalysisLifecycle` return `failed` instead of `initializing`.
      this._failure = {
        reason: existsSync(this._workspacePath) ? 'scan-failed' : 'workspace-missing',
        message: existsSync(this._workspacePath)
          ? `Animoria could not scan this workspace: ${
              err instanceof Error ? err.message : String(err)
            }`
          : `Workspace not found: ${this._workspacePath}`,
      };
      return this._commit({
        upsertedAssetPaths: [],
        removedAssetPaths: [],
        warnings: [this._failure.message],
        startedAt: performance.now(),
      });
    }

    for (const asset of result.assets) {
      this._assets.set(asset.path, asset);
    }
    this._assetsIndexed = true;

    const warnings: string[] = [];
    await this._reloadConfig(warnings);
    this._runRules();

    return this._commit({
      upsertedAssetPaths: result.assets.map((a) => a.path),
      removedAssetPaths: [],
      warnings,
      startedAt: performance.now(),
    });
  }

  /**
   * Establishes reference evidence for every indexed asset in a single pass.
   *
   * ## One pass, not one per asset
   * This previously ran one `UsageScanner` per asset, each of which globbed the
   * workspace and read every source file again — `A` directory walks and `A × F`
   * file reads for `A` assets and `F` files. `buildReferenceIndex` inverts that to
   * one walk and one read per file (see its own documentation), which is what takes
   * the reference workload from 28,270 ms to 65 ms.
   *
   * Awaitable and cancellable, so {@link initializeComplete} can guarantee that no
   * analysis work outlives it.
   */
  private async _establishInitialReferenceCounts(signal?: AbortSignal): Promise<void> {
    const startedAt = performance.now();
    const assets = Array.from(this._assets.values()).filter((a) => a.status === 'parsed');

    if (assets.length === 0) {
      // No assets means reference evidence is trivially complete, not missing —
      // recording that is what lets rules run (and correctly report nothing) rather
      // than decline for want of a signal. The same holds for duplicates: there is
      // nothing to hash, which is a finished search, not an absent one.
      this._referencesResolved = true;
      this._duplicatesResolved = true;
      this._duplicateGroups = [];
      this._scanCoverage = emptyCoverage(this._workspacePath);
      this._referenceIndexSummary = null;
      this._referencesByAsset.clear();
      this._runRules();
      return;
    }

    const index = await buildReferenceIndex({
      workspacePath: this._workspacePath,
      assets,
      extensions: [...this._usageScanExtensions],
      exclude: this._ignorePatterns,
      ...(this._scopeResolver ? { scopeResolver: this._scopeResolver } : {}),
      ...(signal ? { signal } : {}),
    });

    if (this._isDisposed) return;

    this._referenceCounts.clear();
    this._fileContributions.clear();
    this._referencesByAsset.clear();
    for (const asset of assets) {
      if (!this._assets.has(asset.path)) continue; // removed while the scan was in flight
      const references = index.referencesFor(asset.path);
      this._referenceCounts.set(asset.path, references.length);
      this._referencesByAsset.set(asset.path, references);
      for (const ref of references) {
        const contribution = this._fileContributions.get(ref.file) ?? new Map<string, number>();
        contribution.set(asset.path, (contribution.get(asset.path) ?? 0) + 1);
        this._fileContributions.set(ref.file, contribution);
      }
    }

    // 'unknown' means the scan was interrupted; anything else means it ran to
    // completion and its result — however partial — is real evidence rules may use.
    this._referencesResolved = index.coverage.status !== 'unknown';
    this._scanCoverage = index.coverage;
    this._referenceIndexSummary = index.summary;

    await this._refreshDuplicateGroups();

    this._runRules();
    this._commit({
      upsertedAssetPaths: [],
      removedAssetPaths: [],
      warnings: [],
      startedAt,
    });
  }

  /**
   * Reports one raw filesystem signal for a path. Call this directly
   * from the host IDE's native watcher callback — no debouncing,
   * deduplication, or ordering guarantees are required of the caller;
   * see {@link ChangeCoalescer} for how those are handled internally.
   */
  notifyFileChanged(path: string, kind: FileChangeKind): void {
    this._coalescer.record({ path, kind });
  }

  /** The current, immutable state of the index. */
  /**
   * The current, immutable state of the workspace — the one value every client
   * consumes. See {@link WorkspaceAnalysis}.
   *
   * Returns whatever is known *now*, which may be incomplete; check
   * `readiness.complete` before rendering a verdict, or use {@link analyzeComplete}.
   */
  getAnalysis(): WorkspaceAnalysis {
    return this._buildAnalysis();
  }

  /**
   * The current analysis, once every part of it has been established.
   *
   * For an on-demand consumer — a daemon command answering a request, a one-shot
   * run — that needs a verdict rather than a live view. Awaits any background pass
   * still in flight instead of returning a snapshot whose reference-dependent rules
   * have not run.
   *
   * ## Why it scans when nothing has been scanned
   * This used to assume an earlier `initializeFast`/`initializeComplete`. Called on
   * a fresh indexer it returned an analysis over an empty asset map — structurally
   * indistinguishable from a genuinely empty workspace, and therefore capable of
   * reporting a workspace full of violations as having nothing to check. The
   * method now establishes whatever it needs, so its name is true regardless of
   * call order.
   */
  async analyzeComplete(): Promise<WorkspaceAnalysis> {
    if (!this._assetsIndexed) {
      await this._scanAssets();
    }
    await this.whenIdle();
    if (!this._referencesResolved || !this._duplicatesResolved) {
      await this._establishInitialReferenceCounts(this._lifetime.signal);
    }
    return this._buildAnalysis();
  }

  /**
   * The `.animoriaignore`-derived exclude patterns currently in effect,
   * as loaded by this indexer. Exposed so other scanners run alongside
   * it against the same workspace (e.g. the extension's static-asset
   * scan) can share the exact same exclusions rather than reloading and
   * re-parsing `.animoriaignore` themselves.
   */
  /**
   * Every place one asset is referenced, as Core established it.
   *
   * Empty for an asset with no references *and* for an asset whose reference scan has
   * not completed — the two are told apart by `readiness.referencesResolved` on the
   * analysis, which is the same distinction every other consumer of this data reads.
   * A client must never present an incomplete scan as "used nowhere".
   */
  usageReferencesFor(assetPath: string): readonly UsageReference[] {
    return this._referencesByAsset.get(assetPath) ?? [];
  }

  /**
   * Every asset referenced from one source file, with the lines that reference it.
   *
   * The reverse lookup, and the reason it lives here: a host asking "what does this
   * editor line refer to?" would otherwise have to match asset names against source
   * text itself, which is precisely the client-side reimplementation of
   * `reference-patterns.ts` the layer rule forbids — and which the deleted JetBrains
   * hover listener did, by substring, while documenting that it was not authoritative.
   */
  referencesInFile(filePath: string): readonly { assetPath: string; reference: UsageReference }[] {
    const found: { assetPath: string; reference: UsageReference }[] = [];
    for (const [assetPath, references] of this._referencesByAsset) {
      for (const reference of references) {
        if (reference.file === filePath) found.push({ assetPath, reference });
      }
    }
    return found;
  }

  getIgnorePatterns(): readonly string[] {
    return this._ignorePatterns;
  }

  /**
   * Absolute path to the workspace root this indexer was constructed for.
   * Exposed so infrastructure consumers that need to run their own
   * targeted, one-off scans against the same workspace (e.g. a review
   * panel fetching the detailed reference list for one flagged asset)
   * can do so without threading the path through separately or
   * duplicating how this indexer resolves it.
   */
  get workspacePath(): string {
    return this._workspacePath;
  }

  /**
   * The most recent applied batches, oldest first, capped at
   * `maxDiagnosticEntries`. Intended for debugging and future "why did
   * this change" tooling — see the class's Observability rationale.
   */
  getDiagnostics(): readonly IndexerDiagnosticEntry[] {
    return this._diagnostics.slice();
  }

  /**
   * Stops accepting new changes and releases internal timers, listeners, and any
   * in-flight background analysis.
   *
   * Aborting the reference pass matters: it previously ran fire-and-forget with no
   * cancellation, so a disposed indexer kept walking the source tree — competing for
   * the event loop of a caller that believed indexing had finished (measured at
   * ~1.4 s of interference on a 60-asset workspace).
   */
  dispose(): void {
    this._isDisposed = true;
    this._lifetime.abort();
    this._coalescer.dispose();
    this._onDidUpdate.dispose();
  }

  /**
   * Resolves once no background analysis remains in flight.
   *
   * Exposed for tests asserting that {@link initializeComplete} leaves nothing
   * scheduled, and for hosts that want to await a quiescent index before exiting.
   */
  async whenIdle(): Promise<void> {
    // Drain, do not merely wait.
    //
    // This awaited only the background reference pass, so a change the host had just
    // notified was still sitting inside the coalescer's settle window when
    // `analyzeComplete()` returned. The analysis handed back did not contain it, and
    // nothing in the result said so — a host that deleted an asset and immediately
    // re-read the workspace was told the asset was still there.
    //
    // The settle window exists to avoid re-indexing on every keystroke, not to hide
    // work from a caller who has explicitly asked for a settled answer.
    while (this._coalescer.hasPendingChanges() || this._scheduler.isRunning) {
      this._coalescer.flushNow();
      await this._scheduler.whenSettled();
    }
    await this._backgroundReferencePass;
  }

  // ── Batch application ───────────────────────────────────────────────────

  private async _applyBatch(changes: ReadonlyMap<string, FileChangeKind>): Promise<void> {
    const startedAt = performance.now();
    const warnings: string[] = [];
    const upserted = new Set<string>();
    const removed = new Set<string>();

    const { assetPaths, sourcePaths, configChanged, ignoreChanged } = this._classify(changes);

    if (configChanged) {
      await this._reloadConfig(warnings);
    }
    if (ignoreChanged) {
      await this._reloadIgnore();
      // Patterns may have grown or shrunk since the last commit — assets
      // already indexed that now match must be dropped, exactly as if
      // they had just been deleted, so `.animoriaignore` edits converge
      // the same way any other change does rather than only affecting
      // files touched after the edit.
      for (const [existingPath] of this._assets) {
        if (this._isIgnored(relative(this._workspacePath, existingPath))) {
          this._forgetAsset(existingPath);
          removed.add(existingPath);
        }
      }
    }

    for (const [path, kind] of assetPaths) {
      try {
        await this._applyAssetChange(path, kind, upserted, removed);
      } catch (err) {
        warnings.push(`Failed to index asset "${path}": ${describeError(err)}`);
      }
    }

    for (const [path, kind] of sourcePaths) {
      try {
        await this._applySourceChange(path, kind);
      } catch (err) {
        warnings.push(`Failed to update references for "${path}": ${describeError(err)}`);
      }
    }

    // Content identity can only change when the asset set does, so hashing is
    // skipped entirely for a batch that only touched source files.
    if (this._duplicatesResolved && (upserted.size > 0 || removed.size > 0)) {
      await this._refreshDuplicateGroups();
    }

    this._runRules();

    this._commit({
      upsertedAssetPaths: Array.from(upserted),
      removedAssetPaths: Array.from(removed),
      warnings,
      startedAt,
    });
  }

  private _classify(changes: ReadonlyMap<string, FileChangeKind>): {
    assetPaths: Map<string, FileChangeKind>;
    sourcePaths: Map<string, FileChangeKind>;
    configChanged: boolean;
    ignoreChanged: boolean;
  } {
    const assetPaths = new Map<string, FileChangeKind>();
    const sourcePaths = new Map<string, FileChangeKind>();
    let configChanged = false;
    let ignoreChanged = false;

    for (const [path, kind] of changes) {
      if (basename(path) === ANIMORIAIGNORE_BASENAME) {
        ignoreChanged = true;
        continue;
      }
      if (basename(path).startsWith(ANIMORIARC_BASENAME_PREFIX)) {
        configChanged = true;
        continue;
      }
      const ext = extname(path).toLowerCase();
      if (this._assetExtensions.has(ext)) {
        assetPaths.set(path, kind);
      } else if (this._usageScanExtensions.has(ext)) {
        sourcePaths.set(path, kind);
      }
      // Anything else is irrelevant to Animoria and is silently ignored.
    }

    return { assetPaths, sourcePaths, configChanged, ignoreChanged };
  }

  private async _applyAssetChange(
    path: string,
    kind: FileChangeKind,
    upserted: Set<string>,
    removed: Set<string>
  ): Promise<void> {
    if (kind === 'deleted') {
      this._forgetAsset(path);
      removed.add(path);
      return;
    }

    if (this._isIgnored(relative(this._workspacePath, path))) {
      // A file matching `.animoriaignore` is never indexed — including
      // when it is edited in place, since a prior version of it (from
      // before the pattern existed) may already be present.
      if (this._assets.has(path)) {
        this._forgetAsset(path);
        removed.add(path);
      }
      return;
    }

    const asset = await resolveAndParseAsset(path);
    if (!asset) {
      // File is gone, or no longer a recognized format — converge to "absent".
      if (this._assets.has(path)) {
        this._forgetAsset(path);
        removed.add(path);
      }
      return;
    }

    const isNewAsset = !this._assets.has(path);
    this._assets.set(path, asset);
    upserted.add(path);

    // An in-place edit cannot change what code refers to this asset by
    // (its path — and therefore name/stem — is unchanged), so only a
    // genuinely new asset needs a reference-count baseline established.
    if (isNewAsset && asset.status === 'parsed') {
      await this._establishReferenceCount(asset);
    }
  }

  private async _applySourceChange(path: string, kind: FileChangeKind): Promise<void> {
    if (kind === 'deleted') {
      this._retractFileContributions(path);
      return;
    }

    const assets = Array.from(this._assets.values()).filter((a) => a.status === 'parsed');
    const scanned = await scanFileForAssetReferences(path, assets, this._workspacePath);

    const previous = this._fileContributions.get(path);
    const affectedAssetPaths = new Set<string>([...(previous?.keys() ?? []), ...scanned.keys()]);

    const nextContribution = new Map<string, number>();
    for (const assetPath of affectedAssetPaths) {
      const before = previous?.get(assetPath) ?? 0;
      const after = scanned.get(assetPath)?.length ?? 0;
      if (after > 0) nextContribution.set(assetPath, after);

      const delta = after - before;
      if (delta !== 0) {
        const current = this._referenceCounts.get(assetPath) ?? 0;
        this._referenceCounts.set(assetPath, Math.max(0, current + delta));
      }

      // Locations move with the count, always. Maintaining one and not the other is
      // how a panel comes to say "3 usages" above a list of two — and the reason the
      // count was the only thing kept was that nothing had ever needed the rest.
      this._replaceFileReferences(assetPath, path, scanned.get(assetPath) ?? []);
    }

    if (nextContribution.size > 0) {
      this._fileContributions.set(path, nextContribution);
    } else {
      this._fileContributions.delete(path);
    }
  }

  private _retractFileContributions(sourceFilePath: string): void {
    const previous = this._fileContributions.get(sourceFilePath);
    if (!previous) return;

    for (const [assetPath, count] of previous) {
      const current = this._referenceCounts.get(assetPath) ?? 0;
      this._referenceCounts.set(assetPath, Math.max(0, current - count));
      this._replaceFileReferences(assetPath, sourceFilePath, []);
    }
    this._fileContributions.delete(sourceFilePath);
  }

  /**
   * Swaps one source file's contribution to one asset's reference list.
   *
   * Everything from another file is preserved: a rescan of `app.ts` says nothing
   * about the same asset's usage in `main.ts`, and rebuilding the whole list from one
   * file's result would silently drop it.
   */
  private _replaceFileReferences(
    assetPath: string,
    sourceFilePath: string,
    references: readonly UsageReference[]
  ): void {
    const others = (this._referencesByAsset.get(assetPath) ?? []).filter(
      (reference) => reference.file !== sourceFilePath
    );
    const next = [...others, ...references];
    if (next.length === 0) this._referencesByAsset.delete(assetPath);
    else this._referencesByAsset.set(assetPath, next);
  }

  private _forgetAsset(assetPath: string): void {
    this._assets.delete(assetPath);
    this._referenceCounts.delete(assetPath);
    // Retained state that outlives its subject is how a panel comes to list usages of
    // a file the developer deleted ten minutes ago.
    this._referencesByAsset.delete(assetPath);
    for (const contributions of this._fileContributions.values()) {
      contributions.delete(assetPath);
    }
  }

  private async _establishReferenceCount(asset: AnimoriaAsset): Promise<void> {
    const scopePath = this._scopeResolver?.(asset) ?? this._workspacePath;
    const scanner = new UsageScanner({
      workspacePath: this._workspacePath,
      asset,
      strategy: 'pattern',
      scopePath,
    });
    const result = await scanner.search();

    this._referenceCounts.set(asset.path, result.references.length);
    this._referencesByAsset.set(asset.path, result.references);

    for (const ref of result.references) {
      const contribution = this._fileContributions.get(ref.file) ?? new Map<string, number>();
      contribution.set(asset.path, (contribution.get(asset.path) ?? 0) + 1);
      this._fileContributions.set(ref.file, contribution);
    }
  }

  /**
   * Recomputes byte-identical asset groups.
   *
   * Hashing reads every parsed asset in full, so this is deliberately not part of
   * the synchronous rule pass that runs on every batch — it is refreshed alongside
   * the reference scan, and again only when the asset set itself changed.
   */
  private async _refreshDuplicateGroups(): Promise<void> {
    const parsed = Array.from(this._assets.values()).filter((a) => a.status === 'parsed');
    this._duplicateGroups = await detectDuplicateGroups(parsed, this._referenceCounts);
    this._duplicatesResolved = true;
  }

  /**
   * Loads `.animoriarc` over the default policy — never instead of it.
   *
   * Every branch here used to end in a rules config that was either the file's
   * contents verbatim or `{}`, and `{}` meant *no rules ran at all*. A workspace with
   * no configuration got a working index, a working reference scan, and a governance
   * surface reporting that it had nothing to say, above a Health Score that read
   * "not available — add a `.animoriarc` to define a policy".
   *
   * Configuration is an override layer. `resolveRulePolicy` puts it back in that
   * position, including on the invalid path: a malformed config is a reason to warn
   * and fall back to the defaults, not a reason to silently stop checking anything.
   */
  private async _reloadConfig(warnings: string[] = []): Promise<void> {
    const result = await new ConfigLoader(this._workspacePath).load();
    if (result.status === 'loaded') {
      this._rulesConfig = resolveRulePolicy(result.config.rules);
      this._usingDefaultPolicy = isDefaultPolicy(result.config.rules);
      this._configLoadWarnings = [];
    } else if (result.status === 'invalid') {
      this._rulesConfig = resolveRulePolicy(undefined);
      this._usingDefaultPolicy = true;
      const problems = result.diagnostics.map((d) => `${result.filePath}: ${d.message}`);
      this._configLoadWarnings = problems;
      warnings.push(...problems);
    } else {
      this._rulesConfig = resolveRulePolicy(undefined);
      this._usingDefaultPolicy = true;
      this._configLoadWarnings = [];
    }
  }

  private async _reloadIgnore(): Promise<void> {
    this._ignorePatterns = await loadAnimoriaIgnore(this._workspacePath);
    this._isIgnored = compileIgnorePatterns(this._ignorePatterns);
  }

  /**
   * Re-runs the rule engine and the Health Score over current state.
   *
   * Reference evidence is supplied only once it genuinely exists. The distinction
   * matters and is not a performance nicety: `no-unreferenced-assets` treats a
   * *missing* map as "this signal is unavailable — skip and say so", but an asset
   * *absent from a present* map as a confirmed zero. Passing the still-empty map
   * early would flag every asset in the workspace as unreferenced; omitting it
   * causes the rule to report itself as skipped, which is the truthful state.
   */
  private _runRules(): void {
    const assets = Array.from(this._assets.values());
    this._ruleReport = new RulesEngine({
      workspacePath: this._workspacePath,
      assets,
      rulesConfig: this._rulesConfig,
      signals: {
        ...(this._referencesResolved
          ? {
              referenceCounts: this._referenceCounts,
              ...(this._scanCoverage ? { scanCoverage: this._scanCoverage } : {}),
            }
          : {}),
        // Supplied only once hashing has actually run; absent means
        // `no-duplicate-content` declares itself skipped rather than reporting none.
        ...(this._duplicatesResolved ? { duplicateGroups: this._duplicateGroups } : {}),
      },
    }).run();

    // Health Score is a pure, synchronous consumer of the diagnostics
    // just produced above — it re-derives nothing about the assets
    // themselves (see HealthScoreEngine's own docs). Recomputing it here
    // is deliberate: it is cheap enough to do on every batch rather than
    // only when a consumer happens to ask for it.
    this._health = this._healthScoreEngine.evaluate({
      diagnostics: this._ruleReport.diagnostics,
      totalAssetCount: assets.length,
      evaluatedRuleCount: this._ruleReport.evaluatedRuleIds.length,
      skippedRuleCount: this._ruleReport.skippedRules.length,
      analysisComplete: this._referencesResolved && this._duplicatesResolved,
      ...(this._scanCoverage ? { coverageStatus: this._scanCoverage.status } : {}),
    });
  }

  private _buildAnalysis(): WorkspaceAnalysis {
    const readiness: AnalysisReadiness = {
      assetsIndexed: this._assetsIndexed,
      referencesResolved: this._referencesResolved,
      duplicatesResolved: this._duplicatesResolved,
      complete: this._assetsIndexed && this._referencesResolved && this._duplicatesResolved,
    };

    return {
      workspacePath: this._workspacePath,
      generatedAt: new Date().toISOString(),
      generation: this._generation,
      durationMs: this._lastBatchDurationMs,
      readiness,
      assets: Array.from(this._assets.values()),
      coverage: this._scanCoverage,
      referenceCounts: new Map(this._referenceCounts),
      referenceIndex: this._referenceIndexSummary,
      diagnostics: this._ruleReport?.diagnostics ?? [],
      evaluatedRuleIds: this._ruleReport?.evaluatedRuleIds ?? [],
      skippedRules: this._ruleReport?.skippedRules ?? [],
      configErrors: [
        // File-level problems first: a `.animoriarc` that would not parse explains
        // why every rule-level entry below it is missing.
        ...this._configLoadWarnings.map((message) => ({
          ruleId: CONFIG_FILE_PSEUDO_RULE_ID,
          errors: [message],
        })),
        ...(this._ruleReport?.configErrors ?? []),
      ],
      duplicateGroups: this._duplicateGroups,
      health: this._health,
      // Asked of the coalescer rather than inferred from timestamps: it is the one
      // component that knows for certain whether signals have arrived that no
      // committed batch reflects.
      freshness: this._coalescer.hasPendingChanges() ? 'stale' : 'current',
      failure: this._failure,
    };
  }

  private _commit(batch: {
    upsertedAssetPaths: readonly string[];
    removedAssetPaths: readonly string[];
    warnings: readonly string[];
    startedAt: number;
  }): WorkspaceAnalysis {
    this._generation += 1;
    const durationMs = performance.now() - batch.startedAt;
    this._lastBatchDurationMs = durationMs;
    const analysis = this._buildAnalysis();

    this._diagnostics.push({
      generation: this._generation,
      appliedAt: new Date().toISOString(),
      changedPathCount: batch.upsertedAssetPaths.length + batch.removedAssetPaths.length,
      upsertedAssetPaths: batch.upsertedAssetPaths,
      removedAssetPaths: batch.removedAssetPaths,
      durationMs,
      warnings: batch.warnings,
    });
    if (this._diagnostics.length > this._maxDiagnosticEntries) {
      this._diagnostics.splice(0, this._diagnostics.length - this._maxDiagnosticEntries);
    }

    this._onDidUpdate.fire({
      analysis,
      upsertedAssetPaths: batch.upsertedAssetPaths,
      removedAssetPaths: batch.removedAssetPaths,
      durationMs,
    });

    return analysis;
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Coverage for a workspace with no assets to scan for.
 *
 * `complete: true` is deliberate — the scan did not fail, there was simply nothing
 * to look for. That distinction is what lets `no-unreferenced-assets` evaluate (and
 * correctly report nothing) instead of declining for want of a signal.
 */
function emptyCoverage(workspacePath: string): ScanCoverage {
  const scannedExtensions = [...DEFAULT_USAGE_SCAN_EXTENSIONS];
  const unscannedExtensions = describeUnscannedExtensions(scannedExtensions);
  return {
    // `'none'`, not `'complete'`: nothing was read, so there is no reference evidence
    // — which is exactly what a consumer must be able to see before treating "zero
    // references" as a finding rather than an artefact.
    status: deriveCoverageStatus(0, unscannedExtensions, true),
    scannedExtensions,
    unscannedExtensions,
    filesScanned: 0,
    referencesDetected: 0,
    excludedPatterns: [],
    scopePath: workspacePath,
  };
}
