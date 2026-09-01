import { readFileSync } from 'node:fs';
import * as vscode from 'vscode';
import type { AssetCardModel } from './asset-card-model.js';
import { formatDuration } from './asset-card-model.js';

export interface StaticAssetHoverInfo {
  readonly name: string;
  readonly stem: string;
  readonly path: string;
  readonly format: 'svg' | 'png' | 'jpeg' | 'webp' | 'avif';
  readonly sizeBytes: number;
  readonly width?: number;
  readonly height?: number;
}

const STATIC_MIME_BY_FORMAT: Record<string, string> = {
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

/** Renders an {@link AssetCardModel} into a `vscode.MarkdownString` for hover cards and tooltips. */
export class AssetCardRenderer {
  // isTrusted defaults false so no command: URIs execute without the caller opting in.
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

  // Static assets carry no AssetCardModel (no duration/fps/layer to normalize); embeds the file itself as the preview.
  static renderStaticAssetHoverCard(asset: StaticAssetHoverInfo): vscode.MarkdownString {
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

  private static _tryEmbedImage(path: string, format: string): string | null {
    try {
      const buf = readFileSync(path);
      const mime = STATIC_MIME_BY_FORMAT[format] || 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
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

  private static _tryEmbedThumbnail(thumbnailPath: string): string | null {
    try {
      const buf = readFileSync(thumbnailPath);
      const ext = thumbnailPath.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = MIME_BY_EXTENSION[ext] ?? 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }
}

// ─── Markdown escape helper ───────────────────────────────────────────────────

/** Escapes characters that have special meaning inside VS Code hover Markdown. */
function escMd(s: string): string {
  return s.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
}
