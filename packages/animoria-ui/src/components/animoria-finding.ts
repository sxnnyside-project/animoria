import type { RuleDiagnostic } from '@animoria/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './animoria-confidence-badge.js';
import './animoria-coverage-summary.js';
import './animoria-evidence-panel.js';
import './animoria-root-badge.js';

/**
 * Renders a single rule diagnostic finding, its target asset, severity, message, and evidence.
 */
@customElement('animoria-finding')
export class AnimoriaFinding extends LitElement {
  @property({ type: Object }) diagnostic: RuleDiagnostic | null = null;
  /** Root attribution, carried from Core. See `animoria-root-badge`. */
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) hideRoot = false;
  @property({ type: Boolean }) selected = false;
  /** Collapses evidence and remediation by default. For dense problem lists. */
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .finding {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-3);
      border-radius: var(--animoria-radius);
      border: 1px solid var(--animoria-border);
      border-left: 3px solid var(--severity-color);
      background: var(--animoria-bg-secondary);
      transition: background-color 120ms ease;
    }

    .finding.selected {
      background: var(--animoria-bg-selected);
      border-color: var(--animoria-focus-ring);
      border-left-color: var(--severity-color);
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
    }

    .asset {
      font-weight: 600;
      color: var(--animoria-text-strong);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }

    .asset:hover {
      text-decoration: underline;
    }

    .badges {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-1);
      flex-shrink: 0;
    }

    .rule-id {
      font-family: var(--animoria-font-mono);
      font-size: 11px;
      color: var(--animoria-text-muted);
    }

    .message {
      color: var(--animoria-text-primary);
      line-height: var(--animoria-line-height);
    }

    .toggle {
      background: none;
      border: none;
      padding: 0;
      color: var(--animoria-accent);
      font-size: var(--animoria-font-size-xs);
      cursor: pointer;
      align-self: flex-start;
      font-family: inherit;
    }

    .toggle:hover {
      text-decoration: underline;
    }

    .evidence-line {
      font-family: var(--animoria-font-mono);
      font-size: 11px;
      color: var(--animoria-text-muted);
      padding: 4px 8px;
      background: var(--animoria-bg-primary);
      border-radius: var(--animoria-radius-sm);
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
        detail: { assetPath: this.diagnostic.target_asset_path, rootId: this.rootId },
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
    const assetName = diagnostic.target_asset_path.split('/').pop() || diagnostic.target_asset_path;

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
            >${assetName}</span
          >
          <span class="badges">
            <animoria-root-badge
              .rootName=${this.rootName}
              ?hidden=${this.hideRoot}
            ></animoria-root-badge>
          </span>
        </div>

        <div class="rule-id">${diagnostic.rule_id}</div>
        <div class="message">${diagnostic.message}</div>

        ${
          diagnostic.evidence_file && showDetail
            ? html`
              <div class="evidence-line">
                Evidence: ${diagnostic.evidence_file}${diagnostic.evidence_line ? `:${diagnostic.evidence_line}` : ''}
                ${diagnostic.evidence_excerpt ? ` — "${diagnostic.evidence_excerpt}"` : ''}
              </div>
            `
            : nothing
        }

        ${
          this.compact && diagnostic.evidence_file
            ? html`<button class="toggle" type="button" @click=${this._toggle}>
              ${this._expanded ? 'Hide evidence' : 'Show evidence'}
            </button>`
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
