import type { Asset, AssetFormat, AssetKind } from '@animoria/contracts';

/**
 * One labelled fact, optionally with the longer form behind a tooltip.
 */
export interface AssetFact {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

/**
 * Facts under a heading.
 */
export interface AssetFactGroup {
  readonly title: string;
  readonly facts: readonly AssetFact[];
}

/** Broad families the inspector treats differently. */
export type AssetFamily = 'lottie' | 'rive' | 'raster-animated' | 'vector' | 'raster' | 'unknown';

/**
 * Maps format to family for player and inspector controls.
 */
export function familyOf(asset: { format?: string; path: string; kind?: AssetKind }): AssetFamily {
  switch (asset.format) {
    case 'lottie':
    case 'dot-lottie':
      return 'lottie';
    case 'rive':
      return 'rive';
    case 'gif':
    case 'apng':
      return 'raster-animated';
    case 'animated-svg':
    case 'svg':
      return 'vector';
    case 'png':
    case 'jpeg':
    case 'webp':
    case 'avif':
      return 'raster';
    default:
      break;
  }

  const extension = asset.path.slice(asset.path.lastIndexOf('.') + 1).toLowerCase();
  if (extension === 'svg') return 'vector';
  if (['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(extension)) return 'raster';
  return 'unknown';
}

/** Whether this family can be played, and therefore whether transport controls belong. */
export function isPlayable(family: AssetFamily): boolean {
  return family === 'lottie' || family === 'raster-animated';
}

/**
 * The facts for one asset, supporting all 11 motion and static formats.
 */
export function factGroupsFor(asset: Asset): readonly AssetFactGroup[] {
  const identity: AssetFact[] = [{ label: 'Format', value: describeFormat(asset.format) }];

  if (asset.dimensions) {
    identity.push({
      label: 'Dimensions',
      value: `${asset.dimensions.width} × ${asset.dimensions.height}`,
    });
  }
  identity.push({ label: 'Size', value: formatBytes(asset.size_bytes) });
  identity.push({
    label: 'Kind',
    value: asset.kind === 'motion' ? 'Motion Asset' : 'Static Asset',
  });

  if (!asset.is_valid) {
    return [
      { title: 'Asset', facts: identity },
      {
        title: 'Problem',
        facts: [
          {
            label: 'Could not be parsed',
            value: asset.error ?? 'Animoria could not read this file.',
          },
        ],
      },
    ];
  }

  const groups: AssetFactGroup[] = [{ title: 'Asset', facts: identity }];

  if (asset.motion) {
    const timing: AssetFact[] = [];
    if (asset.motion.duration_secs && asset.motion.duration_secs > 0) {
      timing.push({ label: 'Duration', value: `${asset.motion.duration_secs.toFixed(2)}s` });
    }
    if (asset.motion.fps && asset.motion.fps > 0) {
      timing.push({ label: 'Frame rate', value: `${Math.round(asset.motion.fps)} fps` });
    }
    if (timing.length > 0) {
      groups.push({ title: 'Motion', facts: timing });
    }

    const structure: AssetFact[] = [];
    if (asset.motion.total_frames) {
      structure.push({ label: 'Frames', value: String(asset.motion.total_frames) });
    }
    if (asset.motion.layer_count) {
      structure.push({ label: 'Layers', value: String(asset.motion.layer_count) });
    }
    if (structure.length > 0) {
      groups.push({ title: 'Structure', facts: structure });
    }
  }

  if (asset.static_meta) {
    const staticFacts: AssetFact[] = [];
    if (asset.static_meta.has_alpha !== undefined) {
      staticFacts.push({
        label: 'Alpha Channel',
        value: asset.static_meta.has_alpha ? 'Yes' : 'No',
      });
    }
    if (asset.static_meta.color_depth !== undefined) {
      staticFacts.push({ label: 'Color Depth', value: `${asset.static_meta.color_depth} bit` });
    }
    if (staticFacts.length > 0) {
      groups.push({ title: 'Raster Details', facts: staticFacts });
    }
  }

  return groups;
}

/** The flat list, for surfaces with no room for headings. */
export function factsFor(asset: Asset): readonly AssetFact[] {
  const identity: AssetFact[] = [{ label: 'Format', value: describeFormat(asset.format) }];

  if (asset.dimensions) {
    identity.push({
      label: 'Dimensions',
      value: `${asset.dimensions.width} × ${asset.dimensions.height}`,
    });
  }
  identity.push({ label: 'Size', value: formatBytes(asset.size_bytes) });

  if (!asset.is_valid) {
    identity.push({
      label: 'Could not be parsed',
      value: asset.error ?? 'Animoria could not read this file.',
    });
    return identity;
  }

  if (asset.motion?.duration_secs) {
    identity.push({ label: 'Duration', value: `${asset.motion.duration_secs.toFixed(2)}s` });
  }
  if (asset.motion?.fps) {
    identity.push({ label: 'Frame rate', value: `${Math.round(asset.motion.fps)} fps` });
  }
  if (asset.motion?.layer_count) {
    identity.push({ label: 'Layers', value: String(asset.motion.layer_count) });
  }

  return identity;
}

export function describeFormat(format: AssetFormat | string): string {
  switch (format) {
    case 'lottie':
      return 'Lottie JSON';
    case 'dot-lottie':
      return 'dotLottie';
    case 'rive':
      return 'Rive';
    case 'gif':
      return 'GIF';
    case 'apng':
      return 'APNG';
    case 'animated-svg':
      return 'Animated SVG';
    case 'svg':
      return 'SVG';
    case 'png':
      return 'PNG';
    case 'jpeg':
      return 'JPEG';
    case 'webp':
      return 'WebP';
    case 'avif':
      return 'AVIF';
    default:
      return String(format).toUpperCase();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
