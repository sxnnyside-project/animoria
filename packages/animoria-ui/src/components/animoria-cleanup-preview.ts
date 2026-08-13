import type { CleanupPlan, CleanupPlanSafety } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cleanupReasonLabel, formatBytes } from '../view-model/analysis-view-model.js';
import './animoria-confidence-badge.js';

/**
 * The preview of a cleanup plan, and the only place it is confirmed.
 *
 * ## The invariant this component protects
 * It renders a `CleanupPlan` and emits `apply-cleanup-plan` carrying that plan's
 * **id**. It never builds an entry list, never filters one, and never derives what
 * will happen — so "what you saw is what ran" holds structurally. The previous
 * design had the panel hold a mutable session, mutate decisions into it, and hand
 * the mutated object to an executor that re-derived the removal set; there were two
 * derivations and nothing forced them to agree.
 *
 * ## Why `partial` needs a second gesture
 * A plan that refuses part of the selection is not a plan the developer approved.
 * The refusals are shown, and the apply button stays disabled until the developer
 * explicitly acknowledges them — `allowPartial` on the message is then a statement
 * that they saw the list, which is exactly what `executeCleanupPlan` requires
 * before it will proceed. Silently applying the safe subset would be a downgrade
 * the developer never agreed to.
 */
@customElement('animoria-cleanup-preview')
export class AnimoriaCleanupPreview extends LitElement {
  @property({ type: Object }) plan: CleanupPlan | null = null;
  /** False in a read-only host. The apply control renders disabled with a reason. */
  @property({ type: Boolean }) canMutate = true;
  @property({ type: String }) mutationUnavailableReason = '';
  @property({ type: Boolean }) applying = false;

  @state() private _partialAcknowledged = false;

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
      border: 1px solid var(--safety-color);
      border-left-width: 3px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-raised);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
    }

    .safety-title {
      font-weight: 600;
      color: var(--safety-color);
    }

    .safety-body {
      line-height: var(--animoria-line-height);
    }

    .totals {
      display: flex;
      gap: var(--animoria-space-4);
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-muted);
    }

    .totals strong {
      color: var(--animoria-text-strong);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      max-height: 260px;
      overflow-y: auto;
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
    }

    li.refused {
      border-color: var(--animoria-danger);
      background: var(--animoria-danger-quiet);
    }

    .entry-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .entry-name {
      font-weight: 600;
      word-break: break-all;
    }

    .entry-meta,
    .refusal-why {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
    }

    .reasons {
      display: flex;
      gap: var(--animoria-space-1);
      flex-wrap: wrap;
    }

    .reason {
      font-size: var(--animoria-font-size-xs);
      padding: 0 5px;
      border-radius: 3px;
      background: var(--animoria-neutral-quiet);
      color: var(--animoria-text-muted);
    }

    .section-title {
      font-size: var(--animoria-font-size-sm);
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .acknowledge {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-2);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    button {
      font-family: inherit;
      font-size: var(--animoria-font-size);
      border-radius: var(--animoria-radius-sm);
      padding: 7px 14px;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .apply {
      background: var(--animoria-danger);
      color: var(--animoria-text-on-accent);
    }

    .apply:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .cancel {
      background: transparent;
      border-color: var(--animoria-border-strong);
      color: var(--animoria-text-primary);
    }

    .disabled-reason {
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-warning);
      line-height: var(--animoria-line-height);
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

  private get _blocked(): boolean {
    const plan = this.plan;
    if (!plan) return true;
    if (!this.canMutate) return true;
    if (this.applying) return true;
    if (plan.safety === 'unavailable') return true;
    if (plan.safety === 'partial' && !this._partialAcknowledged) return true;
    return false;
  }

  private _apply(): void {
    const plan = this.plan;
    if (!plan || this._blocked) return;
    this.dispatchEvent(
      new CustomEvent('apply-cleanup-plan', {
        detail: { planId: plan.planId, allowPartial: plan.safety === 'partial' },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _cancel(): void {
    this.dispatchEvent(new CustomEvent('cancel-cleanup', { bubbles: true, composed: true }));
  }

  override render() {
    const plan = this.plan;
    if (!plan) return nothing;

    const safety = AnimoriaCleanupPreview.SAFETY[plan.safety];

    return html`
      <div class="preview">
        <div class="safety" style="--safety-color: ${safety.color}">
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
                ${plan.entries.map(
                  (entry) => html`
                    <li>
                      <span class="entry-main">
                        <span class="entry-name">${entry.asset.name}</span>
                        <span class="entry-meta">${entry.asset.path}</span>
                        <span class="reasons">
                          ${entry.reasons.map(
                            (reason) =>
                              html`<span class="reason">${cleanupReasonLabel(reason)}</span>`
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
                  `
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
                ${plan.refusals.map(
                  (refusal) => html`
                    <li class="refused">
                      <span class="entry-main">
                        <span class="entry-name">${refusal.assetPath.split(/[/\\]/).pop()}</span>
                        <span class="refusal-why">${refusal.explanation}</span>
                      </span>
                    </li>
                  `
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
                  .checked=${this._partialAcknowledged}
                  @change=${(e: Event) => {
                    this._partialAcknowledged = (e.target as HTMLInputElement).checked;
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
          <button class="apply" type="button" ?disabled=${this._blocked} @click=${this._apply}>
            ${this.applying ? 'Moving to trash…' : `Move ${plan.entries.length} to trash`}
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
