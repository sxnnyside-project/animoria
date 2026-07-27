import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileScanner } from '../../src/scanner/file-scanner';

const WORKSPACE = resolve(__dirname, '../fixtures/workspace');
const RIVE_WORKSPACE = resolve(__dirname, '../fixtures/rive-workspace');

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
      const names = result.assets.map((a) => a.name);
      expect(names).toContain('success.json');
      expect(names).toContain('loading.json');
      expect(names).toContain('confetti.json');
    });

    it('asset stem does not include extension', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const stems = result.assets.map((a) => a.stem);
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
      const paths = result.assets.map((a) => a.path);
      expect(paths.every((p) => !p.includes('node_modules'))).toBe(true);
    });

    it('excludes dist by default', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const paths = result.assets.map((a) => a.path);
      expect(paths.every((p) => !p.includes('/dist/'))).toBe(true);
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
      const names = result.assets.map((a) => a.name);
      expect(names).not.toContain('arrow.json');
    });

    it('does not include workspace package.json', async () => {
      const scanner = new FileScanner({ workspacePath: WORKSPACE });
      const result = await scanner.scan();
      const names = result.assets.map((a) => a.name);
      expect(names).not.toContain('package.json');
    });
  });

  // --- .riv discovery ---
  // Regression coverage for the extension-list inconsistency fixed
  // alongside TASK-2.1: SUPPORTED_EXTENSIONS previously declared
  // '.rive' while RiveParser only ever matched the real '.riv'
  // extension, so real Rive assets were silently invisible to a full
  // scan. Both now derive from the single canonical list in
  // `types/formats.ts`.

  describe('scan() — Rive (.riv) discovery', () => {
    it('discovers a valid .riv file as a rive-format asset', async () => {
      const scanner = new FileScanner({ workspacePath: RIVE_WORKSPACE });
      const result = await scanner.scan();
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0]?.name).toBe('hero.riv');
      expect(result.assets[0]?.format).toBe('rive');
    });
  });

  // Real professional Lottie exports routinely put a large `assets` array
  // (embedded precomp/image data) before the top-level `v`/`layers` keys —
  // JSON key order isn't part of the format spec. Detection previously
  // only inspected the first 1KB of each candidate file, so any file where
  // `v` fell past that point was silently excluded from the scan
  // entirely — invisible everywhere in the product, not just
  // badly-thumbnailed. Reproduced against real files from lottie-web's own
  // demo assets before this fix (0 of 8 such files were even discovered).
  describe('scan() — Lottie detection beyond a 1KB prefix', () => {
    const tempDirs: string[] = [];
    afterEach(async () => {
      await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
    });

    it('discovers a Lottie file whose "v" key falls past the first 1KB', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'animoria-scanner-'));
      tempDirs.push(dir);

      // A large `assets` array padded well past 1KB, followed by the
      // top-level metadata keys — matching real-world key ordering.
      const padding = 'x'.repeat(2000);
      const doc = `{"assets":[{"id":"comp_0","layers":[],"__pad":"${padding}"}],"layers":[{"ty":4,"shapes":[]}],"v":"5.9.0","fr":30,"ip":0,"op":90,"w":100,"h":100}`;
      expect(doc.indexOf('"v"')).toBeGreaterThan(1024);

      await writeFile(join(dir, 'padded.json'), doc);

      const scanner = new FileScanner({ workspacePath: dir });
      const result = await scanner.scan();

      expect(result.assets).toHaveLength(1);
      expect(result.assets[0]?.name).toBe('padded.json');
    });
  });
});
