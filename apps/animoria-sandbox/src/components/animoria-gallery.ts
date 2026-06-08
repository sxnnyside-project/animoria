import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import './animoria-asset-item.js';

@customElement('animoria-gallery')
export class AnimoriaGallery extends LitElement {
  @property({ type: Array }) assets: AnimoriaAsset[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) workspacePath = '';

  @state() private _query = '';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px 8px;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      flex-shrink: 0;
    }

    .title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #bbbbbb;
    }

    .count {
      font-size: 11px;
      background: #3a3d41;
      color: #cccccc;
      padding: 1px 6px;
      border-radius: 8px;
    }

    .search-wrap {
      padding: 6px 8px;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      flex-shrink: 0;
    }

    .search {
      width: 100%;
      background: #3c3c3c;
      border: 1px solid #3e3e42;
      border-radius: 3px;
      color: #cccccc;
      font-size: 12px;
      padding: 4px 8px;
      outline: none;
    }

    .search:focus {
      border-color: #007acc;
    }

    .search::placeholder {
      color: #858585;
    }

    .list {
      flex: 1;
      overflow-y: auto;
    }

    .list::-webkit-scrollbar {
      width: 6px;
    }

    .list::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 3px;
    }

    .empty {
      padding: 20px 12px;
      font-size: 12px;
      color: #858585;
      text-align: center;
    }
  `;

  private get filteredAssets(): AnimoriaAsset[] {
    if (!this._query) return this.assets;
    const q = this._query.toLowerCase();
    return this.assets.filter(
      a => a.name.toLowerCase().includes(q) || a.stem.toLowerCase().includes(q)
    );
  }

  private _onInput(e: Event) {
    this._query = (e.target as HTMLInputElement).value;
  }

  render() {
    const filtered = this.filteredAssets;

    return html`
      <div class="header">
        <span class="title">Animoria</span>
        <span class="count">${this.assets.length}</span>
      </div>

      <div class="search-wrap">
        <input
          class="search"
          type="text"
          placeholder="Search animations..."
          .value=${this._query}
          @input=${this._onInput}
        />
      </div>

      <div class="list">
        ${this.loading ? html`
          <p class="empty">Scanning workspace&hellip;</p>
        ` : this.assets.length === 0 ? html`
          <p class="empty">No animated assets found.</p>
        ` : filtered.length === 0 ? html`
          <p class="empty">No results for &ldquo;${this._query}&rdquo;</p>
        ` : filtered.map(asset => html`
          <animoria-asset-item .asset=${asset}></animoria-asset-item>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-gallery': AnimoriaGallery;
  }
}
