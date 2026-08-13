import { WorkspaceIndexer } from '../indexer/workspace-indexer.js';
import type { FileChangeKind } from '../indexer/types.js';
import type { MultiRootAnalysis, RootAnalysis } from './multi-root-analysis.js';
import { aggregateAnalyses } from './multi-root-analysis.js';
import type { WorkspaceIdentity, WorkspaceRoot } from './workspace-identity.js';
import { buildWorkspaceIdentity, rootForPath } from './workspace-identity.js';

/**
 * One indexer per root, one aggregate for the workspace.
 *
 * ## Why not one indexer over many roots
 * `WorkspaceIndexer` loads `.animoriarc` and `.animoriaignore` from *its* workspace
 * path and applies them to everything it indexes. Handing it several roots would
 * mean one root's configuration governing another's files — a policy decision nobody
 * made, applied invisibly. D-05 settles this: index every root, one analysis per
 * root, aggregate for display.
 *
 * ## Why roots can be added and removed at runtime
 * VS Code and JetBrains both let a developer add or remove a folder without
 * reopening. A session that only read its roots once would keep analysing a removed
 * root and never see an added one, and the divergence would be invisible until a
 * cleanup plan named a file that no longer belonged to the workspace.
 */
export class WorkspaceSession {
  private _identity: WorkspaceIdentity;
  private readonly _indexers = new Map<string, WorkspaceIndexer>();
  private _disposed = false;

  constructor(rootPaths: readonly string[]) {
    this._identity = buildWorkspaceIdentity(rootPaths);
    for (const root of this._identity.roots) this._createIndexer(root);
  }

  get identity(): WorkspaceIdentity {
    return this._identity;
  }

  get roots(): readonly WorkspaceRoot[] {
    return this._identity.roots;
  }

  /** Indexes every root, in parallel, to completion. */
  async initialize(): Promise<MultiRootAnalysis> {
    await Promise.all([...this._indexers.values()].map((indexer) => indexer.initializeComplete()));
    return this.getAnalysis();
  }

  /** Indexes every root far enough to render, without waiting for reference evidence. */
  async initializeFast(): Promise<MultiRootAnalysis> {
    await Promise.all([...this._indexers.values()].map((indexer) => indexer.initializeFast()));
    return this.getAnalysis();
  }

  /** The current aggregate. Cheap — every root's analysis is already in memory. */
  getAnalysis(): MultiRootAnalysis {
    const perRoot: RootAnalysis[] = [];
    for (const root of this._identity.roots) {
      const indexer = this._indexers.get(root.id);
      if (indexer) perRoot.push({ root, analysis: indexer.getAnalysis() });
    }
    return aggregateAnalyses(this._identity, perRoot);
  }

  /** The aggregate once every root has finished. For one-shot consumers. */
  async analyzeComplete(): Promise<MultiRootAnalysis> {
    const perRoot: RootAnalysis[] = [];
    for (const root of this._identity.roots) {
      const indexer = this._indexers.get(root.id);
      if (indexer) perRoot.push({ root, analysis: await indexer.analyzeComplete() });
    }
    return aggregateAnalyses(this._identity, perRoot);
  }

  /**
   * Routes a filesystem signal to the root that owns it.
   *
   * A path outside every root is dropped rather than being handed to an arbitrary
   * indexer — feeding root A's indexer a change from root B would make it index a
   * file under the wrong configuration and attribute it to the wrong root.
   */
  notifyFileChanged(path: string, kind: FileChangeKind): void {
    const root = rootForPath(this._identity, path);
    if (!root) return;
    this._indexers.get(root.id)?.notifyFileChanged(path, kind);
  }

  /** The indexer for a root, for operations that are genuinely per-root. */
  indexerForRoot(rootId: string): WorkspaceIndexer | null {
    return this._indexers.get(rootId) ?? null;
  }

  /** The indexer owning an absolute path, or `null` when it is outside the workspace. */
  indexerForPath(absolutePath: string): { root: WorkspaceRoot; indexer: WorkspaceIndexer } | null {
    const root = rootForPath(this._identity, absolutePath);
    if (!root) return null;
    const indexer = this._indexers.get(root.id);
    return indexer ? { root, indexer } : null;
  }

  /**
   * Replaces the root set, keeping indexers for roots that survive.
   *
   * Surviving roots keep their index — re-scanning an untouched root because a
   * *different* folder was added would turn "add a folder" into a full workspace
   * rescan, which on a large monorepo is the difference between instant and
   * thirty seconds.
   *
   * @returns the roots added and removed, so a caller can report the change.
   */
  async setRoots(
    rootPaths: readonly string[]
  ): Promise<{ added: readonly WorkspaceRoot[]; removed: readonly WorkspaceRoot[] }> {
    const next = buildWorkspaceIdentity(rootPaths);
    const nextIds = new Set(next.roots.map((root) => root.id));
    const previousIds = new Set(this._identity.roots.map((root) => root.id));

    const removed = this._identity.roots.filter((root) => !nextIds.has(root.id));
    const added = next.roots.filter((root) => !previousIds.has(root.id));

    for (const root of removed) {
      this._indexers.get(root.id)?.dispose();
      this._indexers.delete(root.id);
    }

    this._identity = next;

    for (const root of added) this._createIndexer(root);
    await Promise.all(added.map((root) => this._indexers.get(root.id)?.initializeComplete()));

    return { added, removed };
  }

  /** Resolves once no root has background work in flight. */
  async whenIdle(): Promise<void> {
    await Promise.all([...this._indexers.values()].map((indexer) => indexer.whenIdle()));
  }

  /**
   * Disposes every indexer.
   *
   * Idempotent, and the only owner of these indexers — nothing else may hold one, so
   * there is no path by which a root's background work outlives the session.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    for (const indexer of this._indexers.values()) indexer.dispose();
    this._indexers.clear();
  }

  get isDisposed(): boolean {
    return this._disposed;
  }

  private _createIndexer(root: WorkspaceRoot): void {
    this._indexers.set(root.id, new WorkspaceIndexer({ workspacePath: root.path }));
  }
}
