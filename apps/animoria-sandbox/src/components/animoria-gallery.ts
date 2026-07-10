import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import { t } from '@animoria/core/i18n';
import './animoria-asset-item.js';

@customElement('animoria-gallery')
export class AnimoriaGallery extends LitElement {
  @property({ type: Array }) assets: AnimoriaAsset[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) progressMessage = '';
  @property({ type: Number }) progressPercent = 0;
  @property({ type: String }) workspacePath = '';
  @property({ type: String }) locale = 'en';

  @state() private _query = '';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--animoria-bg-primary);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px 8px;
      background: var(--animoria-bg-primary);
      border-bottom: 1px solid var(--animoria-border-color);
      flex-shrink: 0;
    }

    .title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--animoria-text-primary);
    }

    .count {
      font-size: 11px;
      background: var(--animoria-badge-bg);
      color: var(--animoria-text-primary);
      padding: 1px 6px;
      border-radius: 8px;
    }

    .search-wrap {
      padding: 6px 8px;
      background: var(--animoria-bg-primary);
      border-bottom: 1px solid var(--animoria-border-color);
      flex-shrink: 0;
    }

    .search {
      width: 100%;
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border-color);
      border-radius: 3px;
      color: var(--animoria-text-primary);
      font-size: 12px;
      padding: 4px 8px;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .search:focus {
      border-color: var(--animoria-accent);
    }

    .search::placeholder {
      color: var(--animoria-text-muted);
    }

    .list {
      flex: 1;
      overflow-y: auto;
    }

    .list::-webkit-scrollbar {
      width: 6px;
    }

    .list::-webkit-scrollbar-thumb {
      background: var(--animoria-scroll-thumb);
      border-radius: 3px;
    }

    .list::-webkit-scrollbar-thumb:hover {
      background: var(--animoria-scroll-thumb-hover);
    }

    .empty {
      padding: 20px 12px;
      font-size: 12px;
      color: var(--animoria-text-muted);
      text-align: center;
    }

    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--animoria-accent), var(--animoria-accent-hover));
      transition: width 0.2s ease-out;
      box-shadow: 0 0 8px var(--animoria-accent);
    }

    .empty-card {
      padding: 40px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px dashed var(--animoria-border-color);
      border-radius: 8px;
      margin: 20px;
    }

    .empty-icon {
      font-size: 40px;
      opacity: 0.7;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--animoria-text-primary);
      margin: 0;
    }

    .empty-desc {
      font-size: 12px;
      color: var(--animoria-text-muted);
      margin: 0 0 8px 0;
      line-height: 1.5;
      max-width: 240px;
    }

    .inject-btn {
      background: var(--animoria-accent);
      color: var(--animoria-accent-text);
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      transition:
        background-color 0.2s ease,
        transform 0.1s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .inject-btn:hover {
      background: var(--animoria-accent-hover);
    }

    .inject-btn:active {
      transform: scale(0.97);
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  private get filteredAssets(): AnimoriaAsset[] {
    if (!this._query) return this.assets;
    const q = this._query.toLowerCase();
    return this.assets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.stem.toLowerCase().includes(q)
    );
  }

  private _onInput(e: Event) {
    this._query = (e.target as HTMLInputElement).value;
  }

  private _onInjectDemo() {
    window.postMessage({ command: 'injectDemo', target: 'extension' }, '*');
  }

  render() {
    const filtered = this.filteredAssets;

    return html`
      <div class="header">
        <span class="title">${this.t('gallery.title')}</span>
        <span class="count">${this.assets.length}</span>
      </div>

      ${this.loading
        ? html`
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${this.progressPercent}%"></div>
            </div>
          `
        : ''}

      <div class="search-wrap">
        <input
          class="search"
          type="text"
          placeholder="${this.t('gallery.searchPlaceholder')}"
          .value="${this._query}"
          @input="${this._onInput}"
        />
      </div>

      <div class="list">
        ${this.loading && this.assets.length === 0
          ? html`
              <p class="empty">
                ${this.progressMessage || this.t('gallery.scanning')} (${this.progressPercent}%)
              </p>
            `
          : this.assets.length === 0
            ? html`
                <div class="empty-card">
                  <div class="empty-icon">📂</div>
                  <p class="empty-title">${this.t('gallery.emptyTitle')}</p>
                  <p class="empty-desc">${this.t('gallery.emptyDesc')}</p>
                  <button class="inject-btn" @click="${this._onInjectDemo}">
                    ${this.t('gallery.injectDemo')}
                  </button>
                </div>
              `
            : filtered.length === 0
              ? html`
                  <p class="empty">${this.t('gallery.noResults')} &ldquo;${this._query}&rdquo;</p>
                `
              : filtered.map(
                  (asset) => html`
                    <animoria-asset-item
                      .asset="${asset}"
                      .locale="${this.locale}"
                    ></animoria-asset-item>
                  `
                )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-gallery': AnimoriaGallery;
  }
}
