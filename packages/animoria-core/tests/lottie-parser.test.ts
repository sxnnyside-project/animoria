import { describe, it, expect } from 'vitest';
import { LottieParser } from '../src/parsers/lottie-parser';

describe('LottieParser', () => {

  const parser = new LottieParser();

  // --- validate() ---

  describe('validate()', () => {
    it('returns true for a valid Lottie JSON object', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      expect(parser.validate(data.default)).toBe(true);
    });

    it('returns false for a non-Lottie JSON object', async () => {
      const data = await import('./fixtures/invalid.json');
      expect(parser.validate(data.default)).toBe(false);
    });

    it('returns false for null', () => {
      expect(parser.validate(null)).toBe(false);
    });

    it('returns false for a primitive value', () => {
      expect(parser.validate('hello')).toBe(false);
      expect(parser.validate(42)).toBe(false);
    });

    it('returns false when layers key is missing', () => {
      expect(parser.validate({ v: '5.9.0', fr: 30 })).toBe(false);
    });

    it('returns false when layers is not an array', () => {
      expect(parser.validate({ v: '5.9.0', fr: 30, layers: 'wrong' })).toBe(false);
    });

    it('returns false when fr is missing', () => {
      expect(parser.validate({ v: '5.9.0', layers: [] })).toBe(false);
    });
  });

  // --- parse() ---

  describe('parse()', () => {
    it('returns success true for valid Lottie data', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      const result = parser.parse(data.default);
      expect(result.success).toBe(true);
    });

    it('extracts correct fps from fr field', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      const result = parser.parse(data.default);
      expect(result.metadata?.fps).toBe(30);
    });

    it('extracts correct totalFrames from op - ip', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      // op: 90, ip: 0 → totalFrames: 90
      const result = parser.parse(data.default);
      expect(result.metadata?.totalFrames).toBe(90);
    });

    it('calculates durationSeconds correctly', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      // 90 frames / 30 fps = 3 seconds
      const result = parser.parse(data.default);
      expect(result.metadata?.durationSeconds).toBe(3);
    });

    it('extracts width and height', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      const result = parser.parse(data.default);
      expect(result.metadata?.width).toBe(512);
      expect(result.metadata?.height).toBe(512);
    });

    it('extracts layerCount correctly', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      const result = parser.parse(data.default);
      expect(result.metadata?.layerCount).toBe(1);
    });

    it('extracts markers when present', async () => {
      const data = await import('./fixtures/valid.lottie.json');
      const result = parser.parse(data.default);
      expect(result.metadata?.markers).toHaveLength(2);
      expect(result.metadata?.markers?.[0].name).toBe('intro');
      expect(result.metadata?.markers?.[1].name).toBe('loop');
    });

    it('returns empty markers array when no markers in file', async () => {
      const noMarkers = { v: '5.9.0', fr: 24, ip: 0, op: 48, w: 200, h: 200, layers: [] };
      const result = parser.parse(noMarkers);
      expect(result.metadata?.markers).toEqual([]);
    });

    it('returns success false for invalid data', async () => {
      const data = await import('./fixtures/invalid.json');
      const result = parser.parse(data.default);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns success false and error message for null input', () => {
      const result = parser.parse(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Lottie file: validation failed');
    });
  });
});
