import type { DiagnosticEvidence, EvidenceKind } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * The observation behind a finding.
 *
 * ## Why `absence` gets its own treatment
 * `DiagnosticEvidence.locations` is documented as "empty for an `absence` finding,
 * by definition" — you cannot point at the place a thing is not. A naive renderer
 * therefore shows an empty list for exactly the findings that most need scrutiny,
 * because absence findings are the ones cleanup acts on.
 *
 * So `absence` renders its *summary* as the evidence and defers the "how far did we
 * look" question to the coverage panel beside it, rather than showing an empty box
 * that reads as "no evidence" when it means "the evidence is a negative result".
 *
 * ## Why locations are clickable
 * A reference the developer cannot navigate to is a claim they have to take on
 * trust. Navigation is a host capability, so the component emits intent
 * (`open-reference`) and the host decides whether it can honour it.
 */
@customElement('animoria-evidence-panel')
export class AnimoriaEvidencePanel extends LitElement {
  @property({ type: Object }) evidence: DiagnosticEvidence | null = null;
  /** Set false when the host cannot open a source file; locations render as plain text. */
  @property({ type: Boolean }) navigable = true;
  /**
   * The root this evidence belongs to, forwarded onto every navigation target.
   *
   * A host routing to the right indexer, the right `.animoriarc` or the right trash
   * directory needs the attribution Core already made. Shared UI must not perform
   * workspace-root resolution, so it carries the id rather than matching the file
   * path against a root list.
   */
  @property({ type: String }) rootId = '';
  /** Locations shown before "and N more". */
  @property({ type: Number }) maxLocations = 5;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .panel {
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      padding: var(--animoria-space-2);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .kind {
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--animoria-text-muted);
    }

    .summary {
      color: var(--animoria-text-primary);
      line-height: var(--animoria-line-height);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    li {
      display: flex;
      gap: var(--animoria-space-2);
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-xs);
      align-items: baseline;
    }

    .location {
      color: var(--animoria-info);
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .location.static {
      color: var(--animoria-text-muted);
      cursor: default;
    }

    .location:not(.static):hover {
      text-decoration: underline;
    }

    .excerpt {
      color: var(--animoria-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .more {
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-xs);
    }

    dl {
      margin: 0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px var(--animoria-space-2);
      font-size: var(--animoria-font-size-xs);
    }

    dt {
      color: var(--animoria-text-muted);
    }

    dd {
      margin: 0;
      font-family: var(--animoria-font-mono);
      color: var(--animoria-text-primary);
    }
  `;

  private static readonly KIND_LABELS: Readonly<Record<EvidenceKind, string>> = {
    reference: 'Observed references',
    absence: 'Negative result',
    'content-hash': 'Byte comparison',
    'file-metadata': 'File property',
    config: 'Configuration',
  };

  private _openReference(file: string, line: number | undefined): void {
    if (!this.navigable) return;
    this.dispatchEvent(
      new CustomEvent('open-reference', {
        detail: { file, line: line ?? 1, rootId: this.rootId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderLocations(evidence: DiagnosticEvidence) {
    const locations = evidence.locations ?? [];
    if (locations.length === 0) return nothing;

    const shown = locations.slice(0, this.maxLocations);
    const remaining = locations.length - shown.length;

    return html`
      <ul>
        ${shown.map(
          (location) => html`
            <li>
              <span
                class="location ${this.navigable ? '' : 'static'}"
                role=${this.navigable ? 'button' : 'text'}
                tabindex=${this.navigable ? 0 : -1}
                @click=${() => this._openReference(location.file, location.line)}
                @keydown=${(e: KeyboardEvent) =>
                  e.key === 'Enter' && this._openReference(location.file, location.line)}
                >${location.file}${location.line === undefined ? '' : `:${location.line}`}</span
              >
              ${location.excerpt ? html`<span class="excerpt">${location.excerpt}</span>` : nothing}
            </li>
          `
        )}
      </ul>
      ${remaining > 0 ? html`<div class="more">and ${remaining} more</div>` : nothing}
    `;
  }

  /**
   * Rule-specific numbers, rendered generically.
   *
   * Deliberately not interpreted: a rule that reports `{ limitKb, actualKb }` gets
   * both shown as-is. Formatting them into prose here would mean this file knowing
   * what each rule's data means, which is the rule's job and would go stale the
   * first time one changed.
   */
  private _renderData(evidence: DiagnosticEvidence) {
    const data = evidence.data;
    if (!data || Object.keys(data).length === 0) return nothing;

    return html`
      <dl>
        ${Object.entries(data).map(
          ([key, value]) => html`
            <dt>${key}</dt>
            <dd>${Array.isArray(value) ? value.join(', ') : String(value)}</dd>
          `
        )}
      </dl>
    `;
  }

  override render() {
    const evidence = this.evidence;
    if (!evidence) return nothing;

    return html`
      <div class="panel">
        <div class="header">
          <span class="kind"
            >${AnimoriaEvidencePanel.KIND_LABELS[evidence.kind] ?? evidence.kind}</span
          >
        </div>
        <div class="summary">${evidence.summary}</div>
        ${this._renderLocations(evidence)} ${this._renderData(evidence)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-evidence-panel': AnimoriaEvidencePanel;
  }
}
