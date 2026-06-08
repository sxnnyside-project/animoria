import { performance } from 'perf_hooks';
import { readFile } from 'fs/promises';
import { FileScanner } from './scanner/file-scanner.js';
import { AssetParser } from './parser/asset-parser.js';
import { DotLottieParser } from './parsers/dotlottie-parser.js';
import type { AnimoriaAsset } from './types/index.js';

export interface AnimoriaConfig {
  workspacePath: string;
  exclude?: string[];
  maxFileSizeBytes?: number;
  concurrency?: number;
  /** Called after scanning completes, before parsing begins */
  onScanComplete?: (assetCount: number) => void;
  /** Called each time a single asset finishes parsing (success or error) */
  onAssetParsed?: (asset: AnimoriaAsset, index: number, total: number) => void;
}

export interface AnimoriaResult {
  assets: AnimoriaAsset[];
  parsed: number;
  failed: number;
  scannedFiles: number;
  durationMs: number;
}

export class Animoria {
  private _assets: AnimoriaAsset[] = [];

  constructor(private config: AnimoriaConfig) {}

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

  getAssets(): AnimoriaAsset[] {
    return this._assets;
  }

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
