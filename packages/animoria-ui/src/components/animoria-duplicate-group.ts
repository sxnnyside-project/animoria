import type { DuplicateGroup, ResolutionPlan } from '@animoria/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { formatBytes } from '../view-model/analysis-view-model.js';

/**
 * Renders duplicate asset clusters and resolution flows.
 */
@customElement('animoria-duplicate-group')
export class AnimoriaDuplicateGroupView extends LitElement {
  @property({ type: Object }) group: DuplicateGroup | null = null;
  @property({ type: Object }) plan: ResolutionPlan | null = null;
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) isCrossRoot = false;
  @property({ type: Boolean }) canMutate = false;
  @property({ type: Boolean }) resolving = false;

  @state() private _selectedKeepPath: string | null = null;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .group {
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      background: var(--animoria-bg-secondary);
      padding: var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    .hash {
      font-family: var(--animoria-font-mono);
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--animoria-neutral-quiet);
    }

    .wasted {
      color: var(--animoria-warning);
      font-weight: 600;
    }

    .asset-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .asset-row {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      padding: 4px 8px;
      background: var(--animoria-bg-primary);
      border-radius: var(--animoria-radius-sm);
      font-family: var(--animoria-font-mono);
      font-size: 12px;
    }

    .canonical-tag {
      font-size: 10px;
      font-weight: 700;
      color: var(--animoria-success);
      border: 1px solid var(--animoria-success);
      padding: 0 4px;
      border-radius: 2px;
      text-transform: uppercase;
    }
  `;

  override render() {
    const group = this.group;
    if (!group) return nothing;

    return html`
      <div class="group">
        <div class="header">
          <span class="hash">Hash: ${group.content_hash.slice(0, 12)}…</span>
          <span>${group.asset_ids.length} duplicates</span>
          <span class="wasted">${formatBytes(group.wasted_bytes)} recoverable</span>
        </div>

        <div class="asset-list">
          ${group.asset_ids.map(
            (id) => html`
              <div class="asset-row">
                <span>${id}</span>
                ${id === group.canonical_asset_id ? html`<span class="canonical-tag">Canonical</span>` : nothing}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-duplicate-group': AnimoriaDuplicateGroupView;
  }
}
