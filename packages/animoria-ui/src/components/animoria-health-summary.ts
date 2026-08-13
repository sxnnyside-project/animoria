import type { HealthScoreOutcome, HealthState } from '@animoria/core/contracts';
import { describeHealthState } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * The Health Score panel.
 *
 * ## What this component must never do
 * Compute. `HealthScoreOutcome` is a discriminated union whose `unavailable` arm
 * carries a reason, and `describeHealthState` is Core's own banding — both are used
 * here verbatim. Three clients previously each had their own formula, and the
 * JetBrains one produced a different number from the same workspace; the score
 * arriving as a value with nowhere to recompute it is what makes that impossible now.
 *
 * ## Why `unavailable` is a first-class picture, not a hidden row
 * A workspace Core could not score used to render as an absent widget, which reads
 * as "nothing to report" — the same silence a perfectly healthy workspace produces.
 * The two are now visually distinct, and the reason is shown.
 *
 * ## Qualifications before recommendations
 * A score computed while a configured rule declined to run is a floor on the
 * problems present, not a full accounting. Ordering the caveat above the advice is
 * the difference between "here is what to fix" and "here is what to fix, given we
 * could not check everything".
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

    .qualification {
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-warning);
      line-height: var(--animoria-line-height);
    }

    ol {
      margin: var(--animoria-space-1) 0 0;
      padding-left: 18px;
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-primary);
      display: flex;
      flex-direction: column;
      gap: 2px;
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
            <div class="reason">${outcome.message}</div>
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
        ><span class="compact-dot"></span>Health score ${score}/100 · ${stateLabel}</span
      >`;
    }

    const findingWord = report.totalDiagnosticCount === 1 ? 'finding' : 'findings';

    return html`
      <div class="panel" style="--state-color: ${color}">
        <div class="dial">${score}</div>
        <div class="body">
          <div class="title">Health score ${score}/100 · ${stateLabel}</div>
          <div class="sub">
            ${report.totalAssetCount} asset(s) analyzed · ${report.totalDiagnosticCount} governance
            ${findingWord}
          </div>
          ${report.qualifications.map(
            (qualification) => html`<div class="qualification">${qualification.message}</div>`
          )}
          ${
            report.recommendations.length > 0
              ? html`<ol>
                ${report.recommendations
                  .slice(0, 3)
                  .map((recommendation) => html`<li>${recommendation.message}</li>`)}
              </ol>`
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
