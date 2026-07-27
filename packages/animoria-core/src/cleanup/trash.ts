import { createHash } from 'node:crypto';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { logDebug, logWarn } from '../logging/logger.js';
import type { AnimoriaAsset } from '../types/index.js';

/**
 * Workspace-local recovery mechanism for asset removal, shared by every
 * client (VS Code, JetBrains, CLI). A deletion batch moves each approved
 * asset into `.animoria/trash/<sessionId>/` instead of deleting it
 * outright — bytes are fully preserved on disk, recoverable by moving the
 * file back, and a batch is a single directory a developer can inspect
 * or restore from wholesale.
 *
 * IDE-specific execution paths (e.g. VS Code's `WorkspaceEdit.renameFile`)
 * may still layer their own atomicity guarantees on top, but the path
 * computation and retention policy live here once so every client agrees
 * on where trash lives and how long it survives.
 */

/** Workspace-relative directory every trash session lives under. */
export const TRASH_DIRNAME = join('.animoria', 'trash');

/** How long a trash session is kept before it becomes eligible for automatic purging. */
export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Absolute path to the trash root for a given workspace. */
export function trashRootFor(workspacePath: string): string {
  return join(workspacePath, TRASH_DIRNAME);
}

/** A filesystem-safe identifier for one batch, used as the trash session's directory name. */
export function generateTrashSessionId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Absolute path to the trash directory for one specific batch. */
export function trashSessionDirFor(workspacePath: string, sessionId: string): string {
  return join(trashRootFor(workspacePath), sessionId);
}

/**
 * The destination an asset moves to when staged for deletion. Prefixed with
 * a short hash of its original absolute path so two candidates that share a
 * filename (from different source folders) can never collide within the
 * same session.
 */
export function buildTrashDestination(
  workspacePath: string,
  sessionId: string,
  asset: Pick<AnimoriaAsset, 'path' | 'name'>
): string {
  const originalPathHash = createHash('sha1').update(asset.path).digest('hex').slice(0, 8);
  return join(trashSessionDirFor(workspacePath, sessionId), `${originalPathHash}-${asset.name}`);
}

/**
 * Moves a batch of assets into a fresh trash session directory via
 * filesystem rename (atomic on the same volume, which `.animoria/trash`
 * always is — it lives under the workspace root).
 *
 * @returns The session id and the absolute trash directory used, plus the
 *   subset of assets actually moved (an asset already gone from disk by
 *   the time this runs is skipped rather than failing the whole batch).
 */
export async function moveAssetsToTrash(
  workspacePath: string,
  assets: readonly Pick<AnimoriaAsset, 'path' | 'name' | 'sizeBytes'>[]
): Promise<{ sessionId: string; trashDir: string; moved: string[]; bytesReclaimed: number }> {
  const sessionId = generateTrashSessionId();
  const trashDir = trashSessionDirFor(workspacePath, sessionId);
  await mkdir(trashDir, { recursive: true });

  const moved: string[] = [];
  let bytesReclaimed = 0;

  for (const asset of assets) {
    const destination = buildTrashDestination(workspacePath, sessionId, asset);
    try {
      await rename(asset.path, destination);
      moved.push(asset.path);
      bytesReclaimed += asset.sizeBytes;
    } catch (err) {
      logWarn('trash-cleanup', 'moveAssetsToTrash', 'Could not move asset to trash', {
        assetPath: asset.path,
        reason: 'rename failed (already moved, permission issue, or missing)',
        error: err,
        recovery: 'asset skipped; remains at its original location',
      });
    }
  }

  return { sessionId, trashDir, moved, bytesReclaimed };
}

/**
 * Removes trash session directories older than {@link TRASH_RETENTION_MS}.
 * Never throws — a failure to purge is logged and otherwise ignored, since a
 * full trash directory is an inconvenience, never a correctness problem.
 */
export async function purgeExpiredTrashSessions(
  workspacePath: string,
  maxAgeMs: number = TRASH_RETENTION_MS
): Promise<void> {
  const root = trashRootFor(workspacePath);
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return;
  }

  const cutoff = Date.now() - maxAgeMs;

  for (const entry of entries) {
    const sessionDir = join(root, entry);
    try {
      const stats = await stat(sessionDir);
      if (!stats.isDirectory() || stats.mtimeMs >= cutoff) continue;

      await rm(sessionDir, { recursive: true, force: true });
      logDebug('trash-cleanup', 'purgeExpiredTrashSessions', 'Removed expired trash session', {
        assetPath: sessionDir,
        reason: `older than retention window (${maxAgeMs}ms)`,
        recovery: 'session directory permanently removed',
      });
    } catch (err) {
      logWarn(
        'trash-cleanup',
        'purgeExpiredTrashSessions',
        'Could not purge a trash session directory',
        {
          assetPath: sessionDir,
          reason: 'stat or rm failed',
          error: err,
          recovery: 'session left in place; will be retried on next activation',
        }
      );
    }
  }
}
