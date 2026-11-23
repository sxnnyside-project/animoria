import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import type { AnalysisViewModel, AttributedAsset } from '../../view-model/analysis-view-model.js';
import { referenceStateOf } from '../../view-model/analysis-view-model.js';
import { AnimoriaElement } from '../common/events.js';
import '../gallery/animoria-asset-card.js';
import '../gallery/animoria-state-panel.js';

export type AssetKindFilter = 'all' | 'animated' | 'static' | 'issues';
export type AssetSortOrder = 'name' | 'size' | 'issues';

/**
 * Gallery tab displaying the collection of visual assets in the workspace,
 * complete with search, filter chips, sort ordering, and asset cards.
 */
@customElement('animoria-assets-tab')
export class AnimoriaAssetsTab extends AnimoriaElement {
  @property({ attribute: false }) model: AnalysisViewModel | null = null;
  @property({ attribute: false }) thumbnails = new Map<string, string | null>();
  @property({ type: String }) selectedAssetPath = '';

  @state() private _query = '';
  @state() private _assetKindFilter: AssetKindFilter = 'all';
  @state() private _sortOrder: AssetSortOrder = 'name';

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-3);
    }

    .assets-toolbar {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
      margin-bottom: var(--animoria-space-2);
    }

    .search {
      width: 100%;
      box-sizing: border-box;
      padding: var(--animoria-space-2) var(--animoria-space-3);
      font-size: var(--animoria-font-size-sm);
      font-family: inherit;
      color: var(--animoria-text-primary);
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      outline: none;
      transition: border-color 120ms ease;
    }

    .search:focus {
      border-color: var(--animoria-focus-ring);
    }

    .filters-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
      flex-wrap: wrap;
    }

    .filter-chips {
      display: flex;
      gap: var(--animoria-space-1);
      flex-wrap: wrap;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--animoria-space-1);
      padding: 3px var(--animoria-space-2);
      font-size: var(--animoria-font-size-xs);
      font-family: inherit;
      color: var(--animoria-text-secondary);
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-pill);
      cursor: pointer;
      user-select: none;
      transition: all 120ms ease;
    }

    .chip:hover {
      background: var(--animoria-bg-hover);
      color: var(--animoria-text-primary);
    }

    .chip.active {
      background: var(--animoria-accent);
      color: var(--animoria-accent-contrast);
      border-color: var(--animoria-accent);
    }

    .chip-count {
      font-size: 10px;
      opacity: 0.85;
    }

    .sort-control {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-1);
    }

    .sort-select {
      font-size: var(--animoria-font-size-xs);
      font-family: inherit;
      color: var(--animoria-text-secondary);
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius);
      padding: 3px var(--animoria-space-2);
      outline: none;
      cursor: pointer;
    }

    .sort-select:focus {
      border-color: var(--animoria-focus-ring);
    }

    .grid-status {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--animoria-space-2);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `;

  private _filteredAssets(model: AnalysisViewModel): readonly AttributedAsset[] {
    let assets = model.assets;

    if (this._query) {
      const q = this._query.toLowerCase();
      assets = assets.filter(
        (entry) =>
          entry.asset.name.toLowerCase().includes(q) ||
          entry.asset.path.toLowerCase().includes(q) ||
          entry.asset.format.toLowerCase().includes(q),
      );
    }

    if (this._assetKindFilter === 'animated') {
      assets = assets.filter((entry) =>
        ['lottie', 'rive', 'gif'].includes(entry.asset.format.toLowerCase()),
      );
    } else if (this._assetKindFilter === 'static') {
      assets = assets.filter(
        (entry) => !['lottie', 'rive', 'gif'].includes(entry.asset.format.toLowerCase()),
      );
    } else if (this._assetKindFilter === 'issues') {
      assets = assets.filter(
        (entry) => (model.diagnosticsByAssetPath.get(entry.asset.path)?.length ?? 0) > 0,
      );
    }

    if (this._sortOrder === 'name') {
      assets = [...assets].sort((a, b) => a.asset.name.localeCompare(b.asset.name));
    } else if (this._sortOrder === 'size') {
      assets = [...assets].sort((a, b) => b.asset.size_bytes - a.asset.size_bytes);
    } else if (this._sortOrder === 'issues') {
      assets = [...assets].sort((a, b) => {
        const diff =
          (model.diagnosticsByAssetPath.get(b.asset.path)?.length ?? 0) -
          (model.diagnosticsByAssetPath.get(a.asset.path)?.length ?? 0);
        return diff !== 0 ? diff : a.asset.name.localeCompare(b.asset.name);
      });
    }

    return assets;
  }

  private _handleAssetKeyNav(
    key: string,
    assetPath: string,
    assets: readonly AttributedAsset[],
  ): void {
    const idx = assets.findIndex((a) => a.asset.path === assetPath);
    if (idx < 0) return;

    let targetIdx = idx;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      targetIdx = Math.min(assets.length - 1, idx + 1);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      targetIdx = Math.max(0, idx - 1);
    } else if (key === 'Home') {
      targetIdx = 0;
    } else if (key === 'End') {
      targetIdx = assets.length - 1;
    }

    if (targetIdx !== idx) {
      const nextAsset = assets[targetIdx];
      if (nextAsset) {
        this.emit('select-asset', { assetPath: nextAsset.asset.path, rootId: nextAsset.rootId });
      }
    }
  }

  override render() {
    const model = this.model;
    if (!model) return nothing;

    const assets = this._filteredAssets(model);

    return html`
      <div class="assets-toolbar">
        <input
          class="search"
          type="search"
          placeholder="Search assets by stem or format"
          aria-label="Search assets"
          .value=${live(this._query)}
          @input=${(e: Event) => {
            this._query = (e.target as HTMLInputElement).value;
          }}
        />
        <div class="filters-row">
          <div class="filter-chips" role="group" aria-label="Filter assets by category">
            <button
              type="button"
              class=${classMap({ chip: true, active: this._assetKindFilter === 'all' })}
              aria-pressed=${this._assetKindFilter === 'all'}
              @click=${() => {
                this._assetKindFilter = 'all';
              }}
            >
              All <span class="chip-count">${model.assets.length}</span>
            </button>
            <button
              type="button"
              class=${classMap({ chip: true, active: this._assetKindFilter === 'animated' })}
              aria-pressed=${this._assetKindFilter === 'animated'}
              @click=${() => {
                this._assetKindFilter = 'animated';
              }}
            >
              Animated <span class="chip-count">${model.assets.filter((e) => ['lottie', 'rive', 'gif'].includes(e.asset.format.toLowerCase())).length}</span>
            </button>
            <button
              type="button"
              class=${classMap({ chip: true, active: this._assetKindFilter === 'static' })}
              aria-pressed=${this._assetKindFilter === 'static'}
              @click=${() => {
                this._assetKindFilter = 'static';
              }}
            >
              Static <span class="chip-count">${model.assets.filter((e) => !['lottie', 'rive', 'gif'].includes(e.asset.format.toLowerCase())).length}</span>
            </button>
            <button
              type="button"
              class=${classMap({ chip: true, active: this._assetKindFilter === 'issues' })}
              aria-pressed=${this._assetKindFilter === 'issues'}
              @click=${() => {
                this._assetKindFilter = 'issues';
              }}
            >
              With issues <span class="chip-count">${model.assets.filter((e) => (model.diagnosticsByAssetPath.get(e.asset.path)?.length ?? 0) > 0).length}</span>
            </button>
          </div>
          <div class="sort-control">
            <label for="sort-select" class="sr-only">Sort assets</label>
            <select
              id="sort-select"
              class="sort-select"
              .value=${this._sortOrder}
              @change=${(e: Event) => {
                this._sortOrder = (e.target as HTMLSelectElement).value as AssetSortOrder;
              }}
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="size">Sort: Size (Largest)</option>
              <option value="issues">Sort: Most issues</option>
            </select>
          </div>
        </div>
      </div>

      ${
        assets.length === 0
          ? html`<animoria-state-panel
              state="empty"
              summary=${
                this._query
                  ? `No asset matches "${this._query}".`
                  : `No assets found for filter "${this._assetKindFilter}".`
              }
            ></animoria-state-panel>`
          : html`
            <div class="grid-status" role="status" aria-live="polite">
              Showing ${assets.length} of ${model.assets.length} asset${model.assets.length === 1 ? '' : 's'}
            </div>
            <div
              class="grid"
              role="region"
              aria-label="Workspace asset gallery"
            >
              ${repeat(
                assets,
                (entry) => entry.asset.path,
                (entry) => html`
                  <animoria-asset-card
                    data-path=${entry.asset.path}
                    .asset=${entry.asset}
                    .diagnostics=${model.diagnosticsByAssetPath.get(entry.asset.path) ?? []}
                    .thumbnailSource=${this.thumbnails.get(entry.asset.path) ?? null}
                    .referenceCount=${model.referenceCounts.get(entry.asset.path) ?? 0}
                    .referenceState=${referenceStateOf()}
                    .isSelected=${entry.asset.path === this.selectedAssetPath}
                    .rootId=${entry.rootId}
                    .rootName=${entry.rootName}
                    .shouldHideRoot=${model.isSingleRoot}
                    @select-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
                      this.emit('select-asset', e.detail)}
                    @open-asset=${(e: CustomEvent<{ assetPath: string; rootId: string }>) =>
                      this.emit('open-asset', e.detail)}
                    @asset-key-nav=${(e: CustomEvent<{ key: string; assetPath: string }>) =>
                      this._handleAssetKeyNav(e.detail.key, e.detail.assetPath, assets)}
                  ></animoria-asset-card>
                `,
              )}
            </div>
          `
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-assets-tab': AnimoriaAssetsTab;
  }
}
