import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type EvidenceKind = 'reference' | 'absence' | 'duplicate' | 'metadata';

export interface EvidenceLocation {
  readonly file: string;
  readonly line?: number;
  readonly excerpt?: string;
}

export interface DiagnosticEvidence {
  readonly kind: EvidenceKind;
  readonly summary: string;
  readonly locations?: readonly EvidenceLocation[];
}

/**
 * Renders rule diagnostic evidence and supporting locations.
 */
@customElement('animoria-evidence-panel')
export class AnimoriaEvidencePanel extends LitElement {
  @property({ type: Object }) evidence: DiagnosticEvidence | null = null;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-xs);
    }

    .evidence-box {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      padding: var(--animoria-space-2);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-primary);
      border: 1px solid var(--animoria-border);
    }

    .summary {
      color: var(--animoria-text-primary);
      font-weight: 500;
    }

    .locations {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
    }

    .loc-item {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      font-family: var(--animoria-font-mono);
      font-size: 11px;
      color: var(--animoria-text-muted);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 2px;
    }

    .loc-item:hover {
      background: var(--animoria-bg-hover);
      color: var(--animoria-text-strong);
    }

    .excerpt {
      font-style: italic;
      color: var(--animoria-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  private _navigate(loc: EvidenceLocation): void {
    this.dispatchEvent(
      new CustomEvent('open-reference', {
        detail: { file: loc.file, line: loc.line },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const ev = this.evidence;
    if (!ev) return nothing;

    return html`
      <div class="evidence-box">
        <div class="summary">${ev.summary}</div>
        ${
          ev.locations && ev.locations.length > 0
            ? html`
              <div class="locations">
                ${ev.locations.map(
                  (loc) => html`
                    <div class="loc-item" @click=${() => this._navigate(loc)}>
                      <span>${loc.file}${loc.line ? `:${loc.line}` : ''}</span>
                      ${loc.excerpt ? html`<span class="excerpt">"${loc.excerpt}"</span>` : nothing}
                    </div>
                  `
                )}
              </div>
            `
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-evidence-panel': AnimoriaEvidencePanel;
  }
}
