import type { Asset, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';
import type { StaticAssetHoverInfo } from '../presentation/asset-card-renderer.js';

export function lineMatchesAsset(line: string, name: string, stem: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes(name.toLowerCase()) || lower.includes(stem.toLowerCase());
}

export class AssetResolver {
  static resolveFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    snapshot: WorkspaceAnalysis
  ): Asset | null {
    const line = document.lineAt(position.line).text;

    for (const asset of snapshot.assets) {
      if (!asset.is_valid) continue;
      if (lineMatchesAsset(line, asset.name, asset.stem)) {
        return asset;
      }
    }

    return null;
  }

  static resolveStaticFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    staticAssets: readonly StaticAssetHoverInfo[]
  ): StaticAssetHoverInfo | null {
    const line = document.lineAt(position.line).text;
    for (const asset of staticAssets) {
      if (lineMatchesAsset(line, asset.name, asset.stem)) {
        return asset;
      }
    }
    return null;
  }

  static resolveHoverRange(
    document: vscode.TextDocument,
    position: vscode.Position,
    asset: Pick<Asset, 'name' | 'stem'>
  ): vscode.Range {
    const line = document.lineAt(position.line).text;

    for (const token of [asset.name, asset.stem]) {
      const idx = line.toLowerCase().indexOf(token.toLowerCase());
      if (idx !== -1) {
        return new vscode.Range(
          new vscode.Position(position.line, idx),
          new vscode.Position(position.line, idx + token.length)
        );
      }
    }

    return document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position);
  }
}
