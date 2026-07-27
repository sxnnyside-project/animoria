import { createHash } from 'node:crypto';
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { AnimoriaAsset } from '@animoria/core';
import { logDebug, logWarn } from '@animoria/core';

/**
 * Workspace-local recovery mechanism for Bulk Cleanup deletions.
 *
 * ## Why this exists
 * `CleanupExecutor` previously deleted approved assets via
 * `vscode.WorkspaceEdit.deleteFile`, documenting VS Code's Local History
 * as the rollback path. That claim was never objectively verified for
 * this workflow's actual file types (`.lottie`, `.riv`, `.gif`), and
 * VS Code's own Local History mechanism is tied to text-editor saves —
 * it snapshots a file when a *text document* for it is saved, not when
 * an arbitrary binary file is deleted via a workspace edit. Assets
 * browsed through Animoria's gallery are essentially never opened as
 * VS Code text documents first, so Local History has no reason to hold
 * a snapshot for them. Rather than continue asserting a safety
 * guarantee that could not be confirmed, deletion now stages every
 * removed asset here first — recovery no longer depends on an assumption
 * about an unrelated VS Code feature.
 *
 * ## Design
 * A deletion batch (one `CleanupExecutor.execute()` call) moves every
 * approved asset into `.animoria/trash/<sessionId>/`, one directory per
 * batch, via `vscode.WorkspaceEdit.renameFile` — a single atomic
 * filesystem rename per asset, applied as part of the same
 * `WorkspaceEdit` that would otherwise have deleted it. The file leaves
 * its original location (so the workspace and the index correctly treat
 * it as gone) but its bytes are fully preserved on disk, recoverable by
 * moving it back. Grouping by session makes "what did this cleanup run
 * remove" a single directory a developer can inspect or restore from
 * wholesale.
 *
 * Retention is bounded, not indefinite: {@link purgeExpiredTrashSessions}
 * removes session directories older than a fixed age, run best-effort at
 * workspace startup so trash cannot silently accumulate forever.
 */

/** Workspace-relative directory every trash session lives under. */
export const TRASH_DIRNAME = join('.animoria', 'trash');

/** How long a trash session is kept before it becomes eligible for automatic purging. */
export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Absolute path to the trash root for a given workspace. */
export function trashRootFor(workspacePath: string): string {
  return join(workspacePath, TRASH_DIRNAME);
}

/**
 * A filesystem-safe identifier for one cleanup batch, used as the trash
 * session's directory name. Encodes the moment of execution so sessions
 * sort chronologically and a retention sweep can order-independently
 * decide which ones are old enough to purge.
 */
export function generateTrashSessionId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Absolute path to the trash directory for one specific batch. */
export function trashSessionDirFor(workspacePath: string, sessionId: string): string {
  return join(trashRootFor(workspacePath), sessionId);
}

/**
 * The destination an asset moves to when staged for deletion. Every
 * candidate in a batch shares the batch's session directory, and is
 * additionally prefixed with a short hash of its original absolute path
 * so two candidates that happen to share a filename (from different
 * source folders) can never collide within the same session.
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
 * Removes trash session directories older than {@link TRASH_RETENTION_MS}.
 * Never throws — a failure to purge (permission issue, directory already
 * gone) is logged and otherwise ignored, since a full trash directory is
 * an inconvenience, never a correctness problem, and purging must never
 * be allowed to interrupt workspace activation.
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
    return; // No trash directory yet — nothing to purge.
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
