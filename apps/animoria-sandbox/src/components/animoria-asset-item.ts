import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';

@customElement('animoria-asset-item')
export class AnimoriaAssetItem extends LitElement {
  @property({ type: Object }) asset!: AnimoriaAsset;

  static styles = css`
    :host {
      display: block;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 12px;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      cursor: default;
      user-select: none;
    }

    .item:hover {
      background: #2a2d2e;
    }

    .stem {
      flex: 1;
      font-size: 13px;
      color: #cccccc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 2px 5px;
      border-radius: 3px;
      background: #0e639c;
      color: #ffffff;
      flex-shrink: 0;
    }

    .meta {
      font-size: 11px;
      color: #858585;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .error {
      font-size: 11px;
      color: #f48771;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 1;
    }

    .pending {
      font-size: 11px;
      color: #858585;
      flex-shrink: 0;
    }
  `;

  render() {
    const { asset } = this;
    if (!asset) return html``;

    return html`
      <div class="item">
        <span class="stem">${asset.stem}</span>
        <span class="badge">${asset.format.toUpperCase()}</span>
        ${asset.status === 'parsed' && asset.metadata ? html`
          <span class="meta">
            ${asset.metadata.fps}fps
            &middot;
            ${asset.metadata.durationSeconds}s
            &middot;
            ${asset.metadata.width}&times;${asset.metadata.height}
          </span>
        ` : asset.status === 'error' ? html`
          <span class="error">${asset.error ?? 'Unknown error'}</span>
        ` : html`
          <span class="pending">Parsing&hellip;</span>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-asset-item': AnimoriaAssetItem;
  }
}
