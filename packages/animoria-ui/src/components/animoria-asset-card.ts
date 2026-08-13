import type { AnimoriaAsset, RuleDiagnostic } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ReferenceState } from '../view-model/analysis-view-model.js';
import {
  formatBytes,
  referenceExplanation,
  referenceLabel,
} from '../view-model/analysis-view-model.js';
import './animoria-root-badge.js';

/**
 * One asset, as the product presents it.
 *
 * ## What this consolidates
 * Four implementations of the same tile: the sandbox's `animoria-asset-item`, VS
 * Code's `AssetCardModel` + inline card CSS, and JetBrains' inline card markup in
 * `AnimoriaGalleryPanel`. They disagreed on which fields to show, on how to format a
 * size, and on whether a finding was indicated at all — so the same asset looked
 * like a different asset in each IDE.
 *
 * ## Why the badge is a count and not a classification
 * The card shows *how many* findings concern this asset and their worst severity. It
 * does not name the category. Naming it would require deciding which of several
 * findings is "the" one, which is a judgement — and the three previous cards each
 * made it differently. The names live one click away, in the finding list, where all
 * of them are visible.
 *
 * ## Thumbnails
 * The card never reads a file. It renders `thumbnailSource` if the host supplied one
 * and a format placeholder otherwise, so a host with no thumbnail pipeline degrades
 * to a legible tile rather than a broken image.
 */
@customElement('animoria-asset-card')
export class AnimoriaAssetCard extends LitElement {
  @property({ type: Object }) asset: AnimoriaAsset | null = null;
  /** Findings concerning this asset. Passed in; never derived here. */
  @property({ type: Array }) diagnostics: readonly RuleDiagnostic[] = [];
  /** A `data:` URI or host URL. `null` renders the format placeholder. */
  @property({ type: String }) thumbnailSource: string | null = null;
  @property({ type: Number }) referenceCount = 0;
  /** How confidently the count can be read. Never rendered as a bare number. */
  @property({ type: String }) referenceState: ReferenceState = 'unavailable';
  @property({ type: Boolean }) selected = false;
  /** Row layout instead of a grid tile. */
  @property({ type: Boolean }) dense = false;
  /** Root attribution, carried from Core. See `animoria-root-badge`. */
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) hideRoot = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      background: var(--animoria-bg-secondary);
      cursor: pointer;
      transition: background-color 120ms ease;
    }

    .card:hover {
      background: var(--animoria-bg-hover);
    }

    .card.selected {
      background: var(--animoria-bg-selected);
      border-color: var(--animoria-focus-ring);
    }

    .card:focus-visible {
      outline: 2px solid var(--animoria-focus-ring);
      outline-offset: 1px;
    }

    .thumb {
      aspect-ratio: 1;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .thumb img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .placeholder {
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--animoria-text-muted);
    }

    .name {
      font-weight: 600;
      color: var(--animoria-text-strong);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-1);
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-xs);
    }

    .format {
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      padding: 0 4px;
      border-radius: 3px;
      background: var(--animoria-neutral-quiet);
      color: var(--animoria-text-muted);
      text-transform: uppercase;
    }

    .findings {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      padding: 0 5px;
      border-radius: 8px;
      color: var(--finding-color);
      border: 1px solid var(--finding-color);
    }

    /* Dense (row) layout. */
    .card.dense {
      flex-direction: row;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .card.dense .thumb {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      aspect-ratio: auto;
    }

    .card.dense .body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .unparsed {
      color: var(--animoria-danger);
      font-size: var(--animoria-font-size-xs);
    }
  `;

  private get _worstSeverityColor(): string {
    if (this.diagnostics.some((d) => d.severity === 'error')) return 'var(--animoria-danger)';
    if (this.diagnostics.some((d) => d.severity === 'warning')) return 'var(--animoria-warning)';
    return 'var(--animoria-info)';
  }

  private _select(): void {
    if (!this.asset) return;
    this.dispatchEvent(
      new CustomEvent('select-asset', {
        detail: { assetPath: this.asset.path, rootId: this.rootId },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const asset = this.asset;
    if (!asset) return nothing;

    return html`
      <div
        class="card ${this.dense ? 'dense' : ''} ${this.selected ? 'selected' : ''}"
        role="button"
        tabindex="0"
        aria-label=${asset.name}
        @click=${this._select}
        @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._select()}
      >
        <div class="thumb">
          ${
            this.thumbnailSource
              ? html`<img src=${this.thumbnailSource} alt="" />`
              : html`<span class="placeholder">${asset.format}</span>`
          }
        </div>
        <div class="body">
          <div class="name" title=${asset.path}>${asset.name}</div>
          <animoria-root-badge
            quiet
            .rootName=${this.rootName}
            ?hidden=${this.hideRoot}
          ></animoria-root-badge>
          <div class="meta">
            <span class="format">${asset.format}</span>
            <span>${formatBytes(asset.sizeBytes)}</span>
            ${
              this.diagnostics.length > 0
                ? html`<span
                    class="findings"
                    style="--finding-color: ${this._worstSeverityColor}"
                    title=${`${this.diagnostics.length} governance finding(s) on this asset`}
                  >
                    ${this.diagnostics.length}
                    ${this.diagnostics.length === 1 ? 'finding' : 'findings'}
                  </span>`
                : nothing
            }
          </div>
          ${
            asset.status === 'parsed'
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
