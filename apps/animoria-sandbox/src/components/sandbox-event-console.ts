import { t } from '@animoria/core/i18n';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './mingcute-icon.js';

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  command: string;
  type?: string;
  data: unknown;
  expanded?: boolean;
}

@customElement('sandbox-event-console')
export class SandboxEventConsole extends LitElement {
  @property({ type: Array }) logs: TelemetryLogEntry[] = [];
  @property({ type: String }) locale = 'en';
  @state() private _autoScroll = true;
  @state() private _filter: 'all' | 'scan' | 'watcher' | 'error' = 'all';

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 220px;
      background: #06070a;
      border-top: 1px solid var(--animoria-border-color);
      font-family: 'JetBrains Mono', 'Fira Code', 'Outfit', monospace;
      color: #e2e8f0;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: #0d0f17;
      border-bottom: 1px solid var(--animoria-border-color);
      font-size: 11px;
      user-select: none;
      flex-shrink: 0;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .log-count {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--animoria-border-color);
      color: #94a3b8;
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #f8fafc;
    }

    .btn-icon.active {
      background: rgba(99, 102, 241, 0.2);
      border-color: var(--animoria-accent);
      color: #818cf8;
    }

    .filter-select {
      background: #121520;
      border: 1px solid var(--animoria-border-color);
      color: #94a3b8;
      font-size: 10px;
      border-radius: 4px;
      padding: 2px 4px;
      outline: none;
      font-family: inherit;
    }

    .log-body {
      flex: 1;
      overflow-y: auto;
      padding: 6px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .log-body::-webkit-scrollbar {
      width: 6px;
    }

    .log-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .log-entry {
      display: flex;
      flex-direction: column;
      font-size: 11px;
      line-height: 1.5;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.03);
      padding-bottom: 3px;
    }

    .log-row {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .log-time {
      color: #64748b;
      font-size: 10px;
      white-space: nowrap;
    }

    .badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .badge-scan {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .badge-watcher {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .badge-error {
      background: rgba(244, 63, 94, 0.15);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .badge-info {
      background: rgba(100, 116, 139, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(100, 116, 139, 0.3);
    }

    .log-msg {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #cbd5e1;
    }

    .log-json {
      background: #020305;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 8px;
      margin-top: 4px;
      font-size: 10px;
      color: #a5b4fc;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 140px;
      overflow-y: auto;
    }

    .empty-logs {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #475569;
      font-size: 11px;
      font-style: italic;
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  override updated() {
    if (this._autoScroll) {
      const container = this.renderRoot.querySelector('.log-body');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }

  private _onToggleExpand(logId: string) {
    this.logs = this.logs.map((log) =>
      log.id === logId ? { ...log, expanded: !log.expanded } : log
    );
    this.requestUpdate();
  }

  private _onClearLogs() {
    this.dispatchEvent(new CustomEvent('clear-logs', { bubbles: true, composed: true }));
  }

  private _onFilterChange(e: Event) {
    this._filter = (e.target as HTMLSelectElement).value as 'all' | 'scan' | 'watcher' | 'error';
  }

  private _getFilteredLogs(): TelemetryLogEntry[] {
    if (this._filter === 'all') return this.logs;
    return this.logs.filter((log) => {
      if (this._filter === 'scan') return log.command.includes('scan');
      if (this._filter === 'watcher')
        return log.command.includes('watcher') || log.type === 'indexUpdate';
      if (this._filter === 'error') return log.command.includes('error');
      return true;
    });
  }

  private _getBadgeClass(command: string): string {
    if (command.includes('error')) return 'badge-error';
    if (command.includes('scan')) return 'badge-scan';
    if (command.includes('watcher') || command === 'indexUpdate') return 'badge-watcher';
    return 'badge-info';
  }

  private _formatMessage(log: TelemetryLogEntry): string {
    const data = log.data as {
      message?: string;
      index?: number;
      total?: number;
      assets?: unknown[];
      staticAssets?: unknown[];
      durationMs?: number;
      type?: string;
      path?: string;
      asset?: { name?: string };
    };

    if (log.command === 'scanProgress') {
      return `${data.message || 'Scanning...'} (${data.index || 0}/${data.total || 0})`;
    }
    if (log.command === 'scanComplete') {
      const assetCount = data.assets?.length ?? 0;
      const staticCount = data.staticAssets?.length ?? 0;
      return `Scan complete: ${assetCount} animated, ${staticCount} static assets indexed (${data.durationMs || 0}ms)`;
    }
    if (log.command === 'watcherEvent') {
      if (data.type === 'indexUpdate' || log.type === 'indexUpdate') {
        const assetCount = data.assets?.length ?? 0;
        return `Watcher indexUpdate: ${assetCount} active assets re-indexed`;
      }
      return `Watcher ${data.type || log.type}: ${data.asset?.name || data.path || ''}`;
    }
    return JSON.stringify(log.data);
  }

  override render() {
    const filtered = this._getFilteredLogs();

    return html`
      <div class="header">
        <div class="header-title">
          <mingcute-icon name="terminal" size="13" color="#818cf8"></mingcute-icon>
          <span>${this.t('telemetry.title')}</span>
          <span class="log-count">${this.logs.length}</span>
        </div>
        <div class="actions">
          <select class="filter-select" .value="${this._filter}" @change="${this._onFilterChange}">
            <option value="all">${this.t('telemetry.filterAll')}</option>
            <option value="scan">${this.t('telemetry.filterScan')}</option>
            <option value="watcher">${this.t('telemetry.filterWatcher')}</option>
            <option value="error">${this.t('telemetry.filterError')}</option>
          </select>
          <button
            class="btn-icon ${this._autoScroll ? 'active' : ''}"
            @click="${() => {
              this._autoScroll = !this._autoScroll;
            }}"
          >
            ${this.t('telemetry.autoScroll')}
          </button>
          <button class="btn-icon" @click="${this._onClearLogs}">
            <mingcute-icon name="trash" size="11"></mingcute-icon>
            ${this.t('telemetry.clear')}
          </button>
        </div>
      </div>

      <div class="log-body">
        ${
          filtered.length === 0
            ? html`<div class="empty-logs">${this.t('telemetry.empty')}</div>`
            : filtered.map(
                (log) => html`
                <div class="log-entry">
                  <div class="log-row" @click="${() => this._onToggleExpand(log.id)}">
                    <span class="log-time">${log.timestamp}</span>
                    <span class="badge ${this._getBadgeClass(log.command)}">
                      ${log.command}
                    </span>
                    <span class="log-msg">${this._formatMessage(log)}</span>
                    <mingcute-icon
                      name="${log.expanded ? 'down' : 'chevron'}"
                      size="10"
                      color="#64748b"
                    ></mingcute-icon>
                  </div>
                  ${
                    log.expanded
                      ? html`
                        <pre class="log-json">${JSON.stringify(log.data, null, 2)}</pre>
                      `
                      : ''
                  }
                </div>
              `
              )
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sandbox-event-console': SandboxEventConsole;
  }
}
