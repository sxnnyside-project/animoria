import type { WorkspaceAnalysis, WorkspaceIndexUpdate, WorkspaceIndexer } from '@animoria/core';
import type { CleanupPlanner } from '../../src/cleanup/CleanupPlanner.js';
import { EventEmitter } from '../mocks/vscode.js';

/**
 * Doubles for the two concrete collaborators (`WorkspaceIndexer`,
 * `CleanupPlanner`) that the code under test in TASK-H1.2 depends on but
 * does not own. Both are real classes with private fields, so a
 * structurally-shaped object can only satisfy their type via an explicit
 * cast — that cast is confined to this file and only ever used from
 * tests, never from `src`.
 *
 * Reuses the same `EventEmitter`/`Disposable` primitives as the `vscode`
 * mock (`tests/mocks/vscode.ts`) rather than a second event
 * implementation, per TASK-H1.1's harness architecture.
 */

/**
 * A canonical {@link WorkspaceAnalysis} for tests.
 *
 * Named `buildAnalysis` rather than `buildSnapshot` because there is no longer a
 * snapshot type distinct from the analysis: the extension consumes the same
 * aggregate Core produces and the CLI renders.
 */
export function buildAnalysis(overrides: Partial<WorkspaceAnalysis> = {}): WorkspaceAnalysis {
  return {
    workspacePath: '/workspace',
    generatedAt: '2026-01-01T00:00:00.000Z',
    generation: 1,
    durationMs: 1,
    readiness: {
      assetsIndexed: true,
      referencesResolved: true,
      duplicatesResolved: true,
      complete: true,
    },
    assets: [],
    // A complete scan by default, so a test that does not care about coverage still
    // exercises the ordinary path. A test asserting on confidence must override this:
    // confidence is capped by coverage, and a fake with no coverage would otherwise
    // silently produce low-confidence candidates for reasons unrelated to its subject.
    coverage: {
      status: 'complete',
      scannedExtensions: ['.ts', '.tsx', '.html', '.css', '.md'],
      unscannedExtensions: [],
      filesScanned: 12,
      referencesDetected: 0,
      excludedPatterns: [],
      scopePath: '/workspace',
    },
    referenceCounts: new Map(),
    referenceIndex: null,
    diagnostics: [],
    evaluatedRuleIds: [],
    skippedRules: [],
    configErrors: [],
    duplicateGroups: [],
    health: {
      status: 'unavailable',
      reason: 'no-rules-configured',
      message: 'No rules were configured, so there is nothing to score.',
    },
    ...overrides,
  } as WorkspaceAnalysis;
}

interface FakeWorkspaceIndexerHandle {
  indexer: WorkspaceIndexer;
  setAnalysis(analysis: WorkspaceAnalysis): void;
  /** Test-only hook: schedules `onDidUpdate` to fire on the next microtask, simulating reactive re-convergence without a real timer. */
  scheduleReconvergence(analysis: WorkspaceAnalysis): void;
  /** Every `path`/`kind` pair passed to `indexer.notifyFileChanged`, in call order — lets a test assert the code under test actually nudges the reactive index. */
  notified: readonly { path: string; kind: string }[];
}

export function createFakeWorkspaceIndexer(
  workspacePath: string,
  initialAnalysis: WorkspaceAnalysis = buildAnalysis()
): FakeWorkspaceIndexerHandle {
  let analysis = initialAnalysis;
  const emitter = new EventEmitter<WorkspaceIndexUpdate>();
  const notified: { path: string; kind: string }[] = [];

  const fake = {
    getAnalysis: () => analysis,
    // The real indexer's `analyzeComplete` awaits outstanding work; the fake has
    // none, so resolving with the current analysis is faithful.
    analyzeComplete: async () => analysis,
    onDidUpdate: emitter.event,
    notifyFileChanged: (path: string, kind: string) => {
      notified.push({ path, kind });
      // A real WorkspaceIndexer eventually re-converges and fires
      // `onDidUpdate` asynchronously after a filesystem notification.
      // Scheduling via a microtask (rather than firing synchronously)
      // preserves that ordering — callers that subscribe to `onDidUpdate`
      // immediately after calling this, in the same synchronous turn,
      // still see the event, exactly as they would against the real
      // indexer's own debounce-then-fire behavior, just without a real
      // timer a test would have to wait out.
      queueMicrotask(() => emitter.fire({ analysis } as WorkspaceIndexUpdate));
    },
    get workspacePath() {
      return workspacePath;
    },
    dispose: () => emitter.dispose(),
  };

  return {
    indexer: fake as unknown as WorkspaceIndexer,
    setAnalysis: (next) => {
      analysis = next;
    },
    scheduleReconvergence: (next) => {
      analysis = next;
      queueMicrotask(() => emitter.fire({ analysis: next } as WorkspaceIndexUpdate));
    },
    notified,
  };
}

interface FakeCleanupPlannerHandle {
  planner: CleanupPlanner;
  dismissedPaths: string[];
}

export function createFakeCleanupPlanner(
  analysis: WorkspaceAnalysis,
  workspacePath = '/workspace'
): FakeCleanupPlannerHandle {
  const dismissedPaths: string[] = [];
  const fake = {
    getAnalysis: () => analysis,
    dismiss: (path: string) => {
      dismissedPaths.push(path);
    },
    get workspacePath() {
      return workspacePath;
    },
  };
  return { planner: fake as unknown as CleanupPlanner, dismissedPaths };
}
