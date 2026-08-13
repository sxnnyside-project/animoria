import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GeneratedSnippet } from '../bridge/types.js';

/**
 * The generated snippet, shown rather than promised.
 *
 * ## What this replaces
 * "Generate Code Snippet" ended in a status-bar message reading *"Done, copied."* The
 * developer had to paste into a file to discover which framework they had picked, what
 * the import line was, and whether it referenced the right asset. A toast is an
 * assertion about a clipboard; this is the code.
 *
 * ## Why the code stays until it is dismissed
 * A snippet is something a developer reads while typing something else. Anything that
 * clears it on the next click — a notification timeout, a focus change, opening the
 * file it is meant for — makes it useless for its actual purpose.
 *
 * ## Why the copy button lives inside the block
 * The clipboard action belongs to the thing being copied. A copy button in a toolbar
 * above three code blocks is a button whose target the reader has to infer.
 */
@customElement('animoria-snippet-panel')
export class AnimoriaSnippetPanel extends LitElement {
  /** Every target Core generated for this asset. Never collapsed to one. */
  @property({ attribute: false }) snippets: readonly GeneratedSnippet[] = [];
  @property({ type: String }) assetName = '';
  @property({ type: Boolean }) canCopy = false;

  /** Which target is open. The first is expanded so the panel is never empty-looking. */
  @state() private _selected = 0;
  /** The index whose copy button is showing its confirmed state. */
  @state() private _copied = -1;

  private _copiedTimer: number | undefined;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .targets {
      display: flex;
      gap: var(--animoria-space-1);
      flex-wrap: wrap;
      border-bottom: 1px solid var(--animoria-border);
      padding-bottom: var(--animoria-space-2);
    }

    .targets button {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--animoria-text-muted);
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      padding: 2px 8px 4px;
      cursor: pointer;
    }

    .targets button[aria-selected='true'] {
      color: var(--animoria-text-strong);
      border-bottom-color: var(--animoria-accent);
    }

    .block {
      position: relative;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
      overflow: hidden;
    }

    .block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      padding: 4px var(--animoria-space-2) 4px var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    .language {
      font-family: var(--animoria-font-mono);
      text-transform: lowercase;
    }

    .copy {
      background: transparent;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-primary);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 2px 10px;
      cursor: pointer;
      min-width: 6.5em;
    }

    .copy:hover:not(:disabled) {
      background: var(--animoria-bg-hover);
    }

    .copy[data-copied='true'] {
      color: var(--animoria-success);
      border-color: var(--animoria-success);
    }

    .copy:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    pre {
      margin: 0;
      padding: var(--animoria-space-3);
      overflow-x: auto;
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-sm);
      line-height: 1.5;
      color: var(--animoria-text-primary);
      white-space: pre;
      tab-size: 2;
    }

    .hint {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
      padding: 0 var(--animoria-space-3) var(--animoria-space-2);
    }

    .install {
      font-family: var(--animoria-font-mono);
      color: var(--animoria-text-primary);
    }
  `;

  override disconnectedCallback(): void {
    if (this._copiedTimer !== undefined) clearTimeout(this._copiedTimer);
    super.disconnectedCallback();
  }

  /** The full text a developer would paste: imports, code, and the install hint. */
  private _fullText(snippet: GeneratedSnippet): string {
    return [snippet.imports, snippet.code].filter((part): part is string => !!part).join('\n\n');
  }

  private _copy(snippet: GeneratedSnippet, index: number): void {
    this.dispatchEvent(
      new CustomEvent('copy-to-clipboard', {
        detail: { text: this._fullText(snippet), label: `${snippet.label} snippet` },
        bubbles: true,
        composed: true,
      })
    );

    // Confirmed on the button that was pressed, not in a toast: the developer's eyes
    // are already on the block they clicked.
    this._copied = index;
    if (this._copiedTimer !== undefined) clearTimeout(this._copiedTimer);
    this._copiedTimer = window.setTimeout(() => {
      this._copied = -1;
    }, 2000);
  }

  override render() {
    if (this.snippets.length === 0) return nothing;

    const index = Math.min(this._selected, this.snippets.length - 1);
    const snippet = this.snippets[index]!;

    return html`
      <div class="targets" role="tablist" aria-label="Snippet targets">
        ${this.snippets.map(
          (candidate, position) => html`
            <button
              type="button"
              role="tab"
              aria-selected=${position === index}
              @click=${() => {
                this._selected = position;
              }}
            >
              ${candidate.label}
            </button>
          `
        )}
      </div>

      <div class="block">
        <div class="block-header">
          <span class="language">${snippet.language}</span>
          <button
            type="button"
            class="copy"
            data-copied=${this._copied === index}
            ?disabled=${!this.canCopy}
            title=${this.canCopy ? '' : 'This host has no clipboard.'}
            @click=${() => this._copy(snippet, index)}
          >
            ${this._copied === index ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre><code>${this._fullText(snippet)}</code></pre>
        ${
          snippet.installHint
            ? html`<div class="hint">
                Requires <span class="install">${snippet.installHint}</span>
              </div>`
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-snippet-panel': AnimoriaSnippetPanel;
  }
}
