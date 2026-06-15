import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';
import { DotLottieParser } from './dotlottie-parser.js';

/**
 * Adaptador para el parser dotLottie por defecto para integrarlo en
 * el nuevo pipeline modular de parsers.
 */
export class DotLottieParserAdapter implements IAssetParser {
  private _parser = new DotLottieParser();

  supports(ext: string, _bufferChunk: Buffer): boolean {
    return ext === '.lottie';
  }

  async parse(filePath: string, _buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const result = await this._parser.parseFile(filePath);
      if (!result.success || !result.metadata) {
        throw new Error(result.error ?? 'dotLottie parsing validation failed');
      }
      return result.metadata;
    } catch (err) {
      throw new Error(
        `Failed to parse dotLottie file: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err }
      );
    }
  }

  getFormat(): AnimatedFormat {
    return 'dotlottie';
  }
}
