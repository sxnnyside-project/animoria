import { basename, relative } from 'node:path';
import type {
  Asset,
  DuplicateGroup,
  HealthScoreReport,
  RuleDiagnostic,
  UsageReference,
  WorkspaceAnalysis,
} from '@animoria/contracts';
import * as vscode from 'vscode';
import {
  type AssetBadge,
  presentAssetBadges,
  presentBadgeIconColor,
} from '../presentation/badge-presenter.js';
import { presentHealthScore } from '../presentation/health-score-presenter.js';

// ── Usage reference tree item ────────────────────────────────────────────────

export class AnimoriaUsageItem extends vscode.TreeItem {
  constructor(public ref: UsageReference) {
    const label = `${basename(ref.file_path)}:${ref.line_number}`;
    super(label, vscode.TreeItemCollapsibleState.None);

    const snippet = ref.line_content.trim();
    this.description = snippet.length > 60 ? `${snippet.slice(0, 60)}…` : snippet;
    this.tooltip = `${ref.file_path}\n${ref.line_content}`;
    this.iconPath = new vscode.ThemeIcon('references');
    this.contextValue = 'animoriaUsage';
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [
        vscode.Uri.file(ref.file_path),
        {
          selection: new vscode.Range(
            new vscode.Position(Math.max(0, ref.line_number - 1), 0),
            new vscode.Position(Math.max(0, ref.line_number - 1), 0)
          ),
        },
      ],
    };
  }
}

// ── Asset tree item ──────────────────────────────────────────────────────────

export class AnimoriaTreeItem extends vscode.TreeItem {
  public asset: Asset;
  public usageRefs: AnimoriaUsageItem[] = [];

  constructor(
    asset: Asset,
    thumbnailPath: string | undefined,
    badges: readonly AssetBadge[] = [],
    hasReferences = false
  ) {
    super(
      asset.stem,
      hasReferences
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.asset = asset;
    this.id = asset.path;
    this.contextValue = 'animoriaAsset';

    const presented = presentAssetBadges(badges);
    this.tooltip =
      presented.tooltipLines.length > 0
        ? [asset.path, '', ...presented.tooltipLines].join('\n')
        : asset.path;

    let summary = '';
    if (asset.is_valid) {
      const dims = asset.dimensions ? `${asset.dimensions.width}×${asset.dimensions.height}` : '';
      const fps = asset.motion?.fps ? `${Math.round(asset.motion.fps)}fps` : '';
      const dur = asset.motion?.duration_secs ? `${asset.motion.duration_secs.toFixed(1)}s` : '';
      const formatUpper = asset.format.toUpperCase();
      summary = [formatUpper, fps, dur, dims].filter(Boolean).join(' · ');

      if (thumbnailPath) {
        this.iconPath = vscode.Uri.file(thumbnailPath);
      } else {
        this.iconPath = new vscode.ThemeIcon(
          asset.kind === 'motion' ? 'play-circle' : 'file-media',
          presentBadgeIconColor(badges)
        );
      }
    } else {
      summary = 'Invalid asset';
      this.iconPath = new vscode.ThemeIcon('error');
    }

    this.description = presented.prefix ? `${presented.prefix} ${summary}` : summary;

    this.command = {
      command: 'animoria.openPreview',
      title: 'Open Preview',
      arguments: [asset],
    };
  }
}

// ── Folder tree item ─────────────────────────────────────────────────────────

export class AnimoriaFolderItem extends vscode.TreeItem {
  constructor(
    public readonly folderName: string,
    public readonly relativePath: string,
    public readonly assets: readonly Asset[]
  ) {
    super(folderName, vscode.TreeItemCollapsibleState.Expanded);
    this.description = `${assets.length}`;
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'animoriaFolder';
  }
}

// ── Health Score header widget ───────────────────────────────────────────────

export class AnimoriaHealthScoreItem extends vscode.TreeItem {
  constructor(report: HealthScoreReport | null | undefined) {
    const presented = presentHealthScore(report);
    super(presented.label, vscode.TreeItemCollapsibleState.None);
    this.description = presented.description;
    this.tooltip = presented.tooltip;
    this.iconPath = presented.icon;
    this.contextValue = 'animoriaHealthScore';
  }
}

// ── Governance section header ─────────────────────────────────────────────────

export class AnimoriaGovernanceSectionItem extends vscode.TreeItem {
  constructor(
    label: string,
    count: number,
    public readonly category: string,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${label} (${count})`, collapsibleState);

    const iconName =
      category === 'no-unreferenced-assets'
        ? 'circle-slash'
        : category === 'no-duplicate-content'
          ? 'copy'
          : 'warning';

    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = 'animoriaGovernanceSection';
  }
}

// ── Governance issue item ─────────────────────────────────────────────────────

export class AnimoriaGovernanceIssueItem extends vscode.TreeItem {
  public readonly diagnostic: RuleDiagnostic;

  constructor(diagnostic: RuleDiagnostic) {
    const stem = basename(diagnostic.target_asset_path || 'unknown').split('.')[0] || 'Finding';
    super(stem, vscode.TreeItemCollapsibleState.None);

    this.diagnostic = diagnostic;
    this.tooltip = new vscode.MarkdownString(
      [
        `**${diagnostic.rule_id}** · ${diagnostic.severity}`,
        '',
        diagnostic.message,
        '',
        diagnostic.target_asset_path,
      ].join('\n')
    );

    this.contextValue =
      diagnostic.rule_id === 'no-duplicate-content'
        ? 'animoriaGovernanceIssueDuplicate'
        : 'animoriaGovernanceIssue';

    this.description = diagnostic.message;
    this.iconPath = new vscode.ThemeIcon(diagnostic.severity === 'error' ? 'error' : 'warning');
  }
}

// ── Category Sections ────────────────────────────────────────────────────────

export class AnimoriaSectionItem extends vscode.TreeItem {
  constructor(
    public readonly kind: 'motion' | 'static' | 'duplicates',
    count: number,
    label: string,
    icon: string
  ) {
    super(`${label} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = `animoriaSection_${kind}`;
  }
}

export type AssetViewMode = 'flat' | 'tree';

type AnyTreeElement =
  | AnimoriaHealthScoreItem
  | AnimoriaTreeItem
  | AnimoriaFolderItem
  | AnimoriaUsageItem
  | AnimoriaGovernanceSectionItem
  | AnimoriaGovernanceIssueItem
  | AnimoriaSectionItem;

export class AnimoriaTreeProvider implements vscode.TreeDataProvider<AnyTreeElement> {
  private _assets: Asset[] = [];
  private _workspacePath = '';
  private _query = '';
  private _viewMode: AssetViewMode = 'flat';
  private _thumbnails = new Map<string, string>();
  private _diagnostics: readonly RuleDiagnostic[] = [];
  private _health: HealthScoreReport | null = null;
  private _duplicateGroups: readonly DuplicateGroup[] = [];
  private _references: readonly UsageReference[] = [];

  private _onDidChangeTreeData = new vscode.EventEmitter<AnyTreeElement | undefined | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(workspacePath = '') {
    this._workspacePath = workspacePath;
  }

  get viewMode(): AssetViewMode {
    return this._viewMode;
  }

  setViewMode(mode: AssetViewMode): void {
    if (this._viewMode === mode) return;
    this._viewMode = mode;
    this._onDidChangeTreeData.fire(undefined);
  }

  toggleViewMode(): AssetViewMode {
    this.setViewMode(this._viewMode === 'flat' ? 'tree' : 'flat');
    return this._viewMode;
  }

  getTreeItem(element: AnyTreeElement): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AnyTreeElement): AnyTreeElement[] {
    if (!element) return this._getRootChildren();

    if (element instanceof AnimoriaGovernanceSectionItem) {
      return this._diagnostics
        .filter((d) => d.rule_id === element.category)
        .map((d) => new AnimoriaGovernanceIssueItem(d));
    }

    if (element instanceof AnimoriaSectionItem) {
      if (element.kind === 'motion') {
        return this._buildAssetItems(this._assets.filter((a) => a.kind === 'motion'));
      }
      if (element.kind === 'static') {
        return this._buildAssetItems(this._assets.filter((a) => a.kind === 'static'));
      }
    }

    if (element instanceof AnimoriaFolderItem) {
      return this._buildAssetItems(element.assets, element.relativePath);
    }

    if (element instanceof AnimoriaTreeItem) {
      const refs = this._references.filter(
        (r) =>
          r.asset_id === element.asset.path ||
          r.asset_id === element.asset.id ||
          r.asset_id === element.asset.stem ||
          r.asset_id === element.asset.name
      );
      return refs.map((r) => new AnimoriaUsageItem(r));
    }

    return [];
  }

  private _buildAssetItems(targetAssets: readonly Asset[], parentFolder = ''): AnyTreeElement[] {
    const filtered = this._query
      ? targetAssets.filter(
          (a) =>
            a.name.toLowerCase().includes(this._query.toLowerCase()) ||
            a.stem.toLowerCase().includes(this._query.toLowerCase())
        )
      : targetAssets;

    if (this._viewMode === 'tree') {
      const folders = new Map<string, { fullDir: string; assets: Asset[] }>();
      const rootAssets: Asset[] = [];

      for (const a of filtered) {
        const fullRel = this._workspacePath ? relative(this._workspacePath, a.path) : a.path;
        const rel = parentFolder ? relative(parentFolder, fullRel) : fullRel;
        const parts = rel.split(/[/\\]/).filter(Boolean);
        if (parts.length > 1) {
          const firstSegment = parts[0]!;
          const fullDir = parentFolder ? `${parentFolder}/${firstSegment}` : firstSegment;
          const entry = folders.get(firstSegment) ?? { fullDir, assets: [] };
          entry.assets.push(a);
          folders.set(firstSegment, entry);
        } else {
          rootAssets.push(a);
        }
      }

      const folderItems = Array.from(folders.entries()).map(
        ([segName, { fullDir, assets }]) => new AnimoriaFolderItem(segName, fullDir, assets)
      );
      const fileItems = rootAssets.map((a) => this._createTreeItem(a));
      return [...folderItems, ...fileItems];
    }

    return filtered.map((a) => this._createTreeItem(a));
  }

  private _createTreeItem(a: Asset): AnimoriaTreeItem {
    const badges: AssetBadge[] = [];
    const hasUnref = this._diagnostics.some(
      (d) => d.rule_id === 'no-unreferenced-assets' && d.target_asset_path === a.path
    );
    if (hasUnref) {
      badges.push({ kind: 'unreferenced', severity: 'warning', message: 'Unreferenced asset' });
    }
    const hasDup = this._diagnostics.some(
      (d) => d.rule_id === 'no-duplicate-content' && d.target_asset_path === a.path
    );
    if (hasDup) {
      badges.push({ kind: 'duplicate', severity: 'error', message: 'Duplicate content' });
    }

    const hasReferences = this._references.some(
      (r) =>
        r.asset_id === a.path ||
        r.asset_id === a.id ||
        r.asset_id === a.stem ||
        r.asset_id === a.name
    );
    return new AnimoriaTreeItem(
      a,
      a.thumbnail_path ?? this._thumbnails.get(a.path),
      badges,
      hasReferences
    );
  }

  private _getRootChildren(): AnyTreeElement[] {
    const healthItem = [new AnimoriaHealthScoreItem(this._health)];

    const motionCount = this._assets.filter((a) => a.kind === 'motion').length;
    const staticCount = this._assets.filter((a) => a.kind === 'static').length;

    const sections: AnyTreeElement[] = [];
    if (motionCount > 0) {
      sections.push(
        new AnimoriaSectionItem('motion', motionCount, 'Animated Assets', 'play-circle')
      );
    }
    if (staticCount > 0) {
      sections.push(new AnimoriaSectionItem('static', staticCount, 'Static Assets', 'file-media'));
    }

    const sectionMap = new Map<string, number>();
    for (const d of this._diagnostics) {
      sectionMap.set(d.rule_id, (sectionMap.get(d.rule_id) || 0) + 1);
    }

    const governanceSections = Array.from(sectionMap.entries()).map(
      ([ruleId, count]) =>
        new AnimoriaGovernanceSectionItem(
          ruleId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          count,
          ruleId,
          vscode.TreeItemCollapsibleState.Collapsed
        )
    );

    return [...healthItem, ...sections, ...governanceSections];
  }

  updateAnalysis(
    analysis: WorkspaceAnalysis,
    references: UsageReference[] = [],
    duplicateGroups: DuplicateGroup[] = []
  ): void {
    this._assets = analysis.assets;
    this._diagnostics = analysis.diagnostics;
    this._health = analysis.health_score ?? null;
    this._references = references;
    this._duplicateGroups = duplicateGroups;
    this._workspacePath = analysis.root_path;
    this._onDidChangeTreeData.fire(undefined);
  }

  setSearchQuery(q: string): void {
    this._query = q;
    this._onDidChangeTreeData.fire(undefined);
  }

  setThumbnail(path: string, thumbnailPath: string): void {
    this._thumbnails.set(path, thumbnailPath);
    this._onDidChangeTreeData.fire(undefined);
  }

  getThumbnail(path: string): string | undefined {
    return this._thumbnails.get(path);
  }

  getAssets(): readonly Asset[] {
    return this._assets;
  }
}
