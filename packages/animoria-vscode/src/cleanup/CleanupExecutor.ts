import { existsSync } from 'node:fs';
import * as vscode from 'vscode';
import type { CleanupPlanner } from './CleanupPlanner.js';
import {
  buildTrashDestination,
  generateTrashSessionId,
  trashSessionDirFor,
} from './CleanupTrash.js';
import type { CleanupCandidate, CleanupSession, CleanupSummary } from './CleanupTypes.js';

// ─── CleanupExecutor ──────────────────────────────────────────────────────────

/**
 * Owns the execution phase of a {@link CleanupSession}: pre-generation of the
 * `WorkspaceEdit`, safety validation, and atomic filesystem staging.
 *
 * ## Design intent
 *
 * The executor is deliberately separated from the planner and the panel so
 * that each stage of the `Analyze → Review → Understand → Approve → Execute →
 * Summarize` lifecycle can be reasoned about and tested in isolation.
 *
 * - **`prepare(session)`** — reads candidate decisions, re-validates them
 *   against the *current* index state, and generates the `WorkspaceEdit`.
 *   Must succeed before `execute` may be called. Performs **no mutations**.
 *
 * - **`execute(session)`** — applies the pre-validated `WorkspaceEdit` in one
 *   atomic operation.
 *
 * ## Safety invariants
 *
 * 1. No file is touched before `prepare` has run successfully.
 * 2. **A candidate with any known reference is never removed by this
 *    workflow, regardless of the developer's decision or how stale the
 *    originating proposal is.** Bulk Cleanup has no mechanism to redirect a
 *    reference to a replacement asset the way Assist Duplicate Resolution
 *    does — there is nothing a deleted file's references could point to
 *    instead — so the only safe contract is refusing to remove anything a
 *    reference still points at. `prepare` re-checks this against a fresh
 *    snapshot immediately before building the edit, not the (possibly
 *    stale) counts the proposal was built from.
 * 3. Removal is a **move, not a delete**: every approved candidate is
 *    relocated to `.animoria/trash/<sessionId>/` (see `CleanupTrash.ts`)
 *    via `vscode.WorkspaceEdit.renameFile`, batched into the same single
 *    `WorkspaceEdit` applied with one `vscode.workspace.applyEdit` call —
 *    VS Code applies a `WorkspaceEdit` all-or-nothing, so a batch can
 *    never leave some assets moved and others not because of a mid-batch
 *    failure. This is Animoria's own, verified recovery mechanism: an
 *    earlier version of this workflow instead permanently deleted files
 *    and documented VS Code's Local History as the rollback path, but
 *    that claim was never objectively verified and does not hold for
 *    this workflow's binary asset types — Local History snapshots a file
 *    on a *text document* save, and assets browsed through Animoria's
 *    gallery are essentially never opened as text documents first. A
 *    move into a workspace-local, product-owned trash directory recovers
 *    exactly the same all-or-nothing atomicity guarantee without
 *    depending on that assumption.
 * 4. Dismissed candidates are persisted via `CleanupPlanner` so they never
 *    reappear in future sessions.
 *
 * ## What this class does NOT do
 *
 * - It does not build the proposal (`CleanupPlanner`'s job).
 * - It does not render any UI (`AnimoriaCleanupPanel`'s job).
 * - It does not rewrite source-code references. Every candidate this class
 *   is willing to remove is, by invariant 2, unreferenced — there is never
 *   a reference left to rewrite.
 * - It does not purge old trash sessions — see
 *   `CleanupTrash.purgeExpiredTrashSessions`, run separately at workspace
 *   startup.
 */
export class CleanupExecutor {
  private readonly _planner: CleanupPlanner;

  constructor(planner: CleanupPlanner) {
    this._planner = planner;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Prepares a {@link CleanupSession} for execution.
   *
   * Steps performed (read-only — no mutations):
   * 1. Collect all candidates whose decision is `'remove'`.
   * 2. Re-validate each against the *current* index snapshot's reference
   *    counts — any candidate that now has one or more references is
   *    rejected outright (see safety invariant 2). This catches both a
   *    proposal that has gone stale and a candidate that was always
   *    referenced but selected anyway.
   * 3. Validate every remaining candidate still exists on disk.
   * 4. Build a single `vscode.WorkspaceEdit` moving every validated
   *    candidate into this batch's trash session directory.
   * 5. Attach the edit and the trash session id to the session.
   *
   * Throws if any candidate fails validation. The panel must catch this
   * error and surface it as a warning without proceeding to execution — no
   * partial subset of a rejected batch is ever silently executed.
   *
   * @param session The session to prepare. Mutated only to set `workspaceEdit`/`trashSessionId`.
   * @throws {CleanupValidationError} if any candidate is referenced or no longer exists on disk.
   */
  async prepare(session: CleanupSession): Promise<void> {
    const toRemove = this._collectToRemove(session);

    if (toRemove.length === 0) {
      session.workspaceEdit = new vscode.WorkspaceEdit();
      session.trashSessionId = undefined;
      return;
    }

    // ── Step 1: Refuse to remove anything currently referenced ───────────────
    const currentReferenceCounts = this._planner.getSnapshot().referenceCounts;
    const referenced = toRemove.filter(
      (candidate) => (currentReferenceCounts.get(candidate.asset.path) ?? 0) > 0
    );

    if (referenced.length > 0) {
      throw new CleanupValidationError(
        `${referenced.length} selected asset(s) are currently referenced in source code and cannot be removed by Bulk Cleanup. Deselect them, or use "Delete Asset" on each individually if you still want to remove them.`,
        referenced.map((c) => c.asset.path)
      );
    }

    // ── Step 2: Validate all candidates still exist on disk ──────────────────
    const missing: string[] = [];
    for (const candidate of toRemove) {
      if (!existsSync(candidate.asset.path)) {
        missing.push(candidate.asset.path);
      }
    }

    if (missing.length > 0) {
      throw new CleanupValidationError(
        `${missing.length} asset(s) no longer exist on disk. Refresh the workspace index and try again.`,
        missing
      );
    }

    // ── Step 3: Build the atomic WorkspaceEdit, staging into trash ───────────
    const trashSessionId = generateTrashSessionId();
    const workspacePath = this._planner.workspacePath;
    const edit = new vscode.WorkspaceEdit();
    for (const candidate of toRemove) {
      const trashPath = buildTrashDestination(workspacePath, trashSessionId, candidate.asset);
      edit.renameFile(vscode.Uri.file(candidate.asset.path), vscode.Uri.file(trashPath), {
        overwrite: true,
      });
    }
    session.workspaceEdit = edit;
    session.trashSessionId = trashSessionId;
  }

  /**
   * Applies the pre-validated session, executing all approved removals.
   *
   * **Must only be called after {@link prepare} has returned successfully.**
   * Applies `session.workspaceEdit` — every move `prepare` validated,
   * batched into one edit — with a single `vscode.workspace.applyEdit` call.
   * If VS Code rejects the edit, no asset is moved.
   *
   * @param session A prepared session (`workspaceEdit` must be set).
   * @param healthScoreBefore The score captured at proposal time, for display.
   * @returns A summary of what was accomplished.
   */
  async execute(session: CleanupSession, healthScoreBefore: number): Promise<CleanupSummary> {
    if (!session.workspaceEdit) {
      throw new Error('CleanupExecutor.execute called before prepare. Call prepare() first.');
    }

    const toRemove = this._collectToRemove(session);
    const toDismiss = this._collectToDismiss(session);

    // ── Step 1: Ensure this batch's trash directory exists ───────────────────
    // The directory itself is scaffolding for the move below, not a
    // mutation of tracked repository content — creating it is safe to
    // repeat and does not need `prepare()`'s stricter read-only contract.
    if (session.trashSessionId) {
      const trashDir = trashSessionDirFor(this._planner.workspacePath, session.trashSessionId);
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(trashDir));
    }

    // ── Step 2: Apply the atomic WorkspaceEdit ────────────────────────────────
    const editApplied = await vscode.workspace.applyEdit(session.workspaceEdit);
    if (!editApplied) {
      throw new CleanupValidationError(
        'VS Code declined to apply the workspace edit. No assets were removed.',
        []
      );
    }

    const removedPaths = toRemove.map((c) => c.asset.path);
    const bytesReclaimed = toRemove.reduce((sum, c) => sum + c.sizeBytes, 0);

    // ── Step 3: Persist dismissals ────────────────────────────────────────────
    for (const candidate of toDismiss) {
      this._planner.dismiss(candidate.asset.path);
    }

    // ── Step 4: Summarize ─────────────────────────────────────────────────────
    const remaining = session.proposal.candidates.length - toRemove.length - toDismiss.length;

    const healthScoreAfter = Math.min(
      100,
      healthScoreBefore + session.proposal.estimatedHealthScoreDelta
    );

    return {
      removedAssetPaths: removedPaths,
      bytesReclaimed,
      // Every candidate reaching this point was validated by `prepare` to
      // have zero references (safety invariant 2) — there is never a
      // reference to rewrite for a Bulk Cleanup removal.
      referencesUpdated: 0,
      healthScoreBefore,
      healthScoreAfter,
      remainingCandidates: Math.max(0, remaining),
      completedAt: new Date().toISOString(),
      trashLocation:
        session.trashSessionId && toRemove.length > 0
          ? trashSessionDirFor(this._planner.workspacePath, session.trashSessionId)
          : null,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _collectToRemove(session: CleanupSession): CleanupCandidate[] {
    return session.proposal.candidates.filter(
      (c) => session.decisions.get(c.asset.path) === 'remove'
    );
  }

  private _collectToDismiss(session: CleanupSession): CleanupCandidate[] {
    return session.proposal.candidates.filter(
      (c) => session.decisions.get(c.asset.path) === 'dismiss'
    );
  }
}

// ─── Custom error ─────────────────────────────────────────────────────────────

/**
 * Thrown by {@link CleanupExecutor.prepare} when pre-execution validation
 * rejects one or more candidates — either because they are referenced (see
 * safety invariant 2) or no longer exist on disk.
 *
 * The panel catches this error and surfaces it as a non-blocking warning; no
 * file is touched when this is thrown, including candidates that would have
 * validated successfully.
 */
export class CleanupValidationError extends Error {
  /**
   * The absolute paths that failed validation.
   * May be empty when the failure is not path-specific (e.g. WorkspaceEdit rejection).
   */
  readonly affectedPaths: readonly string[];

  constructor(message: string, affectedPaths: string[]) {
    super(message);
    this.name = 'CleanupValidationError';
    this.affectedPaths = affectedPaths;
  }
}
