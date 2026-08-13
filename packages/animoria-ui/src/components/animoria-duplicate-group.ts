import type { DuplicateGroup, ResolutionPlan } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { formatBytes } from '../view-model/analysis-view-model.js';

/**
 * A duplicate group, and the plan-based resolution flow over it (D-20).
 *
 * ## The three-state safety model this renders
 * `ResolutionPlan.safety` is `complete` or `partial`, and the absence of a plan is
 * the third state. All three are shown, with the actual reasons:
 *
 * - **safe** (`complete`) — every reference to every removed copy will be repointed.
 * - **partial** — some references cannot be repointed mechanically. Each refusal
 *   carries one of four first-class reasons and a plain-language explanation, and
 *   applying requires an explicit acknowledgement. Silently downgrading a partial
 *   plan to safe would remove files that source code still points at without saying
 *   so, which is the precise failure D-20 exists to prevent.
 * - **unavailable** — no plan could be built.
 *
 * ## Why `matchKind` is prominent
 * D-19: `content-hash` and `filename` groups look identical in a list and mean
 * opposite things. Deleting a copy is safe for the first and loses data for the
 * second — two files named `logo.json` may be completely different images. The old
 * cleanup UI offered deletion for both through one `category: 'duplicate'`.
 */
@customElement('animoria-duplicate-group')
export class AnimoriaDuplicateGroupView extends LitElement {
  @property({ type: Object }) group: DuplicateGroup | null = null;
  /** The plan for the current selection, once the host has built one. */
  @property({ type: Object }) plan: ResolutionPlan | null = null;
  @property({ type: String }) planId = '';
  @property({ type: Boolean }) canMutate = true;
  @property({ type: String }) mutationUnavailableReason = '';
  @property({ type: Boolean }) applying = false;

  @state() private _keepPath = '';
  @state() private _partialAcknowledged = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
      color: var(--animoria-text-primary);
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      flex-wrap: wrap;
    }

    .kind {
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: 10px;
      border: 1px solid var(--kind-color);
      color: var(--kind-color);
    }

    .kind-meaning {
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
      flex-basis: 100%;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
    }

    li label {
      display: flex;
      align-items: flex-start;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
      cursor: pointer;
    }

    li label.chosen {
      border-color: var(--animoria-success);
      background: var(--animoria-success-quiet);
    }

    .candidate-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .candidate-name {
      font-weight: 600;
      word-break: break-all;
    }

    .candidate-meta {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
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

    .rewrite,
    .refusal {
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-xs);
      line-height: var(--animoria-line-height);
      padding: var(--animoria-space-1) 0;
      border-bottom: 1px solid var(--animoria-border);
    }

    .old {
      color: var(--animoria-danger);
    }

    .new {
      color: var(--animoria-success);
    }

    .why {
      font-family: var(--animoria-font-family);
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
      gap: var(--animoria-space-2);
      align-items: center;
    }

    button {
      font-family: inherit;
      font-size: var(--animoria-font-size);
      border-radius: var(--animoria-radius-sm);
      padding: 7px 14px;
      cursor: pointer;
      border: 1px solid transparent;
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .disabled-reason {
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-warning);
    }

    .scroll {
      max-height: 200px;
      overflow-y: auto;
    }
  `;

  private static readonly KIND: Readonly<
    Record<string, { color: string; label: string; meaning: string }>
  > = {
    'content-hash': {
      color: 'var(--animoria-info)',
      label: 'Identical content',
      meaning:
        'These files are byte-identical. Keeping one and repointing references at it loses nothing.',
    },
    filename: {
      color: 'var(--animoria-warning)',
      label: 'Same name',
      meaning:
        'These files share a name but their contents differ. Deleting one loses data — this group is a naming collision, not a duplicate.',
    },
  };

  private get _selectedKeepPath(): string {
    return this._keepPath || (this.group?.candidates[0]?.asset.path ?? '');
  }

  private _choose(path: string): void {
    this._keepPath = path;
    this._partialAcknowledged = false;
    const group = this.group;
    if (!group) return;
    this.dispatchEvent(
      new CustomEvent('request-resolution-plan', {
        detail: { groupId: group.id, keepPath: path },
        bubbles: true,
        composed: true,
      })
    );
  }

  private get _blocked(): boolean {
    if (!this.plan || !this.planId) return true;
    if (!this.canMutate) return true;
    if (this.applying) return true;
    if (this.plan.safety === 'partial' && !this._partialAcknowledged) return true;
    return false;
  }

  private _apply(): void {
    if (this._blocked || !this.plan) return;
    this.dispatchEvent(
      new CustomEvent('apply-resolution-plan', {
        detail: { planId: this.planId, allowPartial: this.plan.safety === 'partial' },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderPlan(plan: ResolutionPlan) {
    const safe = plan.safety === 'complete';
    const color = safe ? 'var(--animoria-success)' : 'var(--animoria-warning)';

    return html`
      <div class="safety" style="--safety-color: ${color}">
        <div class="safety-title">
          ${safe ? 'Safe — every reference can be repointed' : 'Partial — some references cannot be repointed'}
        </div>
        <div>
          ${plan.assetsToDelete.length} file(s) move to trash ·
          ${plan.referenceUpdates.length} reference(s) rewritten ·
          ${formatBytes(plan.estimatedSavingsBytes)} reclaimed
        </div>
      </div>

      ${
        plan.referenceUpdates.length > 0
          ? html`
            <div class="section-title">Reference changes</div>
            <div class="scroll">
              ${plan.referenceUpdates.map(
                (update) => html`
                  <div class="rewrite">
                    <div>${update.file}:${update.line}</div>
                    <div class="old">− ${update.oldTarget}</div>
                    <div class="new">+ ${update.newTarget}</div>
                  </div>
                `
              )}
            </div>
          `
          : nothing
      }
      ${
        plan.unrewritableReferences.length > 0
          ? html`
            <div class="section-title">Cannot be repointed — fix these by hand</div>
            <div class="scroll">
              ${plan.unrewritableReferences.map(
                (refusal) => html`
                  <div class="refusal">
                    <div>${refusal.file}:${refusal.line}</div>
                    <div class="old">${refusal.text}</div>
                    <div class="why">${refusal.explanation}</div>
                  </div>
                `
              )}
            </div>
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
                >I understand ${plan.unrewritableReferences.length} reference(s) will still point at
                a file that has moved to trash, and I will fix them myself.</span
              >
            </label>
          `
          : nothing
      }
    `;
  }

  override render() {
    const group = this.group;
    if (!group) return nothing;

    const kind = AnimoriaDuplicateGroupView.KIND[group.matchKind] ?? {
      color: 'var(--animoria-text-muted)',
      label: group.matchKind,
      meaning: '',
    };
    const keepPath = this._selectedKeepPath;

    return html`
      <div class="group">
        <div class="header">
          <span class="kind" style="--kind-color: ${kind.color}">${kind.label}</span>
          <span>${group.candidates.length} copies · ${formatBytes(group.sizeBytes)} each</span>
          <span class="kind-meaning">${kind.meaning}</span>
        </div>

        <div class="section-title">Which copy should be kept?</div>
        <ul>
          ${group.candidates.map(
            (candidate) => html`
              <li>
                <label class=${candidate.asset.path === keepPath ? 'chosen' : ''}>
                  <input
                    type="radio"
                    name="keep"
                    .checked=${candidate.asset.path === keepPath}
                    @change=${() => this._choose(candidate.asset.path)}
                  />
                  <span class="candidate-body">
                    <span class="candidate-name">${candidate.asset.name}</span>
                    <span class="candidate-meta">${candidate.asset.path}</span>
                    <span class="candidate-meta"
                      >${candidate.referenceCount} reference(s) point here</span
                    >
                  </span>
                </label>
              </li>
            `
          )}
        </ul>

        ${this.plan ? this._renderPlan(this.plan) : nothing}
        ${
          !this.canMutate && this.mutationUnavailableReason
            ? html`<div class="disabled-reason">${this.mutationUnavailableReason}</div>`
            : nothing
        }

        <div class="actions">
          <button type="button" ?disabled=${this._blocked} @click=${this._apply}>
            ${this.applying ? 'Resolving…' : 'Resolve duplicates'}
          </button>
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
