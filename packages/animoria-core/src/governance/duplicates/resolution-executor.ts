import { readFile, writeFile } from 'node:fs/promises';
import { moveAssetsToTrash } from '../../cleanup/trash.js';
import { logWarn } from '../../logging/logger.js';
import { validateResolutionPlan } from './resolution-plan-validator.js';
import type { PlanValidationIssue, ResolutionPlan } from './types.js';

/**
 * Executes a {@link ResolutionPlan} — the one place a duplicate resolution
 * actually touches the filesystem.
 *
 * ## Why this exists in Core rather than per-client
 * Duplicate resolution used to be executed twice, differently. VS Code built a
 * `vscode.WorkspaceEdit` that rewrote references *and* called `deleteFile` —
 * a permanent deletion, bypassing the trash every other removal path used. The
 * daemon (and therefore JetBrains) did something else entirely: it moved the
 * duplicates to trash and **never rewrote a single reference**, so resolving a
 * duplicate in a JetBrains IDE left every import pointing at a file that had
 * moved. Two clients, two behaviours, one of which silently broke builds.
 *
 * The plan is now executed here, once, for every client.
 *
 * ## The transaction boundary, stated honestly
 * There is no filesystem primitive that makes "rewrite N source files and move M
 * assets" atomic, and pretending otherwise would be the kind of claim this
 * codebase exists to stop making. The real boundary is:
 *
 * 1. **Validate.** {@link validateResolutionPlan} re-checks every assumption. If
 *    anything moved, nothing at all happens.
 * 2. **Rewrite references first.** Source edits are reversible by the developer's
 *    own editor undo and version control, and a rewritten reference pointing at a
 *    file that has not moved yet is still correct — the canonical asset is
 *    already there. If a rewrite fails, execution stops *before* any asset moves,
 *    and the workspace is left with the references it started with plus, at
 *    worst, some already-repointed ones that are still valid.
 * 3. **Move assets to trash last.** By the time an asset moves, every reference
 *    Animoria could repoint already points at the canonical copy. Trash is
 *    recoverable through the same manifest every other removal writes, so even a
 *    complete failure at this step is undoable via `restoreTrashSession`.
 *
 * The ordering is the guarantee: at no point does an asset disappear while a
 * reference Animoria was able to fix still points at it.
 */

/** What happened when a plan was executed. */
export interface ResolutionExecutionResult {
  readonly status: 'applied' | 'rejected' | 'failed';
  /** Absolute paths of assets moved to trash. */
  readonly removedAssetPaths: readonly string[];
  /** Absolute path of the trash session directory, when anything was moved. */
  readonly trashLocation: string | null;
  /** The trash session id, for `restoreTrashSession`. */
  readonly trashSessionId: string | null;
  /** How many source lines were rewritten. */
  readonly updatedReferenceCount: number;
  /** Bytes recovered. */
  readonly recoveredBytes: number;
  /** Present when `status === 'rejected'` — the plan no longer matched the workspace. */
  readonly issues: readonly PlanValidationIssue[];
  /** Present when `status === 'failed'` — what went wrong mid-execution. */
  readonly error: string | null;
}

/** Options for {@link executeResolutionPlan}. */
export interface ExecuteResolutionPlanOptions {
  readonly workspacePath: string;
  /**
   * Whether to proceed when the plan cannot repoint every reference
   * (`plan.safety === 'partial'`).
   *
   * Defaults to `false`: a partial plan removes assets that source code still
   * points at, so it must be an explicit, informed choice rather than something
   * a caller gets by forgetting to check. A client that surfaces
   * `plan.unrewritableReferences` to the developer and gets confirmation passes
   * `true`; one that does not, cannot.
   */
  readonly allowPartial?: boolean;
}

/**
 * Validates and applies a resolution plan.
 *
 * Never throws for an expected condition — a stale plan comes back as
 * `rejected` with the issues, a mid-flight failure as `failed` with the reason,
 * so a caller renders an outcome rather than catching to discover one.
 */
export async function executeResolutionPlan(
  plan: ResolutionPlan,
  options: ExecuteResolutionPlanOptions
): Promise<ResolutionExecutionResult> {
  const empty = {
    removedAssetPaths: [] as readonly string[],
    trashLocation: null,
    trashSessionId: null,
    updatedReferenceCount: 0,
    recoveredBytes: 0,
  };

  if (plan.safety === 'partial' && options.allowPartial !== true) {
    return {
      ...empty,
      status: 'rejected',
      issues: plan.unrewritableReferences.map((reference) => ({
        kind: 'reference-changed' as const,
        path: reference.file,
        message: `Line ${reference.line}: ${reference.explanation}`,
      })),
      error: null,
    };
  }

  const validation = await validateResolutionPlan(plan);
  if (!validation.valid) {
    return { ...empty, status: 'rejected', issues: validation.issues, error: null };
  }

  // ── Step 1: rewrite references ────────────────────────────────────────────
  // Grouped per file so each file is read and written exactly once, no matter
  // how many of its lines change — and so a file's edits land together rather
  // than through a sequence of partial writes.
  const updatesByFile = new Map<string, typeof plan.referenceUpdates>();
  for (const update of plan.referenceUpdates) {
    updatesByFile.set(update.file, [...(updatesByFile.get(update.file) ?? []), update]);
  }

  let updatedReferenceCount = 0;
  for (const [file, updates] of updatesByFile) {
    try {
      const lines = (await readFile(file, 'utf-8')).split('\n');
      for (const update of updates) {
        // Validation already confirmed this line still reads as expected; the
        // index check here guards only against a malformed plan.
        if (lines[update.line - 1] === undefined) continue;
        lines[update.line - 1] = update.newText;
        updatedReferenceCount += 1;
      }
      await writeFile(file, lines.join('\n'));
    } catch (err) {
      logWarn(
        'duplicate-resolution-execute',
        'executeResolutionPlan',
        'Could not rewrite references',
        {
          assetPath: file,
          reason: 'read or write failed',
          error: err,
          recovery: 'execution aborted before any asset was moved to trash',
        }
      );
      return {
        ...empty,
        status: 'failed',
        updatedReferenceCount,
        issues: [],
        error: `Could not rewrite references in "${file}": ${
          err instanceof Error ? err.message : String(err)
        }. No assets were removed.`,
      };
    }
  }

  // ── Step 2: move the duplicates to trash ──────────────────────────────────
  const { sessionId, trashDir, moved, bytesReclaimed } = await moveAssetsToTrash(
    options.workspacePath,
    plan.assetsToDelete
  );

  return {
    status: 'applied',
    removedAssetPaths: moved,
    trashLocation: moved.length > 0 ? trashDir : null,
    trashSessionId: moved.length > 0 ? sessionId : null,
    updatedReferenceCount,
    recoveredBytes: bytesReclaimed,
    issues: [],
    error: null,
  };
}
