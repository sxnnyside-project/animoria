import { mkdirSync, mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TRASH_DIRNAME,
  buildTrashDestination,
  generateTrashSessionId,
  purgeExpiredTrashSessions,
  trashRootFor,
  trashSessionDirFor,
} from '../../src/cleanup/CleanupTrash.js';

describe('CleanupTrash', () => {
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-trash-'));
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

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
