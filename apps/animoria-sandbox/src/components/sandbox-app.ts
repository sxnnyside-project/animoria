import { mount } from '@animoria/ui';
import { LitElement, css, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { SANDBOX_CAPABILITIES, SandboxHost, type SandboxLogEntry } from '../host/sandbox-host.js';
import './sandbox-event-console.js';

/**
 * The harness shell.
 *
 * ## What is left here, and why
 * Everything in this file is *instrumentation*: the chrome that lets a developer
 * watch the shared UI work. The product surfaces are `@animoria/ui`, mounted below,
 * with no sandbox-specific variant and no fixture shortcuts.
 *
 * The event console is the reason the harness earns its keep. It shows every bridge
 * message in both directions, including the ones the sandbox **refuses** — so the
 * read-only guarantee is something a reviewer can watch happen rather than something
 * they have to trust.
 *
 * ## What was deleted from here
 * `animoria-app.ts` held the analysis, the diagnostics, the reference counts and the
 * health outcome as five separate pieces of `@state`, wired the four product panels
 * itself, and spoke a `{command}` dialect no other client used. All of that is now
 * one `WorkspaceAnalysis` arriving over one bridge.
 */
@customElement('sandbox-app')
export class SandboxApp extends LitElement {
  @state() private _logs: SandboxLogEntry[] = [];
  @state() private _consoleOpen = true;

  @query('#ui-root') private _uiRoot!: HTMLElement;

  private _host: SandboxHost | null = null;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--animoria-bg-primary);
      color: var(--animoria-text-primary);
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size);
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-3);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
      flex-shrink: 0;
      font-size: var(--animoria-font-size-sm);
    }

    .brand {
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--animoria-text-strong);
    }

    .badge {
      font-size: var(--animoria-font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: 10px;
      border: 1px solid var(--animoria-warning);
      color: var(--animoria-warning);
    }

    .controls {
      display: flex;
      gap: var(--animoria-space-2);
      align-items: center;
    }

    button {
      background: transparent;
      border: 1px solid var(--animoria-border-strong);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-primary);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 3px 10px;
      cursor: pointer;
    }

    button:hover {
      background: var(--animoria-bg-hover);
    }

    .split {
      flex: 1;
      display: flex;
      min-height: 0;
    }

    #ui-root {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    sandbox-event-console {
      width: 380px;
      flex-shrink: 0;
      border-left: 1px solid var(--animoria-border);
    }
  `;

  override firstUpdated(): void {
    // Mounted after the first render so `#ui-root` exists. The host is created here
    // rather than in the constructor so a hot reload replaces both together.
    this._host = new SandboxHost({
      onLog: (entry) => {
        // Bounded: an unbounded log in a long dev session is a memory leak in the
        // one place a developer is least likely to look for one.
        this._logs = [...this._logs.slice(-499), entry];
      },
    });
    mount(this._uiRoot, this._host);
  }

  override render() {
    return html`
      <div class="bar">
        <span class="brand">ANIMORIA · SANDBOX</span>
        <span class="badge" title=${SANDBOX_CAPABILITIES.mutationUnavailableReason ?? ''}
          >Read-only</span
        >
        <div class="controls">
          <button type="button" @click=${() => this._host?.send({ type: 'run-analysis' })}>
            Re-analyze
          </button>
          <button
            type="button"
            @click=${() => {
              this._consoleOpen = !this._consoleOpen;
            }}
          >
            ${this._consoleOpen ? 'Hide' : 'Show'} bridge log
          </button>
        </div>
      </div>

      <div class="split">
        <div id="ui-root"></div>
        ${
          this._consoleOpen
            ? html`<sandbox-event-console
              .entries=${this._logs}
              @clear-logs=${() => {
                this._logs = [];
              }}
            ></sandbox-event-console>`
            : null
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sandbox-app': SandboxApp;
  }
}
