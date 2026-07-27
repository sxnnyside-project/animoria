import type {
  AnimoriaAsset,
  AnimoriaStaticAsset,
  RuleEngineReport,
  HealthScoreReport,
  GovernanceReport,
} from '@animoria/core';
import { t } from '@animoria/core/i18n';
import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './animoria-gallery.js';
import './sandbox-control-panel.js';
import './animoria-preview-panel.js';
import './animoria-duplicate-resolver.js';
import type { DuplicateGroup } from './animoria-duplicate-resolver.js';
import './animoria-cleanup-panel.js';
import './sandbox-event-console.js';
import type { TelemetryLogEntry } from './sandbox-event-console.js';
import './mingcute-icon.js';
import '../mocks/mock-extension-host.js';

@customElement('animoria-app')
export class AnimoriaApp extends LitElement {
  @state() private _assets: AnimoriaAsset[] = [];
  @state() private _staticAssets: AnimoriaStaticAsset[] = [];
  @state() private _ruleReport: RuleEngineReport | null = null;
  @state() private _healthScore: HealthScoreReport | null = null;
  @state() private _referenceCounts = new Map<string, number>();
  @state() private _governanceReport: GovernanceReport | null = null;

  @state() private _loading = false;
  @state() private _progressMessage = '';
  @state() private _progressPercent = 0;
  @state() private _selectedAsset: AnimoriaAsset | AnimoriaStaticAsset | null = null;
  @state() private _locale = 'en';
  @state() private _viewMode: 'flat' | 'tree' = 'flat';

  @state() private _selectedDuplicateGroup: DuplicateGroup | null = null;
  @state() private _showCleanupReview = false;
  @state() private _telemetryLogs: TelemetryLogEntry[] = [];
  @state() private _daemonConnected = true;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      overflow: hidden;
      background: var(--animoria-bg-primary);
      font-family: var(--animoria-font-family);
    }

    .top-workbench-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #090a0f;
      border-bottom: 1px solid var(--animoria-border-color);
      font-size: 11px;
      color: var(--animoria-text-muted);
      flex-shrink: 0;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-title {
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #f8fafc;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tag-lab {
      background: var(--animoria-accent);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .status-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #cbd5e1;
    }

    .indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .indicator-dot.offline {
      background: #f59e0b;
    }

    .main-workspace {
      display: flex;
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }

    animoria-gallery {
      flex: 1;
      min-height: 0;
      min-width: 280px;
    }

    animoria-preview-panel,
    animoria-duplicate-resolver,
    animoria-cleanup-panel {
      flex-shrink: 0;
    }

    sandbox-control-panel {
      flex-shrink: 0;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this._handleMessage);
    this._triggerScan();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this._handleMessage);
  }

  t(key: string): string {
    return t(key, this._locale);
  }

  private _triggerScan() {
    this._loading = true;
    this._progressMessage = this.t('app.scanningStart');
    this._progressPercent = 0;
    this._selectedAsset = null;
    this._selectedDuplicateGroup = null;
    this._showCleanupReview = false;

    this._addTelemetryLog('scan', { action: 'triggerScan' });
    window.postMessage({ command: 'scan', target: 'extension' }, '*');
  }

  private _onSelectAsset(e: CustomEvent<{ asset: AnimoriaAsset | AnimoriaStaticAsset }>) {
    this._selectedAsset = e.detail.asset;
    this._selectedDuplicateGroup = null;
    this._showCleanupReview = false;
  }

  private _onChangeLocale = (e: CustomEvent<{ locale: string }>) => {
    this._locale = e.detail.locale;
    this.requestUpdate();
  };

  private _onToggleViewMode() {
    this._viewMode = this._viewMode === 'flat' ? 'tree' : 'flat';
  }

  /**
   * Narrows `_selectedAsset` to `AnimoriaAsset` for `animoria-preview-panel`,
   * which only supports animated assets. `AnimoriaStaticAsset` has no
   * `status` field, so its absence is what distinguishes the two.
   */
  private _selectedAnimatedAsset(): AnimoriaAsset | null {
    const asset = this._selectedAsset;
    return asset && 'status' in asset ? asset : null;
  }

  private _onResolveDuplicateGroup(e: CustomEvent<{ group: DuplicateGroup }>) {
    this._selectedDuplicateGroup = e.detail.group;
    this._selectedAsset = null;
    this._showCleanupReview = false;
  }

  private _onStartCleanupReview() {
    this._showCleanupReview = true;
    this._selectedAsset = null;
    this._selectedDuplicateGroup = null;
  }

  private _addTelemetryLog(command: string, data: unknown) {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    const log: TelemetryLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      command,
      data,
    };
    this._telemetryLogs = [...this._telemetryLogs.slice(-150), log];
  }

  private _handleMessage = (e: MessageEvent) => {
    const message = e.data;
    if (!message || !message.command) return;

    this._addTelemetryLog(message.command, message);

    switch (message.command) {
      case 'scanProgress':
        this._progressMessage = message.message;
        if (message.total > 0) {
          this._progressPercent = Math.round((message.index / message.total) * 100);
        } else {
          this._progressPercent = 0;
        }
        if (message.assets) {
          this._assets = message.assets;
        }
        break;
      case 'scanComplete':
        this._assets = message.assets || [];
        this._staticAssets = message.staticAssets || [];
        this._ruleReport = message.ruleReport || null;
        this._healthScore = message.healthScore || null;
        this._referenceCounts = message.referenceCounts
          ? new Map(message.referenceCounts)
          : new Map();
        this._governanceReport = message.governanceReport || null;
        this._loading = false;
        this._progressMessage = '';
        this._progressPercent = 100;
        break;
      case 'watcherEvent':
        if (message.type === 'indexUpdate') {
          this._assets = message.assets || [];
          this._staticAssets = message.staticAssets || [];
          this._ruleReport = message.ruleReport || null;
          this._healthScore = message.healthScore || null;
          this._referenceCounts = message.referenceCounts
            ? new Map(message.referenceCounts)
            : new Map();
          this._governanceReport = message.governanceReport || null;

          if (this._selectedAsset) {
            const found =
              this._assets.find((a) => a.path === this._selectedAsset!.path) ||
              this._staticAssets.find((a) => a.path === this._selectedAsset!.path);
            this._selectedAsset = found || null;
          }
        } else {
          this._handleWatcherEvent(message.type, message.asset);
        }
        break;
      case 'assetDeleted':
        this._assets = this._assets.filter((a) => a.path !== message.path);
        this._staticAssets = this._staticAssets.filter((a) => a.path !== message.path);
        if (this._selectedAsset?.path === message.path) {
          this._selectedAsset = null;
        }
        break;
    }
  };

  private _handleWatcherEvent(type: 'added' | 'modified' | 'removed', asset: AnimoriaAsset) {
    if (type === 'added') {
      if (!this._assets.some((a) => a.path === asset.path)) {
        this._assets = [...this._assets, asset];
      }
    } else if (type === 'modified') {
      this._assets = this._assets.map((a) => (a.path === asset.path ? asset : a));
      if (this._selectedAsset?.path === asset.path) {
        this._selectedAsset = asset;
      }
    } else if (type === 'removed') {
      this._assets = this._assets.filter((a) => a.path !== asset.path);
      if (this._selectedAsset?.path === asset.path) {
        this._selectedAsset = null;
      }
    }
  }

  override render() {
    return html`
      <!-- Top Laboratory Workbench Bar -->
      <div class="top-workbench-bar">
        <div class="brand-section">
          <span class="brand-title">
            <mingcute-icon name="terminal" size="16" color="#6366f1"></mingcute-icon>
            ANIMORIA CORE
          </span>
          <span class="tag-lab">Dev Bench</span>
        </div>
        <div class="status-section">
          <div class="status-pill">
            <span class="indicator-dot ${this._daemonConnected ? '' : 'offline'}"></span>
            <span>${this._daemonConnected ? this.t('app.daemonOnline') : this.t('app.daemonMock')}</span>
          </div>
          <div class="status-pill">
            <span>${this.t('app.workspace')} /workspace</span>
          </div>
          <div class="status-pill">
            <span>Assets: ${this._assets.length} ${this.t('app.animatedAssets')}, ${this._staticAssets.length} ${this.t('app.staticAssets')}</span>
          </div>
        </div>
      </div>

      <!-- Main Workspace Dock -->
      <div class="main-workspace">
        <animoria-gallery
          .assets="${this._assets}"
          .staticAssets="${this._staticAssets}"
          .ruleReport="${this._ruleReport}"
          .healthScore="${this._healthScore}"
          .referenceCounts="${this._referenceCounts}"
          .governanceReport="${this._governanceReport}"
          .loading="${this._loading}"
          .progressMessage="${this._progressMessage}"
          .progressPercent="${this._progressPercent}"
          .locale="${this._locale}"
          .viewMode="${this._viewMode}"
          .selectedAsset="${this._selectedAsset}"
          workspacePath="/workspace"
          @select-asset="${this._onSelectAsset}"
          @change-locale="${this._onChangeLocale}"
          @toggle-view-mode="${this._onToggleViewMode}"
          @resolve-duplicate-group="${this._onResolveDuplicateGroup}"
          @start-cleanup-review="${this._onStartCleanupReview}"
        ></animoria-gallery>

        ${
          this._showCleanupReview
            ? html`
              <animoria-cleanup-panel
                .locale="${this._locale}"
                .assets="${this._assets}"
                .ruleReport="${this._ruleReport}"
                .healthScore="${this._healthScore}"
                .referenceCounts="${this._referenceCounts}"
                @close="${() => {
                  this._showCleanupReview = false;
                }}"
              ></animoria-cleanup-panel>
            `
            : this._selectedDuplicateGroup
              ? html`
              <animoria-duplicate-resolver
                .locale="${this._locale}"
                .group="${this._selectedDuplicateGroup}"
                @close="${() => {
                  this._selectedDuplicateGroup = null;
                }}"
              ></animoria-duplicate-resolver>
            `
              : html`
              <animoria-preview-panel
                .asset="${this._selectedAnimatedAsset()}"
                .locale="${this._locale}"
                .referenceCounts="${this._referenceCounts}"
                .ruleReport="${this._ruleReport}"
              ></animoria-preview-panel>
            `
        }

        <sandbox-control-panel
          .locale="${this._locale}"
          @change-locale="${this._onChangeLocale}"
        ></sandbox-control-panel>
      </div>

      <!-- Bottom NDJSON Telemetry Log Console -->
      <sandbox-event-console
        .locale="${this._locale}"
        .logs="${this._telemetryLogs}"
        @clear-logs="${() => {
          this._telemetryLogs = [];
        }}"
      ></sandbox-event-console>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-app': AnimoriaApp;
  }
}
