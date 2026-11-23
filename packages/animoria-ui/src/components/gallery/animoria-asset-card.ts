import type { Asset, RuleDiagnostic } from '@animoria/contracts';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { ReferenceState } from '../../view-model/analysis-view-model.js';
import {
  formatBytes,
  referenceExplanation,
  referenceLabel,
} from '../../view-model/analysis-view-model.js';
import '../badges/animoria-root-badge.js';
import { AnimoriaElement } from '../common/events.js';

@customElement('animoria-asset-card')
export class AnimoriaAssetCard extends AnimoriaElement {
  @property({ type: Object }) asset: Asset | null = null;
  /** Findings concerning this asset. Passed in; never derived here. */
  @property({ type: Array }) diagnostics: readonly RuleDiagnostic[] = [];
  /** A `data:` URI or host URL. `null` renders the format placeholder. */
  @property({ type: String }) thumbnailSource: string | null = null;
  @property({ type: Number }) referenceCount = 0;
  /** How confidently the count can be read. Never rendered as a bare number. */
  @property({ type: String }) referenceState: ReferenceState = 'unavailable';
  @property({ type: Boolean }) isSelected = false;
  /** Row layout instead of a grid tile. */
  @property({ type: Boolean }) isDense = false;
  /** Root attribution, carried from Core. See `animoria-root-badge`. */
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) shouldHideRoot = false;

  @state() private _isCopied = false;
  @state() private _isDragging = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      background: var(--animoria-bg-secondary);
      cursor: pointer;
      user-select: none;
      transition: background-color 120ms ease, border-color 120ms ease, opacity 120ms ease;
    }

    .card:hover {
      background: var(--animoria-bg-hover);
    }

    .card:focus-visible {
      outline: 2px solid var(--animoria-focus-ring);
      outline-offset: -1px;
    }

    .card.selected {
      background: var(--animoria-bg-selected);
      border-color: var(--animoria-focus-ring);
    }

    .card.dense {
      flex-direction: row;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .card.dragging {
      opacity: 0.4;
    }

    .thumb {
      position: relative;
      width: 100%;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--animoria-bg-primary);
      border-radius: var(--animoria-radius-sm);
      overflow: hidden;
    }

    .card.dense .thumb {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .thumb img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .placeholder {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--animoria-text-muted);
    }

    .quick-actions {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 3px;
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .card:hover .quick-actions,
    .quick-actions:focus-within {
      opacity: 1;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-secondary);
      cursor: pointer;
      outline: none;
      transition: all 120ms ease;
    }

    .action-btn:hover {
      background: var(--animoria-bg-hover);
      color: var(--animoria-text-primary);
      border-color: var(--animoria-focus-ring);
    }

    .action-btn.copied {
      background: var(--animoria-success);
      color: #fff;
      border-color: var(--animoria-success);
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .name {
      font-weight: 500;
      color: var(--animoria-text-strong);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-1);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    .format {
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-hover);
      color: var(--animoria-text-secondary);
    }

    .findings {
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      color: var(--finding-color, var(--animoria-warning));
    }

    .unparsed {
      color: var(--animoria-danger);
      font-size: var(--animoria-font-size-xs);
    }
  `;

  focusCard(): void {
    const cardEl = this.shadowRoot?.querySelector<HTMLElement>('.card');
    cardEl?.focus();
  }

  private get _worstSeverityColor(): string {
    if (this.diagnostics.some((d) => d.severity === 'error')) {
      return 'var(--animoria-danger)';
    }
    if (this.diagnostics.some((d) => d.severity === 'warning')) {
      return 'var(--animoria-warning)';
    }
    return 'var(--animoria-info)';
  }

  private _handleDragStart(e: DragEvent): void {
    if (!this.asset || !e.dataTransfer) return;
    this._isDragging = true;
    const path = this.asset.relative_path || this.asset.path;
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.setData(
      'application/x-animoria-asset',
      JSON.stringify({
        path: this.asset.path,
        relativePath: this.asset.relative_path,
        name: this.asset.name,
        format: this.asset.format,
        rootId: this.rootId,
      }),
    );
    e.dataTransfer.effectAllowed = 'copyLink';
  }

  private _handleDragEnd(): void {
    this._isDragging = false;
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._select();
    } else if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      e.preventDefault();
      this.emit('asset-key-nav', { key: e.key, assetPath: this.asset?.path });
    }
  }

  private _copyPath(e: Event): void {
    e.stopPropagation();
    if (!this.asset) return;
    const pathToCopy = this.asset.relative_path || this.asset.path;
    navigator.clipboard?.writeText(pathToCopy).catch(() => {});
    this._isCopied = true;
    window.setTimeout(() => {
      this._isCopied = false;
    }, 1500);
    this.emit('copy-asset-path', { assetPath: pathToCopy });
  }

  private _openAsset(e: Event): void {
    e.stopPropagation();
    if (!this.asset) return;
    this.emit('open-asset', { assetPath: this.asset.path, rootId: this.rootId });
  }

  private _select(): void {
    if (!this.asset) return;
    this.emit('select-asset', { assetPath: this.asset.path, rootId: this.rootId });
  }

  override render() {
    const asset = this.asset;
    if (!asset) return nothing;

    return html`
      <div
        class=${classMap({
          card: true,
          dense: this.isDense,
          selected: this.isSelected,
          dragging: this._isDragging,
        })}
        role="button"
        tabindex="0"
        aria-label=${asset.name}
        aria-selected=${this.isSelected}
        draggable="true"
        @dragstart=${this._handleDragStart}
        @dragend=${this._handleDragEnd}
        @click=${this._select}
        @keydown=${this._handleKeyDown}
      >
        <div class="thumb">
          ${
            this.thumbnailSource
              ? html`<img src=${ifDefined(this.thumbnailSource)} alt="" />`
              : html`<span class="placeholder">${asset.format}</span>`
          }
          <div class="quick-actions" @click=${(e: Event) => e.stopPropagation()}>
            <button
              class=${classMap({ 'action-btn': true, copied: this._isCopied })}
              type="button"
              title=${this._isCopied ? 'Copied relative path!' : 'Copy relative path'}
              aria-label=${this._isCopied ? 'Copied' : 'Copy relative path'}
              @click=${this._copyPath}
            >
              ${
                this._isCopied
                  ? html`<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>`
                  : html`<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25v-7.5zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5z"/></svg>`
              }
            </button>
            <button
              class="action-btn"
              type="button"
              title="Open asset in editor"
              aria-label="Open asset in editor"
              @click=${this._openAsset}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2zm6.5-.25a.75.75 0 0 1 .75-.75h4.25c.414 0 .75.336.75.75v4.25a.75.75 0 0 1-1.5 0V3.56L8.53 9.53a.75.75 0 0 1-1.06-1.06l5.97-5.97h-2.44a.75.75 0 0 1-.75-.75z"/></svg>
            </button>
          </div>
        </div>
        <div class="body">
          <div class="name" title=${ifDefined(asset.path)}>${asset.name}</div>
          <animoria-root-badge
            .isQuiet=${true}
            .rootName=${this.rootName}
            ?hidden=${this.shouldHideRoot}
          ></animoria-root-badge>
          <div class="meta">
            <span class="format">${asset.format}</span>
            <span>${formatBytes(asset.size_bytes)}</span>
            ${
              this.diagnostics.length > 0
                ? html`<span
                    class="findings"
                    style=${styleMap({ '--finding-color': this._worstSeverityColor })}
                    title=${`${this.diagnostics.length} governance finding(s) on this asset`}
                  >
                    ${this.diagnostics.length}
                    ${this.diagnostics.length === 1 ? 'finding' : 'findings'}
                  </span>`
                : nothing
            }
          </div>
          ${
            asset.is_valid
              ? html`<div class="meta">
                <span title=${referenceExplanation(this.referenceState)}>
                  ${referenceLabel(this.referenceCount, this.referenceState)}
                </span>
              </div>`
              : html`<div class="unparsed">Could not be parsed</div>`
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-asset-card': AnimoriaAssetCard;
  }
}
