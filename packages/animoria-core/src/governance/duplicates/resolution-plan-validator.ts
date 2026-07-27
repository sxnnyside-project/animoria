import { readFile, stat } from 'node:fs/promises';
import { logDebug } from '../../logging/logger.js';
import { hashAssetContent } from './content-hash.js';
import type { PlanValidationIssue, PlanValidationResult, ResolutionPlan } from './types.js';

/**
 * Re-verifies every assumption a {@link ResolutionPlan} depends on,
 * immediately before execution.
 *
 * ## Why re-validate a plan that was already built correctly
 * A plan can be shown to a developer, sat on their screen while they
 * read it, and only then confirmed — and the filesystem does not stop
 * changing just because a webview is open. Another tool could delete
 * one of the duplicates already; a teammate's save (in a live-share
 * session, or simply a slow reviewer) could edit a referencing file
 * between plan generation and confirmation. Executing a plan built from
 * assumptions that are no longer true risks silently corrupting a file
 * the developer never actually agreed to change — the exact opposite of
 * "never surprise the developer." This function is what the "confirm
 * before executing" and "abort atomically" safety principles are built
 * on: nothing in the workflow applies a `ResolutionPlan` without first
 * calling this and confirming `{ valid: true }`.
 *
 * ## What "valid" means here
 * - Every asset scheduled for deletion still exists **and** its content
 *   hash still equals the group's hash (`plan.group.id`) — catches both
 *   "already deleted" and "changed since the plan was built" (a changed
 *   file is no longer content-identical, so deleting it would destroy
 *   data that was never actually a duplicate).
 * - Every referencing file scheduled for a text edit still contains the
 *   expected `oldText` at the expected line — catches a reference file
 *   having been edited in the meantime, which would otherwise make the
 *   edit land on the wrong line or silently do nothing.
 *
 * @returns `{ valid: true }`, or `{ valid: false, issues }` describing
 *   every problem found — not just the first one, so a developer (or a
 *   retry-with-fresh-plan flow) can see the complete picture in one
 *   pass rather than discovering issues one at a time.
 */
export async function validateResolutionPlan(plan: ResolutionPlan): Promise<PlanValidationResult> {
  const issues: PlanValidationIssue[] = [];

  const assetChecks = plan.assetsToDelete.map(async (asset) => {
    try {
      await stat(asset.path);
    } catch (err) {
      logDebug(
        'duplicate-resolution-validate',
        'validateResolutionPlan',
        'Asset scheduled for deletion no longer exists',
        {
          assetPath: asset.path,
          reason: 'stat failed — file missing or inaccessible',
          error: err,
          recovery: 'plan rejected with an asset-missing issue',
        }
      );
      issues.push({
        kind: 'asset-missing',
        path: asset.path,
        message: `"${asset.name}" no longer exists — it may have already been deleted.`,
      });
      return;
    }

    const currentHash = await hashAssetContent(asset).catch(() => null);
    if (currentHash !== plan.group.id) {
      issues.push({
        kind: 'asset-changed',
        path: asset.path,
        message: `"${asset.name}" has changed since this plan was created and is no longer identical to the canonical asset.`,
      });
    }
  });

  const referenceChecks = plan.referenceUpdates.map(async (update) => {
    let content: string;
    try {
      content = await readFile(update.file, 'utf-8');
    } catch (err) {
      logDebug(
        'duplicate-resolution-validate',
        'validateResolutionPlan',
        'Referencing source file no longer exists',
        {
          assetPath: update.file,
          reason: 'file missing or inaccessible',
          error: err,
          recovery: 'plan rejected with a reference-missing issue',
        }
      );
      issues.push({
        kind: 'reference-missing',
        path: update.file,
        message: `"${update.file}" no longer exists — it may have been moved or deleted.`,
      });
      return;
    }

    const lines = content.split('\n');
    const currentLine = lines[update.line - 1];
    if (currentLine === undefined || currentLine.trim() !== update.oldText.trim()) {
      issues.push({
        kind: 'reference-changed',
        path: update.file,
        message: `Line ${update.line} of "${update.file}" has changed since this plan was created.`,
      });
    }
  });

  await Promise.all([...assetChecks, ...referenceChecks]);

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
