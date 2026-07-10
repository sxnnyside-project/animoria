import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import { t } from '@animoria/core/i18n';
import './animoria-thumbnail-fallback.js';

@customElement('animoria-asset-item')
export class AssetItem extends LitElement {
  @property({ type: Object }) asset!: AnimoriaAsset;
  @property({ type: String }) locale = 'en';

  static styles = css`
    :host {
      display: block;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: var(--animoria-bg-secondary);
      border-bottom: 1px solid var(--animoria-border-color);
      transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .item:hover {
      background: var(--animoria-hover-bg);
    }

    .thumbnail {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid var(--animoria-border-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
    }

    animoria-thumbnail-fallback {
      flex-shrink: 0;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .stem {
      font-size: 13px;
      font-weight: 500;
      color: var(--animoria-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta {
      font-size: 11px;
      color: var(--animoria-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .error {
      font-size: 11px;
      color: var(--animoria-error-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pending {
      font-size: 11px;
      color: var(--animoria-text-muted);
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  private _onClick() {
    this.dispatchEvent(
      new CustomEvent('select-asset', {
        detail: { asset: this.asset },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const { asset } = this;
    if (!asset) return html``;

    return html`
      <div class="item" @click="${this._onClick}">
        ${asset.thumbnailPath
          ? html` <img class="thumbnail" src="${asset.thumbnailPath}" alt="${asset.name}" /> `
          : html`
              <animoria-thumbnail-fallback
                .name="${asset.name}"
                .format="${asset.format}"
              ></animoria-thumbnail-fallback>
            `}

        <div class="info">
          <span class="stem">${asset.stem}</span>
          ${asset.status === 'parsed' && asset.metadata
            ? html`
                <span class="meta">
                  ${'fps' in asset.metadata ? html`${asset.metadata.fps}fps &middot; ` : ''}
                  ${asset.metadata.durationSeconds}s &middot;
                  ${asset.metadata.width}&times;${asset.metadata.height}
                </span>
              `
            : asset.status === 'error'
              ? html` <span class="error">${asset.error ?? this.t('asset.unknownError')}</span> `
              : html` <span class="pending">${this.t('asset.parsing')}&hellip;</span> `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-asset-item': AssetItem;
  }
}
