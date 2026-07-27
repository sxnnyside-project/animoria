import type { AnimatedFormat, AnimoriaAsset, AnimoriaMetadata } from '@animoria/core';

// ─── AssetCardModel ───────────────────────────────────────────────────────────

/**
 * A format-agnostic, surface-agnostic snapshot of the information Animoria
 * considers worth displaying about a single animated asset.
 *
 * ## Why this exists
 *
 * Three distinct surfaces — Hover Preview, Duplicate Resolution, Cleanup
 * Review — need to display the same core facts about an asset. Without a
 * shared model, each surface either reinvents its own field extraction from
 * `AnimoriaAsset`, or worse, starts diverging on which fields to show and
 * how to label them. That divergence makes the product feel inconsistent
 * even when users cannot articulate why.
 *
 * `AssetCardModel` is that shared vocabulary. Each surface decides **how
 * much** of the card to show and **how** to render it; the model decides
 * **what** is available to show. Adding a new field (e.g. "owner team",
 * "last used", "accessibility label") happens once here, and every surface
 * inherits it without modification.
 *
 * ## What this is not
 *
 * - This is not a view. It contains no rendering logic.
 * - This is not a domain entity. It does not compute governance state.
 * - This is not a cache. It represents the model at a point in time; callers
 *   are responsible for re-building it when the underlying asset changes.
 *
 * ## Construction
 *
 * Use {@link AssetCardModel.from} rather than constructing directly. The
 * factory normalizes format-specific metadata into the surface-level fields
 * that every surface cares about, insulating callers from the discriminated
 * union of {@link AnimoriaMetadata}.
 */
export interface AssetCardModel {
  // ── Identity ───────────────────────────────────────────────────────────────

  /** Bare file name including extension, e.g. `"success.lottie"`. */
  readonly name: string;

  /** Bare file name without extension, e.g. `"success"`. */
  readonly stem: string;

  /** Absolute path on disk. */
  readonly path: string;

  /** Human-readable format label, e.g. `"Lottie"`, `"Rive"`, `"GIF"`. */
  readonly formatLabel: string;

  /** Raw format identifier from the core domain. */
  readonly format: AnimatedFormat;

  // ── Dimensions & playback ──────────────────────────────────────────────────

  /** Canvas width in pixels, or `null` if not yet parsed. */
  readonly width: number | null;

  /** Canvas height in pixels, or `null` if not yet parsed. */
  readonly height: number | null;

  /**
   * Total playback duration in seconds, or `null` if not yet parsed.
   * Formatted for display via {@link AssetCardModel.formatDuration}.
   */
  readonly durationSeconds: number | null;

  /**
   * Frames per second, or `null` for formats without a fixed frame rate
   * (e.g. Rive, animated SVG with CSS transitions).
   */
  readonly fps: number | null;

  // ── File ──────────────────────────────────────────────────────────────────

  /** File size in bytes. */
  readonly sizeBytes: number;

  /** Human-readable file size, e.g. `"42.3 KB"`. */
  readonly sizeFormatted: string;

  // ── Governance & usage ────────────────────────────────────────────────────

  /**
   * Number of high-confidence source-code references from the reactive index.
   * `null` when the index has not been consulted (e.g. the model was built
   * before the indexer ran its first usage scan).
   */
  readonly referenceCount: number | null;

  /**
   * Whether any governance rule has flagged this asset in the current index
   * snapshot. `null` if no governance rules are active or the index has not
   * yet computed a rule report.
   */
  readonly hasGovernanceIssue: boolean | null;

  // ── Thumbnail ─────────────────────────────────────────────────────────────

  /**
   * Absolute path to the cached thumbnail on disk, or `null` if the
   * thumbnail has not been generated yet.
   *
   * Consumers should treat a `null` here as "not yet available" rather than
   * "unavailable forever": the background thumbnail engine may generate it
   * shortly after the card model is built.
   */
  readonly thumbnailPath: string | null;

  // ── Format-specific extras ────────────────────────────────────────────────

  /**
   * A short, format-specific detail line for secondary display, e.g.
   * `"12 layers"` for Lottie, `"3 artboards"` for Rive, `"css animation"` for SVG.
   * `null` when not applicable or not yet parsed.
   */
  readonly formatDetail: string | null;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Constructs an {@link AssetCardModel} from the raw domain types provided
 * by the reactive index.
 *
 * @param asset The asset descriptor from the index snapshot.
 * @param opts  Optional supplementary data the index holds separately.
 */
export function buildAssetCardModel(
  asset: AnimoriaAsset,
  opts: {
    referenceCount?: number;
    hasGovernanceIssue?: boolean;
    thumbnailPath?: string;
  } = {}
): AssetCardModel {
  const meta = asset.metadata;

  return {
    name: asset.name,
    stem: asset.stem,
    path: asset.path,
    format: asset.format,
    formatLabel: FORMAT_LABELS[asset.format] ?? asset.format,
    width: meta?.width ?? null,
    height: meta?.height ?? null,
    durationSeconds: meta?.durationSeconds ?? null,
    fps: meta && 'fps' in meta ? meta.fps : null,
    sizeBytes: asset.sizeBytes,
    sizeFormatted: formatBytes(asset.sizeBytes),
    referenceCount: opts.referenceCount ?? null,
    hasGovernanceIssue: opts.hasGovernanceIssue ?? null,
    thumbnailPath: opts.thumbnailPath ?? asset.thumbnailPath ?? null,
    formatDetail: buildFormatDetail(meta ?? null),
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Formats a duration in seconds for compact, human-friendly display.
 * e.g. `0.8` → `"0.8s"`, `61.5` → `"1m 1.5s"`.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).replace(/\.0$/, '');
  return `${m}m ${s}s`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<AnimatedFormat, string> = {
  lottie: 'Lottie JSON',
  dotlottie: 'dotLottie',
  rive: 'Rive',
  gif: 'GIF',
  apng: 'APNG',
  'animated-svg': 'Animated SVG',
};

function buildFormatDetail(meta: AnimoriaMetadata | null): string | null {
  if (!meta) return null;
  switch (meta.format) {
    case 'lottie':
    case 'dotlottie':
      return `${meta.layerCount} layer${meta.layerCount !== 1 ? 's' : ''}`;
    case 'rive':
      if (meta.artboards.length > 0) {
        return `${meta.artboards.length} artboard${meta.artboards.length !== 1 ? 's' : ''}`;
      }
      return meta.stateMachines.length > 0
        ? `${meta.stateMachines.length} state machine${meta.stateMachines.length !== 1 ? 's' : ''}`
        : null;
    case 'gif':
    case 'apng':
      return `${meta.frameCount} frames`;
    case 'animated-svg':
      return meta.animationType === 'mixed'
        ? 'CSS + SMIL animation'
        : `${meta.animationType.toUpperCase()} animation`;
    default:
      return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
