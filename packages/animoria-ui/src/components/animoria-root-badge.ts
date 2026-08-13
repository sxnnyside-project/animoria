import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Which root a thing belongs to.
 *
 * ## Why a badge and not the path
 * `root-b/assets/logo.json` and `root-c/assets/logo.json` render identically once a
 * list truncates the leading segments, which is what a list of file paths always
 * does. The badge puts the disambiguating fact where it cannot be truncated away,
 * and it uses the *root's name* — which `buildWorkspaceIdentity` already
 * disambiguates to `acme/project` when two roots are both called `project`.
 *
 * ## Why it hides itself in a single-root workspace
 * A badge that reads the same on every row carries no information and costs a column.
 * `hidden` is set by the caller from `isSingleRoot`, so the common case looks exactly
 * as it did before U5.
 */
@customElement('animoria-root-badge')
export class AnimoriaRootBadge extends LitElement {
  @property({ type: String }) rootName = '';
  /** Set from `isSingleRoot`: there is nothing to disambiguate. */
  @property({ type: Boolean }) override hidden = false;
  /** Renders in the muted style used inside dense rows. */
  @property({ type: Boolean }) quiet = false;

  static override styles = css`
    :host {
      display: inline-flex;
      font-family: var(--animoria-font-family);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      padding: 0 6px;
      border-radius: 10px;
      background: var(--animoria-accent-quiet);
      color: var(--animoria-text-primary);
      border: 1px solid var(--animoria-border);
      white-space: nowrap;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge.quiet {
      background: none;
      border: none;
      padding: 0;
      color: var(--animoria-text-muted);
      font-weight: 500;
    }
  `;

  override render() {
    if (this.hidden || this.rootName.length === 0) return nothing;

    return html`<span
      class="badge ${this.quiet ? 'quiet' : ''}"
      title=${`Workspace root: ${this.rootName}`}
      >${this.rootName}</span
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-root-badge': AnimoriaRootBadge;
  }
}
