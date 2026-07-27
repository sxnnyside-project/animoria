import type {
  WorkspaceIndexSnapshot,
  WorkspaceIndexUpdate,
  WorkspaceIndexer,
} from '@animoria/core';
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

export function buildSnapshot(
  overrides: Partial<WorkspaceIndexSnapshot> = {}
): WorkspaceIndexSnapshot {
  return {
    assets: [],
    ruleReport: null,
    referenceCounts: new Map(),
    healthScore: null,
    ...overrides,
  } as WorkspaceIndexSnapshot;
}

interface FakeWorkspaceIndexerHandle {
  indexer: WorkspaceIndexer;
  setSnapshot(snapshot: WorkspaceIndexSnapshot): void;
  /** Test-only hook: schedules `onDidUpdate` to fire on the next microtask, simulating reactive re-convergence without a real timer. */
  scheduleReconvergence(snapshot: WorkspaceIndexSnapshot): void;
  /** Every `path`/`kind` pair passed to `indexer.notifyFileChanged`, in call order — lets a test assert the code under test actually nudges the reactive index. */
  notified: readonly { path: string; kind: string }[];
}

export function createFakeWorkspaceIndexer(
  workspacePath: string,
  initialSnapshot: WorkspaceIndexSnapshot = buildSnapshot()
): FakeWorkspaceIndexerHandle {
  let snapshot = initialSnapshot;
  const emitter = new EventEmitter<WorkspaceIndexUpdate>();
  const notified: { path: string; kind: string }[] = [];

  const fake = {
    getSnapshot: () => snapshot,
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
      queueMicrotask(() => emitter.fire({ snapshot } as WorkspaceIndexUpdate));
    },
    get workspacePath() {
      return workspacePath;
    },
    dispose: () => emitter.dispose(),
  };

  return {
    indexer: fake as unknown as WorkspaceIndexer,
    setSnapshot: (next) => {
      snapshot = next;
    },
    scheduleReconvergence: (next) => {
      snapshot = next;
      queueMicrotask(() => emitter.fire({ snapshot: next } as WorkspaceIndexUpdate));
    },
    notified,
  };
}

interface FakeCleanupPlannerHandle {
  planner: CleanupPlanner;
  dismissedPaths: string[];
}

export function createFakeCleanupPlanner(
  snapshot: WorkspaceIndexSnapshot,
  workspacePath = '/workspace'
): FakeCleanupPlannerHandle {
  const dismissedPaths: string[] = [];
  const fake = {
    getSnapshot: () => snapshot,
    dismiss: (path: string) => {
      dismissedPaths.push(path);
    },
    get workspacePath() {
      return workspacePath;
    },
  };
  return { planner: fake as unknown as CleanupPlanner, dismissedPaths };
}
