import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { FileScanner } from '../src/scanner/file-scanner';

const WORKSPACE = resolve(__dirname, './fixtures/workspace');

describe('FileScanner', () => {

  // --- scan() basic ---

  describe('scan() — basic detection', () => {
    it('returns a ScannerResult object', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('scannedFiles');
      expect(result).toHaveProperty('durationMs');
    });

    it('detects only valid Lottie files', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      expect(result.assets).toHaveLength(3);
    });

    it('each asset has required fields', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      for (const asset of result.assets) {
        expect(asset.path).toBeDefined();
        expect(asset.name).toBeDefined();
        expect(asset.stem).toBeDefined();
        expect(asset.format).toBe('lottie');
        expect(asset.sizeBytes).toBeGreaterThan(0);
        expect(asset.mtime).toBeGreaterThan(0);
        expect(asset.status).toBe('pending');
      }
    });

    it('asset name includes extension', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const names = result.assets.map(a => a.name);
      expect(names).toContain('success.json');
      expect(names).toContain('loading.json');
      expect(names).toContain('confetti.json');
    });

    it('asset stem does not include extension', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const stems = result.assets.map(a => a.stem);
      expect(stems).toContain('success');
      expect(stems).toContain('loading');
      expect(stems).toContain('confetti');
    });

    it('scannedFiles count reflects all .json files inspected', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      // arrow.json is inspected and rejected — still counted
      expect(result.scannedFiles).toBeGreaterThanOrEqual(4);
    });

    it('durationMs is a positive number', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      expect(result.durationMs).toBeGreaterThan(0);
    });
  });

  // --- exclusions ---

  describe('scan() — default exclusions', () => {
    it('excludes node_modules by default', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const paths = result.assets.map(a => a.path);
      expect(paths.every(p => !p.includes('node_modules'))).toBe(true);
    });

    it('excludes dist by default', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const paths = result.assets.map(a => a.path);
      expect(paths.every(p => !p.includes('/dist/'))).toBe(true);
    });
  });

  // --- custom config ---

  describe('scan() — custom config', () => {
    it('respects custom exclude patterns', async () => {
      const scanner = new FileScanner({
        workspacePath: WORKSPACE,
        exclude: ['**/animations/**'],
      });
      const result = await scanner.scan();
      expect(result.assets).toHaveLength(0);
    });

    it('respects maxFileSizeBytes — skips files over the limit', async () => {
      const scanner = new FileScanner({
        workspacePath: WORKSPACE,
        maxFileSizeBytes: 10, // 10 bytes — all fixtures will exceed this
      });
      const result = await scanner.scan();
      expect(result.assets).toHaveLength(0);
    });
  });

  // --- validation ---

  describe('scan() — structural validation', () => {
    it('does not include non-Lottie JSON files (arrow.json)', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const names = result.assets.map(a => a.name);
      expect(names).not.toContain('arrow.json');
    });

    it('does not include workspace package.json', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const names = result.assets.map(a => a.name);
      expect(names).not.toContain('package.json');
    });
  });
});
