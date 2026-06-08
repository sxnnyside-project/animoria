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

export interface AnimoriaMetadata {
  format: AnimatedFormat;
  fps: number;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Total frames */
  totalFrames: number;
  width: number;
  height: number;
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

export interface AnimoriaMarker {
  name: string;
  /** Start frame */
  frame: number;
  /** Duration in frames */
  durationFrames: number;
}
