export type Confidence = 'certain' | 'high' | 'moderate' | 'low';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { confidenceLabel } from '../view-model/analysis-view-model.js';

/**
 * Visual badge displaying the diagnostic confidence level (`certain`, `high`, `moderate`, `low`)
 * associated with a governance rule finding.
 */
@customElement('animoria-confidence-badge')
export class AnimoriaConfidenceBadge extends LitElement {
  @property({ type: String }) confidence: Confidence = 'moderate';
  /** Renders the level as a dot only. For dense lists where the word does not fit. */
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host {
      display: inline-flex;
      font-family: var(--animoria-font-family);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--animoria-space-1);
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--animoria-neutral-quiet);
      color: var(--level-color);
      border: 1px solid var(--level-color);
      white-space: nowrap;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--level-color);
      flex-shrink: 0;
    }

    .badge.compact {
      padding: 0;
      border: none;
      background: none;
    }
  `;

  private static readonly COLORS: Readonly<Record<Confidence, string>> = {
    certain: 'var(--animoria-confidence-certain)',
    high: 'var(--animoria-confidence-high)',
    moderate: 'var(--animoria-confidence-moderate)',
    low: 'var(--animoria-confidence-low)',
  };

  override render() {
    const color = AnimoriaConfidenceBadge.COLORS[this.confidence];
    const label = confidenceLabel(this.confidence);

    return html`
      <span
        class="badge ${this.compact ? 'compact' : ''}"
        style="--level-color: ${color}"
        title=${label}
      >
        <span class="dot"></span>
        ${this.compact ? '' : label}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-confidence-badge': AnimoriaConfidenceBadge;
  }
}
