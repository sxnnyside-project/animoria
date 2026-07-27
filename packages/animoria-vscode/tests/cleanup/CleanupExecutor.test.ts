import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnimoriaAsset } from '@animoria/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CleanupExecutor, CleanupValidationError } from '../../src/cleanup/CleanupExecutor.js';
import type {
  CleanupCandidate,
  CleanupProposal,
  CleanupSession,
} from '../../src/cleanup/CleanupTypes.js';
import { mockVscodeState, resetTestWorkspace } from '../harness.js';
import { buildSnapshot, createFakeCleanupPlanner } from '../support/fakes.js';

/**
 * `CleanupExecutor` is the last line of defense before Bulk Cleanup deletes
 * files from a developer's real workspace. These tests exercise its public
 * contract only — `prepare()` then `execute()` — against a real temp
 * directory, since `prepare()` deliberately checks real on-disk existence
 * (`existsSync`) rather than trusting the index. Every scenario proves a
 * refusal, not a successful deletion, unless explicitly named "happy path".
 */
describe('CleanupExecutor', () => {
  let workspaceDir: string;

  beforeEach(() => {
    resetTestWorkspace();
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-cleanup-'));
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  function writeAssetFile(name: string, content = '{}'): AnimoriaAsset {
    const path = join(workspaceDir, name);
    writeFileSync(path, content);
    return {
      path,
      name,
      stem: name.replace(/\.[^.]+$/, ''),
      format: 'lottie',
      sizeBytes: Buffer.byteLength(content),
      mtime: Date.now(),
      status: 'parsed',
    };
  }

  function candidateFor(asset: AnimoriaAsset): CleanupCandidate {
    return {
      asset,
      reasons: ['orphaned'],
      confidence: 'high',
      referenceCount: 0,
      affectedReferences: [],
      sizeBytes: asset.sizeBytes,
      dismissed: false,
    };
  }

  function sessionFor(
    candidates: CleanupCandidate[],
    decisions: Record<string, 'remove' | 'keep' | 'dismiss'>
  ): CleanupSession {
    const proposal: CleanupProposal = {
      candidates,
      totalSizeBytes: candidates.reduce((s, c) => s + c.sizeBytes, 0),
      affectedReferencesCount: 0,
      affectedFolders: [],
      estimatedHealthScoreDelta: 0,
      estimatedExecutionMs: 0,
      generatedAt: new Date().toISOString(),
    };
    const decisionMap = new Map(Object.entries(decisions));
    for (const c of candidates) {
      if (!decisionMap.has(c.asset.path)) decisionMap.set(c.asset.path, 'keep');
    }
    return { proposal, decisions: decisionMap };
  }

  describe('prepare()', () => {
    it('produces an empty edit when nothing is marked for removal', async () => {
      const asset = writeAssetFile('kept.json');
      const session = sessionFor([candidateFor(asset)], {});
      const { planner } = createFakeCleanupPlanner(buildSnapshot(), workspaceDir);
      const executor = new CleanupExecutor(planner);

      await executor.prepare(session);

      expect(session.workspaceEdit).toBeDefined();
      expect(session.workspaceEdit!.fileRenames).toHaveLength(0);
      expect(session.trashSessionId).toBeUndefined();
    });

    it('builds an edit that moves an unreferenced candidate into the trash, not a permanent deletion', async () => {
      const asset = writeAssetFile('orphan.json');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      const { planner } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[asset.path, 0]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);

      await executor.prepare(session);

      expect(session.workspaceEdit!.fileDeletions).toHaveLength(0);
      expect(session.workspaceEdit!.fileRenames).toHaveLength(1);
      expect(session.workspaceEdit!.fileRenames[0]?.from.fsPath).toBe(asset.path);
      expect(session.workspaceEdit!.fileRenames[0]?.to.fsPath).toContain(
        join('.animoria', 'trash')
      );
      expect(session.trashSessionId).toBeDefined();
    });

    it('refuses to delete an asset that became referenced again after the proposal was generated', async () => {
      const asset = writeAssetFile('now-referenced.json');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      // Snapshot the *live* planner would read at prepare-time shows a fresh
      // reference — simulating drift since the proposal (built with
      // referenceCount: 0 on the candidate) was generated.
      const { planner } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[asset.path, 1]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);

      await expect(executor.prepare(session)).rejects.toThrow(CleanupValidationError);
      expect(session.workspaceEdit).toBeUndefined();
    });

    it('never deletes a re-referenced asset even when execute is attempted after a failed prepare', async () => {
      const asset = writeAssetFile('now-referenced.json');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      const { planner } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[asset.path, 1]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);

      await expect(executor.prepare(session)).rejects.toThrow(CleanupValidationError);
      await expect(executor.execute(session, 80)).rejects.toThrow(
        'CleanupExecutor.execute called before prepare'
      );
      expect(mockVscodeState.fileSystem.has(asset.path)).toBe(false); // never seeded — proves no write path was taken
    });

    it('refuses to prepare a candidate that was deleted externally before execution', async () => {
      const asset = writeAssetFile('will-vanish.json');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      const { planner } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[asset.path, 0]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);

      unlinkSync(asset.path); // external deletion between planning and execution

      await expect(executor.prepare(session)).rejects.toThrow(CleanupValidationError);
      expect(session.workspaceEdit).toBeUndefined();
    });

    it('prefers refusal: a referenced candidate blocks the whole batch even when other candidates are also missing', async () => {
      const referencedAsset = writeAssetFile('referenced.json');
      const missingAsset = writeAssetFile('missing.json');
      const session = sessionFor([candidateFor(referencedAsset), candidateFor(missingAsset)], {
        [referencedAsset.path]: 'remove',
        [missingAsset.path]: 'remove',
      });
      const { planner } = createFakeCleanupPlanner(
        buildSnapshot({
          referenceCounts: new Map([
            [referencedAsset.path, 3],
            [missingAsset.path, 0],
          ]),
        }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);
      unlinkSync(missingAsset.path);

      let error: unknown;
      try {
        await executor.prepare(session);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(CleanupValidationError);
      expect((error as CleanupValidationError).affectedPaths).toEqual([referencedAsset.path]);
      expect(session.workspaceEdit).toBeUndefined();
    });

    it('rejects the entire stale batch rather than silently deleting the still-valid subset', async () => {
      const staleAsset = writeAssetFile('stale.json');
      const validAsset = writeAssetFile('valid.json');
      const session = sessionFor([candidateFor(staleAsset), candidateFor(validAsset)], {
        [staleAsset.path]: 'remove',
        [validAsset.path]: 'remove',
      });
      const { planner } = createFakeCleanupPlanner(
        buildSnapshot({
          referenceCounts: new Map([
            [staleAsset.path, 2], // re-referenced since planning
            [validAsset.path, 0],
          ]),
        }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);

      await expect(executor.prepare(session)).rejects.toThrow(CleanupValidationError);
      // validAsset must still exist — a batch failure never lets any part of it through.
      expect(mockVscodeState.fileSystem.size).toBe(0); // nothing was ever written to the applied-edit filesystem
    });
  });

  describe('execute()', () => {
    it('refuses to run without a prepared session', async () => {
      const asset = writeAssetFile('unprepared.json');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      const { planner } = createFakeCleanupPlanner(buildSnapshot(), workspaceDir);
      const executor = new CleanupExecutor(planner);

      await expect(executor.execute(session, 80)).rejects.toThrow(
        'CleanupExecutor.execute called before prepare'
      );
    });

    it('moves only the prepared candidate into trash — content is preserved, not lost — and reports the correct summary', async () => {
      const asset = writeAssetFile('orphan.json', '{"v":1}');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      const { planner, dismissedPaths } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[asset.path, 0]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);
      mockVscodeState.fileSystem.set(asset.path, Buffer.from('{"v":1}'));

      await executor.prepare(session);
      const summary = await executor.execute(session, 80);

      expect(summary.removedAssetPaths).toEqual([asset.path]);
      expect(summary.bytesReclaimed).toBe(asset.sizeBytes);
      expect(summary.referencesUpdated).toBe(0);
      expect(summary.trashLocation).toContain(join('.animoria', 'trash'));
      expect(dismissedPaths).toEqual([]);

      // The asset is gone from its original path...
      expect(mockVscodeState.fileSystem.has(asset.path)).toBe(false);
      // ...but its exact content is recoverable at the trash destination —
      // this is the whole point of TASK-H2.1: a move, never a permanent loss.
      const trashPath = session.workspaceEdit!.fileRenames[0]!.to.fsPath;
      expect(mockVscodeState.fileSystem.get(trashPath)?.toString('utf-8')).toBe('{"v":1}');
    });

    it('persists dismissals only for candidates decided as dismiss, never for removed or kept ones', async () => {
      const removed = writeAssetFile('removed.json');
      const dismissed = writeAssetFile('dismissed.json');
      const kept = writeAssetFile('kept.json');
      const session = sessionFor(
        [candidateFor(removed), candidateFor(dismissed), candidateFor(kept)],
        {
          [removed.path]: 'remove',
          [dismissed.path]: 'dismiss',
          [kept.path]: 'keep',
        }
      );
      const { planner, dismissedPaths } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[removed.path, 0]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);
      mockVscodeState.fileSystem.set(removed.path, Buffer.from('{}'));

      await executor.prepare(session);
      await executor.execute(session, 80);

      expect(dismissedPaths).toEqual([dismissed.path]);
    });

    it('deletes no files when VS Code declines to apply the workspace edit', async () => {
      const asset = writeAssetFile('declined.json');
      const session = sessionFor([candidateFor(asset)], { [asset.path]: 'remove' });
      const { planner, dismissedPaths } = createFakeCleanupPlanner(
        buildSnapshot({ referenceCounts: new Map([[asset.path, 0]]) }),
        workspaceDir
      );
      const executor = new CleanupExecutor(planner);
      mockVscodeState.fileSystem.set(asset.path, Buffer.from('{}'));

      await executor.prepare(session);

      // Force VS Code's own apply step to decline, independent of our
      // validation — simulates VS Code itself rejecting an otherwise
      // valid, already-passed-prepare() edit.
      const { workspace } = await import('../mocks/vscode.js');
      const original = workspace.applyEdit;
      workspace.applyEdit = async () => false;
      try {
        await expect(executor.execute(session, 80)).rejects.toThrow(CleanupValidationError);
      } finally {
        workspace.applyEdit = original;
      }

      expect(mockVscodeState.fileSystem.has(asset.path)).toBe(true); // untouched
      expect(dismissedPaths).toEqual([]); // dismissals never persisted on a failed apply
    });
  });
});
