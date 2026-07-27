import type { DuplicateGroup, ResolutionPlan, WorkspaceIndexer } from '@animoria/core';
import {
  buildResolutionPlan,
  buildResolutionSummary,
  suggestCanonicalAsset,
  validateResolutionPlan,
} from '@animoria/core';
import * as vscode from 'vscode';
import { buildWorkspaceEdit } from '../duplicates/workspace-edit-builder';
import { resolveScopePath } from '../utils/resolve-scope-path';

/** How long to wait for the reactive index to re-converge after execution before giving up on an "after" Health Score. */
const REINDEX_TIMEOUT_MS = 8000;

/**
 * The "Assist Duplicate Resolution" workflow's Webview controller.
 *
 * ## Role in the architecture
 * This class owns exactly one thing: turning developer interaction with
 * the comparison webview into calls against `@animoria/core`'s
 * duplicate-resolution domain (`duplicate-group-detector.js`,
 * `resolution-plan.js`, `resolution-plan-validator.js`,
 * `resolution-summary.js`) and VS Code's own APIs. It contains no
 * comparison logic, no plan-generation logic, and no notion of what
 * makes two assets "duplicates" — every one of those decisions is made
 * in `@animoria/core`, which has no idea a Webview exists. This class's
 * entire job is orchestration and translation, matching the "business
 * logic must remain outside presentation components" requirement this
 * workflow is built around.
 *
 * ## Workflow lifecycle
 * 1. `render()` is called with a {@link DuplicateGroup} (built from
 *    already-known governance data — see `extension.ts`'s
 *    `animoria.resolveDuplicates` command). A suggested canonical asset
 *    is computed and an initial plan is built and sent to the webview.
 * 2. The developer may pick a different candidate as canonical any
 *    number of times; each pick rebuilds the plan (a cheap, read-only
 *    operation — see `buildResolutionPlan`'s own docs) and sends an
 *    updated preview. Nothing is written to disk during this phase.
 * 3. On explicit confirmation, the current plan is **re-validated**
 *    (`validateResolutionPlan`) against the live filesystem. If
 *    anything has changed since the plan was built, the workflow aborts
 *    and reports the problem — no partial edit is ever attempted.
 * 4. A `vscode.WorkspaceEdit` is built from the (now freshly validated)
 *    plan and applied atomically via `vscode.workspace.applyEdit`. VS
 *    Code guarantees this either fully succeeds or fully fails; there
 *    is no custom rollback code here because none is needed.
 * 5. The reactive index (already running for this workspace — see
 *    `WorkspaceIndexer` in `extension.ts`) is nudged to re-converge
 *    immediately for the touched paths, and once it does, a
 *    {@link ResolutionSummary} is built and shown — the workflow's
 *    closing statement, quantifying what changed and how the
 *    workspace's Health Score moved.
 *
 * ## Safety invariants
 * - No file is deleted and no text is rewritten anywhere before step 4
 *   above. Steps 1–3 are entirely read-only.
 * - Confirmation always re-validates against the current filesystem
 *   state, never trusting a plan's age.
 * - Execution is one atomic `WorkspaceEdit`, never a sequence of
 *   independent file operations that could partially apply.
 */
export class AnimoriaDuplicateResolver {
  static currentPanel: AnimoriaDuplicateResolver | undefined;
  static readonly viewType = 'animoria.duplicateResolver';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _workspacePath: string;
  private readonly _indexer: WorkspaceIndexer;
  private _group: DuplicateGroup;
  private _currentPlan: ResolutionPlan | undefined;
  private _disposables: vscode.Disposable[] = [];

  static render(workspacePath: string, group: DuplicateGroup, indexer: WorkspaceIndexer): void {
    if (AnimoriaDuplicateResolver.currentPanel) {
      AnimoriaDuplicateResolver.currentPanel.dispose();
    }

    const panel = vscode.window.createWebviewPanel(
      AnimoriaDuplicateResolver.viewType,
      `Resolve Duplicates: ${group.candidates[0]!.asset.stem}`,
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    AnimoriaDuplicateResolver.currentPanel = new AnimoriaDuplicateResolver(
      panel,
      workspacePath,
      group,
      indexer
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    workspacePath: string,
    group: DuplicateGroup,
    indexer: WorkspaceIndexer
  ) {
    this._panel = panel;
    this._workspacePath = workspacePath;
    this._group = group;
    this._indexer = indexer;

    this._panel.webview.html = this._getHtmlContent();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => void this._handleMessage(msg),
      null,
      this._disposables
    );
  }

  dispose(): void {
    if (AnimoriaDuplicateResolver.currentPanel === this) {
      AnimoriaDuplicateResolver.currentPanel = undefined;
    }
    this._panel.dispose();
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
  }

  private async _handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      case 'ready':
        this._postGroupSnapshot();
        await this._selectCanonical(suggestCanonicalAsset(this._group).path);
        break;

      case 'select-canonical': {
        const { assetPath } = message.payload as { assetPath: string };
        await this._selectCanonical(assetPath);
        break;
      }

      case 'confirm':
        await this._confirm();
        break;

      case 'cancel':
        this.dispose();
        break;

      default:
        break;
    }
  }

  /** Explains the group itself — step 1 ("Why are these assets considered duplicates?"). */
  private _postGroupSnapshot(): void {
    void this._panel.webview.postMessage({
      type: 'group-snapshot',
      payload: {
        candidates: this._group.candidates,
        sizeBytes: this._group.sizeBytes,
        potentialSavingsBytes: this._group.potentialSavingsBytes,
        suggestedCanonicalPath: suggestCanonicalAsset(this._group).path,
      },
    });
  }

  /**
   * Rebuilds the plan for a newly-selected canonical asset and sends it
   * to the webview as a preview — steps 3–7 of the UX progression
   * ("what will happen if I keep this one", "exactly which files",
   * "how much storage"). Read-only: nothing is written to disk here.
   */
  private async _selectCanonical(canonicalAssetPath: string): Promise<void> {
    const canonicalAsset = this._group.candidates.find(
      (c) => c.asset.path === canonicalAssetPath
    )?.asset;
    if (!canonicalAsset) return;

    try {
      const plan = await buildResolutionPlan({
        workspacePath: this._workspacePath,
        group: this._group,
        canonicalAsset,
        scopeResolver: (asset) => resolveScopePath(asset.path, this._workspacePath),
      });
      this._currentPlan = plan;

      void this._panel.webview.postMessage({
        type: 'plan-ready',
        payload: {
          canonicalAssetPath: plan.canonicalAsset.path,
          assetsToDelete: plan.assetsToDelete.map((a) => ({ path: a.path, name: a.name })),
          referenceUpdates: plan.referenceUpdates,
          estimatedSavingsBytes: plan.estimatedSavingsBytes,
        },
      });
    } catch (err) {
      void this._panel.webview.postMessage({
        type: 'plan-error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  /**
   * Confirms and executes the current plan: re-validates, applies one
   * atomic `WorkspaceEdit`, then produces a {@link ResolutionSummary}.
   *
   * If validation fails, the workflow aborts here — no edit is ever
   * constructed or applied for a plan that didn't just pass a fresh
   * check against the real filesystem.
   */
  private async _confirm(): Promise<void> {
    const plan = this._currentPlan;
    if (!plan) return;

    const validation = await validateResolutionPlan(plan);
    if (!validation.valid) {
      void this._panel.webview.postMessage({
        type: 'validation-failed',
        payload: { issues: validation.issues },
      });
      return;
    }

    const healthScoreBefore = this._indexer.getSnapshot().healthScore?.score ?? null;

    const edit = buildWorkspaceEdit(plan);
    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      void this._panel.webview.postMessage({
        type: 'execution-failed',
        payload: { message: 'VS Code was unable to apply the workspace edit.' },
      });
      return;
    }

    // Nudge the reactive index to re-converge immediately for the
    // paths this edit just touched, rather than waiting for the
    // filesystem watcher's own debounce window to notice on its own.
    for (const asset of plan.assetsToDelete) {
      this._indexer.notifyFileChanged(asset.path, 'deleted');
    }
    for (const update of new Set(plan.referenceUpdates.map((u) => u.file))) {
      this._indexer.notifyFileChanged(update, 'changed');
    }

    const healthScoreAfter = await this._awaitReconvergedHealthScore();
    const remainingDiagnosticCount = (
      this._indexer.getSnapshot().ruleReport?.diagnostics ?? []
    ).filter((d) => d.asset.path === plan.canonicalAsset.path).length;

    const summary = buildResolutionSummary(
      plan,
      { before: healthScoreBefore, after: healthScoreAfter },
      remainingDiagnosticCount
    );

    void this._panel.webview.postMessage({ type: 'resolution-complete', payload: summary });
  }

  /**
   * Waits for the next indexer update following execution, so the
   * summary reports an up-to-date Health Score rather than the
   * pre-execution one. Bounded by {@link REINDEX_TIMEOUT_MS} — if the
   * index hasn't converged in time (an unusually large workspace, heavy
   * concurrent filesystem activity), the summary still renders, simply
   * without an "after" score rather than blocking indefinitely.
   */
  private _awaitReconvergedHealthScore(): Promise<number | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        subscription.dispose();
        resolve(null);
      }, REINDEX_TIMEOUT_MS);

      const subscription = this._indexer.onDidUpdate((update) => {
        clearTimeout(timer);
        subscription.dispose();
        resolve(update.snapshot.healthScore?.score ?? null);
      });
    });
  }

  private _getHtmlContent(): string {
    return /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src vscode-resource: https: data:;">
  <title>Resolve Duplicates</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 13px;
      line-height: 1.5;
      padding: 20px;
    }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .subtitle { color: var(--vscode-descriptionForeground); margin-bottom: 20px; }

    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .card {
      flex: 1 1 220px;
      min-width: 220px;
      border: 2px solid var(--vscode-panel-border, var(--vscode-widget-border, #3e3e42));
      border-radius: 8px;
      padding: 14px;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .card:hover { border-color: var(--vscode-focusBorder); }
    .card.selected { border-color: var(--vscode-button-background); background: var(--vscode-list-activeSelectionBackground, transparent); }
    .card-name { font-weight: 600; margin-bottom: 6px; word-break: break-all; }
    .card-stat { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .card-stat b { color: var(--vscode-editor-foreground); }
    .card-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }

    details { margin-top: 8px; }
    summary { cursor: pointer; color: var(--vscode-descriptionForeground); font-size: 12px; }

    .ref-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .ref-item { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; padding: 6px 8px; background: var(--vscode-input-background); border-radius: 4px; }
    .ref-old { color: var(--vscode-errorForeground, #f14c4c); text-decoration: line-through; }
    .ref-new { color: var(--vscode-terminal-ansiGreen, #89d185); }

    .actions { display: flex; gap: 8px; margin-top: 16px; }
    .btn { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; background: var(--vscode-button-secondaryBackground, var(--vscode-button-background)); color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground)); }
    .btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .savings { font-size: 20px; font-weight: 700; color: var(--vscode-terminal-ansiGreen, #89d185); }

    .error-box { background: var(--vscode-inputValidation-errorBackground, #5a1d1d); border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100); border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; }

    #summary-view { display: none; text-align: center; padding: 40px 20px; }
    #summary-view .headline { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
    #summary-view .line { font-size: 14px; margin-bottom: 8px; }
    #summary-view .check { color: var(--vscode-terminal-ansiGreen, #89d185); }
  </style>
</head>
<body>

<div id="main-view">
  <h1>Resolve Duplicates</h1>
  <p class="subtitle">
    These <span id="candidate-count">0</span> assets have byte-identical content —
    keeping all of them provides no benefit and only adds confusion and repository size.
  </p>

  <div id="error-box" class="error-box" style="display:none;"></div>

  <div class="cards" id="cards"></div>

  <div class="section">
    <div class="section-title">If you keep the selected asset</div>
    <div>Estimated storage recovered: <span class="savings" id="savings">—</span></div>
    <details>
      <summary id="ref-summary">Reference updates</summary>
      <div class="ref-list" id="ref-list"></div>
    </details>
  </div>

  <div class="actions">
    <button class="btn primary" id="btn-confirm" disabled>Resolve Duplicates</button>
    <button class="btn" id="btn-cancel">Cancel</button>
  </div>
</div>

<div id="summary-view">
  <div class="headline">Duplicate Resolution Complete</div>
  <div class="line"><span class="check">✓</span> <span id="summary-removed"></span></div>
  <div class="line"><span class="check">✓</span> <span id="summary-refs"></span></div>
  <div class="line"><span class="check">✓</span> <span id="summary-bytes"></span></div>
  <div class="line" id="summary-health-line" style="display:none;"><span class="check">✓</span> <span id="summary-health"></span></div>
  <div class="line" id="summary-issues"></div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let candidates = [];
  let selectedPath = null;

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderCards() {
    const container = document.getElementById('cards');
    container.innerHTML = '';
    candidates.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card' + (c.asset.path === selectedPath ? ' selected' : '');
      const isSuggested = c.__suggested;
      card.innerHTML =
        (isSuggested ? '<div class="card-badge">Suggested</div>' : '') +
        '<div class="card-name">' + escapeHtml(c.asset.name) + '</div>' +
        '<div class="card-stat"><b>' + c.referenceCount + '</b> reference(s) in code</div>' +
        '<div class="card-stat">' + escapeHtml(c.asset.path) + '</div>' +
        '<details><summary>Technical details</summary>' +
        '<div class="card-stat">Format: ' + escapeHtml(c.asset.format) + '</div>' +
        '<div class="card-stat">Size: ' + formatBytes(c.asset.sizeBytes) + '</div>' +
        '<div class="card-stat">Modified: ' + new Date(c.asset.mtime).toLocaleString() + '</div>' +
        '</details>';
      card.addEventListener('click', () => {
        selectedPath = c.asset.path;
        renderCards();
        document.getElementById('btn-confirm').disabled = true;
        vscode.postMessage({ type: 'select-canonical', payload: { assetPath: selectedPath } });
      });
      container.appendChild(card);
    });
  }

  window.addEventListener('message', event => {
    const { type, payload } = event.data;

    if (type === 'group-snapshot') {
      candidates = payload.candidates;
      selectedPath = payload.suggestedCanonicalPath;
      candidates.forEach(c => { c.__suggested = c.asset.path === selectedPath; });
      document.getElementById('candidate-count').textContent = candidates.length;
      renderCards();
    }

    if (type === 'plan-ready') {
      document.getElementById('error-box').style.display = 'none';
      document.getElementById('savings').textContent = formatBytes(payload.estimatedSavingsBytes);
      document.getElementById('ref-summary').textContent =
        payload.referenceUpdates.length + ' reference update(s)';

      const list = document.getElementById('ref-list');
      list.innerHTML = '';
      payload.referenceUpdates.forEach(u => {
        const item = document.createElement('div');
        item.className = 'ref-item';
        item.innerHTML =
          escapeHtml(u.file) + ':' + u.line + '<br/>' +
          '<span class="ref-old">' + escapeHtml(u.oldText) + '</span><br/>' +
          '<span class="ref-new">' + escapeHtml(u.newText) + '</span>';
        list.appendChild(item);
      });

      document.getElementById('btn-confirm').disabled = false;
    }

    if (type === 'plan-error') {
      const box = document.getElementById('error-box');
      box.style.display = 'block';
      box.textContent = 'Could not build a plan: ' + payload.message;
      document.getElementById('btn-confirm').disabled = true;
    }

    if (type === 'validation-failed') {
      const box = document.getElementById('error-box');
      box.style.display = 'block';
      box.innerHTML = '<b>This plan is out of date and cannot be applied safely:</b><br/>' +
        payload.issues.map(i => escapeHtml(i.message)).join('<br/>');
      document.getElementById('btn-confirm').disabled = false;
    }

    if (type === 'execution-failed') {
      const box = document.getElementById('error-box');
      box.style.display = 'block';
      box.textContent = payload.message;
      document.getElementById('btn-confirm').disabled = false;
    }

    if (type === 'resolution-complete') {
      document.getElementById('main-view').style.display = 'none';
      document.getElementById('summary-view').style.display = 'block';
      document.getElementById('summary-removed').textContent =
        payload.removedAssetCount + ' duplicate asset(s) removed';
      document.getElementById('summary-refs').textContent =
        payload.updatedReferenceCount + ' reference(s) updated';
      document.getElementById('summary-bytes').textContent =
        formatBytes(payload.recoveredBytes) + ' recovered';

      if (payload.healthScoreBefore !== null && payload.healthScoreAfter !== null) {
        document.getElementById('summary-health-line').style.display = 'block';
        const delta = payload.healthScoreDelta;
        const sign = delta > 0 ? '+' : '';
        document.getElementById('summary-health').textContent =
          'Asset Health Score: ' + payload.healthScoreBefore + ' → ' + payload.healthScoreAfter +
          ' (' + sign + delta + ')';
      }

      document.getElementById('summary-issues').textContent =
        payload.remainingDiagnosticCount === 0
          ? 'No issues detected.'
          : payload.remainingDiagnosticCount + ' issue(s) still concern the kept asset.';
    }
  });

  document.getElementById('btn-confirm').addEventListener('click', () => {
    document.getElementById('btn-confirm').disabled = true;
    vscode.postMessage({ type: 'confirm' });
  });
  document.getElementById('btn-cancel').addEventListener('click', () => {
    vscode.postMessage({ type: 'cancel' });
  });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  }
}
