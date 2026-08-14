import { logDebug } from '../logging/logger.js';
import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';
import { LottieParser } from './lottie-parser.js';

/** Adapts `LottieParser` to the `IAssetParser` contract for `ParserRegistry`. */
export class LottieParserAdapter implements IAssetParser {
  private _parser = new LottieParser();

  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.json') return false;
    try {
      const chunkStr = bufferChunk.toString('utf8').trim();
      if (!chunkStr.startsWith('{')) return false;

      // Minimal structural signature of a Lottie document.
      const hasVersion = chunkStr.includes('"v"') || chunkStr.includes("'v'");
      const hasLayers = chunkStr.includes('"layers"') || chunkStr.includes("'layers'");

      return hasVersion && hasLayers;
    } catch (err) {
      logDebug(
        'asset-parse',
        'LottieParserAdapter',
        'Could not inspect candidate file chunk for Lottie signature',
        {
          reason: 'buffer decode failed',
          error: err,
          recovery: 'treated as not a Lottie file',
        }
      );
      return false;
    }
  }

  async parse(_filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const raw = JSON.parse(buffer.toString('utf8'));
      const result = this._parser.parse(raw);
      if (!result.success || !result.metadata) {
        throw new Error(result.error ?? 'Lottie parsing validation failed');
      }
      return result.metadata;
    } catch (err) {
      throw new Error(
        `Failed to parse Lottie file: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err }
      );
    }
  }

  getFormat(): AnimatedFormat {
    return 'lottie';
  }
}
