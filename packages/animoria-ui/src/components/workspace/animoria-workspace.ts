import type { Asset, ResolutionPlan, UsageReference, WorkspaceAnalysis } from '@animoria/contracts';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cache } from 'lit/directives/cache.js';
import type { MultiRootAnalysis, RestoreResult, SessionManifest } from '../../bridge/types.js';
import type {
  AnimationPreview,
  GeneratedSnippet,
  HostBridge,
  HostCapabilities,
  RootCleanupPlan,
  RootCleanupProposal,
  UiPreferences,
} from '../../bridge/types.js';
import { DEFAULT_PREFERENCES, NO_CAPABILITIES } from '../../bridge/types.js';
import type {
  AnalysisViewModel,
  AttributedAsset,
  RootFilter,
} from '../../view-model/analysis-view-model.js';
import {
  ALL_ROOTS,
  buildAnalysisViewModel,
  referenceStateOf,
} from '../../view-model/analysis-view-model.js';
import '../badges/animoria-coverage-summary.js';
import '../badges/animoria-health-summary.js';
import '../badges/animoria-root-badge.js';
import { AnimoriaElement } from '../common/events.js';
import '../gallery/animoria-root-selector.js';
import '../gallery/animoria-state-panel.js';
import '../inspector/animoria-asset-inspector.js';
import './animoria-assets-tab.js';
import './animoria-cleanup-tab.js';
import './animoria-duplicates-tab.js';
import './animoria-findings-tab.js';

/**
 * The root shared surface: everything a host mounts, driven entirely by the bridge.
 *
 * ## What this component is responsible for
 * Holding the last message of each kind, deriving one view model per analysis, and
 * routing component events into `HostOutbound`. It contains no product judgement —
 * every decision it renders arrived on the wire.
 *
 * ## Four declarative sub-element tabs
 * The Assets, Findings, Duplicates, and Cleanup workflows live as dedicated Lit elements:
 * `<animoria-assets-tab>`, `<animoria-findings-tab>`, `<animoria-duplicates-tab>`, and
 * `<animoria-cleanup-tab>`. `AnimoriaWorkspace` acts as a lean coordinator.
 */
@customElement('animoria-workspace')
export class AnimoriaWorkspace extends AnimoriaElement {
  /** The host connection. Set once, before the element is attached. */
  @property({ attribute: false }) bridge: HostBridge | null = null;

  /** Which single product surface this mount renders. */
  @property({ type: String }) surface: 'all' | 'inspector' | 'findings' | 'duplicates' | 'cleanup' =
    'all';

  @state() private _analysis: MultiRootAnalysis | WorkspaceAnalysis | null = null;
  /**
   * Which roots are shown. `all` by default — a picker the developer must answer
   * before seeing anything turns "open the panel" into a decision.
   */
  @state() private _rootFilter: RootFilter = ALL_ROOTS;
  @state() private _viewModel: AnalysisViewModel | null = null;
  @state() private _capabilities: HostCapabilities = NO_CAPABILITIES;
  @state() private _progressMessage = '';
  @state() private _error: { message: string; isRecoverable: boolean } | null = null;

  @state() private _selectedAssetPath = '';
  @state() private _thumbnails = new Map<string, string | null>();
  private _pendingThumbnails = new Map<string, string | null>();
  private _thumbnailBatchScheduled = false;
  private _requestedThumbnails = new Set<string>();
  @state() private _tab: 'assets' | 'findings' | 'duplicates' | 'cleanup' = 'assets';
  @state() private _cleanupView: 'proposal' | 'trash' = 'proposal';

  /**
   * The inspector's preview, and the two states that are not a payload.
   */
  @state() private _preview: AnimationPreview | null = null;
  @state() private _isPreviewLoading = false;
  @state() private _previewError = '';

  /** Host-persisted view preferences. Defaults until the host says otherwise. */
  @state() private _preferences: UiPreferences = DEFAULT_PREFERENCES;

  /** Usages of the current selection. `null` means "not answered yet". */
  @state() private _references: readonly UsageReference[] | null = null;
  @state() private _isReferencesComplete = false;

  /** Snippets for the current selection. */
  @state() private _snippets: readonly GeneratedSnippet[] = [];

  /** Cleanup candidates the developer has set aside, as the host reports them. */
  @state() private _dismissed = new Set<string>();

  /** `null` until the host answers `request-trash-sessions`; `[]` means empty trash. */
  @state() private _trashSessions: readonly SessionManifest[] | null = null;
  @state() private _restoreResult: RestoreResult | null = null;
  @state() private _isRestoring = false;

  /** One proposal per root. Never merged: `.animoriarc` is root-scoped. */
  @state() private _proposals: readonly RootCleanupProposal[] = [];
  @state() private _selectedForCleanup = new Set<string>();
  @state() private _cleanupPlans: readonly RootCleanupPlan[] = [];
  @state() private _isApplying = false;

  @state() private _openGroupId = '';
  @state() private _resolutionPlan: ResolutionPlan | null = null;
  @state() private _resolutionPlanId = '';

  private _unsubscribe: (() => void) | null = null;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--animoria-bg-primary);
      color: var(--animoria-text-primary);
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
      overflow: hidden;
    }

    header {
      padding: var(--animoria-space-3) var(--animoria-space-3) 0 var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      border-bottom: 1px solid var(--animoria-border);
      flex-shrink: 0;
    }

    .banner {
      border-left: 3px solid var(--banner-color);
      background: var(--animoria-bg-secondary);
      border-radius: var(--animoria-radius-sm);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      font-size: var(--animoria-font-size-xs);
      line-height: var(--animoria-line-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
    }

    .banner-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .banner-action {
      background: transparent;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      padding: 2px 8px;
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-primary);
      cursor: pointer;
      flex-shrink: 0;
    }

    .banner-action:hover {
      background: var(--animoria-bg-hover);
    }

    nav[role='tablist'] {
      display: flex;
      gap: var(--animoria-space-1);
      margin-top: var(--animoria-space-1);
    }

    button[role='tab'] {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      font-weight: 500;
      padding: var(--animoria-space-1) var(--animoria-space-2) var(--animoria-space-2);
      cursor: pointer;
      transition: color 120ms ease, border-color 120ms ease;
    }

    button[role='tab']:hover {
      color: var(--animoria-text-primary);
    }

    button[role='tab'][aria-selected='true'] {
      color: var(--animoria-text-strong);
      border-bottom-color: var(--animoria-accent);
      font-weight: 600;
    }

    main {
      flex: 1;
      overflow-y: auto;
      padding: var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .error {
      border: 1px solid var(--animoria-danger);
      background: var(--animoria-danger-quiet);
      border-radius: var(--animoria-radius-sm);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
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
          if (message.assetPath !== this._selectedAssetPath) break;
          this._references = message.references;
          this._isReferencesComplete = message.isComplete;
          break;
        case 'analysis':
          this._analysis = message.analysis;
          this._viewModel = buildAnalysisViewModel(message.analysis, this._rootFilter);
          this._progressMessage = '';
          this._error = null;
          this._requestedThumbnails.clear();
          this._requestVisibleThumbnails();
          break;
        case 'roots-changed':
          if (
            this._rootFilter.kind === 'root' &&
            !message.roots.some(
              (root) => root.id === (this._rootFilter as { rootId: string }).rootId,
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
          this._tab = message.tab;
          if (message.assetPath) this._selectAsset(message.assetPath, message.rootId);
          if (message.groupId) {
            this._openGroupId = message.groupId;
            this._resolutionPlan = null;
            this._resolutionPlanId = '';
          }
          break;
        case 'thumbnail':
          this._pendingThumbnails.set(message.assetPath, message.source);
          if (!this._thumbnailBatchScheduled) {
            this._thumbnailBatchScheduled = true;
            queueMicrotask(() => {
              if (!this._thumbnailBatchScheduled) return;
              this._thumbnailBatchScheduled = false;
              const next = new Map(this._thumbnails);
              for (const [path, src] of this._pendingThumbnails) {
                next.set(path, src);
              }
              this._pendingThumbnails.clear();
              this._thumbnails = next;
            });
          }
          break;
        case 'animation-data':
          if (message.assetPath !== this._selectedAssetPath) break;
          this._isPreviewLoading = false;
          this._preview = message.preview;
          this._previewError = message.error ?? '';
          break;
        case 'trash-sessions':
          this._trashSessions = message.sessions;
          break;
        case 'restore-result':
          this._isRestoring = false;
          this._restoreResult = message.result;
          this._send({ type: 'request-trash-sessions' });
          break;
        case 'cleanup-proposal':
          this._proposals = message.roots;
          break;
        case 'cleanup-plan':
          this._cleanupPlans = message.plans;
          break;
        case 'cleanup-result':
          this._isApplying = false;
          this._cleanupPlans = [];
          this._selectedForCleanup = new Set();
          if (message.result.status !== 'applied' && message.result.error) {
            this._error = { message: message.result.error, isRecoverable: true };
          }
          break;
        case 'resolution-plan':
          this._resolutionPlan = message.plan;
          this._resolutionPlanId = message.planId;
          break;
        case 'resolution-result':
          this._isApplying = false;
          this._resolutionPlan = null;
          this._resolutionPlanId = '';
          if (message.status !== 'applied' && message.reason) {
            this._error = { message: message.reason, isRecoverable: true };
          }
          break;
        case 'error':
          this._error = { message: message.message, isRecoverable: message.isRecoverable };
          this._isApplying = false;
          this._isRestoring = false;
          this._isPreviewLoading = false;
          break;
        default:
          break;
      }
    });

    bridge.send({ type: 'ready' });
  }

  override disconnectedCallback(): void {
    this._thumbnailBatchScheduled = false;
    this._pendingThumbnails.clear();
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    super.disconnectedCallback();
  }

  private _send(message: Parameters<NonNullable<HostBridge['send']>>[0]): void {
    this.bridge?.send(message);
  }

  private _setRootFilter(filter: RootFilter): void {
    this._rootFilter = filter;
    if (this._analysis) {
      this._viewModel = buildAnalysisViewModel(this._analysis, filter);
      this._selectedAssetPath = '';
      this._preview = null;
      this._references = null;
      this._snippets = [];
    }
  }

  private _selectAsset(path: string, _rootId?: string): void {
    if (path === this._selectedAssetPath) return;
    this._selectedAssetPath = path;
    this._preview = null;
    this._previewError = '';
    this._isPreviewLoading = true;
    this._references = null;
    this._isReferencesComplete = false;
    this._snippets = [];

    this._send({ type: 'request-animation-data', assetPath: path });
    this._send({ type: 'request-usage-references', assetPath: path });
  }

  private _requestVisibleThumbnails(assets?: readonly AttributedAsset[]): void {
    const list = assets ?? this._viewModel?.assets ?? [];
    for (const entry of list) {
      const p = entry.asset.path;
      if (this._thumbnails.has(p) || this._requestedThumbnails.has(p)) continue;
      this._requestedThumbnails.add(p);
      this._send({ type: 'request-thumbnail', assetPath: p });
    }
  }

  private _requestPlan(): void {
    if (this._selectedForCleanup.size === 0) return;
    this._send({
      type: 'request-cleanup-plan',
      assetPaths: Array.from(this._selectedForCleanup),
    });
  }

  private _toggleCleanupSelection(assetPath: string): void {
    const next = new Set(this._selectedForCleanup);
    if (next.has(assetPath)) next.delete(assetPath);
    else next.add(assetPath);
    this._selectedForCleanup = next;
    this._cleanupPlans = [];
  }

  private _dismissCandidate(assetPath: string, isDismissed: boolean): void {
    const next = new Set(this._dismissed);
    if (isDismissed) next.add(assetPath);
    else next.delete(assetPath);
    this._dismissed = next;

    if (isDismissed && this._selectedForCleanup.has(assetPath)) {
      const selection = new Set(this._selectedForCleanup);
      selection.delete(assetPath);
      this._selectedForCleanup = selection;
      this._cleanupPlans = [];
    }

    this._send({ type: 'dismiss-cleanup-candidate', assetPath, isDismissed });
  }

  private _renderLifecycleGate(model: AnalysisViewModel) {
    if (model.state === 'failed') {
      return html`<main>
        <animoria-state-panel
          state="failed"
          summary=${model.stateLabel}
          actionLabel="Retry analysis"
          @state-action=${() => this._send({ type: 'run-analysis' })}
        ></animoria-state-panel>
      </main>`;
    }

    if (model.state === 'analyzing') {
      return html`<main>
        <animoria-state-panel
          state="analyzing"
          summary=${model.stateLabel}
        ></animoria-state-panel>
      </main>`;
    }

    return null;
  }

  private _renderBanner(model: AnalysisViewModel) {
    if (model.state === 'stale') {
      return html`
        <div class="banner" style="--banner-color: var(--animoria-warning)" role="status">
          <div class="banner-body">
            <strong>Analysis may be out of date.</strong>
            <span>${model.stateLabel}</span>
          </div>
          <button
            class="banner-action"
            type="button"
            @click=${() => this._send({ type: 'run-analysis' })}
          >
            Re-scan
          </button>
        </div>
      `;
    }

    if (model.state === 'incomplete') {
      return html`
        <div class="banner" style="--banner-color: var(--animoria-info)" role="status">
          <div class="banner-body">
            <strong>Partial scan.</strong>
            <span>${model.stateLabel}</span>
          </div>
          <button
            class="banner-action"
            type="button"
            @click=${() => this._send({ type: 'run-analysis' })}
          >
            Re-scan
          </button>
        </div>
      `;
    }

    return nothing;
  }

  private _renderSingleSurface(model: AnalysisViewModel) {
    if (this.surface === 'inspector') {
      let selected = model.assets.find((entry) => entry.asset.path === this._selectedAssetPath);
      if (!selected && model.assets.length > 0) {
        const first = model.assets[0];
        if (first) {
          selected = first;
          this._selectAsset(first.asset.path, first.rootId);
        }
      }
      if (!selected) {
        return html`<main>
          <animoria-state-panel
            state="empty"
            summary="No visual assets discovered in workspace."
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
        ${this.surface === 'findings' ? this._renderFindingsTab(model) : nothing}
        ${this.surface === 'duplicates' ? this._renderDuplicatesTab(model) : nothing}
        ${this.surface === 'cleanup' ? this._renderCleanupTab(model) : nothing}
      </main>
    `;
  }

  private _renderAssetsTab(model: AnalysisViewModel) {
    this._requestVisibleThumbnails(model.assets);
    const selected = model.assets.find((entry) => entry.asset.path === this._selectedAssetPath);

    return html`
      ${selected ? this._renderInspector(model, selected.asset, selected.rootId, selected.rootName) : nothing}
      <animoria-assets-tab
        .model=${model}
        .thumbnails=${this._thumbnails}
        .selectedAssetPath=${this._selectedAssetPath}
        @select-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
          this._selectAsset(e.detail.assetPath, e.detail.rootId)}
        @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
          this._send({ type: 'open-asset', ...e.detail })}
      ></animoria-assets-tab>
    `;
  }

  private _renderInspector(
    model: AnalysisViewModel,
    asset: Asset,
    rootId: string,
    rootName: string,
  ) {
    return html`
      <animoria-asset-inspector
        .asset=${asset}
        .capabilities=${this._capabilities}
        .rootId=${rootId}
        .rootName=${rootName}
        .shouldHideRoot=${model.isSingleRoot}
        .referenceCount=${model.referenceCounts.get(asset.path) ?? 0}
        .referenceState=${referenceStateOf()}
        .findingCount=${(model.diagnosticsByAssetPath.get(asset.path) ?? []).length}
        .preview=${this._preview}
        .isPreviewLoading=${this._isPreviewLoading}
        .previewError=${this._previewError}
        .preferences=${this._preferences}
        .references=${this._references}
        .isReferencesComplete=${this._isReferencesComplete}
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

  private _renderFindingsTab(model: AnalysisViewModel) {
    return html`
      <animoria-findings-tab
        .model=${model}
        .selectedAssetPath=${this._selectedAssetPath}
        @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
          this._selectAsset(e.detail.assetPath, e.detail.rootId)}
        @open-reference=${(e: CustomEvent<{ file: string; line: number; rootId: string }>) =>
          this._send({ type: 'open-reference', ...e.detail })}
      ></animoria-findings-tab>
    `;
  }

  private _renderDuplicatesTab(model: AnalysisViewModel) {
    return html`
      <animoria-duplicates-tab
        .model=${model}
        .capabilities=${this._capabilities}
        .openGroupId=${this._openGroupId}
        .resolutionPlan=${this._resolutionPlan}
        .resolutionPlanId=${this._resolutionPlanId}
        .isApplying=${this._isApplying}
        @request-resolution-plan=${(e: CustomEvent<{ groupId: string; keepPath: string }>) => {
          this._openGroupId = e.detail.groupId;
          this._resolutionPlan = null;
          this._send({ type: 'request-resolution-plan', ...e.detail });
        }}
        @apply-resolution-plan=${(e: CustomEvent<{ planId: string; canAllowPartial: boolean }>) => {
          this._isApplying = true;
          this._send({ type: 'apply-resolution-plan', ...e.detail });
        }}
        @cancel-resolution-plan=${() => {
          this._openGroupId = '';
          this._resolutionPlan = null;
          this._resolutionPlanId = '';
        }}
      ></animoria-duplicates-tab>
    `;
  }

  private _renderCleanupTab(model: AnalysisViewModel) {
    return html`
      <animoria-cleanup-tab
        .model=${model}
        .capabilities=${this._capabilities}
        .cleanupView=${this._cleanupView}
        .trashSessions=${this._trashSessions}
        .restoreResult=${this._restoreResult}
        .isRestoring=${this._isRestoring}
        .cleanupPlans=${this._cleanupPlans}
        .isApplying=${this._isApplying}
        .proposals=${this._proposals}
        .selectedForCleanup=${this._selectedForCleanup}
        .dismissed=${this._dismissed}
        @change-cleanup-view=${(e: CustomEvent<{ view: 'proposal' | 'trash' }>) => {
          this._cleanupView = e.detail.view;
          if (e.detail.view === 'trash' && this._trashSessions === null) {
            this._send({ type: 'request-trash-sessions' });
          }
        }}
        @request-trash-sessions=${() => this._send({ type: 'request-trash-sessions' })}
        @restore-session=${(e: CustomEvent<{ sessionId: string }>) => {
          this._isRestoring = true;
          this._restoreResult = null;
          this._send({ type: 'restore-session', ...e.detail });
        }}
        @apply-cleanup-plan=${(e: CustomEvent<{ planId: string; canAllowPartial: boolean }>) => {
          this._isApplying = true;
          this._send({ type: 'apply-cleanup-plan', ...e.detail });
        }}
        @cancel-cleanup-plans=${() => {
          this._cleanupPlans = [];
        }}
        @request-cleanup-proposal=${() => this._send({ type: 'request-cleanup-proposal' })}
        @request-cleanup-plan=${() => this._requestPlan()}
        @toggle-cleanup-selection=${(e: CustomEvent<{ assetPath: string }>) =>
          this._toggleCleanupSelection(e.detail.assetPath)}
        @dismiss-candidate=${(e: CustomEvent<{ assetPath: string; isDismissed: boolean }>) =>
          this._dismissCandidate(e.detail.assetPath, e.detail.isDismissed)}
      ></animoria-cleanup-tab>
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
      ['findings', `Findings (${model.findingCount})`],
      ['duplicates', `Duplicates (${model.duplicateGroups.length})`],
      ['cleanup', 'Cleanup'],
    ] as const;

    return html`
      <header>
        <animoria-health-summary .outcome=${model.health ? { status: 'available', report: model.health } : { status: 'unavailable' }}></animoria-health-summary>
        ${
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
            `,
          )}
        </nav>
      </header>

      <main>
        ${this._error ? html`<div class="error" role="alert">${this._error.message}</div>` : nothing}
        ${cache(
          this._tab === 'assets'
            ? this._renderAssetsTab(model)
            : this._tab === 'findings'
              ? this._renderFindingsTab(model)
              : this._tab === 'duplicates'
                ? this._renderDuplicatesTab(model)
                : this._renderCleanupTab(model),
        )}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-workspace': AnimoriaWorkspace;
  }
}
