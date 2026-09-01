import { html, nothing } from 'lit';
import type {
  HostBridge,
  HostCapabilities,
  RestoreResult,
  RootCleanupPlan,
  RootCleanupProposal,
  SessionManifest,
} from '../../bridge/types.js';
import type { AnalysisViewModel } from '../../view-model/analysis-view-model.js';
import { formatBytes } from '../../view-model/analysis-view-model.js';
import '../animoria-cleanup-preview.js';
import '../animoria-root-badge.js';
import '../animoria-state-panel.js';
import '../animoria-trash-panel.js';

/**
 * Extracted from `AnimoriaWorkspace` — the Cleanup tab's own render tree
 * (subnav, proposal review, in-flight plan preview, and the Trash sub-view)
 * was over 300 of the component's ~1200 lines on its own. Kept as plain
 * functions taking the exact state slice and callbacks each needs, rather
 * than a separate custom element, so the reactive state stays owned by
 * `AnimoriaWorkspace` — a `@state` write still goes through `this` in the
 * component, these just describe what to render for a given snapshot of it.
 */

export interface CleanupTabDeps {
  readonly send: HostBridge['send'];
  readonly cleanupView: 'proposal' | 'trash';
  readonly setCleanupView: (view: 'proposal' | 'trash') => void;
  readonly trashSessions: readonly SessionManifest[] | null;
  readonly restoreResult: RestoreResult | null;
  readonly restoring: boolean;
  readonly onRequestRestore: () => void;
  readonly capabilities: HostCapabilities;
  readonly cleanupPlans: readonly RootCleanupPlan[];
  readonly setCleanupPlans: (plans: readonly RootCleanupPlan[]) => void;
  readonly applying: boolean;
  readonly onApplyPlan: (detail: { planId: string; allowPartial: boolean }) => void;
  readonly proposals: readonly RootCleanupProposal[];
  readonly onRequestProposal: () => void;
  readonly selectedForCleanup: ReadonlySet<string>;
  readonly onToggleSelection: (assetPath: string) => void;
  readonly onRequestPlan: () => void;
  readonly dismissed: ReadonlySet<string>;
  readonly onDismissCandidate: (assetPath: string, dismissed: boolean) => void;
}

/** Why destructive controls are disabled, or `''` when they aren't. */
export function destructiveReason(capabilities: HostCapabilities): string {
  if (!capabilities.canMutate) {
    return capabilities.mutationUnavailableReason ?? 'This host cannot modify files.';
  }
  return '';
}

export function renderCleanupTab(model: AnalysisViewModel, deps: CleanupTabDeps) {
  return html`
    <div class="subnav" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected=${deps.cleanupView === 'proposal'}
        @click=${() => deps.setCleanupView('proposal')}
      >
        Removable
      </button>
      <button
        type="button"
        role="tab"
        aria-selected=${deps.cleanupView === 'trash'}
        @click=${() => {
          deps.setCleanupView('trash');
          if (deps.trashSessions === null) deps.send({ type: 'request-trash-sessions' });
        }}
      >
        Trash
      </button>
    </div>
    ${deps.cleanupView === 'proposal' ? renderCleanup(model, deps) : renderTrash(deps)}
  `;
}

function renderTrash(deps: CleanupTabDeps) {
  return html`
    <animoria-trash-panel
      .sessions=${deps.trashSessions}
      .result=${deps.restoreResult}
      .canRestore=${deps.capabilities.canRestore}
      .restoreUnavailableReason=${deps.capabilities.mutationUnavailableReason ?? ''}
      .restoring=${deps.restoring}
      @request-trash-sessions=${() => deps.send({ type: 'request-trash-sessions' })}
      @restore-session=${(e: CustomEvent<{ sessionId: string }>) => {
        deps.onRequestRestore();
        deps.send({ type: 'restore-session', ...e.detail });
      }}
    ></animoria-trash-panel>
  `;
}

function renderCleanup(model: AnalysisViewModel, deps: CleanupTabDeps) {
  // ── Preview ──
  //
  // One preview per root the selection touched. They are never merged: each is
  // stale-checked against its own root's generation and staged into its own root's
  // trash, and one combined operation would collapse their refusals into a summary
  // that hides which root refused what.
  if (deps.cleanupPlans.length > 0) {
    return html`
      ${
        deps.cleanupPlans.length > 1
          ? html`<div class="banner" style="--banner-color: var(--animoria-info)" role="status">
              <span
                >This selection spans ${deps.cleanupPlans.length} roots. Each root is
                confirmed and applied separately, so one root failing cannot half-apply
                another.</span
              >
            </div>`
          : nothing
      }
      <div class="list">
        ${deps.cleanupPlans.map(
          (entry) => html`
            <div class="plan-block">
              ${
                model.isSingleRoot
                  ? nothing
                  : html`<div class="section-title">
                      <animoria-root-badge .rootName=${entry.rootName}></animoria-root-badge>
                    </div>`
              }
              <animoria-cleanup-preview
                .plan=${entry.plan}
                .canMutate=${deps.capabilities.canMutate}
                .mutationUnavailableReason=${destructiveReason(deps.capabilities)}
                .applying=${deps.applying}
                @apply-cleanup-plan=${(e: CustomEvent<{ planId: string; allowPartial: boolean }>) =>
                  deps.onApplyPlan(e.detail)}
                @cancel-cleanup=${() => deps.setCleanupPlans([])}
              ></animoria-cleanup-preview>
            </div>
          `
        )}
      </div>
    `;
  }

  // ── Proposal ──
  const visible = deps.proposals.filter(
    (entry) => model.filter.kind === 'all' || model.filter.rootId === entry.rootId
  );

  if (deps.proposals.length === 0) {
    return html`
      <div class="toolbar">
        <button type="button" @click=${() => deps.onRequestProposal()}>
          Find removable assets
        </button>
      </div>
    `;
  }

  const totalCandidates = visible.reduce((sum, entry) => sum + entry.proposal.candidates.length, 0);
  const totalBytes = visible.reduce(
    (sum, entry) =>
      sum +
      (entry.proposal.totalSizeBytes ??
        entry.proposal.candidates.reduce((csum, c) => csum + (c.asset.size_bytes || 0), 0)),
    0
  );

  if (totalCandidates === 0) {
    return html`<animoria-state-panel
      state="empty"
      summary="Nothing is eligible for removal. Every asset is either referenced or passes every rule."
    ></animoria-state-panel>`;
  }

  const selectedCount = deps.selectedForCleanup.size;

  return html`
    <div class="toolbar">
      <button type="button" ?disabled=${selectedCount === 0} @click=${() => deps.onRequestPlan()}>
        Preview removal of ${selectedCount}
      </button>
      <span class="cleanup-meta">${totalCandidates} candidate(s) · ${formatBytes(totalBytes)} total</span>
    </div>

    ${visible.map(
      (entry) => html`
        ${
          model.isSingleRoot
            ? nothing
            : html`<div class="section-title">${entry.rootName} — ${entry.proposal.candidates.length}</div>`
        }
        <div class="list">
          ${entry.proposal.candidates.map((candidate) => {
            const isDismissed = deps.dismissed.has(candidate.asset.path);
            const isEligible = candidate.eligibility?.eligible ?? true;
            return html`
              <div class="cleanup-row ${isEligible ? '' : 'blocked'} ${isDismissed ? 'dismissed' : ''}">
                <input
                  type="checkbox"
                  .checked=${deps.selectedForCleanup.has(candidate.asset.path)}
                  ?disabled=${!isEligible || isDismissed}
                  @change=${() => deps.onToggleSelection(candidate.asset.path)}
                />
                <span class="cleanup-body">
                  <span class="cleanup-name">
                    ${candidate.asset.name}
                    <animoria-root-badge
                      quiet
                      .rootName=${entry.rootName}
                      ?hidden=${model.isSingleRoot}
                    ></animoria-root-badge>
                  </span>
                  <span class="cleanup-meta"
                    >${candidate.asset.path} · ${formatBytes(candidate.sizeBytes ?? candidate.asset.size_bytes)} ·
                    ${candidate.referenceCount ?? 0} reference(s)</span
                  >
                  ${
                    candidate.eligibility && !candidate.eligibility.eligible
                      ? html`<span class="blocked-why"
                          >${candidate.eligibility.explanation ?? candidate.eligibility.reason ?? 'Blocked'}</span
                        >`
                      : nothing
                  }
                </span>
                <button
                  type="button"
                  class="dismiss"
                  title=${
                    isDismissed
                      ? 'Propose this asset again.'
                      : 'Keep this asset and stop proposing it for removal.'
                  }
                  @click=${() => deps.onDismissCandidate(candidate.asset.path, !isDismissed)}
                >
                  ${isDismissed ? 'Undismiss' : 'Keep'}
                </button>
              </div>
            `;
          })}
        </div>
      `
    )}
  `;
}
