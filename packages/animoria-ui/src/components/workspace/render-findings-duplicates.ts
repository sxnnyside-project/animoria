import type { DuplicateGroup, ResolutionPlan } from '@animoria/contracts';
import { html } from 'lit';
import type { HostCapabilities } from '../../bridge/types.js';
import type { AnalysisViewModel } from '../../view-model/analysis-view-model.js';
import '../animoria-duplicate-group.js';
import '../animoria-finding.js';
import '../animoria-state-panel.js';

export interface FindingsDeps {
  readonly selectedAssetPath: string;
  readonly onSelectAsset: (assetPath: string, rootId: string) => void;
  readonly onOpenReference: (detail: { file: string; line: number; rootId: string }) => void;
}

export function renderFindings(model: AnalysisViewModel, deps: FindingsDeps) {
  if (model.findingCount === 0) {
    return html`<animoria-state-panel
      state="empty"
      summary="No governance findings. Every rule that ran found nothing to report."
    ></animoria-state-panel>`;
  }

  return html`
    ${model.sections.map(
      (section) => html`
        <div class="section-title">${section.label} — ${section.diagnostics.length}</div>
        <div class="list">
          ${section.diagnostics.map(
            (entry) => html`
              <animoria-finding
                compact
                .diagnostic=${entry.diagnostic}
                .rootId=${entry.rootId}
                .rootName=${entry.rootName}
                .hideRoot=${model.isSingleRoot}
                .selected=${entry.diagnostic.target_asset_path === deps.selectedAssetPath}
                @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
                  deps.onSelectAsset(e.detail.assetPath, e.detail.rootId)}
                @open-reference=${(
                  e: CustomEvent<{ file: string; line: number; rootId: string }>
                ) => deps.onOpenReference(e.detail)}
              ></animoria-finding>
            `
          )}
        </div>
      `
    )}
  `;
}

export interface DuplicatesDeps {
  readonly capabilities: HostCapabilities;
  readonly openGroupId: string;
  readonly resolutionPlan: ResolutionPlan | null;
  readonly resolutionPlanId: string;
  readonly applying: boolean;
  readonly onRequestResolutionPlan: (detail: { groupId: string; keepPath: string }) => void;
  readonly onApplyResolutionPlan: (detail: { planId: string; allowPartial: boolean }) => void;
  readonly onCancelResolutionPlan: () => void;
}

/**
 * Root names for a duplicate group's candidates, from Core's attribution.
 *
 * Built here rather than in the group component so the component never needs the
 * workspace — it receives a map and renders it. Attribution is read from the
 * analysis, never derived by matching a path against a root list.
 */
export function rootNamesFor(
  model: AnalysisViewModel,
  group: DuplicateGroup
): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  const nameById = new Map(model.roots.map((summary) => [summary.rootId, summary.rootName]));

  for (const assetId of group.asset_ids) {
    const rootId = model.rootIdByAssetPath.get(assetId);
    if (rootId) names.set(assetId, nameById.get(rootId) ?? '');
  }
  return names;
}

export function renderDuplicates(model: AnalysisViewModel, deps: DuplicatesDeps) {
  if (model.duplicateGroups.length === 0) {
    return html`<animoria-state-panel
      state="ready"
      summary="No duplicate asset clusters detected."
    ></animoria-state-panel>`;
  }

  const assetsById = new Map(model.assets.map((a) => [a.asset.id, a.asset]));

  return html`
    <div class="list">
      ${model.duplicateGroups.map(
        (group) => html`
          <animoria-duplicate-group
            .group=${group}
            .assetsById=${assetsById}
            .plan=${deps.openGroupId === group.id ? deps.resolutionPlan : null}
            .planId=${deps.openGroupId === group.id ? deps.resolutionPlanId : ''}
            .canMutate=${deps.capabilities.canMutate}
            .resolving=${deps.applying}
            @request-resolution-plan=${(e: CustomEvent<{ groupId: string; keepPath: string }>) =>
              deps.onRequestResolutionPlan(e.detail)}
            @apply-resolution-plan=${(e: CustomEvent<{ planId: string; allowPartial: boolean }>) =>
              deps.onApplyResolutionPlan(e.detail)}
            @cancel-resolution-plan=${() => deps.onCancelResolutionPlan()}
          ></animoria-duplicate-group>
        `
      )}
    </div>
  `;
}
