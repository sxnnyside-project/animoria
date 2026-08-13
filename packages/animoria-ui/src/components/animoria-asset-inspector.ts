import type { AnimoriaAsset, UsageReference } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  AnimationPreview,
  GeneratedSnippet,
  HostCapabilities,
  UiPreferences,
} from '../bridge/types.js';
import { DEFAULT_PREFERENCES } from '../bridge/types.js';
import type { ReferenceState } from '../view-model/analysis-view-model.js';
import { referenceExplanation, referenceLabel } from '../view-model/analysis-view-model.js';
import { factGroupsFor } from '../view-model/asset-facts.js';
import './animoria-asset-stage.js';
import './animoria-snippet-panel.js';
import './animoria-root-badge.js';

/**
 * The one place an asset can be looked at rather than merely listed.
 *
 * ## What this restores
 * `AnimoriaPreviewPanel` (VS Code, 1,135 lines), `AnimoriaPreviewPanel.kt`
 * (JetBrains) and `animoria-preview-panel.ts` (sandbox) were deleted in the shared-UI
 * migration and nothing took their place. The asset grid survived; *inspecting an
 * asset* did not. Every capability the panels had reached — preview, metadata, reveal
 * in file manager, copy path, generate snippet — became a `HostOutbound` member no
 * component sent, which is how seven of seventeen messages came to have no sender at
 * all.
 *
 * ## Why the preview states are enumerated
 * `idle`, `loading`, `image`, `still`, `unsupported` and `failed` are six visibly
 * different answers, and the old panels collapsed them into two: a spinner and an
 * image. A Rive file that cannot animate here, a Lottie whose frame failed to render,
 * and a file that has gone missing all showed the same empty box.
 *
 * ## What this does not do
 * It computes nothing. Reference counts, badges and diagnostics arrive already
 * decided; the preview arrives already classified by the host. This component chooses
 * layout and wording, and emits intent.
 */
@customElement('animoria-asset-inspector')
export class AnimoriaAssetInspector extends LitElement {
  @property({ attribute: false }) asset: AnimoriaAsset | null = null;
  @property({ attribute: false }) capabilities: HostCapabilities | null = null;
  /** Core's attribution for this asset. Never derived here from the path. */
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) hideRoot = false;
  @property({ type: Number }) referenceCount = 0;
  @property({ type: String }) referenceState: ReferenceState = 'unavailable';

  /** `null` while the host has not answered `request-animation-data` yet. */
  @property({ attribute: false }) preview: AnimationPreview | null = null;
  @property({ type: Boolean }) previewLoading = false;
  @property({ type: String }) previewError = '';

  /** Persisted by the host. Playback speed and background apply to the stage below. */
  @property({ attribute: false }) preferences: UiPreferences = DEFAULT_PREFERENCES;

  /**
   * Where this asset is used, or `null` while the host has not answered.
   *
   * `null`, `[]` and `[] with referencesComplete === false` are three different
   * statements — "not asked yet", "used nowhere", and "we do not know yet" — and the
   * third is the one a developer must never see rendered as the second.
   */
  @property({ attribute: false }) references: readonly UsageReference[] | null = null;
  @property({ type: Boolean }) referencesComplete = false;

  /** Snippets Core generated for this asset. Shown in place, not announced in a toast. */
  @property({ attribute: false }) snippets: readonly GeneratedSnippet[] = [];

  /** Governance findings on this asset. Core's count, never derived here. */
  @property({ type: Number }) findingCount = 0;

  static override styles = css`
    :host {
      display: block;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-raised);
      padding: var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .title {
      display: flex;
      align-items: baseline;
      gap: var(--animoria-space-2);
      flex-wrap: wrap;
    }

    .name {
      font-weight: 600;
      color: var(--animoria-text-strong);
      word-break: break-all;
    }

    .path {
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      word-break: break-all;
    }

    .stage {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 160px;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-secondary);
      padding: var(--animoria-space-2);
    }

    .stage img {
      max-width: 100%;
      max-height: 240px;
      image-rendering: auto;
    }

    .stage-note {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
      text-align: center;
      max-width: 40ch;
    }

    .stage-note.failed {
      color: var(--animoria-danger);
    }

    .still-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    /*
     * Two columns of groups where there is room, one where there is not.
     *
     * The inspector opens beside the editor, so its width is whatever the developer
     * left it. auto-fit means the groups sit side by side in a wide column and stack
     * in a narrow one, without a media query guessing at the split.
     */
    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--animoria-space-3);
    }

    .facts section {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .facts h3 {
      margin: 0;
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--animoria-text-muted);
      padding-bottom: 3px;
      border-bottom: 1px solid var(--animoria-border);
    }

    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 3px var(--animoria-space-3);
      margin: 0;
      font-size: var(--animoria-font-size-sm);
      align-items: baseline;
    }

    dt {
      color: var(--animoria-text-muted);
      white-space: nowrap;
    }

    dd {
      margin: 0;
      color: var(--animoria-text-primary);
      min-width: 0;
      overflow-wrap: anywhere;
    }

    dd.attention {
      color: var(--animoria-warning);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--animoria-space-2);
    }

    button {
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-primary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      padding: 4px 10px;
      font-family: inherit;
      font-size: var(--animoria-font-size-sm);
      cursor: pointer;
    }

    button.primary {
      background: var(--animoria-accent);
      color: var(--animoria-text-on-accent);
      border-color: transparent;
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .reason {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
    }

    .stage-controls {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-3);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      flex-wrap: wrap;
    }

    .stage-controls label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .references {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .reference {
      display: flex;
      gap: var(--animoria-space-2);
      align-items: baseline;
      background: none;
      border: none;
      border-radius: var(--animoria-radius-sm);
      padding: 3px 6px;
      margin: 0;
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-primary);
      text-align: left;
      cursor: pointer;
      width: 100%;
    }

    .reference:hover:not(:disabled) {
      background: var(--animoria-bg-hover);
    }

    .reference:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .reference-where {
      font-family: var(--animoria-font-mono);
      color: var(--animoria-text-muted);
      flex-shrink: 0;
    }

    .reference-line {
      font-family: var(--animoria-font-mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  private _emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /**
   * The preview stage — a real player, delegated to `animoria-asset-stage`.
   *
   * Split out because playback has genuine state of its own (current frame, zoom, the
   * `lottie-web` instance and its teardown), and folding that into the inspector made
   * the inspector responsible for a lifecycle it does not own.
   */
  private _renderStage() {
    return html`
      <animoria-asset-stage
        .preview=${this.preview}
        .preferences=${this.preferences}
        .loading=${this.previewLoading}
        .error=${this.previewError}
        .assetPath=${this.asset?.path ?? ''}
        @preferences-change=${(event: CustomEvent<{ preferences: UiPreferences }>) =>
          this._emit('save-preferences', event.detail)}
      ></animoria-asset-stage>
    `;
  }

  /**
   * Where this asset is used.
   *
   * The answer to the only question an "unreferenced asset" finding raises, and the
   * capability `getUsageReferences` was declared for and never implemented. Each row
   * navigates through the host, which is why they are buttons rather than text.
   */
  private _renderReferences() {
    if (this.references === null) {
      return html`<span class="reason">Looking for usages…</span>`;
    }

    if (this.references.length === 0) {
      return html`<span class="reason">
        ${
          this.referencesComplete
            ? 'Animoria found no usage of this asset in the files it scanned.'
            : 'The usage scan has not finished — this is not yet an answer.'
        }
      </span>`;
    }

    const canOpen = this.capabilities?.canOpenReference === true;

    return html`
      <div class="references">
        <span class="reason">
          ${this.references.length} usage(s)${this.referencesComplete ? '' : ' so far'}
        </span>
        ${this.references.map(
          (reference) => html`
            <button
              type="button"
              class="reference"
              ?disabled=${!canOpen}
              title=${canOpen ? reference.file : 'This host cannot open a source file.'}
              @click=${() =>
                this._emit('open-reference', {
                  file: reference.file,
                  line: reference.line,
                  rootId: this.rootId,
                })}
            >
              <span class="reference-where">${fileName(reference.file)}:${reference.line}</span>
              <span class="reference-line">${reference.content}</span>
            </button>
          `
        )}
      </div>
    `;
  }

  /**
   * What this asset *is*, decided by its family rather than by one generic table.
   *
   * Core extracts artboards and state machines from Rive, frame and loop counts from
   * GIF, animation type from an animated SVG, and the manifest from a dotLottie
   * archive. The previous inspector printed format, size and a reference count for
   * every asset and discarded all of it.
   */
  private _renderMetadata(asset: AnimoriaAsset) {
    const groups = factGroupsFor(asset);

    return html`
      <div class="facts">
        ${groups.map(
          (group) => html`
            <section>
              <h3>${group.title}</h3>
              <dl>
                ${group.facts.map(
                  (fact) => html`
                    <dt title=${fact.detail ?? ''}>${fact.label}</dt>
                    <dd title=${fact.detail ?? ''}>${fact.value}</dd>
                  `
                )}
              </dl>
            </section>
          `
        )}
        <section>
          <h3>Governance</h3>
          <dl>
            <dt title=${referenceExplanation(this.referenceState)}>Usage</dt>
            <dd title=${referenceExplanation(this.referenceState)}>
              ${referenceLabel(this.referenceCount, this.referenceState)}
            </dd>
            <dt>Findings</dt>
            <dd class=${this.findingCount > 0 ? 'attention' : ''}>
              ${
                this.findingCount === 0
                  ? 'None'
                  : `${this.findingCount} ${this.findingCount === 1 ? 'finding' : 'findings'}`
              }
            </dd>
          </dl>
        </section>
      </div>
    `;
  }

  override render() {
    const asset = this.asset;
    if (!asset) {
      return html`<div class="stage">
        <span class="stage-note">No asset selected.</span>
      </div>`;
    }

    const capabilities = this.capabilities;

    return html`
      <div class="title">
        <span class="name">${asset.name}</span>
        ${
          this.hideRoot
            ? nothing
            : html`<animoria-root-badge quiet .rootName=${this.rootName}></animoria-root-badge>`
        }
      </div>
      <span class="path">${asset.path}</span>

      ${this._renderStage()} ${this._renderMetadata(asset)}
      ${this._renderReferences()}
      ${
        this.snippets.length > 0
          ? html`<animoria-snippet-panel
              .snippets=${this.snippets}
              .assetName=${asset.name}
              .canCopy=${this.capabilities?.canCopyToClipboard === true}
            ></animoria-snippet-panel>`
          : nothing
      }

      <div class="actions">
        <button
          type="button"
          class="primary"
          @click=${() => this._emit('open-asset', { assetPath: asset.path, rootId: this.rootId })}
        >
          Open in editor
        </button>

        <button
          type="button"
          ?disabled=${!capabilities?.canRevealInFileManager}
          title=${capabilities?.canRevealInFileManager ? '' : 'This host cannot reveal files.'}
          @click=${() => this._emit('reveal-asset', { assetPath: asset.path, rootId: this.rootId })}
        >
          Reveal in file manager
        </button>

        <button
          type="button"
          ?disabled=${!capabilities?.canCopyToClipboard}
          title=${capabilities?.canCopyToClipboard ? '' : 'This host has no clipboard.'}
          @click=${() => this._emit('copy-to-clipboard', { text: asset.path, label: 'Asset path' })}
        >
          Copy path
        </button>

        <button
          type="button"
          ?disabled=${!capabilities?.canGenerateSnippet}
          title=${capabilities?.canGenerateSnippet ? '' : 'This host cannot generate snippets.'}
          @click=${() => this._emit('generate-snippet', { assetPath: asset.path })}
        >
          Generate snippet
        </button>
      </div>

      ${
        capabilities &&
        !capabilities.canRevealInFileManager &&
        capabilities.mutationUnavailableReason
          ? html`<span class="reason">${capabilities.mutationUnavailableReason}</span>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-asset-inspector': AnimoriaAssetInspector;
  }
}

/** The last path segment. Presentation only — the full path is the button's title. */
function fileName(path: string): string {
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return separator === -1 ? path : path.slice(separator + 1);
}
