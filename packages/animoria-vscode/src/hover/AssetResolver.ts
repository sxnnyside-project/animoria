import { lineMatchesAsset } from '@animoria/core';
import type { AnimoriaAsset, AnimoriaStaticAsset } from '@animoria/core';
import type { WorkspaceIndexSnapshot } from '@animoria/core';
import * as vscode from 'vscode';

// ─── AssetResolver ────────────────────────────────────────────────────────────

/**
 * Resolves a cursor position in a source file to a known {@link AnimoriaAsset}
 * (or, via {@link resolveStaticFromPosition}, a static asset) from the
 * current index.
 *
 * Zero I/O — reads only the in-memory snapshot, so hover stays synchronous.
 * Matching is done via {@link lineMatchesAsset}, shared with the usage
 * engine, using the `'both'` strategy (filename substring or word-boundary
 * stem) rather than `'pattern'`: hover is opt-in and informational, not a
 * governance/reference-count decision, so it doesn't need the stricter
 * false-positive avoidance `UsageScanner` needs. Matching is line-grained,
 * not token-grained — the cursor's column only affects where
 * {@link resolveHoverRange} draws the underline, not which asset resolves.
 */
export class AssetResolver {
  /**
   * Attempts to resolve a `(document, position)` pair to a known asset.
   *
   * @param document The document the hover occurred in.
   * @param position The cursor position.
   * @param snapshot The current workspace index snapshot.
   * @returns The resolved asset, or `null` if no asset matches.
   */
  static resolveFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    snapshot: WorkspaceIndexSnapshot
  ): AnimoriaAsset | null {
    const line = document.lineAt(position.line).text;

    for (const asset of snapshot.assets) {
      if (asset.status !== 'parsed') continue;
      if (lineMatchesAsset(line, asset.name, asset.stem, 'both')) {
        return asset;
      }
    }

    return null;
  }

  /** Same resolution as {@link resolveFromPosition}, over static assets. */
  static resolveStaticFromPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    staticAssets: readonly AnimoriaStaticAsset[]
  ): AnimoriaStaticAsset | null {
    const line = document.lineAt(position.line).text;
    for (const asset of staticAssets) {
      if (lineMatchesAsset(line, asset.name, asset.stem, 'both')) {
        return asset;
      }
    }
    return null;
  }

  /**
   * Determines the hover range for a resolved asset within a document line.
   *
   * The range spans the narrowest substring of the line that contains the
   * asset's filename or stem, used to underline exactly the token the
   * developer hovered on rather than the entire line.
   *
   * Falls back to the full line range if no substring can be isolated
   * (e.g. R.raw.stemName patterns that embed the stem without delimiters).
   *
   * @param document The document the hover occurred in.
   * @param position The cursor position.
   * @param asset    The resolved asset.
   * @returns A `vscode.Range` for the hover underline.
   */
  static resolveHoverRange(
    document: vscode.TextDocument,
    position: vscode.Position,
    asset: Pick<AnimoriaAsset, 'name' | 'stem'>
  ): vscode.Range {
    const line = document.lineAt(position.line).text;

    // Try to find the asset filename or stem as a substring of the line,
    // preferring the longer (filename) match first.
    for (const token of [asset.name, asset.stem]) {
      const idx = line.toLowerCase().indexOf(token.toLowerCase());
      if (idx !== -1) {
        return new vscode.Range(
          new vscode.Position(position.line, idx),
          new vscode.Position(position.line, idx + token.length)
        );
      }
    }

    // Fallback: word range at cursor position
    return document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position);
  }
}
