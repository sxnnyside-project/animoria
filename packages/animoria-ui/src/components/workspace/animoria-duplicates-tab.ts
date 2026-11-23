import type { DuplicateGroup, ResolutionPlan } from '@animoria/contracts';
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { HostCapabilities } from '../../bridge/types.js';
import { NO_CAPABILITIES } from '../../bridge/types.js';
import type { AnalysisViewModel } from '../../view-model/analysis-view-model.js';
import { AnimoriaElement } from '../common/events.js';
import '../gallery/animoria-duplicate-group.js';
import '../gallery/animoria-state-panel.js';

/**
 * Root names for a duplicate group's candidates, from Core's attribution.
 */
export function rootNamesFor(
  model: AnalysisViewModel,
  group: DuplicateGroup,
): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  const nameById = new Map(model.roots.map((summary) => [summary.rootId, summary.rootName]));

  for (const assetId of group.asset_ids) {
    const rootId = model.rootIdByAssetPath.get(assetId);
    if (rootId) names.set(assetId, nameById.get(rootId) ?? '');
  }
  return names;
}

/**
 * Dedicated tab component rendering duplicate clusters and resolution plans.
 */
@customElement('animoria-duplicates-tab')
export class AnimoriaDuplicatesTab extends AnimoriaElement {
  @property({ attribute: false }) model: AnalysisViewModel | null = null;
  @property({ attribute: false }) capabilities: HostCapabilities = NO_CAPABILITIES;
  @property({ type: String }) openGroupId = '';
  @property({ attribute: false }) resolutionPlan: ResolutionPlan | null = null;
  @property({ type: String }) resolutionPlanId = '';
  @property({ type: Boolean }) isApplying = false;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }
  `;

  private _onRequestResolutionPlan(detail: { groupId: string; keepPath: string }): void {
    this.emit('request-resolution-plan', detail);
  }

  private _onApplyResolutionPlan(detail: { planId: string; canAllowPartial: boolean }): void {
    this.emit('apply-resolution-plan', detail);
  }

  private _onCancelResolutionPlan(): void {
    this.emit('cancel-resolution-plan');
  }

  override render() {
    const model = this.model;
    if (!model || model.duplicateGroups.length === 0) {
      return html`<animoria-state-panel
        state="ready"
        summary="No duplicate asset clusters detected."
      ></animoria-state-panel>`;
    }

    const assetsById = new Map(model.assets.map((a) => [a.asset.id, a.asset]));

    return html`
      <div class="list">
        ${repeat(
          model.duplicateGroups,
          (group) => group.id,
          (group) => html`
            <animoria-duplicate-group
              .group=${group}
              .assetsById=${assetsById}
              .plan=${this.openGroupId === group.id ? this.resolutionPlan : null}
              .planId=${this.openGroupId === group.id ? this.resolutionPlanId : ''}
              .canMutate=${this.capabilities.canMutate}
              .isResolving=${this.isApplying}
              @request-resolution-plan=${(e: CustomEvent<{ groupId: string; keepPath: string }>) =>
                this._onRequestResolutionPlan(e.detail)}
              @apply-resolution-plan=${(
                e: CustomEvent<{ planId: string; canAllowPartial: boolean }>,
              ) => this._onApplyResolutionPlan(e.detail)}
              @cancel-resolution-plan=${() => this._onCancelResolutionPlan()}
            ></animoria-duplicate-group>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-duplicates-tab': AnimoriaDuplicatesTab;
  }
}
