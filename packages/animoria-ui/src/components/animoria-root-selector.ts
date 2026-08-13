import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RootFilter, RootSummary } from '../view-model/analysis-view-model.js';

/**
 * Narrows the workspace to one root.
 *
 * ## Why "All roots" is the default and not a prompt
 * A picker the developer must answer before seeing anything turns "open the panel"
 * into a decision. The aggregate is what they came for; filtering is for narrowing
 * once they know what they are looking at. So this renders as a row of chips with
 * `All roots` pre-selected, not a modal or a required dropdown.
 *
 * ## Why it disappears in a single-root workspace
 * A selector with one real option is chrome that teaches nothing. The component
 * renders nothing when `roots.length <= 1`, so the common case is visually identical
 * to what it was before U5.
 *
 * ## Why counts are on the chips
 * "Which root has the findings?" is the question a developer opens this to answer.
 * A chip reading `acme/project · 12` answers it without a click; a bare name makes
 * them try each one.
 */
@customElement('animoria-root-selector')
export class AnimoriaRootSelector extends LitElement {
  @property({ type: Array }) roots: readonly RootSummary[] = [];
  @property({ attribute: false }) filter: RootFilter = { kind: 'all' };
  /** What the counts describe. Findings by default; assets on the asset tab. */
  @property({ type: String }) countKind: 'findings' | 'assets' = 'findings';

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: var(--animoria-space-1);
      align-items: center;
    }

    .label {
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--animoria-text-muted);
      margin-right: var(--animoria-space-1);
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: var(--animoria-space-1);
      background: transparent;
      border: 1px solid var(--animoria-border);
      border-radius: 12px;
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 2px 10px;
      cursor: pointer;
      max-width: 240px;
    }

    button:hover {
      background: var(--animoria-bg-hover);
    }

    button[aria-pressed='true'] {
      background: var(--animoria-bg-selected);
      border-color: var(--animoria-focus-ring);
      color: var(--animoria-text-strong);
    }

    button:focus-visible {
      outline: 2px solid var(--animoria-focus-ring);
      outline-offset: 1px;
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .count {
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      color: var(--animoria-text-muted);
      flex-shrink: 0;
    }

    button[aria-pressed='true'] .count {
      color: var(--animoria-text-strong);
    }
  `;

  private _select(filter: RootFilter): void {
    this.dispatchEvent(
      new CustomEvent('root-filter-change', { detail: filter, bubbles: true, composed: true })
    );
  }

  private _countFor(summary: RootSummary): number {
    return this.countKind === 'assets' ? summary.assetCount : summary.findingCount;
  }

  override render() {
    // One root is not a choice. Rendering a selector for it is chrome that teaches
    // nothing and takes a line of vertical space from the content.
    if (this.roots.length <= 1) return nothing;

    const total = this.roots.reduce((sum, summary) => sum + this._countFor(summary), 0);
    const showingAll = this.filter.kind === 'all';

    return html`
      <nav aria-label="Filter by workspace root">
        <span class="label">Roots</span>

        <button
          type="button"
          aria-pressed=${showingAll}
          @click=${() => this._select({ kind: 'all' })}
        >
          <span class="name">All roots</span>
          <span class="count">${total}</span>
        </button>

        ${this.roots.map(
          (summary) => html`
            <button
              type="button"
              aria-pressed=${this.filter.kind === 'root' && this.filter.rootId === summary.root.id}
              title=${summary.root.path}
              @click=${() => this._select({ kind: 'root', rootId: summary.root.id })}
            >
              <span class="name">${summary.root.name}</span>
              <span class="count">${this._countFor(summary)}</span>
            </button>
          `
        )}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-root-selector': AnimoriaRootSelector;
  }
}
