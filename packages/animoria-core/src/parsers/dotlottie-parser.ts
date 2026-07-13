import { DotLottie } from '@dotlottie/dotlottie-js';
import { readFile } from 'fs/promises';
import type { ParserResult } from '../types/index.js';
import type { DotLottieManifestEntry } from '../types/metadata.js';
import { sanitizeMetadataString } from './sanitizer.js';

export class DotLottieParser {
  validate(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.lottie');
  }

  async parseFile(filePath: string): Promise<ParserResult> {
    try {
      const buffer = await readFile(filePath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      const dotLottie = await new DotLottie().fromArrayBuffer(arrayBuffer);

      const animations = dotLottie.animations;
      if (!animations || animations.length === 0) {
        return { success: false, error: 'No animations found in .lottie archive' };
      }

      const primary = animations[0]!;
      const animData = (await primary.toJSON()) as unknown as Record<string, unknown>;

      const fps = animData['fr'] as number;
      const ip = typeof animData['ip'] === 'number' ? (animData['ip'] as number) : 0;
      const totalFrames = (animData['op'] as number) - ip;
      const durationSeconds = parseFloat((totalFrames / fps).toFixed(4));

      const layers = Array.isArray(animData['layers']) ? (animData['layers'] as unknown[]) : [];

      const rawMarkers = Array.isArray(animData['markers']) ? (animData['markers'] as any[]) : [];
      const markers = rawMarkers.map((m) => ({
        name: sanitizeMetadataString(m.cm as string),
        frame: m.tm as number,
        durationFrames: m.dr as number,
      }));

      const manifestAnimations: DotLottieManifestEntry[] = animations.map((a) => ({
        id: sanitizeMetadataString(a.id),
        name: a.name ? sanitizeMetadataString(a.name) : undefined,
      }));

      const hasImages = dotLottie.getImages().length > 0;

      return {
        success: true,
        metadata: {
          format: 'dotlottie',
          fps,
          totalFrames,
          durationSeconds,
          width: animData['w'] as number,
          height: animData['h'] as number,
          layerCount: layers.length,
          markers,
          dotLottie: {
            animations: manifestAnimations,
            primaryAnimation: sanitizeMetadataString(primary.id),
            hasImages,
          },
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async extractAnimationData(filePath: string, animationId?: string): Promise<unknown | null> {
    try {
      const buffer = await readFile(filePath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      const dotLottie = await new DotLottie().fromArrayBuffer(arrayBuffer);

      let animation;
      if (animationId) {
        animation = await dotLottie.getAnimation(animationId);
      } else {
        animation = dotLottie.animations[0];
      }

      if (!animation) return null;
      return await animation.toJSON();
    } catch {
      return null;
    }
  }
}
