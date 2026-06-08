import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { DotLottieParser } from '../src/parsers/dotlottie-parser';

const FIXTURE = resolve(__dirname, './fixtures/valid.animation.lottie');

describe('DotLottieParser', () => {
  const parser = new DotLottieParser();

  describe('validate()', () => {
    it('returns true for .lottie extension', () => {
      expect(parser.validate('/path/to/animation.lottie')).toBe(true);
    });
    it('returns false for .json extension', () => {
      expect(parser.validate('/path/to/animation.json')).toBe(false);
    });
    it('returns false for other extensions', () => {
      expect(parser.validate('/path/to/animation.riv')).toBe(false);
    });
  });

  describe('parseFile()', () => {
    it('returns success true for valid .lottie file', async () => {
      const result = await parser.parseFile(FIXTURE);
      expect(result.success).toBe(true);
    });
    it('extracts fps greater than zero', async () => {
      const result = await parser.parseFile(FIXTURE);
      expect(result.metadata?.fps).toBeGreaterThan(0);
    });
    it('extracts positive duration', async () => {
      const result = await parser.parseFile(FIXTURE);
      expect(result.metadata?.durationSeconds).toBeGreaterThan(0);
    });
    it('extracts width and height', async () => {
      const result = await parser.parseFile(FIXTURE);
      expect(result.metadata?.width).toBeGreaterThan(0);
      expect(result.metadata?.height).toBeGreaterThan(0);
    });
    it('populates dotLottie metadata extension', async () => {
      const result = await parser.parseFile(FIXTURE);
      expect(result.metadata?.dotLottie).toBeDefined();
      expect(result.metadata?.dotLottie?.animations.length).toBeGreaterThan(0);
    });
    it('sets format to dotlottie', async () => {
      const result = await parser.parseFile(FIXTURE);
      expect(result.metadata?.format).toBe('dotlottie');
    });
    it('returns error for non-existent file', async () => {
      const result = await parser.parseFile('/nonexistent/path.lottie');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('extractAnimationData()', () => {
    it('returns a non-null object for valid file', async () => {
      const data = await parser.extractAnimationData(FIXTURE);
      expect(data).not.toBeNull();
      expect(typeof data).toBe('object');
    });
    it('returned data has Lottie structure', async () => {
      const data = await parser.extractAnimationData(FIXTURE) as Record<string, unknown>;
      expect(data).toHaveProperty('fr');
      expect(data).toHaveProperty('layers');
    });
    it('returns null for non-existent file', async () => {
      const data = await parser.extractAnimationData('/nonexistent/path.lottie');
      expect(data).toBeNull();
    });
  });
});
