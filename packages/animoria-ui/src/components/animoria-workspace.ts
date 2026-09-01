import type {
  Asset,
  DuplicateGroup,
  ResolutionPlan,
  UsageReference,
  WorkspaceAnalysis,
} from '@animoria/contracts';
import type { MultiRootAnalysis, RestoreResult, SessionManifest } from '../bridge/types.js';
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
import type { CleanupTabDeps } from './workspace/render-cleanup.js';
import { renderCleanupTab } from './workspace/render-cleanup.js';
import type { DuplicatesDeps, FindingsDeps } from './workspace/render-findings-duplicates.js';
import { renderDuplicates, renderFindings } from './workspace/render-findings-duplicates.js';

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
 *
 * ## `./workspace/render-*.ts`
 * The Cleanup, Findings, and Duplicates tabs' templates live there as plain
 * functions rather than methods here — each takes the view model plus a
 * small `*Deps` object of exactly the state and callbacks it reads, built by
 * this class's `_cleanupDeps`/`_findingsDeps`/`_duplicatesDeps`. The `@state`
 * fields themselves stay here; those functions only describe what to render
 * for one snapshot of them.
 */
@customElement('animoria-workspace')
export class AnimoriaWorkspace extends LitElement {
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
          if (message.result.status !== 'applied' && message.result.error) {
            this._error = { message: message.result.error, recoverable: true };
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
    const state = model.state;

    // States with nothing behind them replace the content entirely.
    if (state === 'initializing' || state === 'analyzing' || state === 'failed') {
      return html`<animoria-state-panel
        .state=${state}
        .summary=${this._progressMessage || model.stateLabel}
        .actionLabel=${state === 'failed' ? 'Try again' : ''}
        @state-action=${() => this._send({ type: 'run-analysis' })}
      ></animoria-state-panel>`;
    }

    if (model.isEmpty) {
      return html`<animoria-state-panel
        state="empty"
        summary="Animoria scanned this workspace and found no visual asset files."
      ></animoria-state-panel>`;
    }

    return null;
  }

  private _renderBanner(model: AnalysisViewModel) {
    const state = model.state;
    if (state !== 'stale' && state !== 'incomplete') return nothing;

    const color =
      state === 'stale' ? 'var(--animoria-state-stale)' : 'var(--animoria-state-incomplete)';

    return html`
      <div class="banner" style="--banner-color: ${color}" role="status">
        <span>${model.stateLabel}</span>
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
              .referenceState=${referenceStateOf()}
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
    asset: Asset,
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
        .referenceState=${referenceStateOf()}
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

  private _cleanupDeps(): CleanupTabDeps {
    return {
      send: (message) => this._send(message),
      cleanupView: this._cleanupView,
      setCleanupView: (view) => {
        this._cleanupView = view;
      },
      trashSessions: this._trashSessions,
      restoreResult: this._restoreResult,
      restoring: this._restoring,
      onRequestRestore: () => {
        this._restoring = true;
        this._restoreResult = null;
      },
      capabilities: this._capabilities,
      cleanupPlans: this._cleanupPlans,
      setCleanupPlans: (plans) => {
        this._cleanupPlans = [...plans];
      },
      applying: this._applying,
      onApplyPlan: (detail) => {
        this._applying = true;
        this._send({ type: 'apply-cleanup-plan', ...detail });
      },
      proposals: this._proposals,
      onRequestProposal: () => this._send({ type: 'request-cleanup-proposal' }),
      selectedForCleanup: this._selectedForCleanup,
      onToggleSelection: (assetPath) => this._toggleCleanupSelection(assetPath),
      onRequestPlan: () => this._requestPlan(),
      dismissed: this._dismissed,
      onDismissCandidate: (assetPath, dismissed) => this._dismissCandidate(assetPath, dismissed),
    };
  }

  private _findingsDeps(): FindingsDeps {
    return {
      selectedAssetPath: this._selectedAssetPath,
      onSelectAsset: (assetPath, rootId) => this._selectAsset(assetPath, rootId),
      onOpenReference: (detail) => this._send({ type: 'open-reference', ...detail }),
    };
  }

  private _duplicatesDeps(): DuplicatesDeps {
    return {
      capabilities: this._capabilities,
      openGroupId: this._openGroupId,
      resolutionPlan: this._resolutionPlan,
      resolutionPlanId: this._resolutionPlanId,
      applying: this._applying,
      onRequestResolutionPlan: (detail) => {
        this._openGroupId = detail.groupId;
        this._resolutionPlan = null;
        this._send({ type: 'request-resolution-plan', ...detail });
      },
      onApplyResolutionPlan: (detail) => {
        this._applying = true;
        this._send({ type: 'apply-resolution-plan', ...detail });
      },
      onCancelResolutionPlan: () => {
        this._openGroupId = '';
        this._resolutionPlan = null;
        this._resolutionPlanId = '';
      },
    };
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
        ${this.surface === 'findings' ? renderFindings(model, this._findingsDeps()) : nothing}
        ${this.surface === 'duplicates' ? renderDuplicates(model, this._duplicatesDeps()) : nothing}
        ${this.surface === 'cleanup' ? renderCleanupTab(model, this._cleanupDeps()) : nothing}
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
      ['findings', `Findings (${model.findingCount})`],
      ['duplicates', `Duplicates (${model.duplicateGroups.length})`],
      ['cleanup', 'Cleanup'],
    ] as const;

    return html`
      <header>
        <animoria-health-summary .outcome=${model.health ? { status: 'available', report: model.health } : { status: 'unavailable' }}></animoria-health-summary>
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
        ${this._tab === 'findings' ? renderFindings(model, this._findingsDeps()) : nothing}
        ${this._tab === 'duplicates' ? renderDuplicates(model, this._duplicatesDeps()) : nothing}
        ${this._tab === 'cleanup' ? renderCleanupTab(model, this._cleanupDeps()) : nothing}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-workspace': AnimoriaWorkspace;
  }
}
