import * as vscode from 'vscode';
import { basename } from 'path';
import type { AnimoriaAsset, UsageReference, GovernanceIssue, GovernanceReport, GovernanceCategory } from '@animoria/core';
import { UsageScanner } from '@animoria/core';
import { AnimoriaPreviewPanel } from '../panels/AnimoriaPreviewPanel';
import { resolveScopePath } from '../utils/resolve-scope-path';

// ── Usage reference tree item ────────────────────────────────────────────────

export class AnimoriaUsageItem extends vscode.TreeItem {
  constructor(public ref: UsageReference) {
    const label = `${basename(ref.file)}:${ref.line}`;
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = ref.content.length > 60
      ? ref.content.slice(0, 60) + '…'
      : ref.content;
    this.tooltip = `${ref.file}\n${ref.content}`;
    this.iconPath = new vscode.ThemeIcon('references');
    this.contextValue = 'animoriaUsage';
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [
        vscode.Uri.file(ref.file),
        {
          selection: new vscode.Range(
            new vscode.Position(ref.line - 1, 0),
            new vscode.Position(ref.line - 1, 0)
          ),
        },
      ],
    };
  }
}

// ── Asset tree item ──────────────────────────────────────────────────────────

export class AnimoriaTreeItem extends vscode.TreeItem {
  public asset: AnimoriaAsset;
  public usageRefs: AnimoriaUsageItem[] = [];

  constructor(asset: AnimoriaAsset, thumbnailPath?: string) {
    super(asset.stem, vscode.TreeItemCollapsibleState.Collapsed);

    this.asset = asset;
    this.id = asset.path;
    this.tooltip = asset.path;
    this.contextValue = 'animoriaAsset';

    if (asset.status === 'parsed' && asset.metadata) {
      const m = asset.metadata;
      this.description = `${m.fps}fps · ${m.durationSeconds}s · ${m.width}×${m.height}`;
      this.iconPath = thumbnailPath
        ? vscode.Uri.file(thumbnailPath)
        : new vscode.ThemeIcon('play-circle');
    } else if (asset.status === 'error') {
      this.description = 'Error';
      this.iconPath = new vscode.ThemeIcon('error');
    } else {
      this.description = 'Parsing...';
      this.iconPath = new vscode.ThemeIcon('loading~spin');
    }

    this.command = {
      command: 'animoria.openPreview',
      title: 'Open Preview',
      arguments: [asset],
    };
  }
}

// ── Governance section header ─────────────────────────────────────────────────

export class AnimoriaGovernanceSectionItem extends vscode.TreeItem {
  constructor(
    label: string,
    count: number,
    public readonly category: GovernanceCategory,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(`${label} (${count})`, collapsibleState);

    const iconName =
      category === 'unused'     ? 'circle-slash'
      : category === 'duplicate' ? 'copy'
      : 'flame';

    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = 'animoriaGovernanceSection';
  }
}

// ── Governance issue item ─────────────────────────────────────────────────────

export class AnimoriaGovernanceIssueItem extends vscode.TreeItem {
  public readonly issue: GovernanceIssue;

  constructor(issue: GovernanceIssue) {
    super(issue.asset.stem, vscode.TreeItemCollapsibleState.None);

    this.issue = issue;
    this.tooltip = issue.asset.path;
    this.contextValue = 'animoriaGovernanceIssue';

    if (issue.category === 'unused') {
      this.description = 'No references found';
      this.iconPath = new vscode.ThemeIcon('warning');
    } else if (issue.category === 'duplicate') {
      this.description = `Identical to ${issue.duplicateOf?.length ?? 0} other(s)`;
      this.iconPath = new vscode.ThemeIcon('files');
    } else {
      this.description = `${issue.referenceCount} references`;
      this.iconPath = new vscode.ThemeIcon('pulse');
    }

    this.command = {
      command: 'animoria.openPreview',
      title: 'Open Preview',
      arguments: [issue.asset],
    };
  }
}

// ── Tree provider ────────────────────────────────────────────────────────────

type AnyTreeElement =
  | AnimoriaTreeItem
  | AnimoriaUsageItem
  | AnimoriaGovernanceSectionItem
  | AnimoriaGovernanceIssueItem;

export class AnimoriaTreeProvider
  implements vscode.TreeDataProvider<AnyTreeElement>
{
  private _assets: AnimoriaAsset[] = [];
  private _workspacePath: string;
  private _query: string = '';
  private _usageCache: Map<string, AnimoriaUsageItem[]> = new Map();
  private _itemMap: Map<string, AnimoriaTreeItem> = new Map();
  private _thumbnails: Map<string, string> = new Map();
  private _governanceReport: GovernanceReport | null = null;
  private _governanceSections: AnimoriaGovernanceSectionItem[] = [];

  private _onDidChangeTreeData =
    new vscode.EventEmitter<AnyTreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(workspacePath: string = '') {
    this._workspacePath = workspacePath;
  }

  getTreeItem(element: AnyTreeElement): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AnyTreeElement): AnyTreeElement[] {
    // Root level — return asset items then governance sections
    if (!element) {
      const assets = this._query
        ? this._assets.filter(
            a =>
              a.name.toLowerCase().includes(this._query.toLowerCase()) ||
              a.stem.toLowerCase().includes(this._query.toLowerCase())
          )
        : this._assets;

      const assetItems: AnimoriaTreeItem[] = assets.map(a => {
        const thumb = this._thumbnails.get(a.path);
        const item = new AnimoriaTreeItem(a, thumb);
        // Restore cached usage refs and description if available
        const cached = this._usageCache.get(a.path);
        if (cached) {
          item.usageRefs = cached;
          if (a.status === 'parsed' && a.metadata) {
            const m = a.metadata;
            item.description = `${m.fps}fps · ${m.durationSeconds}s · ${cached.length} refs`;
          }
        }
        this._itemMap.set(a.path, item);
        return item;
      });

      return [...assetItems, ...this._governanceSections];
    }

    // Governance section — return issue items
    if (element instanceof AnimoriaGovernanceSectionItem) {
      if (!this._governanceReport) return [];
      const issues =
        element.category === 'unused'     ? this._governanceReport.unused
        : element.category === 'duplicate' ? this._governanceReport.duplicates
        : this._governanceReport.overused;
      return issues.map(i => new AnimoriaGovernanceIssueItem(i));
    }

    // Asset level — return usage references (lazy load)
    if (element instanceof AnimoriaTreeItem) {
      const cached = this._usageCache.get(element.asset.path);
      if (cached) return cached;

      // Kick off async load and return empty for now
      this.loadUsageRefs(element);
      return [];
    }

    // Leaf items have no children
    return [];
  }

  setGovernanceReport(report: GovernanceReport): void {
    this._governanceReport = report;
    this._buildGovernanceSections();
    this._onDidChangeTreeData.fire();
  }

  private _buildGovernanceSections(): void {
    if (!this._governanceReport) return;
    const r = this._governanceReport;
    this._governanceSections = [];

    if (r.unused.length > 0) {
      this._governanceSections.push(
        new AnimoriaGovernanceSectionItem(
          'Unused Assets', r.unused.length, 'unused',
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    }
    if (r.duplicates.length > 0) {
      this._governanceSections.push(
        new AnimoriaGovernanceSectionItem(
          'Duplicates', r.duplicates.length, 'duplicate',
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    }
    if (r.overused.length > 0) {
      this._governanceSections.push(
        new AnimoriaGovernanceSectionItem(
          'Overused Assets', r.overused.length, 'overused',
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    }
  }

  async loadUsageRefs(item: AnimoriaTreeItem): Promise<void> {
    if (!this._workspacePath) return;

    const scopePath = resolveScopePath(item.asset.path, this._workspacePath);
    const scanner = new UsageScanner({
      workspacePath: this._workspacePath,
      asset: item.asset,
      strategy: 'pattern',
      scopePath,
    });

    const result = await scanner.search();
    const usageItems = result.references.map(r => new AnimoriaUsageItem(r));

    this._usageCache.set(item.asset.path, usageItems);
    item.usageRefs = usageItems;

    // Update description on the live item
    if (item.asset.status === 'parsed' && item.asset.metadata) {
      const m = item.asset.metadata;
      item.description = `${m.fps}fps · ${m.durationSeconds}s · ${usageItems.length} refs`;
    } else {
      item.description = `${usageItems.length} refs`;
    }

    // Also update the tracked instance in the map
    this._itemMap.set(item.asset.path, item);
    this._onDidChangeTreeData.fire();
  }

  setThumbnail(assetPath: string, thumbnailPath: string): void {
    this._thumbnails.set(assetPath, thumbnailPath);
    this._onDidChangeTreeData.fire();
  }

  getThumbnail(assetPath: string): string | undefined {
    return this._thumbnails.get(assetPath);
  }

  clearUsageCache(): void {
    this._usageCache.clear();
    this._itemMap.clear();
    this._onDidChangeTreeData.fire();
  }

  setAssets(assets: AnimoriaAsset[]): void {
    this._assets = assets;
    this._thumbnails.clear();
    this._governanceReport = null;
    this._governanceSections = [];
    this.clearUsageCache();
  }

  setQuery(query: string): void {
    this._query = query;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._thumbnails.clear();
    this.clearUsageCache();
  }

  getAssets(): AnimoriaAsset[] {
    return this._assets;
  }

  addAsset(asset: AnimoriaAsset): void {
    const existing = this._assets.findIndex(a => a.path === asset.path);
    if (existing !== -1) {
      this.updateAsset(asset);
      return;
    }
    this._assets.push(asset);
    this._onDidChangeTreeData.fire();
  }

  updateAsset(asset: AnimoriaAsset): void {
    const index = this._assets.findIndex(a => a.path === asset.path);
    if (index === -1) {
      this.addAsset(asset);
      return;
    }
    this._assets[index] = asset;
    // Invalidate cache for this asset so refs re-fetch on next expand
    this._usageCache.delete(asset.path);
    this._itemMap.delete(asset.path);
    this._onDidChangeTreeData.fire();
  }

  removeAsset(path: string): void {
    this._assets = this._assets.filter(a => a.path !== path);
    this._usageCache.delete(path);
    this._itemMap.delete(path);
    this._onDidChangeTreeData.fire();

    const panel = AnimoriaPreviewPanel.currentPanel;
    if (panel && panel.currentAssetPath === path) {
      panel.notifyAssetRemoved();
    }
  }
}
