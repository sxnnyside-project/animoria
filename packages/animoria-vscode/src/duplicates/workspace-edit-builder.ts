import type { ResolutionPlan } from '@animoria/core';
import * as vscode from 'vscode';

/**
 * Translates an IDE-agnostic {@link ResolutionPlan} into a real
 * `vscode.WorkspaceEdit`.
 *
 * ## Why this function exists, separately from the panel
 * `ResolutionPlan` (`@animoria/core`) describes *what* should change —
 * which files to delete, which lines to rewrite — without any
 * knowledge that VS Code exists. This function is the one, narrow place
 * that knowledge gets introduced: it reads a plan and produces the
 * exact `vscode.WorkspaceEdit` primitive VS Code's own apply/undo
 * machinery understands. Keeping it a standalone function (not a method
 * on `AnimoriaDuplicateResolver`) means it can be unit-exercised without
 * a real webview, and means the panel controller's own responsibility
 * stays limited to orchestration — never to deciding how a text edit is
 * constructed.
 *
 * ## Atomicity
 * Every deletion and every text replacement for a plan is added to a
 * *single* `WorkspaceEdit` and applied with one
 * `vscode.workspace.applyEdit` call. VS Code applies a `WorkspaceEdit`
 * all-or-nothing — if any part of it cannot be applied, none of it is —
 * which is exactly the "abort atomically, avoid partial success states"
 * guarantee this workflow promises. No custom rollback bookkeeping is
 * needed here because VS Code's own edit application already provides
 * it.
 *
 * @param plan - A plan that has already passed
 *   `validateResolutionPlan` — this function does not re-validate
 *   anything itself; it trusts the plan it's given, by design, so that
 *   validation stays the one place safety checks are decided (see
 *   `AnimoriaDuplicateResolver`'s docs for where that call happens).
 */
export function buildWorkspaceEdit(plan: ResolutionPlan): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();

  for (const update of plan.referenceUpdates) {
    const uri = vscode.Uri.file(update.file);
    const range = new vscode.Range(
      new vscode.Position(update.line - 1, 0),
      new vscode.Position(update.line - 1, update.oldText.length)
    );
    edit.replace(uri, range, update.newText);
  }

  for (const asset of plan.assetsToDelete) {
    edit.deleteFile(vscode.Uri.file(asset.path), { ignoreIfNotExists: true });
  }

  return edit;
}
