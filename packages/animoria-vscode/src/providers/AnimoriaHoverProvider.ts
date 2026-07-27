import type { WorkspaceIndexer } from '@animoria/core';
import * as vscode from 'vscode';
import { AssetResolver } from '../hover/AssetResolver.js';
import { buildAssetCardModel } from '../presentation/AssetCardModel.js';
import { AssetCardRenderer } from '../presentation/AssetCardRenderer.js';
import type { AnimoriaTreeProvider } from '../providers/AnimoriaTreeProvider.js';

// ─── Supported source file languages ─────────────────────────────────────────

/**
 * Language identifiers for which the hover provider activates.
 *
 * These are the language IDs VS Code assigns to documents — not file
 * extensions. The list mirrors the source extensions the usage scanner
 * targets, ensuring the hover activates on exactly the same files the
 * reference counter already watches.
 *
 * When `UsageScanner` gains support for additional languages, add the
 * corresponding language ID here.
 */
export const HOVER_LANGUAGES = [
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
  'vue',
  'svelte',
  'swift',
  'kotlin',
  'dart',
] as const;

// ─── AnimoriaHoverProvider ────────────────────────────────────────────────────

/**
 * VS Code {@link vscode.HoverProvider} for both animated and static asset
 * references. A thin adapter: {@link AssetResolver} resolves the asset,
 * {@link buildAssetCardModel}/{@link AssetCardRenderer} build the animated
 * card, `AssetCardRenderer.renderStaticAssetHoverCard` builds the static
 * one. No governance or matching logic lives here.
 *
 * Thumbnails are cache-or-omit, not awaited: `treeProvider.getThumbnail`
 * is a synchronous Map lookup, so a freshly-indexed asset's first hover
 * shows metadata only, and the thumbnail appears once the background
 * `ThumbnailEngine` catches up.
 */
export class AnimoriaHoverProvider implements vscode.HoverProvider {
  private readonly _indexer: WorkspaceIndexer;
  private readonly _treeProvider: AnimoriaTreeProvider;

  constructor(indexer: WorkspaceIndexer, treeProvider: AnimoriaTreeProvider) {
    this._indexer = indexer;
    this._treeProvider = treeProvider;
  }

  // ── vscode.HoverProvider ───────────────────────────────────────────────────

  /**
   * Tries animated resolution first, then static. Returns `null` when
   * neither matches the hovered line.
   */
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const snapshot = this._indexer.getSnapshot();

    // ── Step 1: Resolve asset from index ─────────────────────────────────────
    const asset = AssetResolver.resolveFromPosition(document, position, snapshot);
    if (!asset) return this._provideStaticHover(document, position);

    // ── Step 2: Gather supplementary index data ───────────────────────────────
    const referenceCount = snapshot.referenceCounts.get(asset.path) ?? null;
    const thumbnailPath = this._treeProvider.getThumbnail(asset.path) ?? null;

    const hasGovernanceIssue = snapshot.ruleReport
      ? snapshot.ruleReport.diagnostics.some((d) => d.asset.path === asset.path)
      : null;

    // ── Step 3: Build presentation model ──────────────────────────────────────
    const card = buildAssetCardModel(asset, {
      ...(referenceCount !== null ? { referenceCount } : {}),
      ...(hasGovernanceIssue !== null ? { hasGovernanceIssue } : {}),
      ...(thumbnailPath !== null ? { thumbnailPath } : {}),
    });

    // ── Step 4: Render ────────────────────────────────────────────────────────
    const markdown = AssetCardRenderer.renderHoverCard(card);

    // ── Step 5: Resolve hover range ───────────────────────────────────────────
    const range = AssetResolver.resolveHoverRange(document, position, asset);

    return new vscode.Hover(markdown, range);
  }

  /** Static-asset counterpart of `provideHover`'s Step 1–5, for references the animated resolution didn't match. */
  private _provideStaticHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null {
    const staticAssets = this._treeProvider.getStaticAssets();
    const asset = AssetResolver.resolveStaticFromPosition(document, position, staticAssets);
    if (!asset) return null;

    const markdown = AssetCardRenderer.renderStaticAssetHoverCard(asset);
    const range = AssetResolver.resolveHoverRange(document, position, asset);
    return new vscode.Hover(markdown, range);
  }
}
