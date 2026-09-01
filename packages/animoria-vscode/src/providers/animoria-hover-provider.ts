import type { WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';
import { AssetResolver } from '../hover/asset-resolver.js';
import { buildAssetCardModel } from '../presentation/asset-card-model.js';
import { AssetCardRenderer } from '../presentation/asset-card-renderer.js';
import type { AnimoriaTreeProvider } from '../providers/animoria-tree-provider.js';

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

export class AnimoriaHoverProvider implements vscode.HoverProvider {
  constructor(
    private readonly _getAnalysis: () => WorkspaceAnalysis | null,
    private readonly _treeProvider: AnimoriaTreeProvider
  ) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const snapshot = this._getAnalysis();
    if (!snapshot) return null;

    const asset = AssetResolver.resolveFromPosition(document, position, snapshot);
    if (!asset) return null;

    const thumbnailPath =
      asset.thumbnail_path ?? this._treeProvider.getThumbnail(asset.path) ?? null;
    const hasGovernanceIssue = snapshot.diagnostics.some((d) => d.target_asset_path === asset.path);

    const card = buildAssetCardModel(asset, {
      hasGovernanceIssue,
      ...(thumbnailPath !== null ? { thumbnailPath } : {}),
    });

    const markdown = AssetCardRenderer.renderHoverCard(card);
    const range = AssetResolver.resolveHoverRange(document, position, asset);

    return new vscode.Hover(markdown, range);
  }
}
