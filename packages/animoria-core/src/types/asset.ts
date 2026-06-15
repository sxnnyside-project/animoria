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
  metadata?: AnimoriaMetadata;
  /** Error message if status is 'error' */
  error?: string;
  /** Absolute path to the generated thumbnail on disk */
  thumbnailPath?: string;
}

export interface UsageReference {
  /** Absolute path to the file containing the reference */
  file: string;
  /** 1-based line number */
  line: number;
  /** Trimmed content of the matching line */
  content: string;
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

export interface ThumbnailConfig {
  /** Absolute path to workspace root — thumbnails go in {workspacePath}/.animoria/thumbnails/ */
  workspacePath: string;
  /** Absolute path to Chromium/Chrome executable */
  chromiumPath: string;
  /** Thumbnail width in pixels (default: 256) */
  width?: number;
  /** Thumbnail height in pixels (default: 256) */
  height?: number;
  /**
   * Which frame to capture:
   * 'first'  — frame 0 (default)
   * 'middle' — middle frame (totalFrames / 2)
   */
  frame?: 'first' | 'middle';
  /** Max concurrent pages in the headless browser (default: 4) */
  concurrency?: number;
}

export interface ThumbnailResult {
  asset: AnimoriaAsset;
  /** Absolute path to generated .png file, or null if generation failed */
  thumbnailPath: string | null;
  /** Whether this thumbnail was loaded from cache (true) or generated fresh (false) */
  fromCache: boolean;
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

export type GovernanceCategory = 'unused' | 'duplicate' | 'overused';

export interface GovernanceIssue {
  category: GovernanceCategory;
  asset: AnimoriaAsset;
  /** Other assets with identical content (duplicates only) */
  duplicateOf?: AnimoriaAsset[];
  /** Number of references found in source files */
  referenceCount: number;
}

export interface GovernanceConfig {
  workspacePath: string;
  assets: AnimoriaAsset[];
  /** Minimum references to flag as overused (default: 10) */
  overusedThreshold?: number;
  /** Scope path for usage search per asset */
  scopeResolver?: (asset: AnimoriaAsset) => string;
}

export interface GovernanceReport {
  unused: GovernanceIssue[];
  duplicates: GovernanceIssue[];
  overused: GovernanceIssue[];
  /** Total assets analyzed */
  totalAssets: number;
  /** Duration in ms */
  durationMs: number;
  /** ISO timestamp of when the report was generated */
  generatedAt: string;
}
