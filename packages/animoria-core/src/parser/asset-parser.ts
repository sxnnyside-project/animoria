import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';
import { LottieParser } from '../parsers/lottie-parser.js';
import { DotLottieParser } from '../parsers/dotlottie-parser.js';
import type { AnimoriaAsset } from '../types/index.js';

export interface AssetParserConfig {
  /** Max files parsed concurrently (default: 4) */
  concurrency?: number;
}

export interface AssetParserResult {
  assets: AnimoriaAsset[];
  /** Count of successfully parsed assets */
  parsed: number;
  /** Count of assets that failed parsing */
  failed: number;
  /** Duration in ms */
  durationMs: number;
}

const DEFAULT_CONCURRENCY = 4;
const lottieParser = new LottieParser();
const dotLottieParser = new DotLottieParser();

async function parseAsset(asset: AnimoriaAsset): Promise<void> {
  if (asset.format === 'dotlottie') {
    const result = await dotLottieParser.parseFile(asset.path);
    if (result.success) {
      asset.status = 'parsed';
      asset.metadata = result.metadata;
    } else {
      asset.status = 'error';
      asset.error = result.error;
    }
    return;
  }

  let raw: unknown;
  try {
    const content = await fs.readFile(asset.path, 'utf-8');
    raw = JSON.parse(content);
  } catch {
    asset.status = 'error';
    asset.error = 'Failed to read or parse file';
    return;
  }

  if (asset.format === 'lottie') {
    if (!lottieParser.validate(raw)) {
      asset.status = 'error';
      asset.error = 'Validation failed';
      return;
    }
    const result = lottieParser.parse(raw);
    if (!result.success) {
      asset.status = 'error';
      asset.error = result.error;
      return;
    }
    asset.status = 'parsed';
    asset.metadata = result.metadata;
  } else {
    asset.status = 'error';
    asset.error = `Unsupported format: ${asset.format}`;
  }
}

export class AssetParser {
  constructor(private config: AssetParserConfig = {}) {}

  async parse(assets: AnimoriaAsset[]): Promise<AssetParserResult> {
    const start = performance.now();
    const concurrency = this.config.concurrency ?? DEFAULT_CONCURRENCY;

    for (let i = 0; i < assets.length; i += concurrency) {
      const batch = assets.slice(i, i + concurrency);
      await Promise.all(batch.map(parseAsset));
    }

    let parsed = 0;
    let failed = 0;
    for (const asset of assets) {
      if (asset.status === 'parsed') parsed++;
      else if (asset.status === 'error') failed++;
    }

    return { assets, parsed, failed, durationMs: performance.now() - start };
  }
}
