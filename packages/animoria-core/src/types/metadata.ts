import type { AnimatedFormat } from './asset.js';

export interface DotLottieManifestEntry {
  /** Animation ID from manifest.json */
  id: string;
  /** Display name if present */
  name?: string;
  /** Loop setting from manifest */
  loop?: boolean;
  /** Speed multiplier from manifest */
  speed?: number;
}

export interface AnimoriaMarker {
  name: string;
  /** Start frame */
  frame: number;
  /** Duration in frames */
  durationFrames: number;
}

export interface BaseMetadata {
  format: AnimatedFormat;
  width: number;
  height: number;
  durationSeconds: number;
}

export interface LottieMetadata extends BaseMetadata {
  format: 'lottie' | 'dotlottie';
  fps: number;
  /** Total frames */
  totalFrames: number;
  /** Number of top-level layers */
  layerCount: number;
  /** Named markers if present */
  markers?: AnimoriaMarker[];
  /** Populated only for dotLottie format */
  dotLottie?: {
    /** All animations contained in the archive */
    animations: DotLottieManifestEntry[];
    /** The animation used to extract metadata (first by default) */
    primaryAnimation: string;
    /** Whether the archive contains image assets */
    hasImages: boolean;
  };
}

export interface RiveMetadata extends BaseMetadata {
  format: 'rive';
  /** List of artboards inside the rive resource */
  artboards: string[];
  /** State machine names */
  stateMachines: string[];
  /** Timelines/animations list */
  animations: string[];
}

export interface RasterAnimatedMetadata extends BaseMetadata {
  format: 'gif' | 'apng';
  /** Total frames in the animated image */
  frameCount: number;
  /** Number of loop repetitions (0 represents loop forever) */
  loopCount: number;
}

export interface SvgAnimatedMetadata extends BaseMetadata {
  format: 'animated-svg';
  /** Type of animations used in the vector graphic */
  animationType: 'css' | 'smil' | 'mixed';
  /** Total tag count */
  elementCount: number;
}

// Discriminated union for AnimoriaMetadata
export type AnimoriaMetadata =
  | LottieMetadata
  | RiveMetadata
  | RasterAnimatedMetadata
  | SvgAnimatedMetadata;
