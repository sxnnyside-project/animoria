import type { AnimoriaAsset } from '@animoria/core';
import { t } from '@animoria/core/i18n';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface Candidate {
  asset: AnimoriaAsset;
  referenceCount: number;
}

export interface DuplicateGroup {
  canonicalPath: string;
  duplicatePaths: string[];
  sizeBytes: number;
  potentialSavingsBytes: number;
  candidates: Candidate[];
}

@customElement('animoria-duplicate-resolver')
export class AnimoriaDuplicateResolver extends LitElement {
  @property({ type: Object }) group: DuplicateGroup | null = null;
  @property({ type: String }) locale = 'en';

  @state() private _selectedCanonicalPath = '';
  @state() private _resolving = false;

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
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
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

    .summary-card {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid var(--animoria-border-color);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
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

    .section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--animoria-text-muted);
    }

    .candidates-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .candidate-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--animoria-border-color);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .candidate-card:hover {
      background: var(--animoria-hover-bg);
    }

    .candidate-card.selected {
      border-color: var(--animoria-accent);
      background: rgba(99, 102, 241, 0.08);
    }

    .radio-input {
      margin-top: 3px;
      accent-color: var(--animoria-accent);
    }

    .candidate-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .candidate-name {
      font-size: 13px;
      font-weight: 600;
      word-break: break-all;
    }

    .candidate-path {
      font-size: 11px;
      color: var(--animoria-text-muted);
      word-break: break-all;
    }

    .candidate-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      margin-top: 4px;
    }

    .ref-count {
      color: var(--animoria-text-muted);
    }

    .recommended-badge {
      background: #10b981;
      color: #fff;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
    }

    .explanation {
      font-size: 11px;
      color: var(--animoria-text-muted);
      line-height: 1.4;
      background: rgba(0, 0, 0, 0.1);
      padding: 10px;
      border-radius: 4px;
    }

    .btn-submit {
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

    .btn-submit:hover:not(:disabled) {
      background: var(--animoria-accent-hover);
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  override updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('group') && this.group) {
      const sorted = [...this.group.candidates].sort((a, b) => b.referenceCount - a.referenceCount);
      this._selectedCanonicalPath = sorted[0]?.asset.path || this.group.canonicalPath;
    }
  }

  private _onSelectCandidate(path: string) {
    this._selectedCanonicalPath = path;
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _onClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private async _onSubmit() {
    if (!this.group || this._resolving) return;

    this._resolving = true;

    const duplicatePaths = this.group.candidates
      .map((c) => c.asset.path)
      .filter((p) => p !== this._selectedCanonicalPath);

    window.postMessage(
      {
        command: 'resolveDuplicates',
        canonicalPath: this._selectedCanonicalPath,
        duplicatePaths,
        target: 'extension',
      },
      '*'
    );

    setTimeout(() => {
      this._resolving = false;
      this._onClose();
    }, 500);
  }

  override render() {
    if (!this.group) return html``;

    const maxRefs = Math.max(...this.group.candidates.map((c) => c.referenceCount));

    return html`
      <div class="container">
        <div class="header-row">
          <h2 class="title">${this.t('duplicate.title')}</h2>
          <button class="btn-close" @click="${this._onClose}">&times;</button>
        </div>

        <div class="summary-card">
          <span class="savings-label">${this.t('duplicate.savingsLabel')}</span>
          <span class="savings-value">${this._formatSize(this.group.potentialSavingsBytes)}</span>
        </div>

        <div class="section">
          <span class="section-title">${this.t('duplicate.selectCanonical')}</span>
          <div class="candidates-list">
            ${this.group.candidates.map((c) => {
              const isSelected = this._selectedCanonicalPath === c.asset.path;
              const isRecommended = c.referenceCount === maxRefs && maxRefs > 0;
              return html`
                <div
                  class="candidate-card ${isSelected ? 'selected' : ''}"
                  @click="${() => this._onSelectCandidate(c.asset.path)}"
                >
                  <input
                    type="radio"
                    name="canonical"
                    class="radio-input"
                    .checked="${isSelected}"
                    @change="${() => this._onSelectCandidate(c.asset.path)}"
                  />
                  <div class="candidate-info">
                    <span class="candidate-name">${c.asset.name}</span>
                    <span class="candidate-path">${c.asset.path}</span>
                    <div class="candidate-meta">
                      <span class="ref-count">${c.referenceCount} references</span>
                      ${isRecommended ? html`<span class="recommended-badge">${this.t('duplicate.recommended')}</span>` : ''}
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>

        <div class="explanation">
          ${this.t('duplicate.explanation')}
        </div>

        <button
          class="btn-submit"
          ?disabled="${this._resolving}"
          @click="${this._onSubmit}"
        >
          ${this._resolving ? this.t('duplicate.applying') : this.t('duplicate.submit')}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-duplicate-resolver': AnimoriaDuplicateResolver;
  }
}
