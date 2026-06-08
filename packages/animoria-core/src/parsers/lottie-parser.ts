import type { ILottieParser, ParserResult } from '../types/index.js';

export class LottieParser implements ILottieParser {
  validate(data: unknown): boolean {
    if (data === null || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (typeof d['v'] !== 'string') return false;
    if (typeof d['fr'] !== 'number' || d['fr'] <= 0) return false;
    if (!Array.isArray(d['layers'])) return false;
    return true;
  }

  parse(data: unknown): ParserResult {
    try {
      if (!this.validate(data)) {
        return { success: false, error: 'Invalid Lottie file: validation failed' };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const fps: number = d.fr;
      const ip: number = typeof d.ip === 'number' ? d.ip : 0;
      const totalFrames: number = d.op - ip;
      const durationSeconds = parseFloat((totalFrames / fps).toFixed(4));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers = Array.isArray(d.markers)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? d.markers.map((m: any) => ({
            name: m.cm as string,
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
