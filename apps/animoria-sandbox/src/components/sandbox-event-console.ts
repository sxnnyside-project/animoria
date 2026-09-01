import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SandboxLogEntry } from '../host/sandbox-host.js';

/**
 * Every bridge message, in both directions, as they happen. Refused messages
 * render in their own color with the reason, so the read-only guarantee is
 * something a reviewer can watch rather than take on faith.
 */
@customElement('sandbox-event-console')
export class SandboxEventConsole extends LitElement {
  @property({ type: Array }) entries: readonly SandboxLogEntry[] = [];

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--animoria-bg-secondary);
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
      color: var(--animoria-text-primary);
      overflow: hidden;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
      flex-shrink: 0;
    }

    .title {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    button {
      background: transparent;
      border: 1px solid var(--animoria-border-strong);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 2px 8px;
      cursor: pointer;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: var(--animoria-space-2);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    li {
      display: grid;
      grid-template-columns: auto auto 1fr;
      gap: var(--animoria-space-2);
      align-items: baseline;
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-xs);
      line-height: 1.4;
    }

    .time {
      color: var(--animoria-text-muted);
    }

    .dir {
      font-weight: 700;
      white-space: nowrap;
    }

    .dir.out {
      color: var(--animoria-info);
    }

    .dir.in {
      color: var(--animoria-success);
    }

    .dir.refused {
      color: var(--animoria-danger);
    }

    .detail {
      color: var(--animoria-text-muted);
      font-family: var(--animoria-font-family);
    }

    .empty {
      padding: var(--animoria-space-4);
      text-align: center;
      color: var(--animoria-text-muted);
    }
  `;

  private static readonly DIRECTION_CLASS: Readonly<Record<string, string>> = {
    'ui→host': 'out',
    'host→ui': 'in',
    refused: 'refused',
  };

  override render() {
    return html`
      <header>
        <span class="title">Host bridge · ${this.entries.length} message(s)</span>
        <button
          type="button"
          @click=${() =>
            this.dispatchEvent(new CustomEvent('clear-logs', { bubbles: true, composed: true }))}
        >
          Clear
        </button>
      </header>

      ${
        this.entries.length === 0
          ? html`<div class="empty">No messages yet.</div>`
          : html`<ul>
            ${this.entries.map(
              (entry) => html`
                <li>
                  <span class="time">${entry.at.slice(11, 19)}</span>
                  <span class="dir ${SandboxEventConsole.DIRECTION_CLASS[entry.direction] ?? ''}"
                    >${entry.direction}</span
                  >
                  <span
                    >${entry.type}
                    ${entry.detail ? html`<span class="detail">— ${entry.detail}</span>` : null}</span
                  >
                </li>
              `
            )}
          </ul>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sandbox-event-console': SandboxEventConsole;
  }
}
