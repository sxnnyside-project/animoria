import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RestoreResult, SessionManifest } from '../bridge/types.js';
import { formatBytes } from '../view-model/analysis-view-model.js';
import './animoria-state-panel.js';

export type { SessionManifest, RestoreResult };

/**
 * Trash and session restore management panel.
 */
@customElement('animoria-trash-panel')
export class AnimoriaTrashPanel extends LitElement {
  @property({ type: Array }) sessions: readonly SessionManifest[] | null = null;
  @property({ type: Object }) result: RestoreResult | null = null;
  @property({ type: Boolean }) canRestore = false;
  @property({ type: String }) restoreUnavailableReason = '';
  @property({ type: Boolean }) restoring = false;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      background: var(--animoria-bg-secondary);
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .headline {
      font-weight: 600;
      color: var(--animoria-text-strong);
    }

    .meta {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    button {
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 4px 10px;
      border-radius: var(--animoria-radius-sm);
      border: 1px solid var(--animoria-border);
      background: var(--animoria-bg-raised);
      color: var(--animoria-text-primary);
      cursor: pointer;
      flex-shrink: 0;
    }

    button:hover:not(:disabled) {
      background: var(--animoria-bg-hover);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .outcome {
      padding: var(--animoria-space-2);
      border-radius: var(--animoria-radius-sm);
      font-size: var(--animoria-font-size-xs);
    }

    .outcome.clean {
      background: var(--animoria-success-subtle);
      color: var(--animoria-success);
    }

    .outcome.partial {
      background: var(--animoria-warning-subtle);
      color: var(--animoria-warning);
    }

    .reason {
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-xs);
    }
  `;

  private _restore(sessionId: string): void {
    this.dispatchEvent(
      new CustomEvent('restore-session', {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderOutcome(result: RestoreResult) {
    const partial = Boolean(result.error);
    return html`
      <div class="outcome ${partial ? 'partial' : 'clean'}" role="status">
        <div>Restored ${result.restoredPaths.length} asset(s).</div>
        ${result.error ? html`<div class="reason">${result.error}</div>` : nothing}
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
          state="ready"
          summary="Nothing is in Animoria's trash. Removals stay recoverable."
        ></animoria-state-panel>
      `;
    }

    return html`
      ${this.result ? this._renderOutcome(this.result) : nothing}
      ${this.sessions.map((session) => {
        const bytes = session.items.reduce((sum, item) => sum + item.sizeBytes, 0);
        return html`
          <div class="row">
            <span class="body">
              <span class="headline">
                ${session.items.length} asset(s) — ${formatBytes(bytes)}
              </span>
              <span class="meta">${new Date(session.timestamp).toLocaleString()}</span>
              <span class="meta">
                ${session.items.map((item) => item.originalPath).join(', ')}
              </span>
            </span>
            <button
              type="button"
              ?disabled=${!this.canRestore || this.restoring}
              title=${this.canRestore ? '' : this.restoreUnavailableReason}
              @click=${() => this._restore(session.id)}
            >
              ${this.restoring ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        `;
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-trash-panel': AnimoriaTrashPanel;
  }
}
