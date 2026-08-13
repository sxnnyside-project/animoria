import type { AnalysisLifecycleState } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * The six lifecycle states, as one component.
 *
 * ## Why one component and not six
 * The states are mutually exclusive by construction (`deriveAnalysisLifecycle`
 * returns exactly one), and a caller choosing between six components is a caller who
 * can render two at once or none. One component with a `state` property makes the
 * exclusivity structural.
 *
 * ## Why each state looks different
 * Every client previously rendered `loading: boolean`, which meant an unindexed
 * workspace, a failed scan, and an empty workspace were the same picture — and that
 * picture said "no animated assets", a claim two of the three had not earned. Each
 * state below has its own icon, colour token and wording precisely so a developer
 * can tell "we have not looked yet" from "we looked and there is nothing" from "we
 * could not look".
 *
 * `stale` and `incomplete` carry an action, because both are states a developer can
 * leave. `failed` carries one too — the retry is usually the fix. `initializing` and
 * `analyzing` do not: offering "refresh" to someone already waiting for a first
 * result is noise.
 */
@customElement('animoria-state-panel')
export class AnimoriaStatePanel extends LitElement {
  @property({ type: String }) state: AnalysisLifecycleState | 'empty' = 'initializing';
  /** The reason, from `AnalysisLifecycle.summary`. Never composed here. */
  @property({ type: String }) summary = '';
  /** Optional detail, e.g. a coverage explanation. */
  @property({ type: String }) detail = '';
  /** Label for the recovery action. Empty hides the button. */
  @property({ type: String }) actionLabel = '';

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--animoria-space-5);
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
      color: var(--animoria-text-primary);
    }

    .panel {
      max-width: 420px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .glyph {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      background: var(--animoria-neutral-quiet);
      color: var(--state-color, var(--animoria-text-muted));
      border: 2px solid var(--state-color, var(--animoria-border));
    }

    .title {
      font-size: var(--animoria-font-size-lg);
      font-weight: 600;
      color: var(--animoria-text-strong);
    }

    .summary {
      color: var(--animoria-text-primary);
      line-height: var(--animoria-line-height);
    }

    .detail {
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
    }

    button {
      margin-top: var(--animoria-space-2);
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
      border: none;
      border-radius: var(--animoria-radius-sm);
      padding: 6px 14px;
      font-family: inherit;
      font-size: var(--animoria-font-size);
      cursor: pointer;
    }

    button:hover {
      background: var(--animoria-accent-hover);
    }

    /* The spinner is a CSS animation rather than an animated asset: a governance
       tool for animated assets that ships its own spinner GIF would be quoting
       itself. A prefers-reduced-motion query stops it entirely. */
    .glyph.spin::after {
      content: '';
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: var(--state-color);
      animation: rotate 900ms linear infinite;
    }

    .glyph {
      position: relative;
    }

    @keyframes rotate {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .glyph.spin::after {
        animation: none;
      }
    }
  `;

  /**
   * Per-state presentation. A table rather than a chain of conditionals so adding a
   * state is a row, and so a missing state is a compile error rather than a blank
   * panel.
   */
  private static readonly PRESENTATION: Readonly<
    Record<
      AnalysisLifecycleState | 'empty',
      { glyph: string; title: string; color: string; spin: boolean }
    >
  > = {
    initializing: {
      glyph: '·',
      title: 'Starting up',
      color: 'var(--animoria-state-initializing)',
      spin: true,
    },
    analyzing: {
      glyph: '',
      title: 'Analyzing workspace',
      color: 'var(--animoria-state-analyzing)',
      spin: true,
    },
    ready: { glyph: '✓', title: 'Up to date', color: 'var(--animoria-state-ready)', spin: false },
    stale: { glyph: '↻', title: 'Out of date', color: 'var(--animoria-state-stale)', spin: false },
    incomplete: {
      glyph: '!',
      title: 'Incomplete analysis',
      color: 'var(--animoria-state-incomplete)',
      spin: false,
    },
    failed: {
      glyph: '×',
      title: 'Analysis failed',
      color: 'var(--animoria-state-failed)',
      spin: false,
    },
    // Not a lifecycle state — a `ready` analysis with nothing in it. Separated
    // because "no animated assets here" is a fact about the workspace and every
    // other entry in this table is a fact about Animoria.
    empty: {
      glyph: '∅',
      title: 'No animated assets',
      color: 'var(--animoria-state-initializing)',
      spin: false,
    },
  };

  private _onAction(): void {
    this.dispatchEvent(new CustomEvent('state-action', { bubbles: true, composed: true }));
  }

  override render() {
    const presentation =
      AnimoriaStatePanel.PRESENTATION[this.state] ?? AnimoriaStatePanel.PRESENTATION.initializing;

    return html`
      <div class="panel" role="status" aria-live="polite">
        <div
          class="glyph ${presentation.spin ? 'spin' : ''}"
          style="--state-color: ${presentation.color}"
          aria-hidden="true"
        >
          ${presentation.glyph}
        </div>
        <div class="title">${presentation.title}</div>
        ${this.summary ? html`<div class="summary">${this.summary}</div>` : nothing}
        ${this.detail ? html`<div class="detail">${this.detail}</div>` : nothing}
        ${
          this.actionLabel
            ? html`<button type="button" @click=${this._onAction}>${this.actionLabel}</button>`
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-state-panel': AnimoriaStatePanel;
  }
}
