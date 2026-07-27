import { basename, extname, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Animoria } from '../animoria.js';
import { ConfigLoader } from '../governance/config-loader.js';
import {
  HealthScoreEngine,
  type HealthScoreReport,
  type HealthScoreWeights,
} from '../governance/health-score.js';
import { type RuleEngineReport, RulesEngine } from '../governance/rules-engine.js';
import { compileIgnorePatterns, loadAnimoriaIgnore } from '../ignore/animoria-ignore.js';
import type { AnimoriaAsset } from '../types/asset.js';
import { SUPPORTED_ASSET_EXTENSIONS } from '../types/formats.js';
import {
  DEFAULT_USAGE_SCAN_EXTENSIONS,
  UsageScanner,
  scanFileForAssetReferences,
} from '../usage/index.js';
import { runWithConcurrency } from '../utils/concurrency.js';
import { ChangeCoalescer } from './change-coalescer.js';
import { Emitter } from './emitter.js';
import { IndexingScheduler } from './indexing-scheduler.js';
import { resolveAndParseAsset } from './single-file-resolver.js';
import type {
  FileChangeKind,
  IndexerDiagnosticEntry,
  WorkspaceIndexSnapshot,
  WorkspaceIndexUpdate,
} from './types.js';

export type {
  FileChangeEvent,
  FileChangeKind,
  IndexerDiagnosticEntry,
  WorkspaceIndexSnapshot,
  WorkspaceIndexUpdate,
} from './types.js';
export { Emitter } from './emitter.js';

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
 *    resolves with the first {@link WorkspaceIndexSnapshot} and also
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
  private _rulesConfig: Readonly<Record<string, unknown>> = {};
  private _ignorePatterns: string[] = [];
  private _isIgnored: (relativePath: string) => boolean = compileIgnorePatterns([]);
  private _ruleReport: RuleEngineReport | null = null;
  private _healthScore: HealthScoreReport | null = null;
  private readonly _healthScoreEngine: HealthScoreEngine;
  private _generation = 0;
  private readonly _diagnostics: IndexerDiagnosticEntry[] = [];
  private _isDisposed = false;

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
   * Performs the initial full scan and produces the first snapshot. Must
   * be called exactly once, before any {@link notifyFileChanged} calls
   * are expected to have a meaningful effect (calls made before
   * `initialize` resolves are still queued correctly by the coalescer —
   * they simply won't be applied until the initial state exists).
   */
  async initialize(): Promise<WorkspaceIndexSnapshot> {
    await this._reloadIgnore();
    const animoria = new Animoria({
      workspacePath: this._workspacePath,
      exclude: this._ignorePatterns,
    });
    const result = await animoria.run();

    for (const asset of result.assets) {
      this._assets.set(asset.path, asset);
    }

    const warnings: string[] = [];
    await this._reloadConfig(warnings);
    this._runRules(false);

    // Commit and return as soon as assets are scanned/parsed — this is
    // the snapshot the tree view paints from. Reference counting (one
    // full-source-tree `UsageScanner` run per parsed asset) is by far the
    // most expensive part of the initial index and is not needed to show
    // the asset list: every asset's reference count is simply absent from
    // `referenceCounts` until the background pass below fills it in and
    // fires a second `onDidUpdate`, at which point governance/health
    // state (computed with real counts) supersedes this snapshot's.
    // Previously this method awaited an *unbounded* `Promise.all` over
    // every parsed asset before resolving at all, so a workspace of a
    // few hundred assets fired that many concurrent source-tree scans
    // before the tree view could paint a single item.
    const fastSnapshot = this._commit({
      upsertedAssetPaths: result.assets.map((a) => a.path),
      removedAssetPaths: [],
      warnings,
      startedAt: performance.now(),
    });

    void this._establishInitialReferenceCounts();

    return fastSnapshot;
  }

  /**
   * Background completion of the initial reference-count pass, run after
   * {@link initialize} has already committed and returned its fast
   * snapshot. Bounded to {@link REFERENCE_COUNT_CONCURRENCY} concurrent
   * `UsageScanner` runs rather than firing one per asset at once.
   *
   * Deliberately does not go through the scheduler-serialized
   * `_applyBatch` path `initialize` and incremental updates use — doing
   * so would mean a real filesystem event has to wait for this
   * comparatively slow pass to finish before it can be applied, which
   * defeats the point of deferring this work in the first place. Instead
   * this re-checks, per asset, that it is still present in `_assets`
   * before writing its reference count, so a concurrently-applied
   * removal is never resurrected by a stale in-flight scan result — the
   * one invariant that actually matters here, without needing full
   * serialization against `_applyBatch`.
   */
  private async _establishInitialReferenceCounts(): Promise<void> {
    const startedAt = performance.now();
    const parsedAssets = Array.from(this._assets.values()).filter((a) => a.status === 'parsed');
    // Nothing to scan means reference counts are already correctly empty
    // and the fast commit's rule report already reflects that (rules ran
    // with `referenceCountsReady: false`, not "0 references confirmed") —
    // firing a second, informationally-identical commit here would just
    // be a wasted generation bump and `onDidUpdate` notification.
    if (parsedAssets.length === 0) return;

    await runWithConcurrency(parsedAssets, REFERENCE_COUNT_CONCURRENCY, async (asset) => {
      if (!this._assets.has(asset.path)) return; // removed while this scan was in flight
      await this._establishReferenceCount(asset);
      if (!this._assets.has(asset.path)) this._referenceCounts.delete(asset.path);
    });

    if (this._isDisposed) return;

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
  getSnapshot(): WorkspaceIndexSnapshot {
    return this._buildSnapshot();
  }

  /**
   * The `.animoriaignore`-derived exclude patterns currently in effect,
   * as loaded by this indexer. Exposed so other scanners run alongside
   * it against the same workspace (e.g. the extension's static-asset
   * scan) can share the exact same exclusions rather than reloading and
   * re-parsing `.animoriaignore` themselves.
   */
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

  /** Stops accepting new changes and releases internal timers/listeners. */
  dispose(): void {
    this._isDisposed = true;
    this._coalescer.dispose();
    this._onDidUpdate.dispose();
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
    const scanned = await scanFileForAssetReferences(path, assets);

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
    }
    this._fileContributions.delete(sourceFilePath);
  }

  private _forgetAsset(assetPath: string): void {
    this._assets.delete(assetPath);
    this._referenceCounts.delete(assetPath);
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

    for (const ref of result.references) {
      const contribution = this._fileContributions.get(ref.file) ?? new Map<string, number>();
      contribution.set(asset.path, (contribution.get(asset.path) ?? 0) + 1);
      this._fileContributions.set(ref.file, contribution);
    }
  }

  private async _reloadConfig(warnings: string[] = []): Promise<void> {
    const result = await new ConfigLoader(this._workspacePath).load();
    if (result.status === 'loaded') {
      this._rulesConfig = result.config.rules;
    } else if (result.status === 'invalid') {
      this._rulesConfig = {};
      for (const diagnostic of result.diagnostics) {
        warnings.push(`${result.filePath}: ${diagnostic.message}`);
      }
    } else {
      this._rulesConfig = {};
    }
  }

  private async _reloadIgnore(): Promise<void> {
    this._ignorePatterns = await loadAnimoriaIgnore(this._workspacePath);
    this._isIgnored = compileIgnorePatterns(this._ignorePatterns);
  }

  /**
   * @param referenceCountsReady When `false` (the fast, pre-reference-count
   *   snapshot `initialize` commits before the background pass finishes),
   *   `referenceCounts` is omitted from the signals passed to
   *   `RulesEngine` entirely — not passed as an empty map. `no-unreferenced
   *   -assets.rule.ts` treats a *missing* map as "this signal isn't
   *   available yet, skip" and bails out, but treats an asset *absent from
   *   a present* map as a confirmed zero reference count. Passing the
   *   real (empty) `_referenceCounts` map here before it's populated would
   *   flag every asset in the workspace as unused for the few seconds
   *   until the background pass lands — a false-positive flash, not a
   *   performance nicety.
   */
  private _runRules(referenceCountsReady = true): void {
    const assets = Array.from(this._assets.values());
    this._ruleReport = new RulesEngine({
      workspacePath: this._workspacePath,
      assets,
      rulesConfig: this._rulesConfig,
      signals: referenceCountsReady ? { referenceCounts: this._referenceCounts } : {},
    }).run();

    // Health Score is a pure, synchronous consumer of the diagnostics
    // just produced above — it re-derives nothing about the assets
    // themselves (see HealthScoreEngine's own docs). Recomputing it here
    // is deliberate: it is cheap enough to do on every batch rather than
    // only when a consumer happens to ask for it.
    this._healthScore = this._healthScoreEngine.evaluate({
      diagnostics: this._ruleReport.diagnostics,
      totalAssetCount: assets.length,
    });
  }

  private _buildSnapshot(): WorkspaceIndexSnapshot {
    return {
      assets: Array.from(this._assets.values()),
      ruleReport: this._ruleReport,
      healthScore: this._healthScore,
      referenceCounts: new Map(this._referenceCounts),
      generation: this._generation,
    };
  }

  private _commit(batch: {
    upsertedAssetPaths: readonly string[];
    removedAssetPaths: readonly string[];
    warnings: readonly string[];
    startedAt: number;
  }): WorkspaceIndexSnapshot {
    this._generation += 1;
    const durationMs = performance.now() - batch.startedAt;
    const snapshot = this._buildSnapshot();

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
      snapshot,
      upsertedAssetPaths: batch.upsertedAssetPaths,
      removedAssetPaths: batch.removedAssetPaths,
      durationMs,
    });

    return snapshot;
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
