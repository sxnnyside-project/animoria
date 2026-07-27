import type { WorkspaceIndexer } from '@animoria/core';
import * as vscode from 'vscode';
import { CleanupExecutor, CleanupValidationError } from '../cleanup/CleanupExecutor.js';
import { CleanupPlanner } from '../cleanup/CleanupPlanner.js';
import type {
  CleanupCandidate,
  CleanupProposal,
  CleanupSession,
  CleanupSummary,
} from '../cleanup/CleanupTypes.js';

// ─── Panel singleton ──────────────────────────────────────────────────────────

/**
 * Webview panel orchestrating the full Bulk Cleanup Review workflow.
 *
 * ## Lifecycle stages
 * ```
 * Stage 1 — Proposal Summary   (metrics, health-score delta, confirmation gate)
 * Stage 2 — Candidate Review   (per-asset: Remove / Keep / Dismiss)
 * Stage 3 — Approve            (final diff of selected-only candidates)
 * Stage 4 — Execute            (atomic execution with live progress)
 * Stage 5 — Summary            (results, health-score before/after, next steps)
 * ```
 *
 * ## Architecture contract
 * - This panel is **UI-only**. It holds no governance logic.
 *   `CleanupPlanner` owns proposal generation; `CleanupExecutor` owns mutation.
 * - The panel communicates with the host extension exclusively through
 *   `webview.postMessage` (host → panel) and `webview.onDidReceiveMessage`
 *   (panel → host), keeping the Webview fully decoupled.
 * - A single panel instance is reused if already open — navigating to a new
 *   asset from the sidebar does not open a second tab.
 */
export class AnimoriaCleanupPanel {
  static currentPanel: AnimoriaCleanupPanel | undefined;
  static readonly viewType = 'animoria.cleanupReview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _indexer: WorkspaceIndexer;
  private readonly _planner: CleanupPlanner;
  private readonly _executor: CleanupExecutor;
  private _session: CleanupSession | undefined;
  private _disposables: vscode.Disposable[] = [];

  // ── Factory ────────────────────────────────────────────────────────────────

  /**
   * Opens or reveals the Cleanup Review panel and begins the proposal-build
   * phase immediately.
   *
   * @param context VS Code extension context (needed by CleanupPlanner for
   *   workspace-state persistence of dismissals).
   * @param indexer The live workspace indexer, providing the governance snapshot.
   */
  static async render(context: vscode.ExtensionContext, indexer: WorkspaceIndexer): Promise<void> {
    // Reuse existing panel if open.
    if (AnimoriaCleanupPanel.currentPanel) {
      AnimoriaCleanupPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      await AnimoriaCleanupPanel.currentPanel._startReview();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      AnimoriaCleanupPanel.viewType,
      'Animoria — Cleanup Review',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    AnimoriaCleanupPanel.currentPanel = new AnimoriaCleanupPanel(panel, context, indexer);
    await AnimoriaCleanupPanel.currentPanel._startReview();
  }

  // ── Constructor ────────────────────────────────────────────────────────────

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    indexer: WorkspaceIndexer
  ) {
    this._panel = panel;
    this._indexer = indexer;
    this._planner = new CleanupPlanner(indexer, context);
    this._executor = new CleanupExecutor(this._planner);

    this._panel.webview.html = this._getLoadingHtml();

    this._panel.onDidDispose(() => this._dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => void this._handleMessage(msg),
      null,
      this._disposables
    );
  }

  // ── Review lifecycle ───────────────────────────────────────────────────────

  /**
   * Builds a fresh proposal and sends Stage 1 (Proposal Summary) to the panel.
   * Called on first open and on "Refresh" from within the panel.
   */
  private async _startReview(): Promise<void> {
    this._panel.webview.html = this._getLoadingHtml();

    const proposal = await this._planner.buildProposal();
    this._session = this._planner.buildSession(proposal);

    const snapshot = this._planner.getSnapshot();
    const currentHealthScore = snapshot?.healthScore?.score ?? 100;

    this._panel.webview.html = this._getReviewHtml();

    setTimeout(() => {
      this._post({
        type: 'proposal-ready',
        payload: {
          proposal: this._serializeProposal(proposal),
          currentHealthScore,
        },
      });
    }, 100);
  }

  // ── Message handling ───────────────────────────────────────────────────────

  private async _handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      // ── Developer set a per-candidate decision ──────────────────────────────
      case 'set-decision': {
        const { assetPath, decision } = message.payload as {
          assetPath: string;
          decision: 'remove' | 'keep' | 'dismiss';
        };
        if (this._session) {
          this._session.decisions.set(assetPath, decision);
          this._postSelectionSummary();
        }
        break;
      }

      // ── Set all visible candidates to 'remove' ─────────────────────────────
      // Referenced candidates (confidence !== 'high') are never included —
      // CleanupExecutor refuses to remove them regardless, so selecting them
      // here would only produce a confusing rejection later.
      case 'select-all': {
        if (this._session) {
          for (const c of this._session.proposal.candidates) {
            if (c.confidence !== 'high') continue;
            this._session.decisions.set(c.asset.path, 'remove');
          }
          this._postSelectionSummary();
        }
        break;
      }

      // ── Clear all 'remove' decisions (back to 'keep') ──────────────────────
      case 'deselect-all': {
        if (this._session) {
          for (const c of this._session.proposal.candidates) {
            if (this._session.decisions.get(c.asset.path) === 'remove') {
              this._session.decisions.set(c.asset.path, 'keep');
            }
          }
          this._postSelectionSummary();
        }
        break;
      }

      // ── Developer clicked "Approve & Execute" ──────────────────────────────
      case 'execute': {
        await this._handleExecute();
        break;
      }

      // ── Developer wants to start over (refresh proposal) ───────────────────
      case 'refresh': {
        await this._startReview();
        break;
      }

      // ── Developer resets all dismissals for this workspace ─────────────────
      case 'reset-dismissals': {
        this._planner.resetDismissals();
        await this._startReview();
        break;
      }

      default:
        break;
    }
  }

  /**
   * Executes the approved session atomically.
   *
   * Flow: prepare → execute → post summary.
   * On validation failure: surface warning, do not proceed.
   */
  private async _handleExecute(): Promise<void> {
    if (!this._session) return;

    const decisions = [...this._session.decisions.values()];
    const toRemoveCount = decisions.filter((d) => d === 'remove').length;
    const toDismissCount = decisions.filter((d) => d === 'dismiss').length;

    // A session with only Dismiss decisions (no Remove) is a legitimate,
    // complete outcome of the Review stage — it must still be approvable,
    // not just sessions that also remove something.
    if (toRemoveCount === 0 && toDismissCount === 0) {
      this._post({
        type: 'execute-error',
        payload: { message: 'No assets selected for removal or dismissal.' },
      });
      return;
    }

    // Notify panel we are entering Stage 4
    this._post({ type: 'executing', payload: { total: toRemoveCount } });

    const snapshot = this._planner.getSnapshot();
    const healthScoreBefore = snapshot?.healthScore?.score ?? 100;

    try {
      await this._executor.prepare(this._session);
    } catch (err) {
      const msg = err instanceof CleanupValidationError ? err.message : String(err);
      this._post({ type: 'execute-error', payload: { message: msg } });
      vscode.window.showWarningMessage(`Animoria Cleanup: ${msg}`);
      return;
    }

    try {
      const summary = await this._executor.execute(this._session, healthScoreBefore);

      // Nudge the reactive index to re-converge immediately for the
      // paths this batch just moved into trash, rather than waiting for
      // the filesystem watcher's own debounce window to notice on its
      // own — otherwise the tree view, governance report, and this
      // panel's own next proposal would keep showing an asset that no
      // longer exists at its original path until something else
      // happened to trigger a re-scan.
      for (const path of summary.removedAssetPaths) {
        this._indexer.notifyFileChanged(path, 'deleted');
      }

      this._postSummary(summary);

      vscode.window.setStatusBarMessage(
        `Animoria: Cleaned ${summary.removedAssetPaths.length} asset(s) · ${formatBytes(summary.bytesReclaimed)} reclaimed`,
        8000
      );
    } catch (err) {
      const msg =
        err instanceof CleanupValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      this._post({ type: 'execute-error', payload: { message: msg } });
      vscode.window.showErrorMessage(`Animoria Cleanup failed: ${msg}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _postSelectionSummary(): void {
    if (!this._session) return;
    const decisions = [...this._session.decisions.values()];
    const removeCount = decisions.filter((d: string) => d === 'remove').length;
    const dismissCount = decisions.filter((d: string) => d === 'dismiss').length;
    const removeCandidates = this._session.proposal.candidates.filter(
      (c: CleanupCandidate) => this._session!.decisions.get(c.asset.path) === 'remove'
    );
    const removeBytes = removeCandidates.reduce(
      (s: number, c: CleanupCandidate) => s + c.sizeBytes,
      0
    );

    this._post({
      type: 'selection-updated',
      // A session is actionable if it removes anything OR dismisses
      // anything — a Dismiss-only or Keep-then-Dismiss review is a
      // complete, legitimate outcome of the Review stage, not just one
      // that ends in a removal.
      payload: {
        removeCount,
        dismissCount,
        removeBytesFormatted: formatBytes(removeBytes),
      },
    });
  }

  private _postSummary(summary: CleanupSummary): void {
    this._post({
      type: 'summary-ready',
      payload: {
        removedCount: summary.removedAssetPaths.length,
        bytesReclaimedFormatted: formatBytes(summary.bytesReclaimed),
        healthScoreBefore: summary.healthScoreBefore,
        healthScoreAfter: summary.healthScoreAfter,
        remainingCandidates: summary.remainingCandidates,
        completedAt: summary.completedAt,
      },
    });
  }

  private _post(message: { type: string; payload?: unknown }): void {
    void this._panel.webview.postMessage(message);
  }

  private _serializeProposal(proposal: CleanupProposal) {
    return {
      candidateCount: proposal.candidates.length,
      totalSizeBytesFormatted: formatBytes(proposal.totalSizeBytes),
      affectedReferencesCount: proposal.affectedReferencesCount,
      affectedFolders: proposal.affectedFolders,
      estimatedHealthScoreDelta: proposal.estimatedHealthScoreDelta,
      estimatedExecutionTime:
        proposal.estimatedExecutionMs < 1000
          ? `< ${Math.ceil(proposal.estimatedExecutionMs / 100) * 100}ms`
          : `~${(proposal.estimatedExecutionMs / 1000).toFixed(1)}s`,
      generatedAt: proposal.generatedAt,
      candidates: proposal.candidates.map((c: CleanupCandidate) => this._serializeCandidate(c)),
    };
  }

  private _serializeCandidate(c: CleanupCandidate) {
    return {
      assetPath: c.asset.path,
      assetName: c.asset.name,
      assetStem: c.asset.stem,
      assetFormat: c.asset.format,
      sizeFormatted: formatBytes(c.sizeBytes),
      reasons: c.reasons,
      confidence: c.confidence,
      // Referenced candidates can never actually be removed (see
      // CleanupExecutor's safety invariants) — the panel needs the full
      // list, not just the count, to show the developer exactly why.
      affectedReferences: c.affectedReferences.map((ref) => ({
        file: ref.file,
        line: ref.line,
        content: ref.content,
      })),
      thumbnailPath: c.asset.thumbnailPath ?? null,
    };
  }

  // ── HTML content ───────────────────────────────────────────────────────────

  private _getLoadingHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Animoria — Cleanup Review</title>
  <style>
    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      display: flex; align-items: center; justify-content: center;
      height: 100vh; margin: 0;
      font-size: 13px;
    }
    .loading { text-align: center; opacity: 0.7; }
    .spinner {
      width: 24px; height: 24px; margin: 0 auto 12px;
      border: 2px solid var(--vscode-progressBar-background, #007acc);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    Analyzing workspace...
  </div>
</body>
</html>`;
  }

  private _getReviewHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src vscode-resource: data:; script-src 'unsafe-inline';">
  <title>Animoria — Cleanup Review</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: 13px; line-height: 1.5;
      overflow-x: hidden;
    }

    /* ── Page layout ── */
    .page { display: none; flex-direction: column; min-height: 100vh; }
    .page.active { display: flex; }
    .page-header {
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--vscode-panel-border, #3e3e42);
      position: sticky; top: 0; z-index: 10;
      background: var(--vscode-editor-background);
    }
    .page-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .page-subtitle { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .page-body { flex: 1; padding: 16px 20px; overflow-y: auto; }
    .page-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--vscode-panel-border, #3e3e42);
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    }

    /* ── Buttons ── */
    .btn {
      padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer;
      font-size: 12px; font-weight: 500;
      background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
      transition: opacity 0.15s;
      white-space: nowrap;
    }
    .btn:hover { opacity: 0.85; }
    .btn.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn.danger {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-spacer { flex: 1; }

    /* ── Metric cards (Stage 1) ── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px; margin-bottom: 16px;
    }
    .metric-card {
      padding: 12px 14px;
      background: var(--vscode-input-background);
      border-radius: 8px; border: 1px solid var(--vscode-widget-border, transparent);
    }
    .metric-label {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground); margin-bottom: 6px;
    }
    .metric-value { font-size: 20px; font-weight: 700; }
    .metric-sub { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
    .metric-delta { color: var(--vscode-charts-green, #89d185); }

    /* ── Health score display ── */
    .health-row {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px;
      background: var(--vscode-input-background);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .health-score {
      font-size: 28px; font-weight: 700;
      min-width: 44px; text-align: center;
    }
    .health-arrow { font-size: 18px; color: var(--vscode-descriptionForeground); }
    .health-after { color: var(--vscode-charts-green, #89d185); }
    .health-label { font-size: 11px; color: var(--vscode-descriptionForeground); }

    /* ── Candidate cards (Stage 2) ── */
    .candidates-toolbar {
      display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;
    }
    .candidates-count { font-size: 12px; color: var(--vscode-descriptionForeground); flex: 1; }
    .candidates-list { display: flex; flex-direction: column; gap: 8px; }
    .candidate-card {
      padding: 12px 14px;
      background: var(--vscode-input-background);
      border-radius: 8px;
      border: 1px solid transparent;
      transition: border-color 0.15s;
      display: grid; grid-template-columns: 48px 1fr auto; gap: 12px; align-items: start;
    }
    .candidate-card.selected { border-color: var(--vscode-focusBorder, #007acc); }
    .candidate-card.dismissed { opacity: 0.45; }
    .candidate-thumb {
      width: 48px; height: 48px; border-radius: 6px;
      background: var(--vscode-editor-background);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .candidate-thumb-format {
      font-size: 9px; font-weight: 600; letter-spacing: 0.02em;
      color: var(--vscode-descriptionForeground);
    }
    .candidate-thumb img { width: 100%; height: 100%; object-fit: contain; }
    .candidate-meta { min-width: 0; }
    .candidate-name {
      font-weight: 600; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px;
    }
    .candidate-path {
      font-size: 10px; color: var(--vscode-descriptionForeground);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-bottom: 6px;
    }
    .candidate-badges { display: flex; gap: 4px; flex-wrap: wrap; }
    .badge {
      font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase; padding: 1px 6px; border-radius: 3px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .badge.orphaned { background: var(--vscode-charts-orange, #d18616); color: #fff; }
    .badge.oversized { background: var(--vscode-charts-red, #f48771); color: #fff; }
    .badge.high { background: var(--vscode-charts-green, #89d185); color: #000; }
    .badge.medium { background: var(--vscode-charts-yellow, #cca700); color: #000; }
    .badge.low { background: var(--vscode-descriptionForeground); color: #fff; }
    .candidate-size { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .candidate-references {
      margin-top: 6px; padding: 6px 8px; border-radius: 4px;
      background: var(--vscode-inputValidation-warningBackground, #352a05);
      border: 1px solid var(--vscode-inputValidation-warningBorder, #7a6400);
    }
    .candidate-references-warning {
      font-size: 11px; font-weight: 600;
      color: var(--vscode-inputValidation-warningForeground, #e2c08d);
      margin-bottom: 4px;
    }
    .candidate-reference-row {
      display: flex; gap: 8px; font-size: 11px; padding: 2px 0;
      color: var(--vscode-descriptionForeground);
    }
    .reference-file { font-family: var(--vscode-editor-font-family, monospace); flex-shrink: 0; }
    .reference-content { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.8; }
    .candidate-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .action-btn {
      padding: 4px 10px; border: 1px solid var(--vscode-widget-border, #3e3e42);
      border-radius: 4px; cursor: pointer; font-size: 11px;
      background: transparent; color: var(--vscode-editor-foreground);
      transition: background 0.1s, border-color 0.1s; white-space: nowrap;
    }
    .action-btn:hover { background: var(--vscode-list-hoverBackground); }
    .action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .action-btn:disabled:hover { background: transparent; }
    .action-btn.active-remove {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }
    .action-btn.active-keep {
      background: var(--vscode-button-secondaryBackground);
      border-color: var(--vscode-focusBorder, #007acc);
    }
    .action-btn.active-dismiss { opacity: 0.6; }

    /* ── Approve stage (Stage 3) ── */
    .approve-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .approve-item {
      padding: 8px 12px;
      background: var(--vscode-input-background);
      border-radius: 6px; display: flex; justify-content: space-between; align-items: center;
    }
    .approve-name { font-weight: 500; }
    .approve-size { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .approve-total {
      padding: 10px 12px;
      border-top: 1px solid var(--vscode-panel-border, #3e3e42);
      font-weight: 600; font-size: 13px;
    }

    /* ── Execute progress (Stage 4) ── */
    .progress-wrap { text-align: center; padding: 32px 20px; }
    .progress-bar-outer {
      height: 6px; border-radius: 3px;
      background: var(--vscode-input-background);
      overflow: hidden; margin: 16px 0;
    }
    .progress-bar-inner {
      height: 100%; border-radius: 3px;
      background: var(--vscode-progressBar-background, #007acc);
      width: 0%; transition: width 0.3s;
    }
    .progress-label { font-size: 12px; color: var(--vscode-descriptionForeground); }

    /* ── Summary (Stage 5) ── */
    .summary-hero {
      text-align: center; padding: 24px 16px; margin-bottom: 16px;
    }
    .summary-icon { font-size: 40px; margin-bottom: 8px; color: var(--vscode-terminal-ansiGreen, #89d185); }
    .summary-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .summary-sub { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .summary-stats { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .stat-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
    }
    .stat-label { color: var(--vscode-descriptionForeground); }
    .stat-value { font-weight: 600; }
    .health-improvement {
      padding: 14px 16px;
      background: var(--vscode-input-background);
      border-radius: 8px; text-align: center; margin-bottom: 16px;
    }
    .hi-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
    .hi-scores { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .hi-before { font-size: 28px; font-weight: 700; opacity: 0.5; }
    .hi-after { font-size: 36px; font-weight: 800; color: var(--vscode-charts-green, #89d185); }

    /* ── Empty state ── */
    .empty-state {
      text-align: center; padding: 48px 24px;
      color: var(--vscode-descriptionForeground);
    }
    .empty-icon { color: var(--vscode-charts-green, #89d185); margin-bottom: 12px; }
    .empty-icon svg { width: 32px; height: 32px; }
    .empty-title { font-size: 16px; font-weight: 600; color: var(--vscode-editor-foreground); margin-bottom: 6px; }

    /* ── Error notice ── */
    .error-notice {
      padding: 10px 14px;
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      border-radius: 6px;
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      font-size: 12px; margin-bottom: 12px;
      display: none;
    }
    .error-notice.visible { display: block; }

    /* ── Spinner ── */
    .spinner-inline {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid currentColor; border-top-color: transparent;
      border-radius: 50%; animation: spin 0.8s linear infinite;
      vertical-align: middle; margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Folders list ── */
    .folders-list {
      font-size: 11px; color: var(--vscode-descriptionForeground);
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
    }
    .folder-chip {
      padding: 2px 8px; border-radius: 3px;
      background: var(--vscode-input-background);
      font-family: var(--vscode-editor-font-family, monospace);
    }
  </style>
</head>
<body>

<!-- ──────────────────────────────── STAGE 1: PROPOSAL SUMMARY ────────────── -->
<div class="page active" id="stage-proposal">
  <div class="page-header">
    <div class="page-title">Cleanup Review</div>
    <div class="page-subtitle">Analyze · Review · Understand · Approve · Execute · Summarize</div>
  </div>
  <div class="page-body" id="proposal-body">
    <div style="text-align:center; padding: 48px; color: var(--vscode-descriptionForeground);">
      <div class="spinner-inline"></div> Analyzing workspace...
    </div>
  </div>
  <div class="page-footer">
    <button class="btn" id="btn-p-refresh" title="Re-analyze workspace">↺ Refresh</button>
    <div class="btn-spacer"></div>
    <button class="btn primary" id="btn-p-review" disabled>Review Candidates →</button>
  </div>
</div>

<!-- ──────────────────────────────── STAGE 2: CANDIDATE REVIEW ─────────────── -->
<div class="page" id="stage-review">
  <div class="page-header">
    <div class="page-title">Candidate Review</div>
    <div class="page-subtitle" id="review-subtitle">Review each asset and decide what to do.</div>
  </div>
  <div class="page-body">
    <div class="error-notice" id="review-error"></div>
    <div class="candidates-toolbar">
      <span class="candidates-count" id="review-count"></span>
      <button class="btn" id="btn-select-all">Select All</button>
      <button class="btn" id="btn-deselect-all">Deselect All</button>
    </div>
    <div class="candidates-list" id="candidates-list"></div>
  </div>
  <div class="page-footer">
    <button class="btn" id="btn-r-back">← Proposal</button>
    <div class="btn-spacer"></div>
    <span id="review-selection-label" style="font-size:12px; color:var(--vscode-descriptionForeground);"></span>
    <button class="btn primary" id="btn-r-approve" disabled>Approve Selection →</button>
  </div>
</div>

<!-- ──────────────────────────────── STAGE 3: APPROVE ─────────────────────── -->
<div class="page" id="stage-approve">
  <div class="page-header">
    <div class="page-title">Approve Cleanup</div>
    <div class="page-subtitle">Review your final selection before execution.</div>
  </div>
  <div class="page-body">
    <div class="approve-list" id="approve-list"></div>
    <div class="approve-total" id="approve-total"></div>
  </div>
  <div class="page-footer">
    <button class="btn" id="btn-a-back">← Back to Review</button>
    <div class="btn-spacer"></div>
    <button class="btn danger" id="btn-a-execute">Execute Cleanup</button>
  </div>
</div>

<!-- ──────────────────────────────── STAGE 4: EXECUTE ─────────────────────── -->
<div class="page" id="stage-execute">
  <div class="page-header">
    <div class="page-title">Executing Cleanup</div>
    <div class="page-subtitle">Removing selected assets…</div>
  </div>
  <div class="page-body">
    <div class="progress-wrap">
      <div class="progress-label" id="exec-label">Preparing…</div>
      <div class="progress-bar-outer">
        <div class="progress-bar-inner" id="exec-bar"></div>
      </div>
      <div style="font-size:12px; color:var(--vscode-descriptionForeground);" id="exec-sub"></div>
    </div>
  </div>
  <div class="page-footer"></div>
</div>

<!-- ──────────────────────────────── STAGE 5: SUMMARY ─────────────────────── -->
<div class="page" id="stage-summary">
  <div class="page-header">
    <div class="page-title">Cleanup Complete</div>
    <div class="page-subtitle">Your project is cleaner now.</div>
  </div>
  <div class="page-body">
    <div class="summary-hero">
      <div class="summary-icon">✓</div>
      <div class="summary-title" id="summary-title">Cleanup complete</div>
      <div class="summary-sub" id="summary-sub"></div>
    </div>
    <div class="health-improvement">
      <div class="hi-label">Health Score</div>
      <div class="hi-scores">
        <div class="hi-before" id="sum-score-before"></div>
        <div style="font-size:18px; color:var(--vscode-descriptionForeground);">→</div>
        <div class="hi-after" id="sum-score-after"></div>
      </div>
    </div>
    <div class="summary-stats" id="summary-stats"></div>
  </div>
  <div class="page-footer">
    <button class="btn primary" id="btn-s-new">Review More Opportunities</button>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();

  // ── State ──────────────────────────────────────────────────────────────────
  let proposal = null;
  let currentHealthScore = 100;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
  }

  function reasonLabel(r) {
    const map = {
      orphaned: 'Orphaned', oversized: 'Oversized',
      'forbidden-format': 'Format', duplicate: 'Duplicate',
      generated: 'Generated', temporary: 'Temporary',
    };
    return map[r] || r;
  }

  // ── Message handler ────────────────────────────────────────────────────────
  window.addEventListener('message', event => {
    const { type, payload } = event.data;

    if (type === 'proposal-ready') {
      proposal = payload.proposal;
      currentHealthScore = payload.currentHealthScore;
      renderProposalSummary();
    }

    if (type === 'selection-updated') {
      const { removeCount, dismissCount, removeBytesFormatted } = payload;
      const label = document.getElementById('review-selection-label');
      if (label) label.textContent = removeCount > 0 ? \`\${removeCount} selected · \${removeBytesFormatted}\` : '';
      const btn = document.getElementById('btn-r-approve');
      if (btn) btn.disabled = removeCount === 0 && dismissCount === 0;
      updateCandidateCount();
    }

    if (type === 'executing') {
      showPage('stage-execute');
      document.getElementById('exec-label').textContent = \`Removing \${payload.total} asset(s)…\`;
      animateProgress();
    }

    if (type === 'execute-error') {
      showPage('stage-review');
      const el = document.getElementById('review-error');
      el.textContent = payload.message;
      el.classList.add('visible');
    }

    if (type === 'summary-ready') {
      renderSummary(payload);
    }
  });

  // ── Stage 1: Proposal ──────────────────────────────────────────────────────
  function renderProposalSummary() {
    if (!proposal) return;

    if (proposal.candidateCount === 0) {
      document.getElementById('proposal-body').innerHTML = \`
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Z" stroke="currentColor" stroke-width="1.2"/>
              <path d="M5 8.2 7.1 10.3 11.2 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="empty-title">No cleanup candidates</div>
          <p>Every asset in this workspace is referenced, within size limits, and in an allowed format.</p>
          <br/>
          <button class="btn" onclick="vscode.postMessage({type:'reset-dismissals'})">
            Show Previously Dismissed Assets
          </button>
        </div>\`;
      document.getElementById('btn-p-review').disabled = true;
      return;
    }

    const p = proposal;
    const scoreAfter = Math.min(100, currentHealthScore + (p.estimatedHealthScoreDelta || 0));

    const foldersHtml = p.affectedFolders.length
      ? p.affectedFolders.slice(0, 6).map(f => \`<span class="folder-chip">\${escHtml(f)}</span>\`).join('')
      : '<span class="folder-chip">—</span>';

    document.getElementById('proposal-body').innerHTML = \`
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Assets</div>
          <div class="metric-value">\${p.candidateCount}</div>
          <div class="metric-sub">cleanup candidates</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Storage</div>
          <div class="metric-value">\${p.totalSizeBytesFormatted}</div>
          <div class="metric-sub">could be reclaimed</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">References</div>
          <div class="metric-value">\${p.affectedReferencesCount}</div>
          <div class="metric-sub">code references</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Est. Time</div>
          <div class="metric-value" style="font-size:14px;">\${p.estimatedExecutionTime}</div>
          <div class="metric-sub">execution</div>
        </div>
      </div>

      <div class="health-row">
        <div>
          <div class="health-label">Health Score</div>
          <div style="font-size:11px; color:var(--vscode-descriptionForeground);">After this cleanup</div>
        </div>
        <div class="health-score">\${currentHealthScore}</div>
        <div class="health-arrow">→</div>
        <div class="health-score health-after">\${scoreAfter}</div>
        <div>
          <span class="metric-delta" style="font-size:13px; font-weight:700;">+\${p.estimatedHealthScoreDelta}</span>
        </div>
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-size:11px; color:var(--vscode-descriptionForeground); margin-bottom:4px;">Affected folders</div>
        <div class="folders-list">\${foldersHtml}</div>
      </div>
    \`;

    document.getElementById('btn-p-review').disabled = false;
    buildCandidateCards();
  }

  // ── Stage 2: Candidate Review ──────────────────────────────────────────────
  function buildCandidateCards() {
    if (!proposal) return;
    const list = document.getElementById('candidates-list');
    list.innerHTML = '';
    proposal.candidates.forEach(c => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.id = \`card-\${btoa(c.assetPath).replace(/[+/=]/g, '_')}\`;
      card.dataset.path = c.assetPath;

      const thumbHtml = c.thumbnailPath
        ? \`<img src="\${escHtml(c.thumbnailPath)}" alt="thumb" />\`
        : \`<span class="candidate-thumb-format">\${formatLabel(c.assetFormat)}</span>\`;

      const badgesHtml = [
        ...c.reasons.map(r => \`<span class="badge \${r}">\${reasonLabel(r)}</span>\`),
        \`<span class="badge \${c.confidence}">\${c.confidence} confidence</span>\`,
      ].join('');

      // Referenced candidates can never actually be removed by this workflow
      // (CleanupExecutor refuses regardless of the decision made here) — show
      // exactly what would break instead of a bare count, and disable the
      // "Remove" action rather than let the developer hit a rejection later.
      const isReferenced = c.confidence !== 'high' && c.affectedReferences.length > 0;
      const referencesHtml = isReferenced
        ? \`<div class="candidate-references">
            <div class="candidate-references-warning">
              ⚠ Referenced in \${c.affectedReferences.length} place(s) — cannot be removed by Bulk Cleanup
            </div>
            \${c.affectedReferences.map(ref => \`
              <div class="candidate-reference-row">
                <span class="reference-file">\${escHtml(ref.file)}:\${ref.line}</span>
                <span class="reference-content">\${escHtml(ref.content)}</span>
              </div>
            \`).join('')}
          </div>\`
        : '';

      card.innerHTML = \`
        <div class="candidate-thumb">\${thumbHtml}</div>
        <div class="candidate-meta">
          <div class="candidate-name" title="\${escHtml(c.assetPath)}">\${escHtml(c.assetStem)}</div>
          <div class="candidate-path">\${escHtml(c.assetPath)}</div>
          <div class="candidate-badges">\${badgesHtml}</div>
          <div class="candidate-size">\${c.sizeFormatted}</div>
          \${referencesHtml}
        </div>
        <div class="candidate-actions">
          <button class="action-btn" data-path="\${escHtml(c.assetPath)}" data-action="remove"\${isReferenced ? ' disabled title="Referenced in source — cannot be removed by Bulk Cleanup"' : ''}>Remove</button>
          <button class="action-btn active-keep" data-path="\${escHtml(c.assetPath)}" data-action="keep">Keep</button>
          <button class="action-btn" data-path="\${escHtml(c.assetPath)}" data-action="dismiss" title="Never suggest again">Dismiss</button>
        </div>
      \`;
      list.appendChild(card);
    });

    list.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.path;
        const action = btn.dataset.action;
        setDecision(path, action);
        vscode.postMessage({ type: 'set-decision', payload: { assetPath: path, decision: action } });
      });
    });

    updateCandidateCount();
  }

  function setDecision(assetPath, decision) {
    const cardId = \`card-\${btoa(assetPath).replace(/[+/=]/g, '_')}\`;
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.remove('selected', 'dismissed');
    if (decision === 'remove') card.classList.add('selected');
    if (decision === 'dismiss') card.classList.add('dismissed');

    card.querySelectorAll('.action-btn').forEach(b => {
      b.classList.remove('active-remove', 'active-keep', 'active-dismiss');
      if (b.dataset.action === decision) {
        b.classList.add(\`active-\${decision}\`);
      }
    });
  }

  function updateCandidateCount() {
    const el = document.getElementById('review-count');
    if (!proposal || !el) return;
    el.textContent = \`\${proposal.candidateCount} candidate(s)\`;
  }

  function formatLabel(format) {
    const map = { lottie:'JSON', dotlottie:'LOTTIE', rive:'RIVE', gif:'GIF', apng:'APNG', 'animated-svg':'SVG' };
    return map[format] || format.toUpperCase();
  }

  // ── Stage 3: Approve ───────────────────────────────────────────────────────
  function buildApproveList() {
    if (!proposal) return;
    const toRemove = proposal.candidates.filter(c => {
      const card = document.getElementById(\`card-\${btoa(c.assetPath).replace(/[+/=]/g, '_')}\`);
      return card && card.classList.contains('selected');
    });
    const list = document.getElementById('approve-list');
    list.innerHTML = '';
    let totalBytes = 0;
    toRemove.forEach(c => {
      const item = document.createElement('div');
      item.className = 'approve-item';
      item.innerHTML = \`
        <span class="approve-name">\${escHtml(c.assetStem)}</span>
        <span class="approve-size">\${c.sizeFormatted}</span>\`;
      list.appendChild(item);
      const match = proposal.candidates.find(x => x.assetPath === c.assetPath);
      if (match) totalBytes += match.sizeBytes || 0;
    });
    document.getElementById('approve-total').textContent =
      \`\${toRemove.length} asset(s) will be moved to trash · \${formatSize(totalBytes)} recovered\`;
  }

  // ── Stage 4: Execute progress ──────────────────────────────────────────────
  function animateProgress() {
    let width = 0;
    const bar = document.getElementById('exec-bar');
    const interval = setInterval(() => {
      width = Math.min(width + 5, 90); // Stops at 90 — completion comes from host message
      bar.style.width = width + '%';
      if (width >= 90) clearInterval(interval);
    }, 100);
  }

  // ── Stage 5: Summary ───────────────────────────────────────────────────────
  function renderSummary(payload) {
    document.getElementById('exec-bar').style.width = '100%';
    setTimeout(() => {
      showPage('stage-summary');
      document.getElementById('summary-title').textContent =
        payload.removedCount === 0 ? 'Nothing was removed' : \`Removed \${payload.removedCount} asset(s)\`;
      document.getElementById('summary-sub').textContent =
        payload.removedCount > 0 ? payload.bytesReclaimedFormatted + ' reclaimed from your project' : '';
      document.getElementById('sum-score-before').textContent = payload.healthScoreBefore;
      document.getElementById('sum-score-after').textContent = payload.healthScoreAfter;

      const stats = document.getElementById('summary-stats');
      stats.innerHTML = \`
        <div class="stat-row">
          <span class="stat-label">Assets removed</span>
          <span class="stat-value">\${payload.removedCount}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Storage reclaimed</span>
          <span class="stat-value">\${payload.bytesReclaimedFormatted}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Remaining opportunities</span>
          <span class="stat-value">\${payload.remainingCandidates}</span>
        </div>
      \`;
    }, 400);
  }

  // ── Button wiring ──────────────────────────────────────────────────────────
  document.getElementById('btn-p-refresh').addEventListener('click', () =>
    vscode.postMessage({ type: 'refresh' }));

  document.getElementById('btn-p-review').addEventListener('click', () => {
    showPage('stage-review');
    document.getElementById('review-error').classList.remove('visible');
  });

  document.getElementById('btn-select-all').addEventListener('click', () => {
    vscode.postMessage({ type: 'select-all' });
    proposal.candidates.forEach(c => setDecision(c.assetPath, 'remove'));
  });

  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    vscode.postMessage({ type: 'deselect-all' });
    proposal.candidates.forEach(c => setDecision(c.assetPath, 'keep'));
  });

  document.getElementById('btn-r-back').addEventListener('click', () => showPage('stage-proposal'));

  document.getElementById('btn-r-approve').addEventListener('click', () => {
    buildApproveList();
    showPage('stage-approve');
  });

  document.getElementById('btn-a-back').addEventListener('click', () => showPage('stage-review'));

  document.getElementById('btn-a-execute').addEventListener('click', () =>
    vscode.postMessage({ type: 'execute' }));

  document.getElementById('btn-s-new').addEventListener('click', () =>
    vscode.postMessage({ type: 'refresh' }));
</script>
</body>
</html>`;
  }

  private _dispose(): void {
    AnimoriaCleanupPanel.currentPanel = undefined;
    this._panel.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
