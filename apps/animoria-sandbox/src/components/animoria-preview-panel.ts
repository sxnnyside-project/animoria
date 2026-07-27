import type { AnimoriaAsset, RuleEngineReport } from '@animoria/core';
import { t } from '@animoria/core/i18n';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AnimationItem } from 'lottie-web';
import './mingcute-icon.js';

/**
 * Renders metadata, playback, and usage references for one animated asset.
 * Static assets (`AnimoriaStaticAsset`) have no `status`/`metadata`/`error`
 * fields this panel depends on throughout — see `animoria-app.ts`, which
 * only assigns `.asset` here when the current selection is animated.
 */
@customElement('animoria-preview-panel')
export class AnimoriaPreviewPanel extends LitElement {
  @property({ type: Object }) asset: AnimoriaAsset | null = null;
  @property({ type: String }) locale = 'en';
  @property({ type: Object }) ruleReport: RuleEngineReport | null = null;
  @property({ type: Map }) referenceCounts = new Map<string, number>();

  @state() private _isPlaying = true;
  @state() private _speed = 1;
  @state() private _currentFrame = 0;
  @state() private _totalFrames = 0;
  @state() private _showAstJson = false;

  private _lottieInstance: AnimationItem | null = null;

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

    .panel-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-scroll::-webkit-scrollbar {
      width: 6px;
    }

    .panel-scroll::-webkit-scrollbar-thumb {
      background: var(--animoria-scroll-thumb);
      border-radius: 3px;
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
      gap: 8px;
    }

    .player-container {
      background-color: #0b0c10;
      background-image: 
        linear-gradient(45deg, #161822 25%, transparent 25%), 
        linear-gradient(-45deg, #161822 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #161822 75%), 
        linear-gradient(-45deg, transparent 75%, #161822 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      border: 1px solid var(--animoria-border-color);
      border-radius: 4px;
      position: relative;
      overflow: hidden;
      aspect-ratio: 1.33;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #lottie-container {
      width: 100%;
      height: 100%;
    }

    .non-lottie-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--animoria-text-muted);
      gap: 6px;
    }

    .player-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: rgba(0, 0, 0, 0.4);
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
    }

    .scrubber-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .scrubber {
      flex: 1;
      accent-color: var(--animoria-accent);
      cursor: pointer;
    }

    .frame-counter {
      font-size: 10px;
      font-family: monospace;
      color: #94a3b8;
      min-width: 65px;
      text-align: right;
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .btn-play {
      background: var(--animoria-accent);
      color: var(--animoria-accent-text);
      border: none;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-play:hover {
      background: var(--animoria-accent-hover);
    }

    .speed-selector {
      display: flex;
      gap: 4px;
    }

    .btn-speed {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--animoria-border-color);
      color: var(--animoria-text-primary);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      cursor: pointer;
      font-family: monospace;
    }

    .btn-speed.active {
      background: var(--animoria-accent);
      border-color: var(--animoria-accent);
      color: var(--animoria-accent-text);
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .format-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--animoria-badge-bg);
      color: var(--animoria-accent-hover);
      letter-spacing: 0.05em;
      font-family: monospace;
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      word-break: break-all;
      color: var(--animoria-text-primary);
      margin: 0;
    }

    .path-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      background: rgba(0, 0, 0, 0.3);
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
    }

    .path {
      font-size: 10px;
      color: var(--animoria-text-muted);
      word-break: break-all;
      font-family: monospace;
    }

    .section {
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid var(--animoria-border-color);
      border-radius: 4px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--animoria-text-muted);
      border-bottom: 1px solid var(--animoria-border-color);
      padding-bottom: 4px;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
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
      font-size: 12px;
      font-weight: 600;
      font-family: monospace;
    }

    .diag-item {
      padding: 6px 8px;
      border-radius: 3px;
      font-size: 11px;
      line-height: 1.4;
    }

    .diag-error {
      background: rgba(244, 63, 94, 0.08);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: #f43f5e;
    }

    .diag-warning {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .ref-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }

    .ref-orphaned {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .ref-overused {
      background: rgba(244, 63, 94, 0.15);
      color: #f43f5e;
    }

    .ref-normal {
      background: rgba(255, 255, 255, 0.05);
      color: var(--animoria-text-primary);
    }

    .json-ast {
      background: #040508;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 8px;
      font-size: 10px;
      font-family: monospace;
      color: #a5b4fc;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 180px;
      overflow-y: auto;
    }

    .btn-delete {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #f43f5e;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background-color 0.2s ease;
    }

    .btn-delete:hover {
      background: #f43f5e;
      color: #fff;
    }
  `;

  override updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('asset')) {
      this._loadAnimation();
    }
  }

  private async _loadAnimation() {
    if (this._lottieInstance) {
      this._lottieInstance.destroy();
      this._lottieInstance = null;
    }

    if (!this.asset || this.asset.status === 'error' || this.asset.format !== 'lottie') return;

    await this.updateComplete;

    const container = this.renderRoot.querySelector('#lottie-container');
    if (!container) return;

    try {
      let animationData: unknown;
      const isSandbox =
        typeof window !== 'undefined' &&
        (window.location.protocol === 'http:' || window.location.protocol === 'https:');

      if (isSandbox) {
        const res = await fetch(`/api/file?path=${encodeURIComponent(this.asset.path)}`);
        if (res.ok) {
          animationData = await res.json();
        }
      }

      if (!animationData) {
        animationData = this._getFallbackLottieJson();
      }

      const lottie = (await import('lottie-web')).default;
      const instance = lottie.loadAnimation({
        container: container as Element,
        renderer: 'svg',
        loop: true,
        autoplay: this._isPlaying,
        animationData,
      });
      this._lottieInstance = instance;

      instance.setSpeed(this._speed);
      this._totalFrames = instance.totalFrames;

      instance.addEventListener('enterFrame', () => {
        this._currentFrame = Math.round(instance.currentFrame);
      });
    } catch (err) {
      console.error('Failed to load Lottie web animation:', err);
    }
  }

  private _togglePlay() {
    if (!this._lottieInstance) return;
    this._isPlaying = !this._isPlaying;
    if (this._isPlaying) {
      this._lottieInstance.play();
    } else {
      this._lottieInstance.pause();
    }
  }

  private _setSpeed(speed: number) {
    this._speed = speed;
    if (this._lottieInstance) {
      this._lottieInstance.setSpeed(speed);
    }
  }

  private _onScrub(e: Event) {
    if (!this._lottieInstance) return;
    const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
    this._currentFrame = val;
    this._lottieInstance.goToAndStop(val, true);
    this._isPlaying = false;
  }

  private _onDeleteAsset() {
    if (!this.asset) return;
    if (confirm(this.t('preview.confirmDelete'))) {
      window.postMessage(
        { command: 'deleteAsset', path: this.asset.path, target: 'extension' },
        '*'
      );
    }
  }

  t(key: string): string {
    return t(key, this.locale);
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _getFallbackLottieJson() {
    return {
      v: '5.5.7',
      fr: 30,
      ip: 0,
      op: 60,
      w: 100,
      h: 100,
      nm: 'Fallback',
      ddd: 0,
      assets: [],
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: 'Circle',
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: {
              a: 1,
              k: [
                { t: 0, s: [10, 50, 0], e: [90, 50, 0] },
                { t: 30, s: [90, 50, 0], e: [10, 50, 0] },
                { t: 60, s: [10, 50, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          ao: 0,
          shapes: [
            {
              ty: 'gr',
              it: [
                {
                  d: 1,
                  ty: 'el',
                  s: { a: 0, k: [20, 20] },
                  p: { a: 0, k: [0, 0] },
                  nm: 'Ellipse Path',
                },
                {
                  ty: 'fl',
                  c: { a: 0, k: [0.388, 0.4, 0.945, 1] },
                  o: { a: 0, k: 100 },
                  nm: 'Fill',
                },
                {
                  ty: 'tr',
                  p: { a: 0, k: [0, 0] },
                  a: { a: 0, k: [0, 0] },
                  s: { a: 0, k: [100, 100] },
                  r: { a: 0, k: 0 },
                  o: { a: 0, k: 100 },
                  nm: 'Transform',
                },
              ],
              nm: 'Ellipse',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
      ],
    };
  }

  private _renderMetadataDetails() {
    const metadata = this.asset?.metadata;
    if (!metadata) return html``;

    return html`
      <div class="section">
        <div class="section-title">
          <span>${this.t('preview.astInspector')}</span>
          <button
            style="background: transparent; border: none; color: #818cf8; font-size: 10px; cursor: pointer;"
            @click="${() => {
              this._showAstJson = !this._showAstJson;
            }}"
          >
            ${this._showAstJson ? this.t('preview.hideAst') : this.t('preview.viewAst')}
          </button>
        </div>

        ${
          this._showAstJson
            ? html`<pre class="json-ast">${JSON.stringify(metadata, null, 2)}</pre>`
            : html`
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.fps')}</span>
                <span class="grid-value">${'fps' in metadata ? metadata.fps : '—'}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.duration')}</span>
                <span class="grid-value">${metadata.durationSeconds?.toFixed(2) || '—'}s</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.layerCount')}</span>
                <span class="grid-value">${'layerCount' in metadata ? metadata.layerCount : '—'}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t('preview.artboards')}</span>
                <span class="grid-value">${'artboards' in metadata ? metadata.artboards.length : '—'}</span>
              </div>
            </div>
          `
        }
      </div>
    `;
  }

  private _renderDiagnostics() {
    const asset = this.asset;
    if (!asset) return html``;
    const diags = this.ruleReport?.diagnostics.filter((d) => d.asset.path === asset.path) || [];
    const refs = this.referenceCounts.get(asset.path) ?? 0;

    let refClass = 'ref-normal';
    let refLabel = `${refs} references`;
    if (refs === 0 && asset.status === 'parsed') {
      refClass = 'ref-orphaned';
      refLabel = '0 references (Orphaned asset)';
    } else if (refs >= 10) {
      refClass = 'ref-overused';
      refLabel = `${refs} references (Overused asset)`;
    }

    return html`
      <div class="section">
        <h3 class="section-title">${this.t('preview.diagnosticsTitle')}</h3>

        <div style="margin-bottom: 4px;">
          <span class="grid-label">${this.t('preview.usageOccurrences')}</span>
          <div>
            <span class="ref-badge ${refClass}">${refLabel}</span>
          </div>
        </div>

        ${
          diags.length === 0
            ? html`<div style="font-size: 11px; color: #10b981;">${this.t('preview.noIssues')}</div>`
            : diags.map(
                (d) => html`
              <div class="diag-item ${d.severity === 'error' ? 'diag-error' : 'diag-warning'}">
                <strong>[${d.ruleId}]</strong> ${d.message}
              </div>
            `
              )
        }
      </div>
    `;
  }

  override render() {
    const { asset } = this;
    if (!asset) {
      return html`
        <div class="empty-state">
          <mingcute-icon name="file-code" size="32" color="#64748b"></mingcute-icon>
          <div>${this.t('preview.emptyMessage')}</div>
        </div>
      `;
    }

    const showPlayer = asset.status === 'parsed' && asset.format === 'lottie';

    return html`
      <div class="panel-scroll">
        <!-- Checkerboard Player Container -->
        <div class="player-container">
          ${
            showPlayer
              ? html`<div id="lottie-container"></div>`
              : html`
              <div class="non-lottie-preview">
                <mingcute-icon name="file-code" size="24" color="#64748b"></mingcute-icon>
                <span style="font-size: 10px;">Player verifier supports Lottie format</span>
              </div>
            `
          }
        </div>

        <!-- Scrubber Controls -->
        ${
          showPlayer
            ? html`
            <div class="player-controls">
              <div class="scrubber-row">
                <input
                  class="scrubber"
                  type="range"
                  min="0"
                  max="${this._totalFrames}"
                  .value="${this._currentFrame}"
                  @input="${this._onScrub}"
                />
                <span class="frame-counter">${this._currentFrame} / ${this._totalFrames} fr</span>
              </div>
              <div class="controls-row">
                <button class="btn-play" @click="${this._togglePlay}">
                  <mingcute-icon name="${this._isPlaying ? 'pause-fill' : 'play-fill'}" size="12"></mingcute-icon>
                  ${this._isPlaying ? this.t('preview.pause') : this.t('preview.play')}
                </button>
                <div class="speed-selector">
                  ${[0.5, 1, 1.5, 2].map(
                    (s) => html`
                    <button
                      class="btn-speed ${this._speed === s ? 'active' : ''}"
                      @click="${() => this._setSpeed(s)}"
                    >
                      ${s}x
                    </button>
                  `
                  )}
                </div>
              </div>
            </div>
          `
            : ''
        }

        <!-- Header -->
        <div class="header">
          <span class="format-badge">${asset.format}</span>
          <h2 class="title">${asset.name}</h2>
          <div class="path-row">
            <span class="path">${asset.path}</span>
          </div>
        </div>

        <!-- Technical Specs -->
        <div class="section">
          <h3 class="section-title">${this.t('preview.dimensionsSize')}</h3>
          <div class="grid">
            <div class="grid-item">
              <span class="grid-label">${this.t('preview.dimensions')}</span>
              <span class="grid-value">
                ${
                  asset.metadata?.width
                    ? html`${asset.metadata.width}&times;${asset.metadata.height}`
                    : '—'
                }
              </span>
            </div>
            <div class="grid-item">
              <span class="grid-label">${this.t('preview.size')}</span>
              <span class="grid-value">${this._formatSize(asset.sizeBytes)}</span>
            </div>
          </div>
        </div>

        <!-- Diagnostics -->
        ${this._renderDiagnostics()}

        <!-- AST / Metadata Inspector -->
        ${
          asset.status === 'error'
            ? html`
            <div class="section" style="border-color: var(--animoria-error-text);">
              <h3 class="section-title" style="color: var(--animoria-error-text);">
                ${this.t('preview.errorTitle')}
              </h3>
              <div class="diag-item diag-error">
                ${asset.error ?? 'Unknown validation error'}
              </div>
            </div>
          `
            : this._renderMetadataDetails()
        }

        <!-- Actions -->
        <button class="btn-delete" @click="${this._onDeleteAsset}">
          <mingcute-icon name="trash" size="14"></mingcute-icon>
          ${this.t('preview.deleteAsset')}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-preview-panel': AnimoriaPreviewPanel;
  }
}
