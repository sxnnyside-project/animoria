import type { WorkspaceAnalysis } from '../analysis/workspace-analysis.js';

/**
 * Contracts for Animoria's reactive indexing pipeline.
 *
 * ## Why this exists
 * Every governance feature planned for v1.0.0 — Health Score, Hover
 * Preview, Tree View badges, Duplicate Resolution, CLI consistency —
 * depends on one thing being true at all times: the in-memory picture of
 * "what assets exist, what they look like, and whether they violate any
 * rule" must match what is actually on disk, without anyone having to
 * ask for it. This module defines the vocabulary that guarantee is built
 * from, independent of any particular filesystem-watching API.
 *
 * Nothing here imports `vscode`. The indexing pipeline
 * (`workspace-indexer.js` and friends) is a plain Node.js/TypeScript
 * component that a VS Code extension, a JetBrains bridge, or a future
 * CLI watch-mode can all drive by feeding it {@link FileChangeEvent}s —
 * the IDE-specific code's only job is translating its own native
 * filesystem-watcher callbacks into that one normalized shape.
 */

/**
 * The three ways a path can change, as reported by *any* filesystem
 * watcher — VS Code's `FileSystemWatcher`, Node's `fs.watch`, chokidar,
 * or a JetBrains VFS listener.
 *
 * Deliberately excludes a `'renamed'` kind: renames are not a distinct,
 * reliable primitive across watcher implementations (some report them as
 * `deleted` + `created` for the old/new path, some don't report them at
 * all for directories). The pipeline instead *converges* on the correct
 * state regardless of which raw sequence produced it — see
 * {@link "./change-coalescer.js"} for how a delete+create pair for the
 * same path collapses into a single `'changed'` outcome.
 */
export type FileChangeKind = 'created' | 'changed' | 'deleted';

/** A single raw filesystem signal, as reported by the host IDE. */
export interface FileChangeEvent {
  readonly kind: FileChangeKind;
  /** Absolute path to the file that changed. */
  readonly path: string;
}

/**
 * Emitted once per settled batch of filesystem activity — never once per
 * raw event. A single Git branch switch touching 500 files produces
 * exactly one `WorkspaceIndexUpdate`, not 500.
 */
export interface WorkspaceIndexUpdate {
  /**
   * The workspace's complete state after this batch — the one value every client
   * consumes. See {@link WorkspaceAnalysis} for why there is exactly one.
   */
  readonly analysis: WorkspaceAnalysis;
  /** Paths of assets that were added or re-parsed in this batch. */
  readonly upsertedAssetPaths: readonly string[];
  /** Paths of assets removed from the index in this batch. */
  readonly removedAssetPaths: readonly string[];
  /** How long this batch took to apply, in milliseconds. */
  readonly durationMs: number;
}

/**
 * One recorded indexing pass, retained for diagnostics.
 *
 * Exists solely so a future contributor (or a debug command) can answer
 * "why does this asset currently show as unused" or "did my last save
 * actually get picked up" without attaching a debugger — see the
 * Observability requirements this module was built against.
 */
export interface IndexerDiagnosticEntry {
  readonly generation: number;
  readonly appliedAt: string;
  readonly changedPathCount: number;
  readonly upsertedAssetPaths: readonly string[];
  readonly removedAssetPaths: readonly string[];
  readonly durationMs: number;
  /** Non-fatal problems encountered while applying this batch, if any. */
  readonly warnings: readonly string[];
}
