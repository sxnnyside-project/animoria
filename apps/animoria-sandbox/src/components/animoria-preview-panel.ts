import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import { t } from '@animoria/core/i18n';

@customElement('animoria-preview-panel')
export class AnimoriaPreviewPanel extends LitElement {
  @property({ type: Object }) asset: AnimoriaAsset | null = null;
  @property({ type: String }) locale = 'en';

  static override styles = css`
    :host {
      display: block;
      width: 340px;
      height: 100%;
      border-left: 1px solid var(--animoria-border-color);
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-primary);
      overflow-y: auto;
      box-sizing: border-box;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 32px;
      text-align: center;
      color: var(--animoria-text-muted);
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.6;
    }

    .container {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .format-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--animoria-badge-bg);
      color: var(--animoria-accent-hover);
      letter-spacing: 0.05em;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      word-break: break-all;
      color: var(--animoria-text-primary);
    }

    .path {
      font-size: 11px;
      color: var(--animoria-text-muted);
      word-break: break-all;
      background: rgba(0, 0, 0, 0.2);
      padding: 6px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
    }

    .section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--animoria-border-color);
      border-radius: 6px;
      padding: 12px;
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
      border-bottom: 1px solid var(--animoria-border-color);
      padding-bottom: 6px;
      margin: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .grid-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .grid-label {
      font-size: 10px;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
    }

    .grid-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--animoria-text-primary);
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .list-item {
      font-size: 12px;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
      word-break: break-all;
    }

    .badge-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge-item {
      font-size: 11px;
      background: var(--animoria-hover-bg);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid var(--animoria-border-color);
    }

    .thumbnail-preview {
      width: 100%;
      height: 160px;
      border-radius: 6px;
      border: 1px solid var(--animoria-border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--animoria-bg-primary);
      position: relative;
    }

    .thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  private _renderMetadataDetails() {
    const { asset } = this;
    if (!asset || asset.status !== 'parsed' || !asset.metadata) return html``;

    const { metadata } = asset;

    switch (metadata.format) {
      case 'lottie':
      case 'dotlottie': {
        return html`
          <div class="section">
            <h3 class="section-title">${this.t('preview.lottieDetails')}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.fps')}</span>
                <span class="grid-value">${metadata.fps}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.totalFrames')}</span>
                <span class="grid-value">${metadata.totalFrames}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.layerCount')}</span>
                <span class="grid-value">${metadata.layerCount}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.duration')}</span>
                <span class="grid-value">${metadata.durationSeconds}s</span>
              </div>
            </div>
          </div>

          ${metadata.markers && metadata.markers.length > 0
            ? html`
                <div class="section">
                  <h3 class="section-title">${this.t('preview.markers')}</h3>
                  <div class="list">
                    ${metadata.markers.map(
                      (m) => html`
                        <div class="list-item">
                          <strong>${m.name}</strong> (frame ${m.frame}, duration
                          ${m.durationFrames}f)
                        </div>
                      `
                    )}
                  </div>
                </div>
              `
            : ''}
          ${metadata.dotLottie && metadata.dotLottie.animations.length > 0
            ? html`
                <div class="section">
                  <h3 class="section-title">${this.t('preview.dotlottieContent')}</h3>
                  <div class="list">
                    ${metadata.dotLottie.animations.map(
                      (a) => html`
                        <div class="list-item">
                          ID: <code>${a.id}</code>${a.name ? ` (${a.name})` : ''}
                        </div>
                      `
                    )}
                  </div>
                </div>
              `
            : ''}
        `;
      }

      case 'rive': {
        return html`
          <div class="section">
            <h3 class="section-title">${this.t('preview.riveDetails')}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.artboards')}</span>
                <span class="grid-value">${metadata.artboards.length}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.stateMachines')}</span>
                <span class="grid-value">${metadata.stateMachines.length}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t('preview.artboards')}</h3>
            <div class="badge-grid">
              ${metadata.artboards.map((a) => html`<span class="badge-item">${a}</span>`)}
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t('preview.stateMachines')}</h3>
            <div class="badge-grid">
              ${metadata.stateMachines.map((sm) => html`<span class="badge-item">${sm}</span>`)}
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t('preview.animations')}</h3>
            <div class="badge-grid">
              ${metadata.animations.map((a) => html`<span class="badge-item">${a}</span>`)}
            </div>
          </div>
        `;
      }

      case 'gif':
      case 'apng': {
        return html`
          <div class="section">
            <h3 class="section-title">${this.t('preview.rasterDetails')}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.frameCount')}</span>
                <span class="grid-value">${metadata.frameCount}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.loopCount')}</span>
                <span class="grid-value">
                  ${metadata.loopCount === 0 ? this.t('preview.infinite') : metadata.loopCount}
                </span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.duration')}</span>
                <span class="grid-value">${metadata.durationSeconds}s</span>
              </div>
            </div>
          </div>
        `;
      }

      case 'animated-svg': {
        return html`
          <div class="section">
            <h3 class="section-title">${this.t('preview.svgDetails')}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.animationType')}</span>
                <span class="grid-value" style="text-transform: uppercase;">
                  ${metadata.animationType}
                </span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.elementCount')}</span>
                <span class="grid-value">${metadata.elementCount}</span>
              </div>
            </div>
          </div>
        `;
      }

      default:
        return html``;
    }
  }

  override render() {
    const { asset } = this;
    if (!asset) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">&spar;</div>
          <div>${this.t('preview.emptyMessage')}</div>
        </div>
      `;
    }

    return html`
      <div class="container">
        <div class="thumbnail-preview">
          ${asset.thumbnailPath
            ? html` <img class="thumbnail-img" src="${asset.thumbnailPath}" alt="${asset.name}" /> `
            : html`
                <animoria-thumbnail-fallback
                  .name="${asset.name}"
                  .format="${asset.format}"
                  style="width: 80px; height: 80px;"
                ></animoria-thumbnail-fallback>
              `}
        </div>

        <div class="header">
          <span class="format-badge">${asset.format}</span>
          <h2 class="title">${asset.name}</h2>
          <div class="path">${asset.path}</div>
        </div>

        <div class="section">
          <h3 class="section-title">${this.t('preview.dimensionsSize')}</h3>
          <div class="grid">
            <div class="grid-item">
              <span class="grid-label">${this.t('preview.dimensions')}</span>
              <span class="grid-value">
                ${asset.metadata
                  ? html`${asset.metadata.width}&times;${asset.metadata.height}`
                  : '—'}
              </span>
            </div>
            <div class="grid-item">
              <span class="grid-label">${this.t('preview.size')}</span>
              <span class="grid-value">${this._formatSize(asset.sizeBytes)}</span>
            </div>
          </div>
        </div>

        ${asset.status === 'error'
          ? html`
              <div class="section" style="border-color: var(--animoria-error-text);">
                <h3 class="section-title" style="color: var(--animoria-error-text);">
                  ${this.t('preview.errorTitle')}
                </h3>
                <div
                  class="list-item"
                  style="color: var(--animoria-error-text); background: rgba(244, 63, 94, 0.05);"
                >
                  ${asset.error ?? 'Unknown validation/parsing error'}
                </div>
              </div>
            `
          : this._renderMetadataDetails()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-preview-panel': AnimoriaPreviewPanel;
  }
}
