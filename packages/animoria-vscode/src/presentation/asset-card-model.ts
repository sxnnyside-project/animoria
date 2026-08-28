import type { Asset, AssetFormat } from '@animoria/contracts';

export interface AssetCardModel {
  readonly name: string;
  readonly stem: string;
  readonly path: string;
  readonly formatLabel: string;
  readonly format: AssetFormat;
  readonly width: number | null;
  readonly height: number | null;
  readonly durationSeconds: number | null;
  readonly fps: number | null;
  readonly sizeBytes: number;
  readonly sizeFormatted: string;
  readonly referenceCount: number | null;
  readonly hasGovernanceIssue: boolean | null;
  readonly thumbnailPath: string | null;
  readonly formatDetail: string | null;
}

export function buildAssetCardModel(
  asset: Asset,
  opts: {
    referenceCount?: number;
    hasGovernanceIssue?: boolean;
    thumbnailPath?: string;
  } = {}
): AssetCardModel {
  return {
    name: asset.name,
    stem: asset.stem,
    path: asset.path,
    format: asset.format,
    formatLabel: FORMAT_LABELS[asset.format] ?? asset.format,
    width: asset.dimensions?.width ?? null,
    height: asset.dimensions?.height ?? null,
    durationSeconds: asset.motion?.duration_secs ?? null,
    fps: asset.motion?.fps ?? null,
    sizeBytes: asset.size_bytes,
    sizeFormatted: formatBytes(asset.size_bytes),
    referenceCount: opts.referenceCount ?? null,
    hasGovernanceIssue: opts.hasGovernanceIssue ?? null,
    thumbnailPath: opts.thumbnailPath ?? null,
    formatDetail: buildFormatDetail(asset),
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).replace(/\.0$/, '');
  return `${m}m ${s}s`;
}

const FORMAT_LABELS: Record<AssetFormat, string> = {
  lottie: 'Lottie JSON',
  'dot-lottie': 'dotLottie',
  rive: 'Rive',
  gif: 'GIF',
  apng: 'APNG',
  'animated-svg': 'Animated SVG',
  svg: 'SVG',
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
  avif: 'AVIF',
};

function buildFormatDetail(asset: Asset): string | null {
  if (asset.motion?.layer_count) {
    return `${asset.motion.layer_count} layers`;
  }
  if (asset.motion?.total_frames) {
    return `${asset.motion.total_frames} frames`;
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
