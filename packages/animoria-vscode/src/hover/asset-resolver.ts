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

interface SnapshotIndex {
  byName: Map<string, Asset[]>;
  byStem: Map<string, Asset[]>;
}

const snapshotIndexCache = new WeakMap<WorkspaceAnalysis, SnapshotIndex>();

function getOrBuildIndex(snapshot: WorkspaceAnalysis): SnapshotIndex {
  let cached = snapshotIndexCache.get(snapshot);
  if (!cached) {
    const byName = new Map<string, Asset[]>();
    const byStem = new Map<string, Asset[]>();

    for (const asset of snapshot.assets) {
      if (!asset.is_valid) continue;
      const lowerName = asset.name.toLowerCase();
      const nameList = byName.get(lowerName) ?? [];
      nameList.push(asset);
      byName.set(lowerName, nameList);

      if (asset.stem.length >= 3) {
        const lowerStem = asset.stem.toLowerCase();
        const stemList = byStem.get(lowerStem) ?? [];
        stemList.push(asset);
        byStem.set(lowerStem, stemList);
      }
    }

    cached = { byName, byStem };
    snapshotIndexCache.set(snapshot, cached);
  }
  return cached;
}

function extractTokensAtCursor(line: string, charPos: number): string[] {
  if (charPos < 0 || charPos > line.length) return [];
  const candidates = new Set<string>();

  // 1. Quoted string bounds
  const quoteChars = ['"', "'", '`'];
  for (const q of quoteChars) {
    const qStart = line.lastIndexOf(q, charPos);
    if (qStart !== -1) {
      const qEnd = line.indexOf(q, charPos);
      if (qEnd !== -1 && qEnd > qStart) {
        const inside = line.slice(qStart + 1, qEnd).trim();
        if (inside) {
          candidates.add(inside);
          const slashIdx = Math.max(inside.lastIndexOf('/'), inside.lastIndexOf('\\'));
          if (slashIdx !== -1) {
            candidates.add(inside.slice(slashIdx + 1));
          }
        }
      }
    }
  }

  // 2. Word/filename bounds around cursor
  let start = charPos;
  while (start > 0 && /[^'"\`\s<>()\[\]{},;=]/.test(line[start - 1] ?? '')) {
    start--;
  }
  let end = charPos;
  while (end < line.length && /[^'"\`\s<>()\[\]{},;=]/.test(line[end] ?? '')) {
    end++;
  }
  if (end > start) {
    const word = line.slice(start, end).trim();
    if (word) {
      candidates.add(word);
      const slashIdx = Math.max(word.lastIndexOf('/'), word.lastIndexOf('\\'));
      if (slashIdx !== -1) {
        candidates.add(word.slice(slashIdx + 1));
      }
    }
  }

  return Array.from(candidates);
}

export class AssetResolver {
  static resolveFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    snapshot: WorkspaceAnalysis,
  ): Asset | null {
    const line = document.lineAt(position.line).text;
    const charPos = position.character;

    // Fast-path: O(1) indexed lookup via candidate tokens around cursor
    const index = getOrBuildIndex(snapshot);
    const candidateTokens = extractTokensAtCursor(line, charPos);

    for (const token of candidateTokens) {
      const lower = token.toLowerCase();
      // Exact filename match takes precedence
      const nameMatches = index.byName.get(lower);
      if (nameMatches) {
        for (const asset of nameMatches) {
          if (findTokenRange(line, asset.name, charPos)) {
            return asset;
          }
        }
      }
      // Stem match
      const stemMatches = index.byStem.get(lower);
      if (stemMatches) {
        for (const asset of stemMatches) {
          if (findTokenRange(line, asset.stem, charPos)) {
            return asset;
          }
        }
      }
    }

    // Fallback: Comprehensive scan over snapshot if candidate token extraction did not catch exotic bounds
    for (const asset of snapshot.assets) {
      if (!asset.is_valid) continue;
      if (findTokenRange(line, asset.name, charPos)) {
        return asset;
      }
    }

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
