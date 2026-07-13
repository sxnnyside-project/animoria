import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';

/**
 * Parser para el formato de imagen animada GIF (.gif).
 */
export class GifParser implements IAssetParser {
  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.gif') return false;
    if (bufferChunk.length < 6) return false;
    // Magic bytes de cabecera GIF
    const sig = bufferChunk.toString('ascii', 0, 6);
    return sig === 'GIF89a' || sig === 'GIF87a';
  }

  async parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);

      let frameCount = 0;
      let loopCount = 0; // 0 = loop infinito por defecto
      let pos = 10;

      const hasGCT = (buffer[10]! & 0x80) !== 0;
      const gctSize = 3 * 2 ** ((buffer[10]! & 0x07) + 1);
      pos = 13 + (hasGCT ? gctSize : 0);

      while (pos < buffer.length) {
        const blockType = buffer[pos];

        if (blockType === 0x21) {
          // Extension
          const extType = buffer[pos + 1];
          if (extType === 0xf9) {
            frameCount++;
          }
          pos += 2;
          while (pos < buffer.length) {
            const blockSize = buffer[pos]!;
            if (blockSize === 0) {
              pos++;
              break;
            }
            pos += blockSize + 1;
          }
        } else if (blockType === 0x2c) {
          // Image Descriptor
          const hasLCT = (buffer[pos + 9]! & 0x80) !== 0;
          const lctSize = 3 * 2 ** ((buffer[pos + 9]! & 0x07) + 1);
          pos += 10 + (hasLCT ? lctSize : 0);

          pos++; // LZW minimum code size
          while (pos < buffer.length) {
            const blockSize = buffer[pos]!;
            if (blockSize === 0) {
              pos++;
              break;
            }
            pos += blockSize + 1;
          }
        } else if (blockType === 0x3b) {
          // Trailer
          break;
        } else {
          pos++;
        }
      }

      if (frameCount === 0) frameCount = 1;
      const durationSeconds = parseFloat((frameCount * 0.1).toFixed(4));

      return {
        format: 'gif',
        width,
        height,
        durationSeconds,
        sizeBytes: buffer.length,
        frameCount,
        loopCount,
      } as AnimoriaMetadata;
    } catch (err) {
      throw new Error(`GIF parsing failed: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }
  }

  getFormat(): AnimatedFormat {
    return 'gif';
  }
}

/**
 * Parser para el formato de imagen animada APNG (.apng / .png).
 */
export class ApngParser implements IAssetParser {
  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.png' && ext !== '.apng') return false;
    if (bufferChunk.length < 8) return false;

    // Firma PNG estándar
    const isPng =
      bufferChunk[0] === 0x89 &&
      bufferChunk[1] === 0x50 &&
      bufferChunk[2] === 0x4e &&
      bufferChunk[3] === 0x47 &&
      bufferChunk[4] === 0x0d &&
      bufferChunk[5] === 0x0a &&
      bufferChunk[6] === 0x1a &&
      bufferChunk[7] === 0x0a;

    if (!isPng) return false;

    // Buscar el chunk "acTL" (Animation Control Chunk) en el fragmento inicial
    return bufferChunk.indexOf('acTL') !== -1;
  }

  async parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      const acTlPos = buffer.indexOf('acTL');
      if (acTlPos === -1) {
        throw new Error('acTL chunk not found. This is a static PNG, not an animated APNG.');
      }

      const frameCount = buffer.readUInt32BE(acTlPos + 4);
      const loopCount = buffer.readUInt32BE(acTlPos + 8);
      const durationSeconds = parseFloat((frameCount * 0.1).toFixed(4));

      return {
        format: 'apng',
        width,
        height,
        durationSeconds,
        sizeBytes: buffer.length,
        frameCount,
        loopCount,
      } as AnimoriaMetadata;
    } catch (err) {
      throw new Error(`APNG parsing failed: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }
  }

  getFormat(): AnimatedFormat {
    return 'apng';
  }
}
