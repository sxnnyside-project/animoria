import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';
import { LottieParser } from './lottie-parser.js';

/**
 * Adaptador para el parser Lottie por defecto para integrarlo en
 * el nuevo pipeline modular de parsers.
 */
export class LottieParserAdapter implements IAssetParser {
  private _parser = new LottieParser();

  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.json') return false;
    try {
      const chunkStr = bufferChunk.toString('utf8').trim();
      if (!chunkStr.startsWith('{')) return false;

      // Estructura mínima Lottie
      const hasVersion = chunkStr.includes('"v"') || chunkStr.includes("'v'");
      const hasLayers = chunkStr.includes('"layers"') || chunkStr.includes("'layers'");

      return hasVersion && hasLayers;
    } catch {
      return false;
    }
  }

  async parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
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
