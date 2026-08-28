import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type CoverageStatus = 'complete' | 'partial' | 'none';

export interface ScanCoverage {
  readonly status: CoverageStatus;
  readonly scannedExtensions: readonly string[];
  readonly unscannedExtensions: readonly string[];
  readonly filesScanned?: number;
  readonly referencesDetected?: number;
}

export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  complete: 'Complete Scan Coverage',
  partial: 'Partial Scan Coverage',
  none: 'No Scan Coverage',
};

/**
 * Renders source code scanning coverage metrics and status.
 */
@customElement('animoria-coverage-summary')
export class AnimoriaCoverageSummary extends LitElement {
  @property({ type: Object }) coverage: ScanCoverage | null = null;
  @property({ type: Boolean }) inline = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-xs);
    }

    .banner {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border-radius: var(--animoria-radius);
      border: 1px solid var(--animoria-border);
      background: var(--animoria-bg-secondary);
    }

    .banner.none {
      border-color: var(--animoria-danger);
      background: var(--animoria-danger-subtle);
    }

    .banner.partial {
      border-color: var(--animoria-warning);
      background: var(--animoria-warning-subtle);
    }

    .banner.complete {
      border-color: var(--animoria-border);
    }

    .headline {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      font-weight: 600;
      color: var(--animoria-text-strong);
    }

    .status-tag {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .complete .status-tag {
      background: var(--animoria-success-subtle);
      color: var(--animoria-success);
    }

    .partial .status-tag {
      background: var(--animoria-warning-subtle);
      color: var(--animoria-warning);
    }

    .none .status-tag {
      background: var(--animoria-danger-subtle);
      color: var(--animoria-danger);
    }

    .detail {
      color: var(--animoria-text-muted);
      line-height: 1.4;
    }

    .ext-list {
      font-family: var(--animoria-font-mono);
      font-size: 11px;
    }

    .inline-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      border: 1px solid var(--animoria-border);
    }

    .inline-badge.complete {
      color: var(--animoria-success);
      border-color: var(--animoria-success);
    }

    .inline-badge.partial {
      color: var(--animoria-warning);
      border-color: var(--animoria-warning);
    }

    .inline-badge.none {
      color: var(--animoria-danger);
      border-color: var(--animoria-danger);
    }
  `;

  override render() {
    const coverage = this.coverage;
    if (!coverage) return nothing;

    if (this.inline) {
      return html`
        <span class="inline-badge ${coverage.status}">
          ${COVERAGE_LABELS[coverage.status] ?? coverage.status}
        </span>
      `;
    }

    return html`
      <div class="banner ${coverage.status}">
        <div class="headline">
          <span class="status-tag">${coverage.status}</span>
          <span>${COVERAGE_LABELS[coverage.status]}</span>
        </div>
        <div class="detail">
          ${
            coverage.scannedExtensions.length > 0
              ? html`<span>Scanned: <span class="ext-list">${coverage.scannedExtensions.join(', ')}</span></span>`
              : html`<span>No source files were recognized for reference scanning.</span>`
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-coverage-summary': AnimoriaCoverageSummary;
  }
}
