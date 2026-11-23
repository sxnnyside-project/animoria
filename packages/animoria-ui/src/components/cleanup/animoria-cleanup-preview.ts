import type {
  CleanupEntry,
  CleanupPlan,
  CleanupReason,
  CleanupRefusal,
} from '../../bridge/types.js';
export type CleanupPlanSafety = 'safe' | 'partial' | 'unavailable';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { cleanupReasonLabel, formatBytes } from '../../view-model/analysis-view-model.js';
import '../badges/animoria-confidence-badge.js';
import { AnimoriaElement } from '../common/events.js';

/**
 * The preview of a cleanup plan, and the only place it is confirmed.
 */
@customElement('animoria-cleanup-preview')
export class AnimoriaCleanupPreview extends AnimoriaElement {
  @property({ type: Object }) plan: CleanupPlan | null = null;
  /** False in a read-only host. The apply control renders disabled with a reason. */
  @property({ type: Boolean }) canMutate = true;
  @property({ type: String }) mutationUnavailableReason = '';
  @property({ type: Boolean }) isApplying = false;

  @state() private _isPartialAcknowledged = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
      color: var(--animoria-text-primary);
    }

    .preview {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .safety {
      border-left: 3px solid var(--safety-color);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      background: var(--animoria-neutral-quiet);
      border-radius: var(--animoria-radius-sm);
    }

    .safety-title {
      font-weight: 600;
      color: var(--animoria-text-strong);
      margin-bottom: 2px;
    }

    .safety-body {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-secondary);
      line-height: var(--animoria-line-height);
    }

    .totals {
      display: flex;
      gap: var(--animoria-space-3);
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-secondary);
      padding: var(--animoria-space-2) 0;
      border-bottom: 1px solid var(--animoria-border);
    }

    .totals strong {
      color: var(--animoria-text-strong);
    }

    .section-title {
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--animoria-text-muted);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      max-height: 280px;
      overflow-y: auto;
    }

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--animoria-space-1) var(--animoria-space-2);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
      font-size: var(--animoria-font-size-xs);
    }

    li.refused {
      background: var(--animoria-neutral-quiet);
      border-left: 2px solid var(--animoria-warning);
    }

    .entry-main {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .entry-name {
      font-weight: 600;
      color: var(--animoria-text-strong);
    }

    .entry-meta {
      color: var(--animoria-text-muted);
      display: flex;
      align-items: center;
      gap: var(--animoria-space-1);
    }

    .reasons {
      display: flex;
      gap: var(--animoria-space-1);
      margin-top: 2px;
    }

    .reason {
      font-size: 10px;
      padding: 0 4px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-neutral-quiet);
      color: var(--animoria-text-secondary);
    }

    .refusal-why {
      font-size: 11px;
      color: var(--animoria-text-secondary);
      line-height: var(--animoria-line-height);
    }

    .acknowledge {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-2);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-primary);
      padding: var(--animoria-space-2);
      background: var(--animoria-neutral-quiet);
      border-radius: var(--animoria-radius);
      border: 1px solid var(--animoria-border);
      cursor: pointer;
    }

    .acknowledge input {
      margin-top: 2px;
      cursor: pointer;
    }

    .actions {
      display: flex;
      gap: var(--animoria-space-2);
      margin-top: var(--animoria-space-2);
    }

    .actions button {
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border-radius: var(--animoria-radius);
      font-size: var(--animoria-font-size-sm);
      font-family: inherit;
      cursor: pointer;
      border: 1px solid var(--animoria-border);
      transition: all 120ms ease;
    }

    .actions button.apply {
      background: var(--animoria-danger);
      color: #fff;
      border-color: var(--animoria-danger);
      font-weight: 600;
    }

    .actions button.apply:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .actions button.apply:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .actions button.cancel {
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-primary);
    }

    .actions button.cancel:hover {
      background: var(--animoria-bg-hover);
    }

    .disabled-reason {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      font-style: italic;
    }
  `;

  private static readonly SAFETY: Readonly<
    Record<CleanupPlanSafety, { color: string; title: string }>
  > = {
    safe: { color: 'var(--animoria-success)', title: 'Every selected asset can be removed' },
    partial: {
      color: 'var(--animoria-warning)',
      title: 'Some selected assets cannot be removed',
    },
    unavailable: { color: 'var(--animoria-danger)', title: 'This cleanup cannot run' },
  };

  private get _isBlocked(): boolean {
    const plan = this.plan;
    if (!plan) return true;
    if (!this.canMutate) return true;
    if (this.isApplying) return true;
    if (plan.safety === 'unavailable') return true;
    if (plan.safety === 'partial' && !this._isPartialAcknowledged) return true;
    return false;
  }

  private _apply(): void {
    const plan = this.plan;
    if (!plan || this._isBlocked) return;
    this.emit('apply-cleanup-plan', {
      planId: plan.planId,
      canAllowPartial: plan.safety === 'partial',
    });
  }

  private _cancel(): void {
    this.emit('cancel-cleanup');
  }

  override render() {
    const plan = this.plan;
    if (!plan) return nothing;

    const safetyKey = (plan.safety as CleanupPlanSafety) || 'unavailable';
    const safety =
      AnimoriaCleanupPreview.SAFETY[safetyKey] ?? AnimoriaCleanupPreview.SAFETY.unavailable;

    return html`
      <div class="preview">
        <div class="safety" style=${styleMap({ '--safety-color': safety.color })}>
          <div class="safety-title">${safety.title}</div>
          <div class="safety-body">
            ${
              plan.unavailableReason ??
              (plan.safety === 'partial'
                ? `${plan.entries.length} of ${plan.entries.length + plan.refusals.length} selected asset(s) will be moved to trash. The rest are listed below with the reason.`
                : `${plan.entries.length} asset(s) will be moved to trash, where they can be restored.`)
            }
          </div>
        </div>

        <div class="totals">
          <span><strong>${plan.entries.length}</strong> to remove</span>
          <span><strong>${formatBytes(plan.bytesReclaimed)}</strong> reclaimed</span>
          ${
            plan.refusals.length > 0
              ? html`<span><strong>${plan.refusals.length}</strong> refused</span>`
              : nothing
          }
        </div>

        ${
          plan.entries.length > 0
            ? html`
              <div class="section-title">Will be moved to trash</div>
              <ul>
                ${repeat(
                  plan.entries,
                  (entry: CleanupEntry) => entry.asset.path,
                  (entry: CleanupEntry) => html`
                    <li>
                      <span class="entry-main">
                        <span class="entry-name">${entry.asset.name}</span>
                        <span class="entry-meta">${entry.asset.path}</span>
                        <span class="reasons">
                          ${entry.reasons.map(
                            (reason: string | CleanupReason) =>
                              html`<span class="reason">${cleanupReasonLabel(reason)}</span>`,
                          )}
                        </span>
                      </span>
                      <span class="entry-meta">
                        <animoria-confidence-badge
                          .confidence=${entry.confidence}
                        ></animoria-confidence-badge>
                        ${formatBytes(entry.sizeBytes)}
                      </span>
                    </li>
                  `,
                )}
              </ul>
            `
            : nothing
        }
        ${
          plan.refusals.length > 0
            ? html`
              <div class="section-title">Refused</div>
              <ul>
                ${repeat(
                  plan.refusals,
                  (refusal: CleanupRefusal) => refusal.assetPath,
                  (refusal: CleanupRefusal) => html`
                    <li class="refused">
                      <span class="entry-main">
                        <span class="entry-name">${refusal.assetPath.split(/[/\\]/).pop()}</span>
                        <span class="refusal-why">${refusal.explanation}</span>
                      </span>
                    </li>
                  `,
                )}
              </ul>
            `
            : nothing
        }
        ${
          plan.safety === 'partial' && this.canMutate
            ? html`
              <label class="acknowledge">
                <input
                  type="checkbox"
                  .checked=${this._isPartialAcknowledged}
                  @change=${(e: Event) => {
                    this._isPartialAcknowledged = (e.target as HTMLInputElement).checked;
                  }}
                />
                <span
                  >I have read the ${plan.refusals.length} refusal(s) and want to remove the
                  remaining ${plan.entries.length} asset(s).</span
                >
              </label>
            `
            : nothing
        }
        ${
          !this.canMutate && this.mutationUnavailableReason
            ? html`<div class="disabled-reason">${this.mutationUnavailableReason}</div>`
            : nothing
        }

        <div class="actions">
          <button class="apply" type="button" ?disabled=${this._isBlocked} @click=${this._apply}>
            ${this.isApplying ? 'Moving to trash…' : `Move ${plan.entries.length} to trash`}
          </button>
          <button class="cancel" type="button" @click=${this._cancel}>Cancel</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-cleanup-preview': AnimoriaCleanupPreview;
  }
}
