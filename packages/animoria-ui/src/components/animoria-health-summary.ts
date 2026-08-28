import type { HealthScoreReport } from '@animoria/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type HealthState = 'excellent' | 'good' | 'fair' | 'poor';

export type HealthScoreOutcome =
  | { readonly status: 'available'; readonly report: HealthScoreReport }
  | { readonly status: 'unavailable'; readonly message?: string };

export function describeHealthState(score: number): HealthState {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Health score summary presentation component.
 * Renders the authoritative governance health score computed by Core.
 */
@customElement('animoria-health-summary')
export class AnimoriaHealthSummary extends LitElement {
  @property({ type: Object }) outcome: HealthScoreOutcome | null = null;
  /** Renders one line instead of the panel. For toolbars. */
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
      color: var(--animoria-text-primary);
    }

    .panel {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-3);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      background: var(--animoria-bg-raised);
      padding: var(--animoria-space-3);
    }

    .dial {
      width: 46px;
      height: 46px;
      flex-shrink: 0;
      border-radius: 50%;
      border: 2px solid var(--state-color);
      background: var(--animoria-neutral-quiet);
      color: var(--state-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 15px;
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      min-width: 0;
    }

    .title {
      font-weight: 600;
      color: var(--animoria-text-strong);
    }

    .sub,
    .reason {
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
    }

    .categories {
      display: flex;
      flex-wrap: wrap;
      gap: var(--animoria-space-2);
      margin-top: var(--animoria-space-1);
    }

    .cat-chip {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--animoria-bg-primary);
      border: 1px solid var(--animoria-border);
    }

    .compact-line {
      display: inline-flex;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .compact-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--state-color);
    }
  `;

  private static readonly STATE_COLORS: Readonly<Record<HealthState, string>> = {
    excellent: 'var(--animoria-success)',
    good: 'var(--animoria-success)',
    fair: 'var(--animoria-warning)',
    poor: 'var(--animoria-danger)',
  };

  private static readonly STATE_LABELS: Readonly<Record<HealthState, string>> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Needs attention',
    poor: 'Critical',
  };

  override render() {
    const outcome = this.outcome;
    if (!outcome) return nothing;

    if (outcome.status === 'unavailable') {
      const color = 'var(--animoria-state-initializing)';
      if (this.compact) {
        return html`<span class="compact-line" style="--state-color: ${color}"
          ><span class="compact-dot"></span>Health score not available</span
        >`;
      }
      return html`
        <div class="panel" style="--state-color: ${color}">
          <div class="dial">—</div>
          <div class="body">
            <div class="title">Health score not available</div>
            <div class="reason">${outcome.message ?? 'Workspace is being indexed.'}</div>
          </div>
        </div>
      `;
    }

    const report = outcome.report;
    const state = describeHealthState(report.score);
    const color = AnimoriaHealthSummary.STATE_COLORS[state];
    const stateLabel = AnimoriaHealthSummary.STATE_LABELS[state];
    const score = Math.round(report.score);

    if (this.compact) {
      return html`<span class="compact-line" style="--state-color: ${color}"
        ><span class="compact-dot"></span>Health score ${score}/100 · Grade ${report.grade}</span
      >`;
    }

    return html`
      <div class="panel" style="--state-color: ${color}">
        <div class="dial">${score}</div>
        <div class="body">
          <div class="title">Health score ${score}/100 · Grade ${report.grade} (${stateLabel})</div>
          <div class="sub">${report.summary}</div>
          ${
            report.categories && report.categories.length > 0
              ? html`
                <div class="categories">
                  ${report.categories.map(
                    (cat) => html`
                      <span class="cat-chip">
                        ${cat.category}: ${Math.round(cat.score)}/100
                      </span>
                    `
                  )}
                </div>
              `
              : nothing
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-health-summary': AnimoriaHealthSummary;
  }
}
