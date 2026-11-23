import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import type { RestoreResult, SessionManifest } from '../../bridge/types.js';
import { formatBytes } from '../../view-model/analysis-view-model.js';
import { AnimoriaElement } from '../common/events.js';
import '../gallery/animoria-state-panel.js';

export type { SessionManifest, RestoreResult };

/**
 * Trash and session restore management panel.
 */
@customElement('animoria-trash-panel')
export class AnimoriaTrashPanel extends AnimoriaElement {
  @property({ type: Array }) sessions: readonly SessionManifest[] | null = null;
  @property({ type: Object }) result: RestoreResult | null = null;
  @property({ type: Boolean }) canRestore = false;
  @property({ type: String }) restoreUnavailableReason = '';
  @property({ type: Boolean }) isRestoring = false;

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
    }

    .outcome {
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border-radius: var(--animoria-radius);
      border: 1px solid var(--animoria-border);
      font-size: var(--animoria-font-size-xs);
    }

    .outcome.clean {
      border-color: var(--animoria-success);
      background: var(--animoria-neutral-quiet);
      color: var(--animoria-text-primary);
    }

    .outcome.partial {
      border-color: var(--animoria-warning);
      background: var(--animoria-neutral-quiet);
      color: var(--animoria-text-primary);
    }

    .reason {
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-xs);
    }
  `;

  private _restore(sessionId: string): void {
    this.emit('restore-session', { sessionId });
  }

  private _renderOutcome(result: RestoreResult) {
    const isPartial = Boolean(result.error);
    return html`
      <div class=${classMap({ outcome: true, partial: isPartial, clean: !isPartial })} role="status">
        <div>Restored ${result.restoredPaths.length} asset(s).</div>
        ${result.error ? html`<div class="reason">${result.error}</div>` : nothing}
      </div>
    `;
  }

  override render() {
    if (this.sessions === null) {
      return html`
        <button type="button" ?disabled=${!this.canRestore} @click=${() =>
          this.emit('request-trash-sessions')}>
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
      return html`<animoria-state-panel
        state="empty"
        summary="No assets in trash for this workspace."
      ></animoria-state-panel>`;
    }

    return html`
      ${this.result ? this._renderOutcome(this.result) : nothing}
      ${repeat(
        this.sessions,
        (s) => s.id,
        (s) => {
          const totalBytes = s.items.reduce((sum, item) => sum + item.sizeBytes, 0);
          return html`
            <div class="row">
              <div class="body">
                <div class="headline">
                  ${s.items.length} asset${s.items.length === 1 ? '' : 's'} (${formatBytes(totalBytes)})
                </div>
                <div class="meta">
                  ${new Date(s.timestamp).toLocaleString()} · ${s.items.map((e) => e.originalPath.split('/').pop()).join(', ')}
                </div>
              </div>
              <button
                class="primary"
                type="button"
                ?disabled=${!this.canRestore || this.isRestoring}
                @click=${() => this._restore(s.id)}
              >
                ${this.isRestoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          `;
        },
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-trash-panel': AnimoriaTrashPanel;
  }
}
