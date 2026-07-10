import { performance } from 'perf_hooks';
import { readFile } from 'fs/promises';
import { FileScanner } from './scanner/file-scanner.js';
import { AssetParser } from './parser/asset-parser.js';
import { DotLottieParser } from './parsers/dotlottie-parser.js';
import type { AnimoriaAsset } from './types/index.js';

/**
 * Configuration options for the Animoria scanner and parser orchestrator.
 */
export interface AnimoriaConfig {
  /** Absolute path to the workspace root directory to scan */
  workspacePath: string;
  /** Optional array of glob patterns to exclude from scanning */
  exclude?: string[];
  /** Maximum file size in bytes allowed for parsing (default: 10MB) */
  maxFileSizeBytes?: number;
  /** Concurrency limit for parsing operations (default: 4) */
  concurrency?: number;
  /** Callback invoked after workspace scanning completes, reporting the count of discovered candidate files */
  onScanComplete?: (assetCount: number) => void;
  /** Callback invoked after each individual asset finishes parsing, reporting the asset, its index, and total count */
  onAssetParsed?: (asset: AnimoriaAsset, index: number, total: number) => void;
}

/**
 * The consolidated result output of an Animoria orchestration run.
 */
export interface AnimoriaResult {
  /** Array of successfully parsed and failed assets */
  assets: AnimoriaAsset[];
  /** Count of assets successfully parsed */
  parsed: number;
  /** Count of assets that encountered parsing errors */
  failed: number;
  /** Total number of files scanned in the workspace */
  scannedFiles: number;
  /** Time taken to complete the run in milliseconds */
  durationMs: number;
}

/**
 * The main orchestrator class of the Animoria engine.
 * Spawns the FileScanner to traverse directories and coordinates
 * parsing operations via the AssetParser.
 */
export class Animoria {
  private _assets: AnimoriaAsset[] = [];

  constructor(private config: AnimoriaConfig) {}

  /**
   * Executes the full workspace scanning and asset parsing flow.
   * Walks directories, filters files by configuration, resolves appropriate parsers,
   * extracts metadata, and compiles results.
   * 
   * @returns A promise resolving to the final consolidated run result.
   */
  async run(): Promise<AnimoriaResult> {
    const start = performance.now();

    const scanner = new FileScanner({
      workspacePath: this.config.workspacePath,
      exclude: this.config.exclude,
      maxFileSizeBytes: this.config.maxFileSizeBytes,
    });

    const scanResult = await scanner.scan();
    this.config.onScanComplete?.(scanResult.assets.length);

    const parser = new AssetParser({ concurrency: this.config.concurrency });
    const parserResult = await parser.parse(scanResult.assets);

    if (this.config.onAssetParsed) {
      const total = parserResult.assets.length;
      parserResult.assets.forEach((asset, index) => {
        this.config.onAssetParsed!(asset, index, total);
      });
    }

    this._assets = parserResult.assets;

    return {
      assets: this._assets,
      parsed: parserResult.parsed,
      failed: parserResult.failed,
      scannedFiles: scanResult.scannedFiles,
      durationMs: performance.now() - start,
    };
  }

  /**
   * Returns the list of parsed assets from the last run execution.
   */
  getAssets(): AnimoriaAsset[] {
    return this._assets;
  }

  /**
   * Reads and extracts the raw JSON animation payload for Lottie/dotLottie assets.
   * Useful for web player rendering and preview injection.
   * 
   * @param asset The AnimoriaAsset to parse.
   * @returns A promise resolving to the JSON data object, or null if loading/parsing fails.
   */
  async getAnimationData(asset: AnimoriaAsset): Promise<unknown | null> {
    if (asset.format === 'lottie') {
      try {
        const raw = await readFile(asset.path, 'utf-8');
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (asset.format === 'dotlottie') {
      const parser = new DotLottieParser();
      return parser.extractAnimationData(asset.path);
    }
    return null;
  }
}
