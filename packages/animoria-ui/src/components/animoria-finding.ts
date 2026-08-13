import type { RuleDiagnostic } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './animoria-confidence-badge.js';
import './animoria-coverage-summary.js';
import './animoria-evidence-panel.js';
import './animoria-root-badge.js';

/**
 * One governance finding, with everything Core established about it.
 *
 * ## What "everything" means, and what used to be shown instead
 * A `RuleDiagnostic` carries a message, evidence, confidence, coverage, remediation
 * and a help URI. Before this component, every client rendered **the message and
 * nothing else** — a sentence, in a list, with no way to tell a byte-equality fact
 * from an inference over an incomplete scan, and no statement of what to do about
 * it. Four waves of contract work reached the screen as one string.
 *
 * The order below is the reading order a decision needs: what is wrong, how sure we
 * are, what we saw, what to do. Remediation last, because it is the thing the
 * developer acts on and should be adjacent to the controls.
 */
@customElement('animoria-finding')
export class AnimoriaFinding extends LitElement {
  @property({ type: Object }) diagnostic: RuleDiagnostic | null = null;
  /**
   * The root this finding belongs to, from Core's attribution.
   *
   * Carried, never derived. `root-b/assets/logo.json` and `root-c/assets/logo.json`
   * render identically once a list truncates the leading segments — which is what a
   * list of paths always does — so "which root?" has to be answerable without
   * inspecting the path.
   */
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  /** Set from `isSingleRoot`: there is nothing to disambiguate. */
  @property({ type: Boolean }) hideRoot = false;
  /** Collapses evidence and coverage until expanded. For dense lists. */
  @property({ type: Boolean }) compact = false;
  @property({ type: Boolean }) selected = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
    }

    .finding {
      border: 1px solid var(--animoria-border);
      border-left: 3px solid var(--severity-color, var(--animoria-border-strong));
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-raised);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .finding.selected {
      background: var(--animoria-bg-selected);
    }

    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--animoria-space-2);
    }

    .asset {
      font-weight: 600;
      color: var(--animoria-text-strong);
      word-break: break-all;
      cursor: pointer;
    }

    .asset:hover {
      text-decoration: underline;
    }

    .badges {
      display: inline-flex;
      align-items: center;
      gap: var(--animoria-space-1);
      flex-shrink: 0;
    }

    .rule-id {
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    .message {
      color: var(--animoria-text-primary);
      line-height: var(--animoria-line-height);
    }

    .remediation {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-2);
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-primary);
      background: var(--animoria-neutral-quiet);
      border-radius: var(--animoria-radius-sm);
      padding: var(--animoria-space-2);
      line-height: var(--animoria-line-height);
    }

    .remediation-label {
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      font-size: var(--animoria-font-size-xs);
      letter-spacing: 0.04em;
      flex-shrink: 0;
      padding-top: 1px;
    }

    a {
      color: var(--animoria-info);
      font-size: var(--animoria-font-size-sm);
    }

    .toggle {
      background: none;
      border: none;
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      cursor: pointer;
      padding: 0;
      text-align: left;
      text-decoration: underline;
    }
  `;

  private _expanded = false;

  private static readonly SEVERITY_COLORS: Readonly<Record<string, string>> = {
    error: 'var(--animoria-danger)',
    warning: 'var(--animoria-warning)',
    info: 'var(--animoria-info)',
  };

  private _openAsset(): void {
    if (!this.diagnostic) return;
    this.dispatchEvent(
      new CustomEvent('open-asset', {
        detail: { assetPath: this.diagnostic.asset.path, rootId: this.rootId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggle(): void {
    this._expanded = !this._expanded;
    this.requestUpdate();
  }

  override render() {
    const diagnostic = this.diagnostic;
    if (!diagnostic) return nothing;

    const showDetail = !this.compact || this._expanded;
    const severityColor =
      AnimoriaFinding.SEVERITY_COLORS[diagnostic.severity] ?? 'var(--animoria-border-strong)';

    return html`
      <div
        class="finding ${this.selected ? 'selected' : ''}"
        style="--severity-color: ${severityColor}"
      >
        <div class="top">
          <span
            class="asset"
            role="button"
            tabindex="0"
            @click=${this._openAsset}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._openAsset()}
            >${diagnostic.asset.name}</span
          >
          <span class="badges">
            <animoria-root-badge
              .rootName=${this.rootName}
              ?hidden=${this.hideRoot}
            ></animoria-root-badge>
            <animoria-confidence-badge
              .confidence=${diagnostic.confidence}
            ></animoria-confidence-badge>
          </span>
        </div>

        <div class="rule-id">${diagnostic.ruleId}</div>
        <div class="message">${diagnostic.message}</div>

        ${
          this.compact
            ? html`<button class="toggle" type="button" @click=${this._toggle}>
              ${this._expanded ? 'Hide evidence' : 'Show evidence'}
            </button>`
            : nothing
        }

        ${
          showDetail
            ? html`
              <animoria-evidence-panel
                .evidence=${diagnostic.evidence}
                .rootId=${this.rootId}
              ></animoria-evidence-panel>
              ${
                diagnostic.coverage
                  ? html`<animoria-coverage-summary
                    .coverage=${diagnostic.coverage}
                  ></animoria-coverage-summary>`
                  : nothing
              }
            `
            : nothing
        }

        <div class="remediation">
          <span class="remediation-label">Fix</span>
          <span>${diagnostic.remediation.summary}</span>
        </div>

        ${
          diagnostic.helpUri
            ? html`<a href=${diagnostic.helpUri} target="_blank" rel="noreferrer"
              >Read more about this rule</a
            >`
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-finding': AnimoriaFinding;
  }
}
