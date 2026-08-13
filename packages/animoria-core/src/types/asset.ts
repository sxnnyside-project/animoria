import type { AnimoriaMetadata } from './metadata.js';

export type AnimatedFormat = 'lottie' | 'dotlottie' | 'rive' | 'gif' | 'apng' | 'animated-svg';

export type AssetStatus = 'pending' | 'parsed' | 'error';

export interface AnimoriaAsset {
  /** Absolute path to the file */
  path: string;
  /** File name with extension */
  name: string;
  /** File name without extension */
  stem: string;
  /** Detected animated format */
  format: AnimatedFormat;
  /** Size in bytes */
  sizeBytes: number;
  /** Last modified timestamp (ms) */
  mtime: number;
  /** Parse status */
  status: AssetStatus;
  /** Populated after parsing */
  metadata?: AnimoriaMetadata | undefined;
  /** Error message if status is 'error' */
  error?: string | undefined;
  /** Absolute path to the generated thumbnail on disk */
  thumbnailPath?: string | undefined;
}

/**
 * How a reference was tied to its asset — the strength of the individual match.
 *
 * - `resolved-path` — the referenced path resolved to exactly this asset's file.
 *   The strongest form: no other asset could satisfy it.
 * - `filename` — the reference names this asset's filename, but its location could
 *   not be resolved (a bundler alias, a bare specifier, a web-root-absolute URL).
 *   Real evidence, but two identically-named assets would both be credited.
 * - `code` — matched a language-specific usage pattern (an import, `R.raw.*`,
 *   `Lottie.asset(...)`) rather than a resolvable path.
 */
export type UsageReferenceKind = 'resolved-path' | 'filename' | 'code';

export interface UsageReference {
  /** Absolute path to the file containing the reference */
  file: string;
  /** 1-based line number */
  line: number;
  /** Trimmed content of the matching line */
  content: string;
  /** How this reference was established — see {@link UsageReferenceKind}. */
  kind: UsageReferenceKind;
}

export interface UsageSearchConfig {
  /** Absolute workspace path */
  workspacePath: string;
  /** The asset to search references for */
  asset: AnimoriaAsset;
  /**
   * Match strategy:
   * 'pattern'  — use semantic patterns to detect genuine asset references (default)
   * 'filename' — match full filename as substring (e.g. "success.json")
   * 'stem'     — match stem as whole word only (e.g. \bsuccess\b)
   * 'both'     — filename OR stem as whole word (legacy, not recommended)
   */
  strategy?: 'pattern' | 'filename' | 'stem' | 'both';
  /**
   * Source file extensions to search inside.
   * Default: ['.ts','.tsx','.js','.jsx','.swift','.kt','.dart','.vue','.svelte']
   */
  extensions?: string[];
  /** Folders to exclude. Default: node_modules, dist, build, .git */
  exclude?: string[];
  /**
   * When set, only references found within this directory subtree are returned.
   * Useful for monorepos to scope results to one app. If not set, all references
   * in the workspace are returned.
   */
  scopePath?: string;
}

export interface UsageSearchResult {
  asset: AnimoriaAsset;
  references: UsageReference[];
  /** Total source files searched */
  searchedFiles: number;
  /** Duration in ms */
  durationMs: number;
}

export interface ThumbnailEngineConfig {
  /** Absolute path to workspace root — thumbnails go in {workspacePath}/.animoria/thumbnails/ */
  workspacePath: string;
  /** Thumbnail width and height in pixels (square output; default: 256) */
  size?: number;
  /**
   * Which frame to approximate when a source format is keyframe-animated:
   * 'first'  — frame 0 (default)
   * 'middle' — middle frame (totalFrames / 2)
   *
   * The vector renderer approximates keyframed properties using their
   * first keyframe regardless of this setting (see
   * {@link ../thumbnails/lottie-vector-renderer.js} for why); this
   * option only affects which frame index is recorded, an input a
   * future, richer renderer can consume.
   */
  frame?: 'first' | 'middle';
}

/**
 * Identifies which rendering tier produced a given thumbnail, in order of
 * fidelity. Exposed so downstream consumers (Hover Preview, Preview Panel,
 * Health Score) can decide whether to trust the thumbnail as a true visual
 * preview or treat it as a placeholder.
 */
export type ThumbnailKind =
  /** A vector frame rendered directly from parsed asset content. */
  | 'vector'
  /** A raster image extracted from the animation's own embedded asset data (e.g. a Lottie image layer's base64 payload), used when the vector tier cannot represent the document. */
  | 'embedded-image'
  /** The original file bytes, reused as-is (e.g. GIF/APNG/static SVG). */
  | 'source-copy'
  /** A deterministic format badge — no asset content was rendered. */
  | 'badge';

export interface ThumbnailResult {
  asset: AnimoriaAsset;
  /** Absolute path to the generated thumbnail file, or null if generation failed */
  thumbnailPath: string | null;
  /** Whether this thumbnail was loaded from cache (true) or generated fresh (false) */
  fromCache: boolean;
  /** Which rendering tier produced this thumbnail; absent when generation failed */
  kind?: ThumbnailKind;
  error?: string;
}

export interface ThumbnailBatchResult {
  results: ThumbnailResult[];
  generated: number;
  fromCache: number;
  failed: number;
  durationMs: number;
}

// ── Governance ───────────────────────────────────────────────────────────────
//
// `GovernanceCategory`, `GovernanceIssue`, `GovernanceConfig` and `GovernanceReport`
// used to live here — the result shape of a second governance engine that ran its
// own usage scan and content hashing, produced `unused` / `duplicate` / `overused`
// categories, and fed nothing into the Health Score. Every concept it expressed is
// now a rule diagnostic or a duplicate group inside `WorkspaceAnalysis`, so the
// parallel vocabulary is gone rather than maintained alongside the canonical one.
