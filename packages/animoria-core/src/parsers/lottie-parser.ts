import type { ILottieParser, ParserResult } from '../types/index.js';
import { sanitizeMetadataString } from './sanitizer.js';

export class LottieParser implements ILottieParser {
  validate(data: unknown): boolean {
    if (data === null || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      typeof d['v'] === 'string' &&
      typeof d['fr'] === 'number' &&
      d['fr'] > 0 &&
      Array.isArray(d['layers'])
    );
  }

  parse(data: unknown): ParserResult {
    try {
      if (!this.validate(data)) {
        return { success: false, error: 'Invalid Lottie file: validation failed' };
      }

      const d = data as any;
      const fps: number = d.fr;
      const ip: number = typeof d.ip === 'number' ? d.ip : 0;
      const totalFrames: number = d.op - ip;
      const durationSeconds = parseFloat((totalFrames / fps).toFixed(4));

      const markers = Array.isArray(d.markers)
        ? d.markers.map((m: any) => ({
            name: sanitizeMetadataString(m.cm as string),
            frame: m.tm as number,
            durationFrames: m.dr as number,
          }))
        : [];

      return {
        success: true,
        metadata: {
          format: 'lottie',
          fps,
          totalFrames,
          durationSeconds,
          width: d.w as number,
          height: d.h as number,
          layerCount: (d.layers as unknown[]).length,
          markers,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}
