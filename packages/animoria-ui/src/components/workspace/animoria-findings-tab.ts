import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { AnalysisViewModel } from '../../view-model/analysis-view-model.js';
import { AnimoriaElement } from '../common/events.js';
import '../gallery/animoria-finding.js';
import '../gallery/animoria-state-panel.js';

/**
 * Dedicated tab component rendering governance findings grouped by rule.
 */
@customElement('animoria-findings-tab')
export class AnimoriaFindingsTab extends AnimoriaElement {
  @property({ attribute: false }) model: AnalysisViewModel | null = null;
  @property({ type: String }) selectedAssetPath = '';

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .section-title {
      font-size: var(--animoria-font-size-sm);
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `;

  private _onSelectAsset(assetPath: string, rootId: string): void {
    this.emit('open-asset', { assetPath, rootId });
  }

  private _onOpenReference(detail: { file: string; line: number; rootId: string }): void {
    this.emit('open-reference', detail);
  }

  override render() {
    const model = this.model;
    if (!model || model.findingCount === 0) {
      return html`<animoria-state-panel
        state="empty"
        summary="No governance findings. Every rule that ran found nothing to report."
      ></animoria-state-panel>`;
    }

    return html`
      ${model.sections.map(
        (section) => html`
          <div class="section-title">${section.label} — ${section.diagnostics.length}</div>
          <div class="list">
            ${repeat(
              section.diagnostics,
              (entry) =>
                `${entry.diagnostic.rule_id}:${entry.diagnostic.target_asset_path || entry.rootId}`,
              (entry) => html`
                <animoria-finding
                  .isCompact=${true}
                  .diagnostic=${entry.diagnostic}
                  .rootId=${entry.rootId}
                  .rootName=${entry.rootName}
                  .shouldHideRoot=${model.isSingleRoot}
                  .isSelected=${entry.diagnostic.target_asset_path === this.selectedAssetPath}
                  @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
                    this._onSelectAsset(e.detail.assetPath, e.detail.rootId)}
                  @open-reference=${(
                    e: CustomEvent<{ file: string; line: number; rootId: string }>,
                  ) => this._onOpenReference(e.detail)}
                ></animoria-finding>
              `,
            )}
          </div>
        `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-findings-tab': AnimoriaFindingsTab;
  }
}
