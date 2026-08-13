import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
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
 * ## Why a manifest, not just a hash-prefixed filename
 * Each trashed file's destination name is prefixed with a short hash of its
 * *original* absolute path, purely to avoid two same-named files from
 * different folders colliding within one session — that hash is one-way and
 * was never meant to be reversed. Before {@link SessionManifest} existed,
 * "restore" was consequently not a capability anything actually had: the
 * only record of where a file used to live was implicit in a value nothing
 * could invert. The manifest is what turns "the bytes are still on disk" into
 * "the bytes can be put back where they came from."
 *
 * IDE-specific execution paths (e.g. VS Code's `WorkspaceEdit.renameFile`)
 * may still layer their own atomicity guarantees on top, but the path
 * computation, manifest, and retention policy live here once so every
 * client agrees on where trash lives, what was in it, and how long it
 * survives.
 */

const MANIFEST_FILENAME = 'manifest.json';

/** One asset's original and trashed location, recorded so it can be restored. */
export interface TrashManifestEntry {
  readonly originalPath: string;
  readonly trashPath: string;
  readonly sizeBytes: number;
}

/** The complete, persisted record of one trash session — what `restoreTrashSession` reads. */
export interface SessionManifest {
  readonly sessionId: string;
  readonly workspacePath: string;
  readonly movedAt: string;
  readonly entries: readonly TrashManifestEntry[];
}

/** One entry `restoreTrashSession` could not put back, and why. */
export interface RestoreFailure {
  readonly originalPath: string;
  readonly reason: 'destination-occupied' | 'trash-file-missing' | 'move-failed';
}

/** The outcome of restoring a trash session — never throws; failures are reported per entry. */
export interface RestoreResult {
  readonly sessionId: string;
  readonly restoredPaths: readonly string[];
  readonly failures: readonly RestoreFailure[];
}

/** Workspace-relative directory every trash session lives under. */
export const TRASH_DIRNAME = join('.animoria', 'trash');

/** How long a trash session is kept before it becomes eligible for automatic purging. */
export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Absolute path to the trash root for a given workspace. */
export function trashRootFor(workspacePath: string): string {
  return join(workspacePath, TRASH_DIRNAME);
}

/**
 * A filesystem-safe identifier for one batch, used as the trash session's
 * directory name.
 *
 * The millisecond-resolution timestamp prefix keeps ids chronologically
 * sortable by plain string comparison; the random suffix exists only to
 * break a tie when two batches are generated inside the same millisecond
 * (two clients cleaning up at once, or a script retrying rapidly) — without
 * it, the second batch's session id would collide with the first's, and its
 * manifest write would silently overwrite the first batch's own manifest.
 */
export function generateTrashSessionId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${suffix}`;
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

/** Absolute path to the manifest file for one trash session. */
export function trashManifestPathFor(workspacePath: string, sessionId: string): string {
  return join(trashSessionDirFor(workspacePath, sessionId), MANIFEST_FILENAME);
}

/**
 * Moves a batch of assets into a fresh trash session directory via
 * filesystem rename (atomic on the same volume, which `.animoria/trash`
 * always is — it lives under the workspace root), and writes a
 * {@link SessionManifest} recording where each one came from.
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
  const entries: TrashManifestEntry[] = [];
  let bytesReclaimed = 0;

  for (const asset of assets) {
    const destination = buildTrashDestination(workspacePath, sessionId, asset);
    try {
      await rename(asset.path, destination);
      moved.push(asset.path);
      bytesReclaimed += asset.sizeBytes;
      entries.push({
        originalPath: asset.path,
        trashPath: destination,
        sizeBytes: asset.sizeBytes,
      });
    } catch (err) {
      logWarn('trash-cleanup', 'moveAssetsToTrash', 'Could not move asset to trash', {
        assetPath: asset.path,
        reason: 'rename failed (already moved, permission problem, or missing)',
        error: err,
        recovery: 'asset skipped; remains at its original location',
      });
    }
  }

  // Written after every move attempt, so the manifest only ever names assets
  // that actually made it into this session directory — a manifest entry is
  // a promise `restoreTrashSession` can keep, not an intention that may not
  // have happened.
  await writeSessionManifest(workspacePath, sessionId, entries);

  return { sessionId, trashDir, moved, bytesReclaimed };
}

/**
 * Writes a session's manifest directly, for callers that move files through
 * their own mechanism rather than {@link moveAssetsToTrash} — VS Code stages
 * its moves inside a single `vscode.WorkspaceEdit` for all-or-nothing
 * atomicity, so it computes destinations with {@link buildTrashDestination}
 * and, once VS Code confirms the edit applied, records what it moved here.
 * Both paths produce the exact same manifest shape, so {@link restoreTrashSession}
 * has no reason to know or care which client created a given session.
 */
export async function writeSessionManifest(
  workspacePath: string,
  sessionId: string,
  entries: readonly TrashManifestEntry[]
): Promise<void> {
  const manifest: SessionManifest = {
    sessionId,
    workspacePath,
    movedAt: new Date().toISOString(),
    entries,
  };
  await writeFile(
    trashManifestPathFor(workspacePath, sessionId),
    JSON.stringify(manifest, null, 2)
  );
}

/**
 * Restores every asset in a trash session to its original location.
 *
 * Never throws. Each entry is restored independently: one entry failing
 * (its original location is now occupied by something else, or its trash
 * file has already been moved away by hand) does not block the rest of the
 * session from being restored. Refusing to overwrite an occupied
 * destination is deliberate — a file that now exists at the original path
 * may be new work the developer has done since the deletion, and this
 * function has no way to know it is safe to replace.
 */
export async function restoreTrashSession(
  workspacePath: string,
  sessionId: string
): Promise<RestoreResult> {
  const manifest = await readSessionManifest(workspacePath, sessionId);
  if (!manifest) {
    return { sessionId, restoredPaths: [], failures: [] };
  }

  const restoredPaths: string[] = [];
  const failures: RestoreFailure[] = [];

  for (const entry of manifest.entries) {
    if (existsSync(entry.originalPath)) {
      failures.push({ originalPath: entry.originalPath, reason: 'destination-occupied' });
      continue;
    }
    if (!existsSync(entry.trashPath)) {
      failures.push({ originalPath: entry.originalPath, reason: 'trash-file-missing' });
      continue;
    }
    try {
      await rename(entry.trashPath, entry.originalPath);
      restoredPaths.push(entry.originalPath);
    } catch (err) {
      logWarn('trash-cleanup', 'restoreTrashSession', 'Could not restore an asset from trash', {
        assetPath: entry.originalPath,
        reason: 'rename failed',
        error: err,
        recovery: 'asset left in trash; retry restore or move it back by hand',
      });
      failures.push({ originalPath: entry.originalPath, reason: 'move-failed' });
    }
  }

  return { sessionId, restoredPaths, failures };
}

/** Reads and parses one session's manifest, or `null` if it does not exist or is unreadable. */
export async function readSessionManifest(
  workspacePath: string,
  sessionId: string
): Promise<SessionManifest | null> {
  try {
    const raw = await readFile(trashManifestPathFor(workspacePath, sessionId), 'utf-8');
    return JSON.parse(raw) as SessionManifest;
  } catch {
    return null;
  }
}

/**
 * Lists every trash session currently on disk, most recent first — the
 * primary way a client discovers what is restorable without the caller
 * needing to already know a session id.
 */
export async function listTrashSessions(workspacePath: string): Promise<SessionManifest[]> {
  const root = trashRootFor(workspacePath);
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }

  const manifests: SessionManifest[] = [];
  for (const sessionId of entries) {
    const manifest = await readSessionManifest(workspacePath, sessionId);
    if (manifest) manifests.push(manifest);
  }

  return manifests.sort((a, b) => b.movedAt.localeCompare(a.movedAt));
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
