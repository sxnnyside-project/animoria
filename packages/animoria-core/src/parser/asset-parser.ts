import { promises as fs } from 'fs';
import { extname } from 'path';
import { performance } from 'perf_hooks';
import { ParserRegistry } from '../parsers/parser-registry.js';
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

export class AssetParser {
  constructor(private config: AssetParserConfig = {}) {}

  async parse(assets: AnimoriaAsset[]): Promise<AssetParserResult> {
    const start = performance.now();
    const concurrency = this.config.concurrency ?? DEFAULT_CONCURRENCY;
    const registry = ParserRegistry.getInstance();

    const parseAsset = async (asset: AnimoriaAsset): Promise<void> => {
      try {
        const buffer = await fs.readFile(asset.path);
        const ext = extname(asset.name).toLowerCase();

        const parser = registry.getParserFor(ext, buffer);
        if (!parser) {
          asset.status = 'error';
          asset.error = `Unsupported format or signature: ${asset.format}`;
          return;
        }

        const metadata = await parser.parse(asset.path, buffer);
        asset.status = 'parsed';
        asset.metadata = metadata;
      } catch (err) {
        asset.status = 'error';
        asset.error = err instanceof Error ? err.message : String(err);
      }
    };

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
