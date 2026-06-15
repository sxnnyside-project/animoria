import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { FileScanner } from '../src/scanner/file-scanner';
import { AssetParser } from '../src/parser/asset-parser';

const WORKSPACE = resolve(__dirname, './fixtures/workspace');

describe('AssetParser', () => {
  describe('parse() — basic flow', () => {
    it('returns an AssetParserResult object', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser();
      const result = await parser.parse(scanResult.assets);
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('durationMs');
    });

    it('parses all valid Lottie assets successfully', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser();
      const result = await parser.parse(scanResult.assets);
      expect(result.parsed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('sets status to parsed on success', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser();
      const result = await parser.parse(scanResult.assets);
      expect(result.assets.every((a) => a.status === 'parsed')).toBe(true);
    });

    it('populates metadata on each asset', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser();
      const result = await parser.parse(scanResult.assets);
      for (const asset of result.assets) {
        expect(asset.metadata).toBeDefined();
        expect(asset.metadata?.fps).toBeGreaterThan(0);
        expect(asset.metadata?.width).toBeGreaterThan(0);
        expect(asset.metadata?.height).toBeGreaterThan(0);
        expect(asset.metadata?.layerCount).toBeGreaterThanOrEqual(0);
        expect(asset.metadata?.durationSeconds).toBeGreaterThan(0);
      }
    });

    it('durationMs is a positive number', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser();
      const result = await parser.parse(scanResult.assets);
      expect(result.durationMs).toBeGreaterThan(0);
    });
  });

  describe('parse() — error handling', () => {
    it('sets status to error for an asset with invalid path', async () => {
      const fakeAsset = {
        path: '/nonexistent/path/animation.json',
        name: 'animation.json',
        stem: 'animation',
        format: 'lottie' as const,
        sizeBytes: 100,
        mtime: Date.now(),
        status: 'pending' as const,
      };
      const parser = new AssetParser();
      const result = await parser.parse([fakeAsset]);
      expect(result.assets[0].status).toBe('error');
      expect(result.assets[0].error).toBeDefined();
      expect(result.failed).toBe(1);
      expect(result.parsed).toBe(0);
    });

    it('handles empty asset array gracefully', async () => {
      const parser = new AssetParser();
      const result = await parser.parse([]);
      expect(result.assets).toHaveLength(0);
      expect(result.parsed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('parse() — concurrency', () => {
    it('works with concurrency of 1', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser({ concurrency: 1 });
      const result = await parser.parse(scanResult.assets);
      expect(result.parsed).toBe(3);
    });

    it('works with concurrency higher than asset count', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const scanResult = await scanner.scan();
      const parser = new AssetParser({ concurrency: 20 });
      const result = await parser.parse(scanResult.assets);
      expect(result.parsed).toBe(3);
    });
  });
});
