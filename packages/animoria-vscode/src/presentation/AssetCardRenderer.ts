import { readFileSync } from 'node:fs';
import type { AnimoriaStaticAsset } from '@animoria/core';
import { logDebug } from '@animoria/core';
import * as vscode from 'vscode';
import type { AssetCardModel } from './AssetCardModel.js';
import { formatDuration } from './AssetCardModel.js';

const STATIC_MIME_BY_FORMAT: Record<AnimoriaStaticAsset['format'], string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

/** Max width (px) for a hover-card thumbnail — VS Code's markdown image-size syntax (`|width=`) caps it without upscaling smaller thumbnails. */
const HOVER_THUMBNAIL_MAX_WIDTH = 160;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── AssetCardRenderer ────────────────────────────────────────────────────────

/**
 * Renders an {@link AssetCardModel} into a `vscode.MarkdownString` for use
 * in hover cards, sidebar tooltips, and any other VS Code surface that
 * accepts structured Markdown.
 *
 * ## Why this is separate from `AssetCardModel`
 *
 * The model defines *what* is known. The renderer decides *how* it is
 * presented for a specific surface. A future renderer for a different
 * surface (e.g. a Quick Pick detail line, or a plain-text CLI output)
 * would accept the same model and produce a different output format —
 * without any changes to the model itself.
 *
 * ## Hover rendering contract
 *
 * The renderer follows a fixed information hierarchy:
 *
 * **Primary** — thumbnail · name · format · dimensions · duration · size
 * **Secondary** — reference count · governance flag
 * **Technical** — asset path (collapsed/muted)
 *
 * The thumbnail is embedded inline when `card.thumbnailPath` is non-null.
 * When it is null, the renderer emits a compact metadata-only card so the
 * hover is never visually empty or blocked.
 *
 * ## VS Code Markdown constraints
 *
 * Hover Markdown strings have a narrower feature set than standard GitHub
 * Markdown. Specifically: no custom CSS, no `<style>` tags, limited HTML.
 * The renderer uses only the subset VS Code actually renders:
 * - `![alt](uri)` for thumbnail (must be a `vscode-resource:` or `https:` URI)
 * - Fenced code blocks for the technical path
 * - `**bold**` and `_italic_` for hierarchy
 * - Horizontal rules for section separation
 * - Escaped pipe characters inside tables
 */
export class AssetCardRenderer {
  /**
   * Renders a hover card from an {@link AssetCardModel}.
   *
   * The returned `MarkdownString` has `isTrusted` set to `false` (safe
   * default: no command links executed without opt-in from the caller).
   * Set `isTrusted = true` on the result if the caller wants to add
   * `command:` URIs.
   *
   * @param card    The model to render.
   * @param compact When `true`, omits the thumbnail and emits a single-line
   *   summary suitable for inline description tooltips (e.g. tree items).
   *   When `false` (default), renders the full hierarchical card.
   */
  static renderHoverCard(card: AssetCardModel, compact = false): vscode.MarkdownString {
    const md = new vscode.MarkdownString('', true);
    md.supportHtml = false; // Keep output predictable across all VS Code themes
    md.supportThemeIcons = true; // Renders $(icon) codicon syntax instead of emoji

    if (compact) {
      return AssetCardRenderer._renderCompact(md, card);
    }
    return AssetCardRenderer._renderFull(md, card);
  }

  // ── Full card (hover) ──────────────────────────────────────────────────────

  private static _renderFull(
    md: vscode.MarkdownString,
    card: AssetCardModel
  ): vscode.MarkdownString {
    // ── Thumbnail ────────────────────────────────────────────────────────────
    if (card.thumbnailPath) {
      const thumbData = AssetCardRenderer._tryEmbedThumbnail(card.thumbnailPath);
      if (thumbData) {
        md.appendMarkdown(`![${card.stem}](${thumbData}|width=${HOVER_THUMBNAIL_MAX_WIDTH})\n\n`);
      }
    }

    // ── Primary: name + format ───────────────────────────────────────────────
    md.appendMarkdown(`**${escMd(card.stem)}** \`${card.formatLabel}\`\n\n`);

    // ── Primary: dimensions / duration / FPS / size ──────────────────────────
    const primaryParts: string[] = [];
    if (card.width !== null && card.height !== null) {
      primaryParts.push(`${card.width}×${card.height}`);
    }
    if (card.durationSeconds !== null) {
      primaryParts.push(formatDuration(card.durationSeconds));
    }
    if (card.fps !== null) {
      primaryParts.push(`${card.fps} fps`);
    }
    primaryParts.push(card.sizeFormatted);

    if (primaryParts.length > 0) {
      md.appendMarkdown(`${primaryParts.join(' · ')}\n\n`);
    }

    // ── Format-specific detail ────────────────────────────────────────────────
    if (card.formatDetail) {
      md.appendMarkdown(`_${escMd(card.formatDetail)}_\n\n`);
    }

    // ── Secondary: usage + governance ────────────────────────────────────────
    const secondaryParts: string[] = [];
    if (card.referenceCount !== null) {
      const label = card.referenceCount === 1 ? 'reference' : 'references';
      secondaryParts.push(`${card.referenceCount} ${label}`);
    }
    if (card.hasGovernanceIssue === true) {
      secondaryParts.push('$(warning) Governance finding');
    }
    if (card.hasGovernanceIssue === false && card.referenceCount !== null) {
      secondaryParts.push('$(check) Governance OK');
    }

    if (secondaryParts.length > 0) {
      md.appendMarkdown(`---\n\n${secondaryParts.join(' · ')}\n\n`);
    }

    // ── Technical: path (muted, non-interruptive) ─────────────────────────────
    md.appendMarkdown('---\n\n');
    md.appendCodeblock(card.path, '');

    return md;
  }

  // ── Static asset card (hover) ───────────────────────────────────────────────

  /**
   * Renders a hover card for a static asset (SVG without animation, PNG,
   * JPEG, WebP, AVIF). Static assets carry no `AssetCardModel` — they have
   * no duration/fps/layer metadata to normalize — so this renders directly
   * from `AnimoriaStaticAsset`, embedding the file itself as the preview
   * image rather than a separately-generated thumbnail.
   */
  static renderStaticAssetHoverCard(asset: AnimoriaStaticAsset): vscode.MarkdownString {
    const md = new vscode.MarkdownString('', true);
    md.supportHtml = false;
    md.supportThemeIcons = true;

    const embedded = AssetCardRenderer._tryEmbedImage(asset.path, asset.format);
    if (embedded) {
      md.appendMarkdown(`![${asset.stem}](${embedded}|width=${HOVER_THUMBNAIL_MAX_WIDTH})\n\n`);
    }

    md.appendMarkdown(`**${escMd(asset.stem)}** \`${asset.format.toUpperCase()}\`\n\n`);
    md.appendMarkdown(`${formatBytes(asset.sizeBytes)}\n\n`);
    md.appendMarkdown('---\n\n');
    md.appendCodeblock(asset.path, '');

    return md;
  }

  private static _tryEmbedImage(
    path: string,
    format: AnimoriaStaticAsset['format']
  ): string | null {
    try {
      const buf = readFileSync(path);
      const mime = STATIC_MIME_BY_FORMAT[format];
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (err) {
      logDebug(
        'asset-card-render',
        'AssetCardRenderer',
        'Could not embed static asset image in hover card',
        {
          assetPath: path,
          reason: 'file unreadable',
          error: err,
          recovery: 'thumbnail omitted from hover card',
        }
      );
      return null;
    }
  }

  // ── Compact card (sidebar tooltip, inline) ─────────────────────────────────

  private static _renderCompact(
    md: vscode.MarkdownString,
    card: AssetCardModel
  ): vscode.MarkdownString {
    const parts: string[] = [card.formatLabel];
    if (card.width !== null && card.height !== null) parts.push(`${card.width}×${card.height}`);
    if (card.durationSeconds !== null) parts.push(formatDuration(card.durationSeconds));
    if (card.sizeFormatted) parts.push(card.sizeFormatted);
    md.appendMarkdown(parts.join(' · '));
    return md;
  }

  // ── Thumbnail embedding ────────────────────────────────────────────────────

  /**
   * Attempts to embed a thumbnail as a `data:` URI for inline display in the
   * hover card.
   *
   * VS Code hover Markdown supports `data:image/...;base64,...` URIs directly
   * — this avoids VS Code's resource access restrictions on local file URIs
   * inside hover strings, which vary by host platform and security setting.
   *
   * Returns `null` if the file cannot be read (thumbnail deleted between
   * generation and hover trigger, permission issue, etc). The caller should
   * silently omit the thumbnail in that case — it is never load-bearing for
   * correctness.
   */
  private static _tryEmbedThumbnail(thumbnailPath: string): string | null {
    try {
      const buf = readFileSync(thumbnailPath);
      const ext = thumbnailPath.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = MIME_BY_EXTENSION[ext] ?? 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (err) {
      logDebug(
        'asset-card-render',
        'AssetCardRenderer',
        'Could not embed thumbnail in hover card',
        {
          assetPath: thumbnailPath,
          reason: 'thumbnail deleted between generation and hover, or unreadable',
          error: err,
          recovery: 'thumbnail omitted from hover card',
        }
      );
      return null;
    }
  }
}

// ─── Markdown escape helper ───────────────────────────────────────────────────

/** Escapes characters that have special meaning inside VS Code hover Markdown. */
function escMd(s: string): string {
  return s.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
}
