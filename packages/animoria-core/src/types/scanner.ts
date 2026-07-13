import type { AnimoriaAsset } from './asset.js';

export interface ScannerConfig {
  /** Absolute path to workspace root */
  workspacePath: string;
  /** Folders to exclude from scanning */
  exclude?: string[] | undefined;
  /** Max file size to process in bytes (default: 10MB) */
  maxFileSizeBytes?: number | undefined;
}

export interface ScannerResult {
  assets: AnimoriaAsset[];
  /** Total files inspected */
  scannedFiles: number;
  /** Duration in ms */
  durationMs: number;
}
