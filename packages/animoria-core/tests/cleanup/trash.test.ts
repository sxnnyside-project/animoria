import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TRASH_DIRNAME,
  buildTrashDestination,
  generateTrashSessionId,
  listTrashSessions,
  moveAssetsToTrash,
  purgeExpiredTrashSessions,
  readSessionManifest,
  restoreTrashSession,
  trashManifestPathFor,
  trashRootFor,
  trashSessionDirFor,
  writeSessionManifest,
} from '../../src/cleanup/trash';

/**
 * The shared trash mechanism every client (VS Code, JetBrains, the CLI daemon)
 * routes through.
 *
 * ## Why `restore` is the part worth testing hardest
 * Before the manifest existed, a trashed file's original location was encoded
 * only in a one-way hash prefixed to its new filename — nothing could recover
 * it. "The bytes are preserved" and "the bytes are restorable" were treated
 * as the same guarantee when they were not: recoverability requires knowing
 * *where to put something back*, which a hash cannot tell you. These tests
 * exercise real filesystem moves in a temp directory rather than mocking
 * `fs`, because the property under test — a file that leaves and then
 * returns to the same path — is exactly the kind of thing a mock could get
 * right for the wrong reason.
 */
describe('trash', () => {
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-trash-'));
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  describe('path computation', () => {
    it('places the trash root under .animoria/trash inside the workspace', () => {
      expect(trashRootFor(workspaceDir)).toBe(join(workspaceDir, TRASH_DIRNAME));
    });

    it('generates a filesystem-safe, chronologically sortable session id', () => {
      const id = generateTrashSessionId();
      expect(id).not.toMatch(/[:.]/);
      expect(() => trashSessionDirFor(workspaceDir, id)).not.toThrow();
    });

    it('builds unique destinations for two assets that share a filename from different folders', () => {
      const sessionId = generateTrashSessionId();
      const a = { path: '/workspace/folderA/loading.json', name: 'loading.json' };
      const b = { path: '/workspace/folderB/loading.json', name: 'loading.json' };

      const destA = buildTrashDestination(workspaceDir, sessionId, a);
      const destB = buildTrashDestination(workspaceDir, sessionId, b);

      expect(destA).not.toBe(destB);
      expect(destA.startsWith(trashSessionDirFor(workspaceDir, sessionId))).toBe(true);
      expect(destB.startsWith(trashSessionDirFor(workspaceDir, sessionId))).toBe(true);
    });

    it('builds the same destination for the same asset given the same session id (deterministic)', () => {
      const sessionId = generateTrashSessionId();
      const asset = { path: '/workspace/asset.json', name: 'asset.json' };

      expect(buildTrashDestination(workspaceDir, sessionId, asset)).toBe(
        buildTrashDestination(workspaceDir, sessionId, asset)
      );
    });
  });

  describe('moveAssetsToTrash', () => {
    function writeAsset(
      relativePath: string,
      content = 'x'
    ): { path: string; name: string; sizeBytes: number } {
      const path = join(workspaceDir, relativePath);
      writeFileSync(path, content);
      return { path, name: relativePath.split('/').pop()!, sizeBytes: content.length };
    }

    it('moves every asset out of its original location', async () => {
      const asset = writeAsset('hero.json', 'lottie-bytes');

      const result = await moveAssetsToTrash(workspaceDir, [asset]);

      expect(existsSync(asset.path)).toBe(false);
      expect(result.moved).toEqual([asset.path]);
      expect(result.bytesReclaimed).toBe(asset.sizeBytes);
    });

    it('skips an asset already gone from disk rather than failing the whole batch', async () => {
      const present = writeAsset('present.json');
      const missing = {
        path: join(workspaceDir, 'missing.json'),
        name: 'missing.json',
        sizeBytes: 10,
      };

      const result = await moveAssetsToTrash(workspaceDir, [present, missing]);

      expect(result.moved).toEqual([present.path]);
      expect(existsSync(present.path)).toBe(false);
    });

    it('writes a manifest naming only the assets actually moved', async () => {
      const present = writeAsset('present.json');
      const missing = {
        path: join(workspaceDir, 'missing.json'),
        name: 'missing.json',
        sizeBytes: 10,
      };

      const result = await moveAssetsToTrash(workspaceDir, [present, missing]);
      const manifest = await readSessionManifest(workspaceDir, result.sessionId);

      expect(manifest).not.toBeNull();
      expect(manifest?.sessionId).toBe(result.sessionId);
      expect(manifest?.entries.map((e) => e.originalPath)).toEqual([present.path]);
      expect(manifest?.entries[0]?.trashPath).toBe(
        buildTrashDestination(workspaceDir, result.sessionId, present)
      );
    });

    it('persists the manifest as readable JSON at a predictable path', async () => {
      const asset = writeAsset('hero.json');
      const { sessionId } = await moveAssetsToTrash(workspaceDir, [asset]);

      const raw = await readFile(trashManifestPathFor(workspaceDir, sessionId), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.entries).toHaveLength(1);
    });
  });

  describe('restoreTrashSession', () => {
    function writeAsset(
      relativePath: string,
      content = 'x'
    ): { path: string; name: string; sizeBytes: number } {
      const path = join(workspaceDir, relativePath);
      writeFileSync(path, content);
      return { path, name: relativePath.split('/').pop()!, sizeBytes: content.length };
    }

    it('puts every trashed asset back at its original path, with its original bytes', async () => {
      const asset = writeAsset('hero.json', 'original-lottie-bytes');
      const { sessionId } = await moveAssetsToTrash(workspaceDir, [asset]);
      expect(existsSync(asset.path)).toBe(false);

      const result = await restoreTrashSession(workspaceDir, sessionId);

      expect(result.restoredPaths).toEqual([asset.path]);
      expect(result.failures).toEqual([]);
      expect(existsSync(asset.path)).toBe(true);
      expect(await readFile(asset.path, 'utf-8')).toBe('original-lottie-bytes');
    });

    it('restores every asset in a multi-asset session', async () => {
      const a = writeAsset('a.json');
      mkdirSync(join(workspaceDir, 'sub'), { recursive: true });
      const b = writeAsset('sub/b.json');
      const { sessionId } = await moveAssetsToTrash(workspaceDir, [a, b]);

      const result = await restoreTrashSession(workspaceDir, sessionId);

      expect(result.restoredPaths.sort()).toEqual([a.path, b.path].sort());
      expect(existsSync(a.path)).toBe(true);
      expect(existsSync(b.path)).toBe(true);
    });

    it('refuses to overwrite a file that now occupies the original path', async () => {
      const asset = writeAsset('hero.json', 'original');
      const { sessionId } = await moveAssetsToTrash(workspaceDir, [asset]);

      // Something new was created at the same path after the deletion — this
      // must not be silently clobbered by the restore.
      writeFileSync(asset.path, 'new work created after the deletion');

      const result = await restoreTrashSession(workspaceDir, sessionId);

      expect(result.restoredPaths).toEqual([]);
      expect(result.failures).toEqual([
        { originalPath: asset.path, reason: 'destination-occupied' },
      ]);
      expect(await readFile(asset.path, 'utf-8')).toBe('new work created after the deletion');
    });

    it('reports a missing trash file without throwing', async () => {
      const asset = writeAsset('hero.json');
      const { sessionId } = await moveAssetsToTrash(workspaceDir, [asset]);
      // Remove only the trashed file itself, keeping the manifest — this
      // simulates someone moving a file out of the trash folder by hand
      // rather than the whole session going missing.
      const manifest = await readSessionManifest(workspaceDir, sessionId);
      rmSync(manifest!.entries[0]!.trashPath, { force: true });

      const result = await restoreTrashSession(workspaceDir, sessionId);

      expect(result.failures).toEqual([{ originalPath: asset.path, reason: 'trash-file-missing' }]);
    });

    it('restores independently: one failing entry does not block the others', async () => {
      const ok = writeAsset('ok.json');
      const blocked = writeAsset('blocked.json');
      const { sessionId } = await moveAssetsToTrash(workspaceDir, [ok, blocked]);
      writeFileSync(blocked.path, 'occupied');

      const result = await restoreTrashSession(workspaceDir, sessionId);

      expect(result.restoredPaths).toEqual([ok.path]);
      expect(result.failures).toEqual([
        { originalPath: blocked.path, reason: 'destination-occupied' },
      ]);
    });

    it('returns an empty result for a session id with no manifest, rather than throwing', async () => {
      const result = await restoreTrashSession(workspaceDir, 'never-existed');
      expect(result).toEqual({ sessionId: 'never-existed', restoredPaths: [], failures: [] });
    });
  });

  describe('writeSessionManifest — for callers that move files themselves', () => {
    it('lets a caller record a manifest for moves it performed by its own mechanism', async () => {
      // Mirrors how VS Code stages moves inside a single WorkspaceEdit rather
      // than calling moveAssetsToTrash: it computes destinations itself, lets
      // VS Code perform the atomic move, then records what happened here.
      const sessionId = generateTrashSessionId();
      mkdirSync(trashSessionDirFor(workspaceDir, sessionId), { recursive: true });
      const asset = { path: join(workspaceDir, 'hero.json'), name: 'hero.json', sizeBytes: 5 };
      const trashPath = buildTrashDestination(workspaceDir, sessionId, asset);
      writeFileSync(asset.path, 'hello');
      writeFileSync(trashPath, 'hello'); // simulates the WorkspaceEdit having already moved it

      await writeSessionManifest(workspaceDir, sessionId, [
        { originalPath: asset.path, trashPath, sizeBytes: asset.sizeBytes },
      ]);

      const manifest = await readSessionManifest(workspaceDir, sessionId);
      expect(manifest?.entries).toEqual([
        { originalPath: asset.path, trashPath, sizeBytes: asset.sizeBytes },
      ]);
    });
  });

  describe('listTrashSessions', () => {
    it('returns an empty list when no trash directory exists yet', async () => {
      expect(await listTrashSessions(workspaceDir)).toEqual([]);
    });

    it('lists every session with a manifest, most recently moved first', async () => {
      const first = { path: join(workspaceDir, 'a.json'), name: 'a.json', sizeBytes: 1 };
      writeFileSync(first.path, 'x');
      const { sessionId: firstId } = await moveAssetsToTrash(workspaceDir, [first]);

      // Session ids are millisecond-resolution timestamps: two batches inside
      // the same millisecond (which two back-to-back test calls genuinely can
      // be, unlike two real cleanup runs a developer triggers) would collide
      // and land in the same session directory, making "which one is more
      // recent" undefined rather than merely hard to test. The delay is what
      // this test needs to observe ordering; it says nothing about how fast
      // real usage is.
      await new Promise((resolve) => setTimeout(resolve, 5));

      const second = { path: join(workspaceDir, 'b.json'), name: 'b.json', sizeBytes: 1 };
      writeFileSync(second.path, 'x');
      const { sessionId: secondId } = await moveAssetsToTrash(workspaceDir, [second]);

      expect(firstId).not.toBe(secondId);

      const sessions = await listTrashSessions(workspaceDir);

      expect(sessions.map((s) => s.sessionId)).toEqual([secondId, firstId]);
    });

    it('ignores a session directory with no manifest rather than throwing', async () => {
      const orphanDir = trashSessionDirFor(workspaceDir, generateTrashSessionId());
      mkdirSync(orphanDir, { recursive: true });
      writeFileSync(join(orphanDir, 'stray-file.json'), 'x');

      await expect(listTrashSessions(workspaceDir)).resolves.toEqual([]);
    });
  });

  describe('purgeExpiredTrashSessions', () => {
    function makeSession(id: string, ageMs: number): string {
      const dir = trashSessionDirFor(workspaceDir, id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'placeholder.txt'), 'x');
      const past = new Date(Date.now() - ageMs);
      utimesSync(dir, past, past);
      return dir;
    }

    it('does nothing when no trash directory exists yet', async () => {
      await expect(purgeExpiredTrashSessions(workspaceDir, 1000)).resolves.not.toThrow();
    });

    it('removes a session older than the retention window', async () => {
      const oldDir = makeSession('old-session', 10_000);

      await purgeExpiredTrashSessions(workspaceDir, 1_000);

      expect(existsSync(oldDir)).toBe(false);
    });

    it('keeps a session within the retention window', async () => {
      const recentDir = makeSession('recent-session', 100);

      await purgeExpiredTrashSessions(workspaceDir, 10_000);

      expect(existsSync(recentDir)).toBe(true);
      expect(statSync(recentDir).isDirectory()).toBe(true);
    });

    it('purges only expired sessions, leaving recent ones untouched, in a mixed batch', async () => {
      const oldDir = makeSession('old', 10_000);
      const recentDir = makeSession('recent', 100);

      await purgeExpiredTrashSessions(workspaceDir, 1_000);

      expect(existsSync(oldDir)).toBe(false);
      expect(existsSync(recentDir)).toBe(true);
    });
  });
});
