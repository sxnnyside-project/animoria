import type {
  AnimoriaAsset,
  MultiRootAnalysis,
  ResolutionPlan,
  RestoreResult,
  SessionManifest,
  UsageReference,
} from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  AnimationPreview,
  GeneratedSnippet,
  HostBridge,
  HostCapabilities,
  RootCleanupPlan,
  RootCleanupProposal,
  UiPreferences,
} from '../bridge/types.js';
import { DEFAULT_PREFERENCES, NO_CAPABILITIES } from '../bridge/types.js';
import type { AnalysisViewModel, RootFilter } from '../view-model/analysis-view-model.js';
import {
  ALL_ROOTS,
  buildAnalysisViewModel,
  formatBytes,
  referenceStateOf,
} from '../view-model/analysis-view-model.js';
import './animoria-asset-card.js';
import './animoria-asset-inspector.js';
import './animoria-cleanup-preview.js';
import './animoria-coverage-summary.js';
import './animoria-duplicate-group.js';
import './animoria-finding.js';
import './animoria-health-summary.js';
import './animoria-root-badge.js';
import './animoria-root-selector.js';
import './animoria-state-panel.js';
import './animoria-trash-panel.js';

/**
 * The root shared surface: everything a host mounts, driven entirely by the bridge.
 *
 * ## What this component is responsible for
 * Holding the last message of each kind, deriving one view model per analysis, and
 * routing component events into `HostOutbound`. It contains no product judgement —
 * every decision it renders arrived on the wire.
 *
 * ## Why it renders state before content
 * The lifecycle gate is the first thing in `render`, not a banner above the content.
 * A `failed` or `initializing` analysis has no content to show, and showing an empty
 * asset grid beneath a small error message is how "we could not scan" came to read
 * as "you have no animated assets" in three clients at once.
 *
 * `stale` and `incomplete` are the exceptions: both have real content worth showing,
 * so they render as a banner *above* it with destructive controls disabled, rather
 * than replacing it. Hiding the workspace because the analysis is a few seconds out
 * of date would be its own kind of dishonesty.
 */
@customElement('animoria-workspace')
export class AnimoriaWorkspace extends LitElement {
  /** The host connection. Set once, before the element is attached. */
  @property({ attribute: false }) bridge: HostBridge | null = null;

  /**
   * Which single product surface this mount renders.
   *
   * ## Why this exists
   * The migration put assets, findings, duplicates, cleanup and trash behind one tab
   * bar in one panel, and the result did none of them well: a preview competing for
   * width with a findings list, a cleanup review one click from an asset grid, and a
   * developer who opened "Resolve Duplicates" landing in a workspace browser.
   *
   * Before Wave 1 each capability had its own focused surface, and that was better.
   * The *implementation* is shared — same components, same bridge, same view model —
   * but a host mounts the surface the developer asked for, in the place that surface
   * belongs. `all` keeps the combined view for the sandbox, where reviewing every
   * screen in one page is the entire point of the harness.
   */
  @property({ type: String }) surface: 'all' | 'inspector' | 'findings' | 'duplicates' | 'cleanup' =
    'all';

  @state() private _analysis: MultiRootAnalysis | null = null;
  /**
   * Which roots are shown. `all` by default — a picker the developer must answer
   * before seeing anything turns "open the panel" into a decision.
   */
  @state() private _rootFilter: RootFilter = ALL_ROOTS;
  @state() private _viewModel: AnalysisViewModel | null = null;
  @state() private _capabilities: HostCapabilities = NO_CAPABILITIES;
  @state() private _progressMessage = '';
  @state() private _error: { message: string; recoverable: boolean } | null = null;

  @state() private _selectedAssetPath = '';
  /** Core's attribution for the selection. Never re-derived from the path here. */
  @state() private _selectedRootId = '';
  @state() private _thumbnails = new Map<string, string | null>();
  @state() private _tab: 'assets' | 'findings' | 'duplicates' | 'cleanup' = 'assets';
  /**
   * Whether the cleanup tab is showing what was removed rather than what could be.
   *
   * Trash was a fifth top-level tab. It is not a peer of Assets and Findings — it is
   * the other half of one workflow, and a developer reaches it *after* a cleanup, not
   * instead of one. Five tabs competing for a sidebar's width is the "multi-tab chunk
   * that tries to cover everything" the review named; four with a scoped switch is the
   * same capability at less cost.
   */
  @state() private _cleanupView: 'proposal' | 'trash' = 'proposal';
  @state() private _query = '';

  /**
   * The inspector's preview, and the two states that are not a payload.
   *
   * Keyed implicitly by `_selectedAssetPath`: an `animation-data` message naming a
   * different asset is dropped rather than rendered, because a developer clicking
   * through a list faster than the host answers must never be shown the previous
   * asset's frame under the current asset's name.
   */
  @state() private _preview: AnimationPreview | null = null;
  @state() private _previewLoading = false;
  @state() private _previewError = '';

  /** Host-persisted view preferences. Defaults until the host says otherwise. */
  @state() private _preferences: UiPreferences = DEFAULT_PREFERENCES;

  /** Usages of the current selection. `null` means "not answered yet". */
  @state() private _references: readonly UsageReference[] | null = null;
  @state() private _referencesComplete = false;

  /**
   * Snippets for the current selection.
   *
   * Kept until the developer selects a different asset — a snippet is something read
   * while typing something else, and anything that clears it on the next click makes
   * it useless for its purpose.
   */
  @state() private _snippets: readonly GeneratedSnippet[] = [];

  /**
   * Cleanup candidates the developer has set aside, as the host reports them.
   *
   * Held so a dismissed row can render as dismissed immediately after the host
   * confirms, rather than only after the next proposal is rebuilt.
   */
  @state() private _dismissed = new Set<string>();

  /** `null` until the host answers `request-trash-sessions`; `[]` means empty trash. */
  @state() private _trashSessions: readonly SessionManifest[] | null = null;
  @state() private _restoreResult: RestoreResult | null = null;
  @state() private _restoring = false;

  /** One proposal per root. Never merged: `.animoriarc` is root-scoped. */
  @state() private _proposals: readonly RootCleanupProposal[] = [];
  @state() private _selectedForCleanup = new Set<string>();
  /**
   * One plan per root the selection touched.
   *
   * Kept as a list rather than merged: each is stale-checked against its own root's
   * generation and staged into its own root's trash, and merging them would collapse
   * their refusals into one summary that hides which root refused what.
   */
  @state() private _cleanupPlans: readonly RootCleanupPlan[] = [];
  @state() private _applying = false;

  @state() private _openGroupId = '';
  @state() private _resolutionPlan: ResolutionPlan | null = null;
  @state() private _resolutionPlanId = '';
  @state() private _resolutionRootName = '';

  private _unsubscribe: (() => void) | null = null;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
      color: var(--animoria-text-primary);
      background: var(--animoria-bg-primary);
      overflow: hidden;
    }

    header {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
      flex-shrink: 0;
    }

    nav {
      display: flex;
      gap: var(--animoria-space-1);
    }

    nav button {
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 4px 10px;
      cursor: pointer;
    }

    nav button[aria-selected='true'] {
      background: var(--animoria-bg-selected);
      color: var(--animoria-text-strong);
      border-color: var(--animoria-border);
    }

    .banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border: 1px solid var(--banner-color);
      border-left-width: 3px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-raised);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
    }

    .banner button {
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
      border: none;
      border-radius: var(--animoria-radius-sm);
      padding: 4px 10px;
      font-family: inherit;
      cursor: pointer;
      flex-shrink: 0;
    }

    .search {
      width: 100%;
      box-sizing: border-box;
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-primary);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 5px 8px;
    }

    main {
      flex: 1;
      overflow-y: auto;
      padding: var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--animoria-space-2);
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .cleanup-row {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
    }

    .cleanup-row.blocked {
      opacity: 0.7;
      border-color: var(--animoria-warning);
    }

    .cleanup-row.dismissed {
      opacity: 0.55;
    }

    .dismiss {
      background: transparent;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 2px 8px;
      cursor: pointer;
      flex-shrink: 0;
      margin-left: auto;
      align-self: flex-start;
    }

    .cleanup-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cleanup-name {
      font-weight: 600;
      word-break: break-all;
    }

    .cleanup-meta,
    .blocked-why {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
    }

    .blocked-why {
      color: var(--animoria-warning);
    }

    .plan-block {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      padding-bottom: var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
    }

    .toolbar {
      display: flex;
      gap: var(--animoria-space-2);
      align-items: center;
    }

    .subnav {
      display: flex;
      gap: var(--animoria-space-1);
      border-bottom: 1px solid var(--animoria-border);
      padding-bottom: var(--animoria-space-2);
    }

    .subnav button {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 2px 6px 4px;
      cursor: pointer;
    }

    .subnav button[aria-selected='true'] {
      color: var(--animoria-text-strong);
      border-bottom-color: var(--animoria-accent);
    }

    .toolbar button {
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
      border: none;
      border-radius: var(--animoria-radius-sm);
      padding: 6px 12px;
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      cursor: pointer;
    }

    .toolbar button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .error {
      border: 1px solid var(--animoria-danger);
      background: var(--animoria-danger-quiet);
      border-radius: var(--animoria-radius-sm);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
    }

    .section-title {
      font-size: var(--animoria-font-size-sm);
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `;

  // ── Bridge wiring ───────────────────────────────────────────────────────────

  override connectedCallback(): void {
    super.connectedCallback();
    const bridge = this.bridge;
    if (!bridge) return;

    this._unsubscribe = bridge.subscribe((message) => {
      switch (message.type) {
        case 'capabilities':
          this._capabilities = message.capabilities;
          break;
        case 'preferences':
          this._preferences = message.preferences;
          break;
        case 'snippets':
          if (message.assetPath !== this._selectedAssetPath) break;
          this._snippets = message.snippets;
          break;
        case 'usage-references':
          // Answers for a superseded selection are dropped, for the same reason a
          // late preview is: a developer clicking through a list faster than the host
          // answers must never see one asset's usages under another's name.
          if (message.assetPath !== this._selectedAssetPath) break;
          this._references = message.references;
          this._referencesComplete = message.complete;
          break;
        case 'analysis':
          this._analysis = message.analysis;
          this._viewModel = buildAnalysisViewModel(message.analysis, this._rootFilter);
          this._progressMessage = '';
          this._error = null;
          break;
        case 'roots-changed':
          // A filter naming a root that has been removed would render an empty
          // workspace, which is indistinguishable from one with no assets. Reset to
          // the aggregate rather than showing a screen that lies.
          if (
            this._rootFilter.kind === 'root' &&
            !message.roots.some(
              (root) => root.id === (this._rootFilter as { rootId: string }).rootId
            )
          ) {
            this._rootFilter = ALL_ROOTS;
            if (this._analysis) {
              this._viewModel = buildAnalysisViewModel(this._analysis, this._rootFilter);
            }
          }
          break;
        case 'analysis-progress':
          this._progressMessage = message.message;
          break;
        case 'focus':
          // Contextual routing. The host knows which asset or group the developer
          // acted on; arriving on a generic tab and making them find it again is the
          // regression this message exists to close.
          this._tab = message.tab;
          if (message.assetPath) this._selectAsset(message.assetPath, message.rootId);
          if (message.groupId) {
            this._openGroupId = message.groupId;
            this._resolutionPlan = null;
            this._resolutionPlanId = '';
          }
          break;
        case 'thumbnail':
          this._thumbnails = new Map(this._thumbnails).set(message.assetPath, message.source);
          break;
        case 'animation-data':
          // Late answers for a superseded selection are discarded, not rendered.
          if (message.assetPath !== this._selectedAssetPath) break;
          this._previewLoading = false;
          this._preview = message.preview;
          this._previewError = message.error ?? '';
          break;
        case 'trash-sessions':
          this._trashSessions = message.sessions;
          break;
        case 'restore-result':
          this._restoring = false;
          this._restoreResult = message.result;
          // The listing is now out of date — the session it named is gone. Re-asked
          // rather than mutated here, so what is shown is always the host's answer.
          this._send({ type: 'request-trash-sessions' });
          break;
        case 'cleanup-proposal':
          this._proposals = message.roots;
          break;
        case 'cleanup-plan':
          this._cleanupPlans = message.plans;
          break;
        case 'cleanup-result':
          this._applying = false;
          this._cleanupPlans = [];
          this._selectedForCleanup = new Set();
          // A `rejected` result with no reason is a deliberate refusal the developer
          // already made — the native confirmation they dismissed. Announcing that
          // back to them as an error is noise; the important part is that the
          // operation is *settled*, which is what releases the controls above.
          if (message.result.status !== 'applied' && message.result.reason) {
            this._error = { message: message.result.reason, recoverable: true };
          }
          break;
        case 'resolution-plan':
          this._resolutionPlan = message.plan;
          this._resolutionPlanId = message.planId;
          this._resolutionRootName = message.rootName;
          break;
        case 'resolution-result':
          this._applying = false;
          this._resolutionPlan = null;
          this._resolutionPlanId = '';
          if (message.status !== 'applied' && message.reason) {
            this._error = { message: message.reason, recoverable: true };
          }
          break;
        case 'error':
          this._error = { message: message.message, recoverable: message.recoverable };
          // Every in-flight operation is released. An error is the host saying it is
          // no longer working on anything, and leaving `_applying` set would disable
          // the very controls the developer needs to retry — which is how a refused
          // message came to look like a frozen panel.
          this._applying = false;
          this._restoring = false;
          this._previewLoading = false;
          break;
        default:
          break;
      }
    });

    bridge.send({ type: 'ready' });
  }

  override disconnectedCallback(): void {
    this._unsubscribe?.();
    this._unsubscribe = null;
    super.disconnectedCallback();
  }

  // ── Intent ──────────────────────────────────────────────────────────────────

  private _send(message: Parameters<HostBridge['send']>[0]): void {
    this.bridge?.send(message);
  }

  /**
   * Selects an asset and asks the host for everything the inspector needs.
   *
   * Selection no longer implies opening the file. It used to: clicking a card sent
   * `open-asset`, so browsing a gallery of twenty assets opened twenty editor tabs,
   * and there was no way to *look* at an asset without navigating away from the list.
   * Opening is now an explicit action in the inspector.
   */
  private _selectAsset(assetPath: string, rootId: string): void {
    if (this._selectedAssetPath === assetPath) return;
    this._selectedAssetPath = assetPath;
    this._selectedRootId = rootId;

    this._preview = null;
    this._previewError = '';
    this._previewLoading = true;
    this._references = null;
    this._referencesComplete = false;
    this._snippets = [];
    this._send({ type: 'request-animation-data', assetPath });
    this._send({ type: 'request-usage-references', assetPath });

    if (!this._thumbnails.has(assetPath)) {
      this._send({ type: 'request-thumbnail', assetPath });
    }
  }

  /** Re-derives the view model against a new filter. The analysis is unchanged. */
  private _setRootFilter(filter: RootFilter): void {
    this._rootFilter = filter;
    if (this._analysis) {
      this._viewModel = buildAnalysisViewModel(this._analysis, filter);
    }
    // A plan built from a selection made under a different filter would list assets
    // the developer can no longer see. Cleared rather than silently kept.
    this._cleanupPlans = [];
  }

  private _toggleCleanupSelection(assetPath: string): void {
    const next = new Set(this._selectedForCleanup);
    if (next.has(assetPath)) next.delete(assetPath);
    else next.add(assetPath);
    this._selectedForCleanup = next;
    this._cleanupPlans = [];
  }

  private _requestPlan(): void {
    this._send({
      type: 'request-cleanup-plan',
      assetPaths: [...this._selectedForCleanup],
    });
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private _renderLifecycleGate(model: AnalysisViewModel) {
    const state = model.lifecycle.state;

    // States with nothing behind them replace the content entirely.
    if (state === 'initializing' || state === 'analyzing' || state === 'failed') {
      return html`<animoria-state-panel
        .state=${state}
        .summary=${this._progressMessage || model.lifecycle.summary}
        .actionLabel=${state === 'failed' ? 'Try again' : ''}
        @state-action=${() => this._send({ type: 'run-analysis' })}
      ></animoria-state-panel>`;
    }

    if (model.isEmpty) {
      return html`<animoria-state-panel
        state="empty"
        summary="Animoria scanned this workspace and found no Lottie, Rive, GIF, APNG or animated SVG files."
      ></animoria-state-panel>`;
    }

    return null;
  }

  private _renderBanner(model: AnalysisViewModel) {
    const state = model.lifecycle.state;
    if (state !== 'stale' && state !== 'incomplete') return nothing;

    const color =
      state === 'stale' ? 'var(--animoria-state-stale)' : 'var(--animoria-state-incomplete)';

    return html`
      <div class="banner" style="--banner-color: ${color}" role="status">
        <span>${model.lifecycle.summary}</span>
        ${
          state === 'stale'
            ? html`<button type="button" @click=${() => this._send({ type: 'run-analysis' })}>
              Refresh
            </button>`
            : nothing
        }
      </div>
    `;
  }

  private _renderAssets(model: AnalysisViewModel) {
    const query = this._query.trim().toLowerCase();
    const assets = query
      ? model.assets.filter(
          (entry) =>
            entry.asset.stem.toLowerCase().includes(query) ||
            entry.asset.format.toLowerCase().includes(query)
        )
      : model.assets;

    if (assets.length === 0) {
      return html`<animoria-state-panel
        state="empty"
        summary=${`No asset matches "${this._query}".`}
      ></animoria-state-panel>`;
    }

    const selected = assets.find((entry) => entry.asset.path === this._selectedAssetPath);

    return html`
      ${selected ? this._renderInspector(model, selected.asset, selected.rootId, selected.rootName) : nothing}
      <div class="grid">
        ${assets.map(
          (entry) => html`
            <animoria-asset-card
              .asset=${entry.asset}
              .diagnostics=${model.diagnosticsByAssetPath.get(entry.asset.path) ?? []}
              .thumbnailSource=${this._thumbnails.get(entry.asset.path) ?? null}
              .referenceCount=${model.referenceCounts.get(entry.asset.path) ?? 0}
              .referenceState=${referenceStateOf(model)}
              .selected=${entry.asset.path === this._selectedAssetPath}
              .rootId=${entry.rootId}
              .rootName=${entry.rootName}
              .hideRoot=${model.isSingleRoot}
              @select-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
                this._selectAsset(e.detail.assetPath, e.detail.rootId)}
            ></animoria-asset-card>
          `
        )}
      </div>
    `;
  }

  /**
   * The inspector for the current selection.
   *
   * Rendered above the grid rather than in a second panel: the shared UI mounts into
   * a sidebar in one host and a tool window in another, and a fixed side pane is a
   * layout decision neither can honour. Every action it offers is gated on the
   * capability the host declared, and renders disabled with the host's own reason.
   */
  private _renderInspector(
    model: AnalysisViewModel,
    asset: AnimoriaAsset,
    rootId: string,
    rootName: string
  ) {
    return html`
      <animoria-asset-inspector
        .asset=${asset}
        .capabilities=${this._capabilities}
        .rootId=${rootId}
        .rootName=${rootName}
        .hideRoot=${model.isSingleRoot}
        .referenceCount=${model.referenceCounts.get(asset.path) ?? 0}
        .referenceState=${referenceStateOf(model)}
        .findingCount=${(model.diagnosticsByAssetPath.get(asset.path) ?? []).length}
        .preview=${this._preview}
        .previewLoading=${this._previewLoading}
        .previewError=${this._previewError}
        .preferences=${this._preferences}
        .references=${this._references}
        .referencesComplete=${this._referencesComplete}
        .snippets=${this._snippets}
        @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
          this._send({ type: 'open-asset', ...e.detail })}
        @reveal-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
          this._send({ type: 'reveal-asset', ...e.detail })}
        @copy-to-clipboard=${(e: CustomEvent<{ text: string; label: string }>) =>
          this._send({ type: 'copy-to-clipboard', ...e.detail })}
        @generate-snippet=${(e: CustomEvent<{ assetPath: string }>) =>
          this._send({ type: 'generate-snippet', ...e.detail })}
        @open-reference=${(e: CustomEvent<{ file: string; line: number; rootId: string }>) =>
          this._send({ type: 'open-reference', ...e.detail })}
        @save-preferences=${(e: CustomEvent<{ preferences: UiPreferences }>) =>
          this._send({ type: 'save-preferences', ...e.detail })}
      ></animoria-asset-inspector>
    `;
  }

  /**
   * The cleanup tab: what can be removed, and what already was.
   *
   * One switch rather than two tabs, because they are two views of one decision.
   */
  private _renderCleanupTab(model: AnalysisViewModel) {
    return html`
      <div class="subnav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected=${this._cleanupView === 'proposal'}
          @click=${() => {
            this._cleanupView = 'proposal';
          }}
        >
          Removable
        </button>
        <button
          type="button"
          role="tab"
          aria-selected=${this._cleanupView === 'trash'}
          @click=${() => {
            this._cleanupView = 'trash';
            if (this._trashSessions === null) this._send({ type: 'request-trash-sessions' });
          }}
        >
          Trash
        </button>
      </div>
      ${this._cleanupView === 'proposal' ? this._renderCleanup(model) : this._renderTrash()}
    `;
  }

  private _renderTrash() {
    return html`
      <animoria-trash-panel
        .sessions=${this._trashSessions}
        .result=${this._restoreResult}
        .canRestore=${this._capabilities.canRestore}
        .restoreUnavailableReason=${this._capabilities.mutationUnavailableReason ?? ''}
        .restoring=${this._restoring}
        @request-trash-sessions=${() => this._send({ type: 'request-trash-sessions' })}
        @restore-session=${(e: CustomEvent<{ sessionId: string }>) => {
          this._restoring = true;
          this._restoreResult = null;
          this._send({ type: 'restore-session', ...e.detail });
        }}
      ></animoria-trash-panel>
    `;
  }

  private _renderFindings(model: AnalysisViewModel) {
    if (model.findingCount === 0) {
      return html`<animoria-state-panel
        state="empty"
        summary="No governance findings. Every rule that ran found nothing to report."
      ></animoria-state-panel>`;
    }

    return html`
      ${
        model.coverage
          ? html`<animoria-coverage-summary .coverage=${model.coverage}></animoria-coverage-summary>`
          : nothing
      }
      ${model.sections.map(
        (section) => html`
          <div class="section-title">${section.label} — ${section.diagnostics.length}</div>
          <div class="list">
            ${section.diagnostics.map(
              (entry) => html`
                <animoria-finding
                  compact
                  .diagnostic=${entry.diagnostic}
                  .rootId=${entry.rootId}
                  .rootName=${entry.rootName}
                  .hideRoot=${model.isSingleRoot}
                  .selected=${entry.diagnostic.asset.path === this._selectedAssetPath}
                  @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
                    this._selectAsset(e.detail.assetPath, e.detail.rootId)}
                  @open-reference=${(
                    e: CustomEvent<{ file: string; line: number; rootId: string }>
                  ) => this._send({ type: 'open-reference', ...e.detail })}
                ></animoria-finding>
              `
            )}
          </div>
        `
      )}
    `;
  }

  private _renderDuplicates(model: AnalysisViewModel) {
    if (model.duplicateGroups.length === 0) {
      // Hashing runs in the background pass, so an analysis can be `ready` for the
      // asset list and still have no duplicate answer. Reporting that as "no
      // duplicates" is how a workspace with two byte-identical files came to show
      // zero — the panel was reading a fast analysis and calling it a result.
      const settled = model.analysis.readiness?.duplicatesResolved === true;
      return html`<animoria-state-panel
        state=${settled ? 'empty' : 'analyzing'}
        summary=${
          settled
            ? 'No byte-identical assets in this workspace. Animoria compared the content of every asset it indexed.'
            : 'Animoria is still comparing asset content. Duplicate groups appear here as soon as hashing finishes.'
        }
      ></animoria-state-panel>`;
    }

    return html`
      <div class="list">
        ${model.duplicateGroups.map(
          (group) => html`
            <animoria-duplicate-group
              .group=${group}
              .plan=${this._openGroupId === group.id ? this._resolutionPlan : null}
              .planId=${this._openGroupId === group.id ? this._resolutionPlanId : ''}
              .planRootName=${this._openGroupId === group.id ? this._resolutionRootName : ''}
              .rootNameByAssetPath=${this._rootNamesFor(model, group)}
              .crossRoot=${model.crossRootGroupIds.has(group.id)}
              .hideRoot=${model.isSingleRoot}
              .canMutate=${this._capabilities.canMutate && model.allowsDestructiveActions}
              .mutationUnavailableReason=${this._destructiveReason(model)}
              .applying=${this._applying}
              @request-resolution-plan=${(
                e: CustomEvent<{ groupId: string; keepPath: string }>
              ) => {
                this._openGroupId = e.detail.groupId;
                this._resolutionPlan = null;
                this._send({ type: 'request-resolution-plan', ...e.detail });
              }}
              @apply-resolution-plan=${(
                e: CustomEvent<{ planId: string; allowPartial: boolean }>
              ) => {
                this._applying = true;
                this._send({ type: 'apply-resolution-plan', ...e.detail });
              }}
            ></animoria-duplicate-group>
          `
        )}
      </div>
    `;
  }

  /**
   * Why destructive controls are disabled, when they are.
   *
   * Two independent gates, and the message must say which one applies: a read-only
   * host and an out-of-date analysis both disable the button, and telling the
   * developer the wrong reason sends them to fix the wrong thing.
   */
  private _destructiveReason(model: AnalysisViewModel): string {
    if (!model.allowsDestructiveActions) return model.lifecycle.summary;
    if (!this._capabilities.canMutate) {
      return this._capabilities.mutationUnavailableReason ?? 'This host cannot modify files.';
    }
    return '';
  }

  /**
   * Root names for a duplicate group's candidates, from Core's attribution.
   *
   * Built here rather than in the group component so the component never needs the
   * workspace — it receives a map and renders it. Attribution is read from the
   * analysis, never derived by matching a path against a root list.
   */
  private _rootNamesFor(
    model: AnalysisViewModel,
    group: { candidates: readonly { asset: { path: string } }[] }
  ): ReadonlyMap<string, string> {
    const names = new Map<string, string>();
    const nameById = new Map(model.roots.map((summary) => [summary.root.id, summary.root.name]));

    for (const candidate of group.candidates) {
      const rootId = model.rootIdByAssetPath.get(candidate.asset.path);
      if (rootId) names.set(candidate.asset.path, nameById.get(rootId) ?? '');
    }
    return names;
  }

  private _renderCleanup(model: AnalysisViewModel) {
    // ── Preview ──
    //
    // One preview per root the selection touched. They are never merged: each is
    // stale-checked against its own root's generation and staged into its own root's
    // trash, and one combined operation would collapse their refusals into a summary
    // that hides which root refused what.
    if (this._cleanupPlans.length > 0) {
      return html`
        ${
          this._cleanupPlans.length > 1
            ? html`<div class="banner" style="--banner-color: var(--animoria-info)" role="status">
                <span
                  >This selection spans ${this._cleanupPlans.length} roots. Each root is
                  confirmed and applied separately, so one root failing cannot half-apply
                  another.</span
                >
              </div>`
            : nothing
        }
        <div class="list">
          ${this._cleanupPlans.map(
            (entry) => html`
              <div class="plan-block">
                ${
                  model.isSingleRoot
                    ? nothing
                    : html`<div class="section-title">
                        <animoria-root-badge .rootName=${entry.rootName}></animoria-root-badge>
                      </div>`
                }
                <animoria-cleanup-preview
                  .plan=${entry.plan}
                  .canMutate=${this._capabilities.canMutate && model.allowsDestructiveActions}
                  .mutationUnavailableReason=${this._destructiveReason(model)}
                  .applying=${this._applying}
                  @apply-cleanup-plan=${(
                    e: CustomEvent<{ planId: string; allowPartial: boolean }>
                  ) => {
                    this._applying = true;
                    this._send({ type: 'apply-cleanup-plan', ...e.detail });
                  }}
                  @cancel-cleanup=${() => {
                    this._cleanupPlans = [];
                  }}
                ></animoria-cleanup-preview>
              </div>
            `
          )}
        </div>
      `;
    }

    // ── Proposal ──
    const visible = this._proposals.filter(
      (entry) => model.filter.kind === 'all' || model.filter.rootId === entry.rootId
    );

    if (this._proposals.length === 0) {
      return html`
        <div class="toolbar">
          <button type="button" @click=${() => this._send({ type: 'request-cleanup-proposal' })}>
            Find removable assets
          </button>
        </div>
      `;
    }

    const totalCandidates = visible.reduce(
      (sum, entry) => sum + entry.proposal.candidates.length,
      0
    );
    const totalBytes = visible.reduce((sum, entry) => sum + entry.proposal.totalSizeBytes, 0);

    if (totalCandidates === 0) {
      return html`<animoria-state-panel
        state="empty"
        summary="Nothing is eligible for removal. Every asset is either referenced or passes every rule."
      ></animoria-state-panel>`;
    }

    const selectedCount = this._selectedForCleanup.size;

    return html`
      <div class="toolbar">
        <button type="button" ?disabled=${selectedCount === 0} @click=${() => this._requestPlan()}>
          Preview removal of ${selectedCount}
        </button>
        <span class="cleanup-meta"
          >${totalCandidates} candidate(s) · ${formatBytes(totalBytes)} total</span
        >
      </div>

      ${visible.map(
        (entry) => html`
          ${
            model.isSingleRoot
              ? nothing
              : html`<div class="section-title">
                  ${entry.rootName} — ${entry.proposal.candidates.length}
                </div>`
          }
          <div class="list">
            ${entry.proposal.candidates.map((candidate) => {
              const isDismissed = this._dismissed.has(candidate.asset.path);
              return html`
                <div
                  class="cleanup-row ${candidate.eligibility.eligible ? '' : 'blocked'} ${
                    isDismissed ? 'dismissed' : ''
                  }"
                >
                  <input
                    type="checkbox"
                    .checked=${this._selectedForCleanup.has(candidate.asset.path)}
                    ?disabled=${!candidate.eligibility.eligible || isDismissed}
                    @change=${() => this._toggleCleanupSelection(candidate.asset.path)}
                  />
                  <span class="cleanup-body">
                    <span class="cleanup-name">
                      ${candidate.asset.name}
                      <animoria-root-badge
                        quiet
                        .rootName=${entry.rootName}
                        ?hidden=${model.isSingleRoot}
                      ></animoria-root-badge>
                    </span>
                    <span class="cleanup-meta"
                      >${candidate.asset.path} · ${formatBytes(candidate.sizeBytes)} ·
                      ${candidate.referenceCount} reference(s)</span
                    >
                    ${
                      candidate.eligibility.eligible
                        ? nothing
                        : html`<span class="blocked-why"
                            >${candidate.eligibility.explanation}</span
                          >`
                    }
                  </span>
                  <button
                    type="button"
                    class="dismiss"
                    title=${
                      isDismissed
                        ? 'Propose this asset again.'
                        : 'Keep this asset and stop proposing it for removal.'
                    }
                    @click=${() => this._dismissCandidate(candidate.asset.path, !isDismissed)}
                  >
                    ${isDismissed ? 'Undismiss' : 'Keep'}
                  </button>
                </div>
              `;
            })}
          </div>
        `
      )}
    `;
  }

  /**
   * Sets a candidate aside, or brings it back.
   *
   * The state is the host's, not Core's: Core reports that an asset is unreferenced
   * and that stays true — what changes is whether this developer wants to keep being
   * told. `buildCleanupCandidates` has always accepted `dismissedPaths`; every host
   * passed an empty set, so a developer's only options were "delete it" and "see it
   * proposed again tomorrow".
   */
  private _dismissCandidate(assetPath: string, dismissed: boolean): void {
    const next = new Set(this._dismissed);
    if (dismissed) next.add(assetPath);
    else next.delete(assetPath);
    this._dismissed = next;

    if (dismissed && this._selectedForCleanup.has(assetPath)) {
      const selection = new Set(this._selectedForCleanup);
      selection.delete(assetPath);
      this._selectedForCleanup = selection;
      // A plan built from a selection that included this asset no longer describes
      // what would happen. Cleared rather than silently kept.
      this._cleanupPlans = [];
    }

    this._send({ type: 'dismiss-cleanup-candidate', assetPath, dismissed });
  }

  /**
   * One surface, rendered alone.
   *
   * No tab bar, no siblings competing for the same width. The header keeps only what
   * that surface genuinely needs: the health summary and root selector belong to a
   * workspace-wide view, not above a single asset's preview.
   */
  private _renderSingleSurface(model: AnalysisViewModel) {
    if (this.surface === 'inspector') {
      const selected = model.assets.find((entry) => entry.asset.path === this._selectedAssetPath);
      if (!selected) {
        return html`<main>
          <animoria-state-panel
            state="empty"
            summary="Select an asset in the Animoria view to inspect it."
          ></animoria-state-panel>
        </main>`;
      }
      return html`<main>
        ${this._error ? html`<div class="error" role="alert">${this._error.message}</div>` : nothing}
        ${this._renderInspector(model, selected.asset, selected.rootId, selected.rootName)}
      </main>`;
    }

    return html`
      <header>
        ${
          model.isSingleRoot
            ? nothing
            : html`<animoria-root-selector
                .roots=${model.roots}
                .filter=${model.filter}
                .countKind=${'findings'}
                @root-filter-change=${(e: CustomEvent<RootFilter>) => this._setRootFilter(e.detail)}
              ></animoria-root-selector>`
        }
        ${this._renderBanner(model)}
      </header>
      <main>
        ${this._error ? html`<div class="error" role="alert">${this._error.message}</div>` : nothing}
        ${this.surface === 'findings' ? this._renderFindings(model) : nothing}
        ${this.surface === 'duplicates' ? this._renderDuplicates(model) : nothing}
        ${this.surface === 'cleanup' ? this._renderCleanupTab(model) : nothing}
      </main>
    `;
  }

  override render() {
    const model = this._viewModel;

    if (!model) {
      return html`<animoria-state-panel
        state="initializing"
        summary=${this._progressMessage || 'Waiting for the workspace analysis.'}
      ></animoria-state-panel>`;
    }

    const gate = this._renderLifecycleGate(model);
    if (gate) return gate;

    if (this.surface !== 'all') return this._renderSingleSurface(model);

    const tabs = [
      ['assets', `Assets (${model.assetCount})`],
      ['findings', `Findings (${model.analysis.diagnostics.length})`],
      ['duplicates', `Duplicates (${model.duplicateGroups.length})`],
      ['cleanup', 'Cleanup'],
    ] as const;

    return html`
      <header>
        <animoria-health-summary .outcome=${model.analysis.health}></animoria-health-summary>
        ${
          // A workspace with one root has nothing to choose between, and a selector
          // offering one option is noise. With several, the selector is the only way
          // to reach a single root's view — it was built, imported and never
          // rendered, which made multi-root filtering unreachable in every host.
          model.isSingleRoot
            ? nothing
            : html`<animoria-root-selector
                .roots=${model.roots}
                .filter=${model.filter}
                .countKind=${this._tab === 'assets' ? 'assets' : 'findings'}
                @root-filter-change=${(e: CustomEvent<RootFilter>) => this._setRootFilter(e.detail)}
              ></animoria-root-selector>`
        }
        ${this._renderBanner(model)}
        <nav role="tablist">
          ${tabs.map(
            ([id, label]) => html`
              <button
                role="tab"
                type="button"
                aria-selected=${this._tab === id}
                @click=${() => {
                  this._tab = id;
                }}
              >
                ${label}
              </button>
            `
          )}
        </nav>
        ${
          this._tab === 'assets'
            ? html`<input
              class="search"
              type="search"
              placeholder="Search assets"
              .value=${this._query}
              @input=${(e: Event) => {
                this._query = (e.target as HTMLInputElement).value;
              }}
            />`
            : nothing
        }
      </header>

      <main>
        ${this._error ? html`<div class="error" role="alert">${this._error.message}</div>` : nothing}
        ${this._tab === 'assets' ? this._renderAssets(model) : nothing}
        ${this._tab === 'findings' ? this._renderFindings(model) : nothing}
        ${this._tab === 'duplicates' ? this._renderDuplicates(model) : nothing}
        ${this._tab === 'cleanup' ? this._renderCleanupTab(model) : nothing}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-workspace': AnimoriaWorkspace;
  }
}
