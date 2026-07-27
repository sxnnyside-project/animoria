import type { AnimoriaAsset, RuleEngineReport } from '@animoria/core';
import { t } from '@animoria/core/i18n';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface CleanupItem {
  path: string;
  name: string;
  sizeBytes: number;
  reason: string;
  type: 'unused' | 'duplicate' | 'discouraged';
}

@customElement('animoria-cleanup-panel')
export class AnimoriaCleanupPanel extends LitElement {
  @property({ type: Array }) assets: AnimoriaAsset[] = [];
  @property({ type: Object }) ruleReport: RuleEngineReport | null = null;
  @property({ type: Map }) referenceCounts = new Map<string, number>();
  @property({ type: String }) locale = 'en';

  @state() private _decisions = new Map<string, 'remove' | 'keep'>();
  @state() private _executing = false;

  static override styles = css`
    :host {
      display: block;
      width: 380px;
      height: 100%;
      border-left: 1px solid var(--animoria-border-color);
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-primary);
      overflow-y: auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .container {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex: 1;
      overflow: hidden;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--animoria-text-primary);
      margin: 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--animoria-text-muted);
      cursor: pointer;
      font-size: 18px;
    }

    .btn-close:hover {
      color: var(--animoria-text-primary);
    }

    .savings-card {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid var(--animoria-border-color);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }

    .savings-label {
      font-size: 11px;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .savings-value {
      font-size: 18px;
      font-weight: 700;
      color: #10b981;
    }

    .list-scroll {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-right: 4px;
    }

    .list-scroll::-webkit-scrollbar {
      width: 4px;
    }

    .list-scroll::-webkit-scrollbar-thumb {
      background: var(--animoria-scroll-thumb);
      border-radius: 2px;
    }

    .item-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--animoria-border-color);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: background-color 0.2s ease;
    }

    .item-card:hover {
      background: var(--animoria-hover-bg);
    }

    .checkbox-input {
      margin-top: 3px;
      accent-color: var(--animoria-accent);
      cursor: pointer;
    }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .item-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .item-name {
      font-size: 12px;
      font-weight: 600;
      word-break: break-all;
    }

    .item-size {
      font-size: 10px;
      color: var(--animoria-text-muted);
      white-space: nowrap;
    }

    .item-path {
      font-size: 10px;
      color: var(--animoria-text-muted);
      word-break: break-all;
    }

    .reason-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      margin-top: 4px;
    }

    .type-badge {
      font-size: 8px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .type-unused {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .type-duplicate {
      background: rgba(99, 102, 241, 0.15);
      color: var(--animoria-accent-hover);
    }

    .type-discouraged {
      background: rgba(244, 63, 94, 0.15);
      color: #f43f5e;
    }

    .reason-text {
      color: var(--animoria-text-muted);
    }

    .footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-apply {
      background: var(--animoria-accent);
      color: var(--animoria-accent-text);
      border: none;
      padding: 10px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-align: center;
      transition: background-color 0.2s ease;
    }

    .btn-apply:hover:not(:disabled) {
      background: var(--animoria-accent-hover);
    }

    .btn-apply:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--animoria-text-muted);
      font-size: 12px;
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('assets') || changedProperties.has('ruleReport')) {
      const items = this._getCleanupItems();
      for (const item of items) {
        if (!this._decisions.has(item.path)) {
          this._decisions.set(item.path, 'remove');
        }
      }
    }
  }

  private _getCleanupItems(): CleanupItem[] {
    const items: CleanupItem[] = [];

    for (const asset of this.assets) {
      if (asset.status === 'parsed') {
        const refs = this.referenceCounts.get(asset.path) ?? 0;
        if (refs === 0) {
          items.push({
            path: asset.path,
            name: asset.name,
            sizeBytes: asset.sizeBytes,
            reason: 'Unused asset (0 references in workspace)',
            type: 'unused',
          });
        }
      }
    }

    const duplicatePaths = new Set<string>();
    const diagnostics = this.ruleReport?.diagnostics || [];
    for (const d of diagnostics) {
      if (d.ruleId === 'no-duplicate-content' || d.ruleId === 'no-duplicate-names') {
        if (d.asset.name.includes('-copy') || d.asset.name.includes('copy')) {
          duplicatePaths.add(d.asset.path);
        }
      }
    }

    for (const asset of this.assets) {
      if (duplicatePaths.has(asset.path)) {
        if (!items.some((i) => i.path === asset.path)) {
          items.push({
            path: asset.path,
            name: asset.name,
            sizeBytes: asset.sizeBytes,
            reason: 'Redundant duplicate content',
            type: 'duplicate',
          });
        }
      }
    }

    for (const d of diagnostics) {
      if (d.ruleId === 'no-gif') {
        if (!items.some((i) => i.path === d.asset.path)) {
          items.push({
            path: d.asset.path,
            name: d.asset.name,
            sizeBytes: d.asset.sizeBytes,
            reason: 'GIF format is discouraged (recommend migrating to Rive/SVG)',
            type: 'discouraged',
          });
        }
      }
    }

    return items;
  }

  private _onToggleDecision(path: string) {
    const current = this._decisions.get(path) || 'remove';
    this._decisions.set(path, current === 'remove' ? 'keep' : 'remove');
    this.requestUpdate();
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _onClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private async _onApply() {
    if (this._executing) return;

    this._executing = true;

    const decisionsArray: Array<{ path: string; decision: string }> = [];
    for (const [path, dec] of this._decisions.entries()) {
      decisionsArray.push({ path, decision: dec });
    }

    window.postMessage(
      {
        command: 'executeCleanup',
        decisions: decisionsArray,
        target: 'extension',
      },
      '*'
    );

    setTimeout(() => {
      this._executing = false;
      this._onClose();
    }, 500);
  }

  override render() {
    const items = this._getCleanupItems();

    let totalSavingsBytes = 0;
    let removeCount = 0;
    for (const item of items) {
      if (this._decisions.get(item.path) === 'remove') {
        totalSavingsBytes += item.sizeBytes;
        removeCount++;
      }
    }

    return html`
      <div class="container">
        <div class="header-row">
          <h2 class="title">${this.t('cleanup.title')}</h2>
          <button class="btn-close" @click="${this._onClose}">&times;</button>
        </div>

        <div class="savings-card">
          <span class="savings-label">${this.t('cleanup.savingsLabel')}</span>
          <span class="savings-value">${this._formatSize(totalSavingsBytes)}</span>
        </div>

        <div class="list-scroll">
          ${
            items.length === 0
              ? html`<div class="empty">${this.t('cleanup.noCandidates')}</div>`
              : items.map((item) => {
                  const isSelected = this._decisions.get(item.path) === 'remove';
                  let typeLabel = this.t('cleanup.typeUnused');
                  let typeClass = 'type-unused';
                  if (item.type === 'duplicate') {
                    typeLabel = this.t('cleanup.typeDuplicate');
                    typeClass = 'type-duplicate';
                  } else if (item.type === 'discouraged') {
                    typeLabel = this.t('cleanup.typeDiscouraged');
                    typeClass = 'type-discouraged';
                  }

                  return html`
                  <div class="item-card" @click="${() => this._onToggleDecision(item.path)}">
                    <input
                      type="checkbox"
                      class="checkbox-input"
                      .checked="${isSelected}"
                      @change="${() => this._onToggleDecision(item.path)}"
                      @click="${(e: Event) => e.stopPropagation()}"
                    />
                    <div class="item-info">
                      <div class="item-name-row">
                        <span class="item-name">${item.name}</span>
                        <span class="item-size">${this._formatSize(item.sizeBytes)}</span>
                      </div>
                      <span class="item-path">${item.path}</span>
                      <div class="reason-row">
                        <span class="type-badge ${typeClass}">${typeLabel}</span>
                        <span class="reason-text">${item.reason}</span>
                      </div>
                    </div>
                  </div>
                `;
                })
          }
        </div>

        <div class="footer">
          <button
            class="btn-apply"
            ?disabled="${removeCount === 0 || this._executing}"
            @click="${this._onApply}"
          >
            ${this._executing ? this.t('cleanup.applying') : `${this.t('cleanup.apply')} (${removeCount})`}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-cleanup-panel': AnimoriaCleanupPanel;
  }
}
