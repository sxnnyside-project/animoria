import { basename } from 'node:path';
import type {
  AnimoriaAsset,
  AnimoriaStaticAsset,
  AssetBadge,
  AssetTreeNode,
  GovernanceCategory,
  GovernanceIssue,
  GovernanceReport,
  HealthScoreReport,
  RuleDiagnostic,
  RuleEngineReport,
  UsageReference,
} from '@animoria/core';
import {
  UsageScanner,
  buildAssetFlatProjection,
  buildAssetTreeProjection,
  evaluateAssetBadges,
} from '@animoria/core';
import * as vscode from 'vscode';
import { AnimoriaPreviewPanel } from '../panels/AnimoriaPreviewPanel';
import { presentAssetBadges, presentBadgeIconColor } from '../presentation/badge-presenter';
import { presentHealthScore } from '../presentation/health-score-presenter';
import { resolveScopePath } from '../utils/resolve-scope-path';

// ── Usage reference tree item ────────────────────────────────────────────────

export class AnimoriaUsageItem extends vscode.TreeItem {
  constructor(public ref: UsageReference) {
    const label = `${basename(ref.file)}:${ref.line}`;
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = ref.content.length > 60 ? `${ref.content.slice(0, 60)}…` : ref.content;
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

  constructor(
    asset: AnimoriaAsset,
    thumbnailPath: string | undefined,
    badges: readonly AssetBadge[],
    thumbnailUnavailable = false
  ) {
    super(asset.stem, vscode.TreeItemCollapsibleState.Collapsed);

    this.asset = asset;
    this.id = asset.path;
    this.contextValue = 'animoriaAsset';

    const presented = presentAssetBadges(badges);
    this.tooltip =
      presented.tooltipLines.length > 0
        ? [asset.path, '', ...presented.tooltipLines].join('\n')
        : asset.path;

    let summary: string;
    if (asset.status === 'parsed' && asset.metadata) {
      const m = asset.metadata;
      summary = `${'fps' in m ? `${m.fps}fps · ` : ''}${m.durationSeconds}s · ${m.width}×${m.height}`;
      if (thumbnailPath) {
        // A file exists on disk regardless of which rendering tier
        // produced it (vector, embedded-image, source-copy, or the
        // format badge) — all four are a completed, terminal result, not
        // a loading state, so they all render the same way: the actual
        // file.
        this.iconPath = vscode.Uri.file(thumbnailPath);
      } else if (thumbnailUnavailable) {
        // Generation ran for this asset and produced nothing — a real,
        // terminal failure. Static and visually distinct from both the
        // spinner (still working) and a rendered thumbnail (succeeded).
        this.iconPath = new vscode.ThemeIcon('circle-slash', presentBadgeIconColor(badges));
      } else {
        // Thumbnail generation for this asset has not completed yet.
        // Same spinner glyph as the parsing state below — both mean
        // "something is in progress" — so it never looks like a static,
        // finished result.
        this.iconPath = new vscode.ThemeIcon('loading~spin');
      }
    } else if (asset.status === 'error') {
      summary = 'Error';
      this.iconPath = new vscode.ThemeIcon('error');
    } else {
      summary = 'Parsing...';
      this.iconPath = new vscode.ThemeIcon('loading~spin');
    }
    this.description = presented.prefix ? `${presented.prefix} ${summary}` : summary;

    this.command = {
      command: 'animoria.openPreview',
      title: 'Open Preview',
      arguments: [asset],
    };
  }
}

// ── Folder tree item (Directory Tree view mode) ──────────────────────────────

/**
 * A directory node in Tree View mode, wrapping the corresponding
 * `AssetFolderNode` from `buildAssetTreeProjection` (`@animoria/core`).
 *
 * Holding a direct reference to its own projection node — rather than
 * looking children up by path in some separate map — is what lets
 * {@link AnimoriaTreeProvider.getChildren} answer "what are this
 * folder's children" in O(1): the projection already computed the
 * answer once, when it was built.
 */
export class AnimoriaFolderItem extends vscode.TreeItem {
  constructor(public readonly node: Extract<AssetTreeNode, { kind: 'folder' }>) {
    super(node.name, vscode.TreeItemCollapsibleState.Expanded);
    this.tooltip = node.relativePath;
    this.contextValue = 'animoriaFolder';
    this.iconPath = vscode.ThemeIcon.Folder;
  }
}

// ── Health Score header widget ───────────────────────────────────────────────

/**
 * The sidebar's top-level Health Score summary — a project health
 * headline, not a numeric label. See `health-score-presenter.ts` for how
 * the score is turned into this widget's text and icon.
 */
export class AnimoriaHealthScoreItem extends vscode.TreeItem {
  constructor(report: HealthScoreReport) {
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
    public readonly category: GovernanceCategory,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${label} (${count})`, collapsibleState);

    const iconName =
      category === 'unused' ? 'circle-slash' : category === 'duplicate' ? 'copy' : 'flame';

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
    // Duplicates get their own context value so the sidebar offers
    // "Resolve Duplicates" (the assisted workflow) instead of the raw
    // "Delete Asset" action available for unused/overused issues —
    // deleting one half of a duplicate pair directly would bypass the
    // reference-rewriting safety this workflow exists to provide.
    this.contextValue =
      issue.category === 'duplicate'
        ? 'animoriaGovernanceIssueDuplicate'
        : 'animoriaGovernanceIssue';

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

// ── Animated Assets section ───────────────────────────────────────────────────

/**
 * Root-level section header for animated assets (Lottie, dotLottie, Rive,
 * GIF, APNG, animated SVG) — the same disclosure/collapse experience the
 * Static Assets section gets, for the same reason: a long asset list
 * should never force continuous scrolling past the Health Score and
 * governance sections just to reach whatever comes after it.
 */
export class AnimoriaAnimatedAssetsSectionItem extends vscode.TreeItem {
  constructor(count: number, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(`Animated Assets (${count})`, collapsibleState);
    this.iconPath = new vscode.ThemeIcon('layers');
    this.contextValue = 'animoriaAnimatedAssetsSection';
  }
}

// ── Static Assets section ─────────────────────────────────────────────────────

/**
 * Root-level section header for static visual assets (SVG without
 * animation, PNG, JPEG, WebP, AVIF).
 *
 * Deliberately a flat, un-nested list rather than a folder/flat toggle
 * like the animated Gallery — static assets carry no animation metadata,
 * duration, or health-score weight, so they don't need the same
 * navigation machinery. This is the "different category, appropriate to
 * its complexity" experience the product decision calls for: visible and
 * governed, but never routed through the animated asset's richer (and
 * here, unnecessary) workflows.
 */
export class AnimoriaStaticAssetsSectionItem extends vscode.TreeItem {
  constructor(count: number, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(`Static Assets (${count})`, collapsibleState);
    this.iconPath = new vscode.ThemeIcon('symbol-color');
    this.contextValue = 'animoriaStaticAssetsSection';
  }
}

export class AnimoriaStaticAssetItem extends vscode.TreeItem {
  constructor(public readonly asset: AnimoriaStaticAsset) {
    super(asset.stem, vscode.TreeItemCollapsibleState.None);
    this.id = asset.path;
    this.description = `${asset.format.toUpperCase()} · ${formatBytesShort(asset.sizeBytes)}`;
    this.tooltip = asset.path;
    // Static assets are already displayable images (SVG/PNG/JPEG/WebP/
    // AVIF) — no rendering pipeline is needed to produce a thumbnail the
    // way animated formats need one. Pointing the icon directly at the
    // file is the real preview, not a fallback; using a generic
    // `ThemeIcon` here (as a prior version of this file did) meant every
    // static asset showed the same placeholder glyph regardless of its
    // actual content.
    this.iconPath = vscode.Uri.file(asset.path);
    this.contextValue = 'animoriaStaticAsset';
    // Consistent with animated `AnimoriaTreeItem`/`AnimoriaGovernanceIssueItem`
    // — clicking a static asset opens the same Preview Panel, not a
    // different action. Static assets are governed the same way animated
    // ones are; only the panel's internal rendering differs (see
    // `AnimoriaPreviewPanel`'s static-asset branch).
    this.command = {
      command: 'animoria.openPreview',
      title: 'Open Preview',
      arguments: [asset],
    };
  }
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Tree provider ────────────────────────────────────────────────────────────

/** How assets are spatially organized in the sidebar — see `@animoria/core`'s `navigation` module for the shared projection logic behind both. */
export type AssetViewMode = 'flat' | 'tree';

type AnyTreeElement =
  | AnimoriaHealthScoreItem
  | AnimoriaFolderItem
  | AnimoriaTreeItem
  | AnimoriaUsageItem
  | AnimoriaGovernanceSectionItem
  | AnimoriaGovernanceIssueItem
  | AnimoriaAnimatedAssetsSectionItem
  | AnimoriaStaticAssetsSectionItem
  | AnimoriaStaticAssetItem;

/**
 * Presentation adapter over Animoria's governance domain for VS Code's
 * `TreeDataProvider` API.
 *
 * ## What "presentation adapter" means here
 * This class owns no governance logic. Every decision about *what*
 * exists to show — which assets, their badge state, the Health Score,
 * the directory grouping — is computed by `@animoria/core` (the
 * reactive indexer, the Rule Engine, the Health Score Engine, the
 * navigation and badge modules). This class's job is exclusively:
 * hold the current snapshot of that data, and turn it into
 * `vscode.TreeItem`s on demand. See `navigation/` and `governance/badges`
 * in `@animoria/core` for where the corresponding domain logic actually
 * lives.
 *
 * ## Tree vs. Flat — one asset model, two projections
 * {@link setViewMode} does not maintain two separate data structures.
 * Both view modes render from the same `_assets` array, projected on
 * demand via `buildAssetTreeProjection` or `buildAssetFlatProjection`
 * (`@animoria/core`) depending on {@link viewMode}. Switching modes is a
 * `vscode.EventEmitter` refresh, never a rebuild of the underlying asset
 * state — the two views can never drift apart because there is only one
 * source of truth for what's being projected.
 *
 * ## Badges are always evaluated fresh, never cached
 * Governance state (reference counts, Rule Engine diagnostics, known
 * duplicates) is supplied via {@link setGovernanceState} and
 * {@link setGovernanceReport}, and `evaluateAssetBadges`
 * (`@animoria/core`) is called per asset at render time. This keeps
 * badge state honest — a badge can never show stale data left over from
 * a previous snapshot, because there is no persisted badge; there is
 * only ever "what would `evaluateAssetBadges` say right now."
 */
export class AnimoriaTreeProvider implements vscode.TreeDataProvider<AnyTreeElement> {
  private _assets: AnimoriaAsset[] = [];
  private _workspacePath: string;
  private _query = '';
  private _viewMode: AssetViewMode = 'flat';
  private _usageCache: Map<string, AnimoriaUsageItem[]> = new Map();
  private _itemMap: Map<string, AnimoriaTreeItem> = new Map();
  private _thumbnails: Map<string, string> = new Map();
  /** Assets for which thumbnail generation ran and produced no file (a real failure, not a badge-tier success). Distinct from "not yet attempted" so the tree can tell "still generating" from "gave up". */
  private _thumbnailFailures: Set<string> = new Set();
  private _governanceReport: GovernanceReport | null = null;
  private _governanceSections: AnimoriaGovernanceSectionItem[] = [];
  private _ruleReport: RuleEngineReport | null = null;
  private _healthScore: HealthScoreReport | null = null;
  private _referenceCounts: ReadonlyMap<string, number> = new Map();
  private _staticAssets: AnimoriaStaticAsset[] = [];

  private _onDidChangeTreeData = new vscode.EventEmitter<AnyTreeElement | undefined | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(workspacePath = '') {
    this._workspacePath = workspacePath;
  }

  /** The active navigation projection. See the class docs for why this never implies a second data model. */
  get viewMode(): AssetViewMode {
    return this._viewMode;
  }

  /** Switches between Flat and Directory Tree projections of the same asset list. */
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

    if (element instanceof AnimoriaFolderItem) {
      return this._wrapProjectionNodes(element.node.children);
    }

    if (element instanceof AnimoriaGovernanceSectionItem) {
      if (!this._governanceReport) return [];
      const issues =
        element.category === 'unused'
          ? this._governanceReport.unused
          : element.category === 'duplicate'
            ? this._governanceReport.duplicates
            : this._governanceReport.overused;
      return issues.map((i) => new AnimoriaGovernanceIssueItem(i));
    }

    if (element instanceof AnimoriaTreeItem) {
      const cached = this._usageCache.get(element.asset.path);
      if (cached) return cached;

      // Usage references are scanned lazily on first expand: return no
      // children immediately, then fire a tree refresh once the scan
      // completes and populates the cache.
      this.loadUsageRefs(element);
      return [];
    }

    if (element instanceof AnimoriaAnimatedAssetsSectionItem) {
      return this._buildAnimatedAssetItems();
    }

    if (element instanceof AnimoriaStaticAssetsSectionItem) {
      return this._staticAssets.map((a) => new AnimoriaStaticAssetItem(a));
    }

    // Leaf items (health score, usage refs, governance issues, static assets) have no children.
    return [];
  }

  /** The animated-asset projection (Flat or Directory Tree, per `_viewMode`), filtered by the current search query. */
  private _buildAnimatedAssetItems(): AnyTreeElement[] {
    const filteredAssets = this._query
      ? this._assets.filter(
          (a) =>
            a.name.toLowerCase().includes(this._query.toLowerCase()) ||
            a.stem.toLowerCase().includes(this._query.toLowerCase())
        )
      : this._assets;

    return this._viewMode === 'tree'
      ? this._wrapProjectionNodes(buildAssetTreeProjection(filteredAssets, this._workspacePath))
      : buildAssetFlatProjection(filteredAssets).map((asset) => this._wrapAsset(asset));
  }

  private _getRootChildren(): AnyTreeElement[] {
    const healthItem = this._healthScore ? [new AnimoriaHealthScoreItem(this._healthScore)] : [];

    // Mirrors the Static Assets section below — the same disclosure
    // experience for both categories, collapsed by default so neither one
    // forces scrolling past the other by default.
    const animatedSection =
      this._assets.length > 0
        ? [
            new AnimoriaAnimatedAssetsSectionItem(
              this._assets.length,
              vscode.TreeItemCollapsibleState.Collapsed
            ),
          ]
        : [];

    const staticSection =
      this._staticAssets.length > 0
        ? [
            new AnimoriaStaticAssetsSectionItem(
              this._staticAssets.length,
              vscode.TreeItemCollapsibleState.Collapsed
            ),
          ]
        : [];

    return [...healthItem, ...animatedSection, ...this._governanceSections, ...staticSection];
  }

  /**
   * Converts navigation-projection nodes (`@animoria/core`) into tree
   * items, recursing into folders lazily is unnecessary here since
   * `AssetTreeNode.children` is already fully materialized — this only
   * wraps one level; deeper levels are wrapped the same way when VS Code
   * asks for a folder's children (see `getChildren`).
   */
  private _wrapProjectionNodes(nodes: readonly AssetTreeNode[]): AnyTreeElement[] {
    return nodes.map((node) =>
      node.kind === 'folder' ? new AnimoriaFolderItem(node) : this._wrapAsset(node.asset)
    );
  }

  /**
   * Builds (or reuses cached usage refs for) the single `AnimoriaTreeItem`
   * representation of one asset — the one place per-asset presentation
   * (thumbnail, badges, cached description) is assembled, shared by both
   * the Flat and Tree projections so neither can drift from the other.
   */
  private _wrapAsset(asset: AnimoriaAsset): AnimoriaTreeItem {
    const thumb = this._thumbnails.get(asset.path);
    const thumbnailUnavailable = this._thumbnailFailures.has(asset.path);
    const badges = evaluateAssetBadges(asset, {
      referenceCounts: this._referenceCounts,
      duplicateAssetPaths: this._duplicateAssetPaths(),
      diagnosticsByAssetPath: this._diagnosticsByAssetPath(),
    });
    const item = new AnimoriaTreeItem(asset, thumb, badges, thumbnailUnavailable);

    const cached = this._usageCache.get(asset.path);
    if (cached) {
      item.usageRefs = cached;
      if (asset.status === 'parsed' && asset.metadata) {
        const m = asset.metadata;
        const presented = presentAssetBadges(badges);
        const summary = `${'fps' in m ? `${m.fps}fps · ` : ''}${m.durationSeconds}s · ${cached.length} refs`;
        item.description = presented.prefix ? `${presented.prefix} ${summary}` : summary;
      }
    }

    this._itemMap.set(asset.path, item);
    return item;
  }

  private _diagnosticsByAssetPath(): ReadonlyMap<string, readonly RuleDiagnostic[]> {
    const map = new Map<string, RuleDiagnostic[]>();
    for (const diagnostic of this._ruleReport?.diagnostics ?? []) {
      const list = map.get(diagnostic.asset.path) ?? [];
      list.push(diagnostic);
      map.set(diagnostic.asset.path, list);
    }
    return map;
  }

  private _duplicateAssetPaths(): ReadonlySet<string> {
    return new Set(this._governanceReport?.duplicates.map((issue) => issue.asset.path) ?? []);
  }

  setGovernanceReport(report: GovernanceReport): void {
    this._governanceReport = report;
    this._buildGovernanceSections();
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Replaces the Static Assets section's contents.
   *
   * Independent of {@link setAssets} — static assets are not animated
   * `AnimoriaAsset`s and never participate in the animated pipeline's
   * badges, health score, or reference-counting. Static asset discovery
   * is a plain one-shot scan (see `StaticAssetScanner`), not reactively
   * tracked per file-watcher event the way animated assets are; callers
   * re-run it on workspace init and explicit refresh.
   */
  setStaticAssets(assets: readonly AnimoriaStaticAsset[]): void {
    this._staticAssets = [...assets];
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Feeds reactive governance signals (reference counts, Rule Engine
   * diagnostics, Health Score) from the latest `WorkspaceIndexSnapshot`
   * into the provider. Deliberately independent of {@link setAssets} /
   * {@link updateAsset} / {@link removeAsset} — asset identity changes
   * and governance-state changes are different kinds of updates from
   * the reactive indexer, and folding them into one method would force
   * every governance refresh to also re-derive the asset list (or vice
   * versa) even when only one actually changed.
   */
  setGovernanceState(state: {
    ruleReport: RuleEngineReport | null;
    healthScore: HealthScoreReport | null;
    referenceCounts: ReadonlyMap<string, number>;
  }): void {
    this._ruleReport = state.ruleReport;
    this._healthScore = state.healthScore;
    this._referenceCounts = state.referenceCounts;
    this._onDidChangeTreeData.fire(undefined);
  }

  private _buildGovernanceSections(): void {
    if (!this._governanceReport) return;
    const r = this._governanceReport;
    this._governanceSections = [];

    if (r.unused.length > 0) {
      this._governanceSections.push(
        new AnimoriaGovernanceSectionItem(
          'Unused Assets',
          r.unused.length,
          'unused',
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    }
    if (r.duplicates.length > 0) {
      this._governanceSections.push(
        new AnimoriaGovernanceSectionItem(
          'Duplicates',
          r.duplicates.length,
          'duplicate',
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    }
    if (r.overused.length > 0) {
      this._governanceSections.push(
        new AnimoriaGovernanceSectionItem(
          'Overused Assets',
          r.overused.length,
          'overused',
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
    const usageItems = result.references.map((r) => new AnimoriaUsageItem(r));

    this._usageCache.set(item.asset.path, usageItems);
    item.usageRefs = usageItems;

    // Update description on the live item
    if (item.asset.status === 'parsed' && item.asset.metadata) {
      const m = item.asset.metadata;
      item.description = `${'fps' in m ? `${m.fps}fps · ` : ''}${m.durationSeconds}s · ${usageItems.length} refs`;
    } else {
      item.description = `${usageItems.length} refs`;
    }

    // Also update the tracked instance in the map
    this._itemMap.set(item.asset.path, item);
    this._onDidChangeTreeData.fire(undefined);
  }

  setThumbnail(assetPath: string, thumbnailPath: string): void {
    this._thumbnails.set(assetPath, thumbnailPath);
    this._thumbnailFailures.delete(assetPath);
    this._onDidChangeTreeData.fire(undefined);
  }

  /** Records that thumbnail generation ran for `assetPath` and produced nothing — a genuine failure, distinct from the badge tier (which still produces a file and goes through {@link setThumbnail}). */
  markThumbnailUnavailable(assetPath: string): void {
    this._thumbnailFailures.add(assetPath);
    this._onDidChangeTreeData.fire(undefined);
  }

  getThumbnail(assetPath: string): string | undefined {
    return this._thumbnails.get(assetPath);
  }

  clearUsageCache(): void {
    this._usageCache.clear();
    this._itemMap.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  setAssets(assets: AnimoriaAsset[]): void {
    this._assets = assets;
    this._thumbnails.clear();
    this._thumbnailFailures.clear();
    this._governanceReport = null;
    this._governanceSections = [];
    this.clearUsageCache();
  }

  setQuery(query: string): void {
    this._query = query;
    this._onDidChangeTreeData.fire(undefined);
  }

  refresh(): void {
    this._thumbnails.clear();
    this._thumbnailFailures.clear();
    this.clearUsageCache();
  }

  getAssets(): AnimoriaAsset[] {
    return this._assets;
  }

  getStaticAssets(): readonly AnimoriaStaticAsset[] {
    return this._staticAssets;
  }

  addAsset(asset: AnimoriaAsset): void {
    const existing = this._assets.findIndex((a) => a.path === asset.path);
    if (existing !== -1) {
      this.updateAsset(asset);
      return;
    }
    this._assets.push(asset);
    this._onDidChangeTreeData.fire(undefined);
  }

  updateAsset(asset: AnimoriaAsset): void {
    const index = this._assets.findIndex((a) => a.path === asset.path);
    if (index === -1) {
      this.addAsset(asset);
      return;
    }
    this._assets[index] = asset;
    // Invalidate cache for this asset so refs re-fetch on next expand
    this._usageCache.delete(asset.path);
    this._itemMap.delete(asset.path);
    this._onDidChangeTreeData.fire(undefined);
  }

  removeAsset(path: string): void {
    this._assets = this._assets.filter((a) => a.path !== path);
    this._usageCache.delete(path);
    this._itemMap.delete(path);
    this._onDidChangeTreeData.fire(undefined);

    const panel = AnimoriaPreviewPanel.currentPanel;
    if (panel && panel.currentAssetPath === path) {
      panel.notifyAssetRemoved();
    }
  }
}
