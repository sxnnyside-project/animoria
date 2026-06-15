import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';
import { sanitizeMetadataString } from './sanitizer.js';

export class RiveParser implements IAssetParser {
  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.riv') return false;
    if (bufferChunk.length < 4) return false;
    return bufferChunk.toString('ascii', 0, 4) === 'RIVE';
  }

  async parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const rawStrings = this._extractStrings(buffer);

      const candidates = Array.from(
        new Set(
          rawStrings.filter((s) => {
            return (
              s.length >= 3 &&
              s.length < 40 &&
              /^[a-zA-Z0-9_\-\s]+$/.test(s) &&
              !['RIVE', 'rive', 'properties', 'StateMachine', 'Transition'].includes(s)
            );
          })
        )
      );

      const artboards = candidates
        .filter(
          (s) =>
            s.toLowerCase().includes('board') ||
            s.toLowerCase().includes('main') ||
            s.toLowerCase().includes('scene') ||
            ['logo', 'icon', 'button', 'hero', 'avatar'].includes(s.toLowerCase())
        )
        .map(sanitizeMetadataString);

      const stateMachines = candidates
        .filter(
          (s) =>
            s.toLowerCase().includes('state') ||
            s.toLowerCase().includes('machine') ||
            s.toLowerCase().includes('hover') ||
            s.toLowerCase().includes('click') ||
            s.toLowerCase().includes('controller')
        )
        .map(sanitizeMetadataString);

      const animations = candidates
        .filter(
          (s) =>
            !artboards.includes(s) &&
            !stateMachines.includes(s) &&
            s.length < 15 &&
            ['idle', 'play', 'show', 'hide', 'open', 'close', 'run', 'walk', 'spin', 'start'].some(
              (kw) => s.toLowerCase().includes(kw)
            )
        )
        .map(sanitizeMetadataString);

      return {
        format: 'rive',
        width: 500,
        height: 500,
        durationSeconds: 0,
        sizeBytes: buffer.length,
        artboards: artboards.length > 0 ? artboards : ['main'],
        stateMachines: stateMachines.length > 0 ? stateMachines : ['StateMachine'],
        animations: animations.length > 0 ? animations.slice(0, 6) : ['idle'],
      } as AnimoriaMetadata;
    } catch (err) {
      throw new Error(`Rive parsing failed: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }
  }

  getFormat(): AnimatedFormat {
    return 'rive';
  }

  private _extractStrings(buffer: Buffer): string[] {
    const strings: string[] = [];
    let current = '';
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      if (char >= 32 && char <= 126) {
        current += String.fromCharCode(char);
      } else {
        if (current.length >= 3) {
          strings.push(current);
        }
        current = '';
      }
    }
    if (current.length >= 3) {
      strings.push(current);
    }
    return strings;
  }
}
