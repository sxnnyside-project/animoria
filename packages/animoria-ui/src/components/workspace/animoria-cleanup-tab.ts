import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import type {
  HostCapabilities,
  RestoreResult,
  RootCleanupPlan,
  RootCleanupProposal,
  SessionManifest,
} from '../../bridge/types.js';
import { NO_CAPABILITIES } from '../../bridge/types.js';
import type { AnalysisViewModel } from '../../view-model/analysis-view-model.js';
import { formatBytes } from '../../view-model/analysis-view-model.js';
import { AnimoriaElement } from '../common/events.js';
import '../badges/animoria-root-badge.js';
import '../cleanup/animoria-cleanup-preview.js';
import '../cleanup/animoria-trash-panel.js';
import '../gallery/animoria-state-panel.js';

/** Why destructive controls are disabled, or `''` when they aren't. */
export function destructiveReason(capabilities: HostCapabilities): string {
  if (!capabilities.canMutate) {
    return capabilities.mutationUnavailableReason ?? 'This host cannot modify files.';
  }
  return '';
}

/**
 * Dedicated tab component rendering removable candidates, deletion staging, and trash session restoration.
 */
@customElement('animoria-cleanup-tab')
export class AnimoriaCleanupTab extends AnimoriaElement {
  @property({ attribute: false }) model: AnalysisViewModel | null = null;
  @property({ attribute: false }) capabilities: HostCapabilities = NO_CAPABILITIES;
  @property({ type: String }) cleanupView: 'proposal' | 'trash' = 'proposal';
  @property({ attribute: false }) trashSessions: readonly SessionManifest[] | null = null;
  @property({ attribute: false }) restoreResult: RestoreResult | null = null;
  @property({ type: Boolean }) isRestoring = false;
  @property({ attribute: false }) cleanupPlans: readonly RootCleanupPlan[] = [];
  @property({ type: Boolean }) isApplying = false;
  @property({ attribute: false }) proposals: readonly RootCleanupProposal[] = [];
  @property({ attribute: false }) selectedForCleanup: ReadonlySet<string> = new Set();
  @property({ attribute: false }) dismissed: ReadonlySet<string> = new Set();

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .subnav {
      display: flex;
      gap: var(--animoria-space-1);
      border-bottom: 1px solid var(--animoria-border);
      padding-bottom: var(--animoria-space-2);
    }

    .subnav button {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 2px 6px 4px;
      cursor: pointer;
    }

    .subnav button[aria-selected='true'] {
      color: var(--animoria-text-strong);
      border-bottom-color: var(--animoria-accent);
    }

    .banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border: 1px solid var(--banner-color);
      border-left-width: 3px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-raised);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
    }

    .toolbar {
      display: flex;
      gap: var(--animoria-space-2);
      align-items: center;
    }

    .toolbar button {
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
      border: none;
      border-radius: var(--animoria-radius-sm);
      padding: 6px 12px;
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      cursor: pointer;
    }

    .toolbar button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .plan-block {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      padding-bottom: var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
    }

    .section-title {
      font-size: var(--animoria-font-size-sm);
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .cleanup-row {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
    }

    .cleanup-row.blocked {
      opacity: 0.7;
      border-color: var(--animoria-warning);
    }

    .cleanup-row.dismissed {
      opacity: 0.55;
    }

    .dismiss {
      background: transparent;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 2px 8px;
      cursor: pointer;
      flex-shrink: 0;
      margin-left: auto;
      align-self: flex-start;
    }

    .cleanup-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cleanup-name {
      font-weight: 600;
      word-break: break-all;
    }

    .cleanup-meta,
    .blocked-why {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
    }

    .blocked-why {
      color: var(--animoria-warning);
    }
  `;

  override render() {
    return html`
      <div class="subnav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected=${this.cleanupView === 'proposal'}
          @click=${() => this.emit('change-cleanup-view', { view: 'proposal' })}
        >
          Removable
        </button>
        <button
          type="button"
          role="tab"
          aria-selected=${this.cleanupView === 'trash'}
          @click=${() => this.emit('change-cleanup-view', { view: 'trash' })}
        >
          Trash
        </button>
      </div>
      ${this.cleanupView === 'proposal' ? this._renderCleanup() : this._renderTrash()}
    `;
  }

  private _renderTrash() {
    return html`
      <animoria-trash-panel
        .sessions=${this.trashSessions}
        .result=${this.restoreResult}
        .canRestore=${this.capabilities.canRestore}
        .restoreUnavailableReason=${this.capabilities.mutationUnavailableReason ?? ''}
        .isRestoring=${this.isRestoring}
        @request-trash-sessions=${() => this.emit('request-trash-sessions')}
        @restore-session=${(e: CustomEvent<{ sessionId: string }>) =>
          this.emit('restore-session', e.detail)}
      ></animoria-trash-panel>
    `;
  }

  private _renderCleanup() {
    const model = this.model;
    if (this.cleanupPlans.length > 0) {
      return html`
        ${
          this.cleanupPlans.length > 1
            ? html`<div class="banner" style="--banner-color: var(--animoria-info)" role="status">
                <span
                  >This selection spans ${this.cleanupPlans.length} roots. Each root is
                  confirmed and applied separately, so one root failing cannot half-apply
                  another.</span
                >
              </div>`
            : nothing
        }
        <div class="list">
          ${repeat(
            this.cleanupPlans,
            (entry) => entry.plan.planId,
            (entry) => html`
              <div class="plan-block">
                ${
                  !model || model.isSingleRoot
                    ? nothing
                    : html`<div class="section-title">
                        <animoria-root-badge .rootName=${entry.rootName}></animoria-root-badge>
                      </div>`
                }
                <animoria-cleanup-preview
                  .plan=${entry.plan}
                  .canMutate=${this.capabilities.canMutate}
                  .mutationUnavailableReason=${destructiveReason(this.capabilities)}
                  .isApplying=${this.isApplying}
                  @apply-cleanup-plan=${(
                    e: CustomEvent<{ planId: string; canAllowPartial: boolean }>,
                  ) => this.emit('apply-cleanup-plan', e.detail)}
                  @cancel-cleanup=${() => this.emit('cancel-cleanup-plans')}
                ></animoria-cleanup-preview>
              </div>
            `,
          )}
        </div>
      `;
    }

    const filterKind = model?.filter.kind ?? 'all';
    const filterRootId = model?.filter.kind === 'root' ? model.filter.rootId : null;
    const visible = this.proposals.filter(
      (entry) => filterKind === 'all' || filterRootId === entry.rootId,
    );

    if (this.proposals.length === 0) {
      return html`
        <div class="toolbar">
          <button type="button" @click=${() => this.emit('request-cleanup-proposal')}>
            Find removable assets
          </button>
        </div>
      `;
    }

    const totalCandidates = visible.reduce(
      (sum, entry) => sum + entry.proposal.candidates.length,
      0,
    );
    const totalBytes = visible.reduce(
      (sum, entry) =>
        sum +
        (entry.proposal.totalSizeBytes ??
          entry.proposal.candidates.reduce((csum, c) => csum + (c.asset.size_bytes || 0), 0)),
      0,
    );

    if (totalCandidates === 0) {
      return html`<animoria-state-panel
        state="empty"
        summary="Nothing is eligible for removal. Every asset is either referenced or passes every rule."
      ></animoria-state-panel>`;
    }

    const selectedCount = this.selectedForCleanup.size;

    return html`
      <div class="toolbar">
        <button
          type="button"
          ?disabled=${selectedCount === 0}
          @click=${() => this.emit('request-cleanup-plan')}
        >
          Preview removal of ${selectedCount}
        </button>
        <span class="cleanup-meta">${totalCandidates} candidate(s) · ${formatBytes(totalBytes)} total</span>
      </div>

      ${visible.map(
        (entry) => html`
          ${
            !model || model.isSingleRoot
              ? nothing
              : html`<div class="section-title">${entry.rootName} — ${entry.proposal.candidates.length}</div>`
          }
          <div class="list">
            ${repeat(
              entry.proposal.candidates,
              (candidate) => candidate.asset.path,
              (candidate) => {
                const isDismissed = this.dismissed.has(candidate.asset.path);
                const isEligible = candidate.eligibility?.isEligible ?? true;
                return html`
                  <div
                    class=${classMap({
                      'cleanup-row': true,
                      blocked: !isEligible,
                      dismissed: isDismissed,
                    })}
                  >
                    <input
                      type="checkbox"
                      .checked=${this.selectedForCleanup.has(candidate.asset.path)}
                      ?disabled=${!isEligible || isDismissed}
                      @change=${() =>
                        this.emit('toggle-cleanup-selection', { assetPath: candidate.asset.path })}
                    />
                    <span class="cleanup-body">
                      <span class="cleanup-name">
                        ${candidate.asset.name}
                        <animoria-root-badge
                          quiet
                          .rootName=${entry.rootName}
                          ?hidden=${!model || model.isSingleRoot}
                        ></animoria-root-badge>
                      </span>
                      <span class="cleanup-meta"
                        >${candidate.asset.path} · ${formatBytes(candidate.sizeBytes ?? candidate.asset.size_bytes)} ·
                        ${candidate.referenceCount ?? 0} reference(s)</span
                      >
                      ${
                        candidate.eligibility && !candidate.eligibility.isEligible
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
                      @click=${() =>
                        this.emit('dismiss-candidate', {
                          assetPath: candidate.asset.path,
                          isDismissed: !isDismissed,
                        })}
                    >
                      ${isDismissed ? 'Undismiss' : 'Keep'}
                    </button>
                  </div>
                `;
              },
            )}
          </div>
        `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-cleanup-tab': AnimoriaCleanupTab;
  }
}
