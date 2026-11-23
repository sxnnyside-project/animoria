import type { Asset, UsageReference } from '@animoria/contracts';
import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  AnimationPreview,
  GeneratedSnippet,
  HostCapabilities,
  UiPreferences,
} from '../../bridge/types.js';
import { DEFAULT_PREFERENCES } from '../../bridge/types.js';
import type { ReferenceState } from '../../view-model/analysis-view-model.js';
import { referenceExplanation, referenceLabel } from '../../view-model/analysis-view-model.js';
import { factGroupsFor } from '../../view-model/asset-facts.js';
import '../badges/animoria-root-badge.js';
import { AnimoriaElement } from '../common/events.js';
import './animoria-asset-stage.js';
import './animoria-snippet-panel.js';

@customElement('animoria-asset-inspector')
export class AnimoriaAssetInspector extends AnimoriaElement {
  @property({ attribute: false }) asset: Asset | null = null;
  @property({ attribute: false }) capabilities: HostCapabilities | null = null;
  /** Core's attribution for this asset. Never derived here from the path. */
  @property({ type: String }) rootId = '';
  @property({ type: String }) rootName = '';
  @property({ type: Boolean }) shouldHideRoot = false;
  @property({ type: Number }) referenceCount = 0;
  @property({ type: String }) referenceState: ReferenceState = 'unavailable';

  /** `null` while the host has not answered `request-animation-data` yet. */
  @property({ attribute: false }) preview: AnimationPreview | null = null;
  @property({ type: Boolean }) isPreviewLoading = false;
  @property({ type: String }) previewError = '';

  /** Persisted by the host. Playback speed and background apply to the stage below. */
  @property({ attribute: false }) preferences: UiPreferences = DEFAULT_PREFERENCES;

  /**
   * Where this asset is used, or `null` while the host has not answered.
   */
  @property({ attribute: false }) references: readonly UsageReference[] | null = null;
  @property({ type: Boolean }) isReferencesComplete = false;

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
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .title {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      flex-wrap: wrap;
    }

    .name {
      font-weight: 600;
      font-size: var(--animoria-font-size-base);
      color: var(--animoria-text-strong);
    }

    .path {
      font-family: var(--animoria-font-mono);
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--animoria-space-3);
    }

    section h3 {
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--animoria-text-muted);
      margin: 0 0 var(--animoria-space-1) 0;
    }

    dl {
      margin: 0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--animoria-space-1) var(--animoria-space-2);
      font-size: var(--animoria-font-size-xs);
    }

    dt {
      color: var(--animoria-text-secondary);
    }

    dd {
      margin: 0;
      font-weight: 500;
      color: var(--animoria-text-strong);
    }

    dd.attention {
      color: var(--animoria-warning);
    }

    .actions {
      display: flex;
      gap: var(--animoria-space-1);
      flex-wrap: wrap;
      padding-top: var(--animoria-space-2);
      border-top: 1px solid var(--animoria-border);
    }

    .actions button {
      padding: var(--animoria-space-1) var(--animoria-space-2);
      font-size: var(--animoria-font-size-xs);
      border-radius: var(--animoria-radius-sm);
      border: 1px solid var(--animoria-border);
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-primary);
      cursor: pointer;
      font-family: inherit;
    }

    .actions button.primary {
      background: var(--animoria-accent);
      color: var(--animoria-accent-contrast);
      border-color: var(--animoria-accent);
    }

    .actions button:hover:not(:disabled) {
      filter: brightness(1.08);
    }

    .actions button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .reason {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      font-style: italic;
    }

    .stage {
      min-height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--animoria-bg-primary);
      border-radius: var(--animoria-radius-sm);
    }

    .stage-note {
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-xs);
    }

    .references {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
    }

    .reference {
      display: flex;
      align-items: baseline;
      gap: var(--animoria-space-2);
      padding: var(--animoria-space-1) var(--animoria-space-2);
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-primary);
      cursor: pointer;
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      text-align: left;
    }

    .reference:hover:not(:disabled) {
      background: var(--animoria-bg-hover);
      border-color: var(--animoria-focus-ring);
    }

    .reference:disabled {
      opacity: 0.6;
      cursor: default;
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

  private _renderStage() {
    return html`
      <animoria-asset-stage
        .preview=${this.preview}
        .preferences=${this.preferences}
        .isLoading=${this.isPreviewLoading}
        .error=${this.previewError}
        .assetPath=${this.asset?.path ?? ''}
        @preferences-change=${(event: CustomEvent<{ preferences: UiPreferences }>) =>
          this.emit('save-preferences', event.detail)}
      ></animoria-asset-stage>
    `;
  }

  private _renderReferences() {
    if (this.references === null) {
      return html`<span class="reason">Looking for usages…</span>`;
    }

    if (this.references.length === 0) {
      return html`<span class="reason">
        ${
          this.isReferencesComplete
            ? 'Animoria found no usage of this asset in the files it scanned.'
            : 'The usage scan has not finished — this is not yet an answer.'
        }
      </span>`;
    }

    const canOpen = this.capabilities?.canOpenReference === true;

    return html`
      <div class="references">
        <span class="reason">
          ${this.references.length} usage(s)${this.isReferencesComplete ? '' : ' so far'}
        </span>
        ${this.references.map(
          (reference) => html`
            <button
              type="button"
              class="reference"
              ?disabled=${!canOpen}
              title=${canOpen ? reference.file_path : 'This host cannot open a source file.'}
              @click=${() =>
                this.emit('open-reference', {
                  file: reference.file_path,
                  line: reference.line_number,
                  rootId: this.rootId,
                })}
            >
              <span class="reference-where">${fileName(reference.file_path)}:${reference.line_number}</span>
              <span class="reference-line">${reference.line_content}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  private _renderMetadata(asset: Asset) {
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
                  `,
                )}
              </dl>
            </section>
          `,
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
          this.shouldHideRoot
            ? nothing
            : html`<animoria-root-badge .isQuiet=${true} .rootName=${this.rootName}></animoria-root-badge>`
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
          @click=${() => this.emit('open-asset', { assetPath: asset.path, rootId: this.rootId })}
        >
          Open in editor
        </button>

        <button
          type="button"
          ?disabled=${!capabilities?.canRevealInFileManager}
          title=${capabilities?.canRevealInFileManager ? '' : 'This host cannot reveal files.'}
          @click=${() => this.emit('reveal-asset', { assetPath: asset.path, rootId: this.rootId })}
        >
          Reveal in file manager
        </button>

        <button
          type="button"
          ?disabled=${!capabilities?.canCopyToClipboard}
          title=${capabilities?.canCopyToClipboard ? '' : 'This host has no clipboard.'}
          @click=${() => this.emit('copy-to-clipboard', { text: asset.relative_path || asset.path, label: 'Relative asset path' })}
        >
          Copy relative path
        </button>

        <button
          type="button"
          ?disabled=${!capabilities?.canGenerateSnippet}
          title=${capabilities?.canGenerateSnippet ? '' : 'This host cannot generate snippets.'}
          @click=${() => this.emit('generate-snippet', { assetPath: asset.path })}
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
