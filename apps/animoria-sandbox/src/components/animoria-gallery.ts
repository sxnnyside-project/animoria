import type {
  AnimoriaAsset,
  AnimoriaStaticAsset,
  RuleEngineReport,
  HealthScoreReport,
  GovernanceIssue,
  GovernanceReport,
} from '@animoria/core';
import { t } from '@animoria/core/i18n';
import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './animoria-asset-item.js';
import './mingcute-icon.js';
import type { DuplicateGroup } from './animoria-duplicate-resolver.js';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  asset?: AnimoriaAsset | undefined;
}

@customElement('animoria-gallery')
export class AnimoriaGallery extends LitElement {
  @property({ type: Array }) assets: AnimoriaAsset[] = [];
  @property({ type: Array }) staticAssets: AnimoriaStaticAsset[] = [];
  @property({ type: Object }) ruleReport: RuleEngineReport | null = null;
  @property({ type: Object }) healthScore: HealthScoreReport | null = null;
  @property({ type: Object }) governanceReport: GovernanceReport | null = null;
  @property({ type: Map }) referenceCounts = new Map<string, number>();

  @property({ type: Boolean }) loading = false;
  @property({ type: String }) progressMessage = '';
  @property({ type: Number }) progressPercent = 0;
  @property({ type: String }) workspacePath = '';
  @property({ type: String }) locale = 'en';
  @property({ type: String }) viewMode: 'flat' | 'tree' = 'flat';
  @property({ type: Object }) selectedAsset: AnimoriaAsset | AnimoriaStaticAsset | null = null;

  @state() private _query = '';
  @state() private _governanceExpanded = true;
  @state() private _unusedExpanded = false;
  @state() private _duplicatesExpanded = false;
  @state() private _overusedExpanded = false;
  @state() private _animatedExpanded = true;
  @state() private _staticExpanded = true;
  @state() private _expandedFolders = new Set<string>();

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--animoria-bg-primary);
      border-right: 1px solid var(--animoria-border-color);
      box-sizing: border-box;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--animoria-bg-primary);
      border-bottom: 1px solid var(--animoria-border-color);
      flex-shrink: 0;
    }

    .title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--animoria-text-primary);
    }

    .actions-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-action {
      background: transparent;
      border: 1px solid var(--animoria-border-color);
      color: var(--animoria-text-primary);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .btn-action:hover {
      background: var(--animoria-hover-bg);
      border-color: var(--animoria-accent);
    }

    .progress-bar-container {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.03);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--animoria-accent), var(--animoria-accent-hover));
      transition: width 0.2s ease-out;
    }

    .search-wrap {
      padding: 8px 12px;
      background: var(--animoria-bg-primary);
      border-bottom: 1px solid var(--animoria-border-color);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-input-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border-color);
      border-radius: 4px;
      padding: 4px 8px;
    }

    .search-input-box:focus-within {
      border-color: var(--animoria-accent);
    }

    .search {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--animoria-text-primary);
      font-size: 12px;
      outline: none;
      font-family: var(--animoria-font-family);
    }

    .sidebar-scroll {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .sidebar-scroll::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar-scroll::-webkit-scrollbar-thumb {
      background: var(--animoria-scroll-thumb);
      border-radius: 3px;
    }

    .health-widget {
      margin: 10px 12px;
      padding: 10px 12px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
      background: rgba(255, 255, 255, 0.01);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .health-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .health-score {
      font-size: 18px;
      font-weight: 700;
      font-family: monospace;
    }

    .health-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .health-good {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .health-warning {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .health-critical {
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
    }

    .health-rec {
      font-size: 11px;
      color: var(--animoria-text-muted);
      line-height: 1.4;
      border-top: 1px dashed var(--animoria-border-color);
      padding-top: 6px;
      margin-top: 2px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--animoria-text-muted);
      background: rgba(0, 0, 0, 0.08);
      border-bottom: 1px solid var(--animoria-border-color);
      cursor: pointer;
      user-select: none;
    }

    .section-header:hover {
      color: var(--animoria-text-primary);
    }

    .section-title-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sub-badge {
      font-size: 9px;
      font-weight: 700;
      background: var(--animoria-badge-bg);
      color: var(--animoria-text-primary);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: monospace;
    }

    .section-content {
      display: flex;
      flex-direction: column;
    }

    .sub-section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 20px;
      font-size: 11px;
      font-weight: 600;
      color: var(--animoria-text-muted);
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }

    .sub-section-header:hover {
      color: var(--animoria-text-primary);
      background: var(--animoria-hover-bg);
    }

    .sub-content {
      background: rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
    }

    .gov-issue-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px 6px 32px;
      font-size: 11px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.01);
      transition: background-color 0.2s ease;
    }

    .gov-issue-item:hover {
      background: var(--animoria-hover-bg);
    }

    .gov-issue-item.selected {
      background: rgba(99, 102, 241, 0.12);
      border-left: 2px solid var(--animoria-accent);
      padding-left: 30px;
    }

    .gov-meta {
      font-size: 10px;
      color: var(--animoria-text-muted);
      font-family: monospace;
    }

    .btn-resolve {
      font-size: 9px;
      font-weight: 600;
      background: var(--animoria-accent);
      color: var(--animoria-accent-text);
      border: none;
      border-radius: 3px;
      padding: 2px 6px;
      cursor: pointer;
      margin-left: 8px;
    }

    .btn-resolve:hover {
      background: var(--animoria-accent-hover);
    }

    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      font-size: 11px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .tree-node:hover {
      background: var(--animoria-hover-bg);
    }

    .tree-node.selected {
      background: rgba(99, 102, 241, 0.12);
      border-left: 2px solid var(--animoria-accent);
      padding-left: 12px;
    }

    .tree-node-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty {
      padding: 14px;
      font-size: 11px;
      color: var(--animoria-text-muted);
      text-align: center;
    }

    .static-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      font-size: 11px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      transition: background-color 0.2s ease;
    }

    .static-item:hover {
      background: var(--animoria-hover-bg);
    }

    .static-item.selected {
      background: rgba(99, 102, 241, 0.12);
      border-left: 2px solid var(--animoria-accent);
      padding-left: 12px;
    }

    .static-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .static-meta {
      font-size: 10px;
      color: var(--animoria-text-muted);
      font-family: monospace;
    }
  `;

  t(key: string): string {
    return t(key, this.locale);
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private get _filteredAssets(): AnimoriaAsset[] {
    if (!this._query) return this.assets;
    const q = this._query.toLowerCase();
    return this.assets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.stem.toLowerCase().includes(q)
    );
  }

  private _onInput(e: Event) {
    this._query = (e.target as HTMLInputElement).value;
  }

  private _onToggleViewMode() {
    this.dispatchEvent(new CustomEvent('toggle-view-mode', { bubbles: true, composed: true }));
  }

  private _onSelectAsset(asset: AnimoriaAsset | AnimoriaStaticAsset) {
    this.dispatchEvent(
      new CustomEvent('select-asset', {
        detail: { asset },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onStartCleanupReview() {
    this.dispatchEvent(new CustomEvent('start-cleanup-review', { bubbles: true, composed: true }));
  }

  private _onResolveDuplicate(e: Event, group: DuplicateGroup) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('resolve-duplicate-group', {
        detail: { group },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleFolder(path: string) {
    const next = new Set(this._expandedFolders);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    this._expandedFolders = next;
    this.requestUpdate();
  }

  private _getFormatIconName(format: string): string {
    switch (format) {
      case 'lottie':
      case 'dotlottie':
      case 'rive':
      case 'animated-svg':
        return 'file-code';
      case 'gif':
      case 'apng':
        return 'file-image';
      default:
        return 'file-line';
    }
  }

  private _buildTree(assets: AnimoriaAsset[]): TreeNode[] {
    const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };
    for (const asset of assets) {
      const pathParts = asset.path.replace(/^\/workspace\//, '').split('/');
      let current = root;
      let currentPath = '/workspace';
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (!part) continue;
        currentPath = `${currentPath}/${part}`;
        const isLast = i === pathParts.length - 1;
        let found = current.children.find((c) => c.name === part);
        if (!found) {
          const newNode: TreeNode = {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            children: [],
            asset: isLast ? asset : undefined,
          };
          current.children.push(newNode);
          found = newNode;
        }
        current = found;
      }
    }

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (node.isFolder) sortNodes(node.children);
      }
    };
    sortNodes(root.children);
    return root.children;
  }

  private _renderTreeNode(node: TreeNode, depth = 0): TemplateResult {
    const paddingLeft = `${depth * 10 + 14}px`;
    if (node.isFolder) {
      const isExpanded = this._expandedFolders.has(node.path);
      return html`
        <div
          class="tree-node"
          style="padding-left: ${paddingLeft}"
          @click="${() => this._toggleFolder(node.path)}"
        >
          <mingcute-icon
            name="${isExpanded ? 'down' : 'chevron'}"
            size="10"
            color="#64748b"
          ></mingcute-icon>
          <mingcute-icon name="folder" size="13" color="#818cf8"></mingcute-icon>
          <span class="tree-node-name">${node.name}</span>
        </div>
        ${isExpanded ? node.children.map((c) => this._renderTreeNode(c, depth + 1)) : ''}
      `;
    }
    const isSelected = this.selectedAsset?.path === node.asset?.path;
    return html`
        <div
          class="tree-node ${isSelected ? 'selected' : ''}"
          style="padding-left: ${paddingLeft + 10}"
          @click="${() => this._onSelectAsset(node.asset!)}"
        >
          <mingcute-icon name="${this._getFormatIconName(node.asset!.format)}" size="13" color="#cbd5e1"></mingcute-icon>
          <span class="tree-node-name">${node.name}</span>
        </div>
      `;
  }

  private _renderHealthScoreWidget() {
    if (!this.healthScore) return html``;
    const { score, recommendations } = this.healthScore;
    const badgeText = score >= 90 ? 'Excellent' : score >= 70 ? 'Needs Attention' : 'Critical';
    const badgeClass =
      score >= 90 ? 'health-good' : score >= 70 ? 'health-warning' : 'health-critical';

    const topPriority = recommendations[0]?.message || 'All clean, no issues detected!';

    return html`
      <div class="health-widget">
        <div class="health-header">
          <span class="health-score">${Math.round(score)}/100</span>
          <span class="health-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="health-rec">
          <strong>Top priority:</strong> ${topPriority}
        </div>
      </div>
    `;
  }

  private _renderGovernanceSection() {
    const unused = this.governanceReport?.unused || [];
    const duplicates = this.governanceReport?.duplicates || [];
    const overused = this.governanceReport?.overused || [];
    const isExpanded = this._governanceExpanded;

    return html`
      <div
        class="section-header"
        @click="${() => {
          this._governanceExpanded = !this._governanceExpanded;
        }}"
      >
        <span class="section-title-left">
          <mingcute-icon
            name="${isExpanded ? 'down' : 'chevron'}"
            size="10"
            color="#64748b"
          ></mingcute-icon>
          <mingcute-icon name="shield-check" size="13" color="#6366f1"></mingcute-icon>
          ${this.t('gallery.governance')}
        </span>
        <span class="sub-badge">${unused.length + duplicates.length + overused.length}</span>
      </div>

      ${
        isExpanded
          ? html`
          <div class="section-content">
            <!-- Unused Subsection -->
            <div
              class="sub-section-header"
              @click="${() => {
                this._unusedExpanded = !this._unusedExpanded;
              }}"
            >
              <mingcute-icon
                name="${this._unusedExpanded ? 'down' : 'chevron'}"
                size="10"
                color="#64748b"
              ></mingcute-icon>
              <span>${this.t('gallery.unusedAssets')}</span>
              <span class="sub-badge">${unused.length}</span>
            </div>
            ${
              this._unusedExpanded
                ? html`
                <div class="sub-content">
                  ${
                    unused.length === 0
                      ? html`<div class="empty">${this.t('gallery.noUnused')}</div>`
                      : unused.map(
                          (item: GovernanceIssue) => html`
                        <div
                          class="gov-issue-item ${this.selectedAsset?.path === item.asset.path ? 'selected' : ''}"
                          @click="${() => this._onSelectAsset(item.asset)}"
                        >
                          <span>${item.asset.stem}</span>
                          <span class="gov-meta">0 refs</span>
                        </div>
                      `
                        )
                  }
                </div>
              `
                : ''
            }

            <!-- Duplicates Subsection -->
            <div
              class="sub-section-header"
              @click="${() => {
                this._duplicatesExpanded = !this._duplicatesExpanded;
              }}"
            >
              <mingcute-icon
                name="${this._duplicatesExpanded ? 'down' : 'chevron'}"
                size="10"
                color="#64748b"
              ></mingcute-icon>
              <span>${this.t('gallery.duplicateGroups')}</span>
              <span class="sub-badge">${duplicates.length}</span>
            </div>
            ${
              this._duplicatesExpanded
                ? html`
                <div class="sub-content">
                  ${
                    duplicates.length === 0
                      ? html`<div class="empty">${this.t('gallery.noDuplicates')}</div>`
                      : duplicates.map((item: GovernanceIssue) => {
                          const duplicateOf = item.duplicateOf ?? [];
                          const isSelected = this.selectedAsset?.path === item.asset.path;
                          const duplicateGroup: DuplicateGroup = {
                            canonicalPath: item.asset.path,
                            duplicatePaths: duplicateOf.map((a: AnimoriaAsset) => a.path),
                            sizeBytes: item.asset.sizeBytes,
                            potentialSavingsBytes: duplicateOf.length * item.asset.sizeBytes,
                            candidates: [
                              { asset: item.asset, referenceCount: item.referenceCount },
                              ...duplicateOf.map((a: AnimoriaAsset) => ({
                                asset: a,
                                referenceCount: this.referenceCounts.get(a.path) ?? 0,
                              })),
                            ],
                          };

                          return html`
                          <div
                            class="gov-issue-item ${isSelected ? 'selected' : ''}"
                            @click="${() => this._onSelectAsset(item.asset)}"
                          >
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                              <span>${item.asset.stem}</span>
                              <span class="gov-meta">Duplicate of ${duplicateOf.length} files</span>
                            </div>
                            <button
                              class="btn-resolve"
                              @click="${(e: Event) => this._onResolveDuplicate(e, duplicateGroup)}"
                            >
                              ${this.t('gallery.resolve')}
                            </button>
                          </div>
                        `;
                        })
                  }
                </div>
              `
                : ''
            }

            <!-- Overused Subsection -->
            <div
              class="sub-section-header"
              @click="${() => {
                this._overusedExpanded = !this._overusedExpanded;
              }}"
            >
              <mingcute-icon
                name="${this._overusedExpanded ? 'down' : 'chevron'}"
                size="10"
                color="#64748b"
              ></mingcute-icon>
              <span>${this.t('gallery.overusedAssets')}</span>
              <span class="sub-badge">${overused.length}</span>
            </div>
            ${
              this._overusedExpanded
                ? html`
                <div class="sub-content">
                  ${
                    overused.length === 0
                      ? html`<div class="empty">${this.t('gallery.noOverused')}</div>`
                      : overused.map(
                          (item: GovernanceIssue) => html`
                        <div
                          class="gov-issue-item ${this.selectedAsset?.path === item.asset.path ? 'selected' : ''}"
                          @click="${() => this._onSelectAsset(item.asset)}"
                        >
                          <span>${item.asset.stem}</span>
                          <span class="gov-meta" style="color: var(--animoria-error-text);"
                            >${item.referenceCount} refs</span
                          >
                        </div>
                      `
                        )
                  }
                </div>
              `
                : ''
            }
          </div>
        `
          : ''
      }
    `;
  }

  override render() {
    const filtered = this._filteredAssets;
    const treeNodes = this._buildTree(filtered);

    return html`
      <div class="header">
        <div class="title-wrap">
          <span class="title">${this.t('gallery.title')}</span>
          <span class="sub-badge">${this.assets.length}</span>
        </div>
        <div class="actions-wrap">
          <button class="btn-action" @click="${this._onStartCleanupReview}">
            <mingcute-icon name="trash" size="12"></mingcute-icon>
            ${this.t('gallery.cleanupReview')}
          </button>
          <button class="btn-action" @click="${this._onToggleViewMode}">
            <mingcute-icon name="${this.viewMode === 'flat' ? 'folder' : 'file-code'}" size="12"></mingcute-icon>
            ${this.viewMode === 'flat' ? this.t('gallery.viewTree') : this.t('gallery.viewFlat')}
          </button>
        </div>
      </div>

      ${
        this.loading
          ? html`
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${this.progressPercent}%"></div>
          </div>
        `
          : ''
      }

      <div class="search-wrap">
        <div class="search-input-box">
          <mingcute-icon name="search" size="13" color="#64748b"></mingcute-icon>
          <input
            class="search"
            type="text"
            placeholder="${this.t('gallery.searchPlaceholder')}"
            .value="${this._query}"
            @input="${this._onInput}"
          />
        </div>
      </div>

      <div class="sidebar-scroll">
        <!-- Health score widget -->
        ${this._renderHealthScoreWidget()}

        <!-- Governance issues -->
        ${this._renderGovernanceSection()}

        <!-- Animated Assets Section -->
        <div
          class="section-header"
          @click="${() => {
            this._animatedExpanded = !this._animatedExpanded;
          }}"
        >
          <span class="section-title-left">
            <mingcute-icon
              name="${this._animatedExpanded ? 'down' : 'chevron'}"
              size="10"
              color="#64748b"
            ></mingcute-icon>
            <mingcute-icon name="file-code" size="13" color="#818cf8"></mingcute-icon>
            ${this.t('gallery.animatedSection')}
          </span>
          <span class="sub-badge">${filtered.length}</span>
        </div>

        ${
          this._animatedExpanded
            ? html`
            <div class="section-content">
              ${
                this.viewMode === 'tree'
                  ? treeNodes.map((node) => this._renderTreeNode(node))
                  : filtered.length === 0
                    ? html`<div class="empty">${this.t('gallery.noAnimated')}</div>`
                    : filtered.map(
                        (asset) => html`
                      <animoria-asset-item
                        .asset="${asset}"
                        .locale="${this.locale}"
                        .selected="${this.selectedAsset?.path === asset.path}"
                        @click="${() => this._onSelectAsset(asset)}"
                      ></animoria-asset-item>
                    `
                      )
              }
            </div>
          `
            : ''
        }

        <!-- Static Assets Section -->
        <div
          class="section-header"
          @click="${() => {
            this._staticExpanded = !this._staticExpanded;
          }}"
        >
          <span class="section-title-left">
            <mingcute-icon
              name="${this._staticExpanded ? 'down' : 'chevron'}"
              size="10"
              color="#64748b"
            ></mingcute-icon>
            <mingcute-icon name="file-image" size="13" color="#38bdf8"></mingcute-icon>
            ${this.t('gallery.staticSection')}
          </span>
          <span class="sub-badge">${this.staticAssets.length}</span>
        </div>

        ${
          this._staticExpanded
            ? html`
            <div class="section-content">
              ${
                this.staticAssets.length === 0
                  ? html`<div class="empty">${this.t('gallery.noStatic')}</div>`
                  : this.staticAssets.map(
                      (staticAsset) => html`
                    <div
                      class="static-item ${this.selectedAsset?.path === staticAsset.path ? 'selected' : ''}"
                      @click="${() => this._onSelectAsset(staticAsset)}"
                    >
                      <mingcute-icon name="file-image" size="14" color="#38bdf8"></mingcute-icon>
                      <div class="static-info">
                        <span style="font-weight: 500;">${staticAsset.stem}</span>
                        <span class="static-meta"
                          >${staticAsset.format.toUpperCase()} &middot;
                          ${this._formatSize(staticAsset.sizeBytes)}</span
                        >
                      </div>
                    </div>
                  `
                    )
              }
            </div>
          `
            : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-gallery': AnimoriaGallery;
  }
}
