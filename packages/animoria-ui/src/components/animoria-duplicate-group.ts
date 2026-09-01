import type { Asset, DuplicateGroup, ResolutionPlan } from '@animoria/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { formatBytes } from '../view-model/analysis-view-model.js';

@customElement('animoria-duplicate-group')
export class AnimoriaDuplicateGroupView extends LitElement {
  @property({ type: Object }) group: DuplicateGroup | null = null;
  @property({ type: Object }) assetsById: ReadonlyMap<string, Asset> = new Map();
  @property({ type: Object }) plan: ResolutionPlan | null = null;
  @property({ type: String }) planId = '';
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) isCrossRoot = false;
  @property({ type: Boolean }) canMutate = false;
  @property({ type: Boolean }) resolving = false;

  @state() private _selectedKeepId: string | null = null;

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

    .asset-row.selected {
      outline: 1px solid var(--animoria-accent, var(--animoria-success));
    }

    .asset-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    button {
      font: inherit;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: var(--animoria-radius-sm);
      border: 1px solid var(--animoria-border);
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text);
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      background: var(--animoria-neutral-quiet);
    }

    button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    button.primary {
      background: var(--animoria-accent, var(--animoria-success));
      border-color: transparent;
      color: var(--animoria-bg-primary);
    }

    .plan-preview {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-primary);
      font-size: 12px;
    }

    .plan-actions {
      display: flex;
      gap: var(--animoria-space-2);
    }

    .rewrite-count {
      color: var(--animoria-text-muted);
      font-size: 11px;
    }
  `;

  private _nameFor(assetId: string): string {
    return this.assetsById.get(assetId)?.name ?? assetId;
  }

  private _selectKeep(assetId: string): void {
    if (!this.canMutate || this.resolving) return;
    this._selectedKeepId = assetId;
    const group = this.group;
    if (!group) return;
    const keepAsset = this.assetsById.get(assetId);
    this.dispatchEvent(
      new CustomEvent('request-resolution-plan', {
        detail: { groupId: group.id, keepPath: keepAsset?.path ?? assetId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _apply(): void {
    if (!this.plan || !this.planId) return;
    this.dispatchEvent(
      new CustomEvent('apply-resolution-plan', {
        detail: { planId: this.planId, allowPartial: false },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderPlanPreview() {
    const plan = this.plan;
    if (!plan) return nothing;

    const rewriteCount = plan.proposed_reference_rewrites.length;

    return html`
      <div class="plan-preview">
        <div>
          Will move <strong>${plan.target_assets_to_delete.length}</strong> duplicate(s) to trash.
        </div>
        ${
          rewriteCount > 0
            ? html`<div class="rewrite-count">
              ${rewriteCount} source reference${rewriteCount === 1 ? '' : 's'} can be updated to
              point at the kept copy — you'll confirm each one after resolving.
            </div>`
            : nothing
        }
        <div class="plan-actions">
          <button class="primary" ?disabled=${this.resolving} @click=${() => this._apply()}>
            ${this.resolving ? 'Resolving…' : 'Resolve Duplicates'}
          </button>
          <button
            ?disabled=${this.resolving}
            @click=${() => {
              this._selectedKeepId = null;
              this.dispatchEvent(
                new CustomEvent('cancel-resolution-plan', { bubbles: true, composed: true })
              );
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    `;
  }

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
          ${group.asset_ids.map((id) => {
            const isCanonical = id === group.canonical_asset_id;
            const isSelected = id === this._selectedKeepId;
            return html`
              <div class="asset-row ${isSelected ? 'selected' : ''}">
                <span class="asset-name" title=${id}>${this._nameFor(id)}</span>
                ${isCanonical ? html`<span class="canonical-tag">Canonical</span>` : nothing}
                ${
                  this.canMutate
                    ? html`<button
                      ?disabled=${this.resolving || isSelected}
                      @click=${() => this._selectKeep(id)}
                    >
                      ${isSelected ? 'Keeping this' : 'Keep this copy'}
                    </button>`
                    : nothing
                }
              </div>
            `;
          })}
        </div>

        ${this._renderPlanPreview()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-duplicate-group': AnimoriaDuplicateGroupView;
  }
}
