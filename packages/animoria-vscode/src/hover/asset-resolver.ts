import type { Asset, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';
import type { StaticAssetHoverInfo } from '../presentation/asset-card-renderer.js';

export function lineMatchesAsset(line: string, name: string, stem: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes(name.toLowerCase()) || lower.includes(stem.toLowerCase());
}

export function findTokenRange(
  line: string,
  token: string,
  charPos: number,
): [number, number] | null {
  if (!token || token.length < 2) return null;
  const lowerLine = line.toLowerCase();
  const lowerToken = token.toLowerCase();
  let startIdx = lowerLine.indexOf(lowerToken, 0);
  while (startIdx !== -1) {
    const endIdx = startIdx + token.length;
    if (charPos >= startIdx && charPos <= endIdx) {
      return [startIdx, endIdx];
    }
    startIdx = lowerLine.indexOf(lowerToken, startIdx + 1);
  }
  return null;
}

export class AssetResolver {
  static resolveFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    snapshot: WorkspaceAnalysis,
  ): Asset | null {
    const line = document.lineAt(position.line).text;
    const charPos = position.character;

    // 1. Exact filename match covering cursor position takes precedence
    for (const asset of snapshot.assets) {
      if (!asset.is_valid) continue;
      if (findTokenRange(line, asset.name, charPos)) {
        return asset;
      }
    }

    // 2. Stem match (>= 3 chars) covering cursor position
    for (const asset of snapshot.assets) {
      if (!asset.is_valid || asset.stem.length < 3) continue;
      if (findTokenRange(line, asset.stem, charPos)) {
        return asset;
      }
    }

    return null;
  }

  static resolveStaticFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    staticAssets: readonly StaticAssetHoverInfo[],
  ): StaticAssetHoverInfo | null {
    const line = document.lineAt(position.line).text;
    const charPos = position.character;

    for (const asset of staticAssets) {
      if (findTokenRange(line, asset.name, charPos)) {
        return asset;
      }
    }

    for (const asset of staticAssets) {
      if (asset.stem.length >= 3 && findTokenRange(line, asset.stem, charPos)) {
        return asset;
      }
    }

    return null;
  }

  static resolveHoverRange(
    document: vscode.TextDocument,
    position: vscode.Position,
    asset: Pick<Asset, 'name' | 'stem'>,
  ): vscode.Range {
    const line = document.lineAt(position.line).text;
    const charPos = position.character;

    const exactRange = findTokenRange(line, asset.name, charPos);
    if (exactRange) {
      return new vscode.Range(
        new vscode.Position(position.line, exactRange[0]),
        new vscode.Position(position.line, exactRange[1]),
      );
    }

    if (asset.stem.length >= 3) {
      const stemRange = findTokenRange(line, asset.stem, charPos);
      if (stemRange) {
        return new vscode.Range(
          new vscode.Position(position.line, stemRange[0]),
          new vscode.Position(position.line, stemRange[1]),
        );
      }
    }

    return document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position);
  }
}
