import type { RestoreResult, SessionManifest } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatBytes } from '../view-model/analysis-view-model.js';
import './animoria-state-panel.js';

/**
 * What cleanup can be undone, and the outcome of undoing it.
 *
 * ## Why this exists
 * Every removal Animoria performs stages into `.animoria/trash/` specifically so it
 * can be reversed. The reversal had a Core implementation (`restoreTrashSession`), a
 * daemon method, a `HostBridge` message pair, and handlers in all three hosts — and
 * no component anywhere sent `request-trash-sessions` or rendered `restore-result`.
 * The safety property existed end to end except for the end the developer touches.
 *
 * ## Why partial restores render per entry
 * `restoreTrashSession` never throws; it reports each file it could not put back and
 * why — most often because something new now occupies the original path. Collapsing
 * that into "restore failed" would send the developer looking for a bug instead of
 * for the file in their way.
 */
@customElement('animoria-trash-panel')
export class AnimoriaTrashPanel extends LitElement {
  /** `null` before the host has answered — distinct from an empty trash. */
  @property({ attribute: false }) sessions: readonly SessionManifest[] | null = null;
  @property({ attribute: false }) result: RestoreResult | null = null;
  @property({ type: Boolean }) canRestore = false;
  @property({ type: String }) restoreUnavailableReason = '';
  @property({ type: Boolean }) restoring = false;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
    }

    .body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .headline {
      font-weight: 600;
    }

    .meta,
    .reason {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
      word-break: break-all;
    }

    button {
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
      border: none;
      border-radius: var(--animoria-radius-sm);
      padding: 5px 12px;
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      cursor: pointer;
      flex-shrink: 0;
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .outcome {
      border: 1px solid var(--animoria-border);
      border-left-width: 3px;
      border-radius: var(--animoria-radius-sm);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      font-size: var(--animoria-font-size-sm);
      line-height: var(--animoria-line-height);
    }

    .outcome.clean {
      border-left-color: var(--animoria-success);
    }

    .outcome.partial {
      border-left-color: var(--animoria-warning);
    }
  `;

  private _restore(sessionId: string): void {
    this.dispatchEvent(
      new CustomEvent('restore-session', { detail: { sessionId }, bubbles: true, composed: true })
    );
  }

  private _renderOutcome(result: RestoreResult) {
    const partial = result.failures.length > 0;
    return html`
      <div class="outcome ${partial ? 'partial' : 'clean'}" role="status">
        <div>
          Restored ${result.restoredPaths.length} asset(s)${
            partial ? `, ${result.failures.length} could not be put back.` : '.'
          }
        </div>
        ${result.failures.map(
          (failure) => html`<div class="reason">
            ${failure.originalPath} — ${REASON_TEXT[failure.reason]}
          </div>`
        )}
      </div>
    `;
  }

  override render() {
    if (this.sessions === null) {
      return html`
        <button type="button" ?disabled=${!this.canRestore} @click=${() =>
          this.dispatchEvent(
            new CustomEvent('request-trash-sessions', { bubbles: true, composed: true })
          )}>
          Show what can be restored
        </button>
        ${
          this.canRestore
            ? nothing
            : html`<span class="reason">${
                this.restoreUnavailableReason || 'This host cannot restore trashed assets.'
              }</span>`
        }
      `;
    }

    if (this.sessions.length === 0) {
      return html`
        ${this.result ? this._renderOutcome(this.result) : nothing}
        <animoria-state-panel
          state="empty"
          summary="Nothing is in Animoria's trash. Removals stay recoverable for seven days."
        ></animoria-state-panel>
      `;
    }

    return html`
      ${this.result ? this._renderOutcome(this.result) : nothing}
      ${this.sessions.map((session) => {
        const bytes = session.entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
        return html`
          <div class="row">
            <span class="body">
              <span class="headline">
                ${session.entries.length} asset(s) — ${formatBytes(bytes)}
              </span>
              <span class="meta">${new Date(session.movedAt).toLocaleString()}</span>
              <span class="meta">
                ${session.entries.map((entry) => entry.originalPath).join(', ')}
              </span>
            </span>
            <button
              type="button"
              ?disabled=${!this.canRestore || this.restoring}
              title=${this.canRestore ? '' : this.restoreUnavailableReason}
              @click=${() => this._restore(session.sessionId)}
            >
              ${this.restoring ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        `;
      })}
    `;
  }
}

/** Core's refusal reasons, in the words a developer can act on. */
const REASON_TEXT: Readonly<Record<RestoreResult['failures'][number]['reason'], string>> = {
  'destination-occupied': 'something new now exists at its original path',
  'trash-file-missing': 'the staged copy is no longer in the trash directory',
  'move-failed': 'the file could not be moved back',
};

declare global {
  interface HTMLElementTagNameMap {
    'animoria-trash-panel': AnimoriaTrashPanel;
  }
}
