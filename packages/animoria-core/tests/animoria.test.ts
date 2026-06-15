import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'path';
import { Animoria } from '../src/animoria';

const WORKSPACE = resolve(__dirname, './fixtures/workspace');

describe('Animoria facade', () => {
  describe('run()', () => {
    it('returns an AnimoriaResult object', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('scannedFiles');
      expect(result).toHaveProperty('durationMs');
    });

    it('finds and parses all valid Lottie assets', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(result.parsed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('all assets have status parsed', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(result.assets.every((a) => a.status === 'parsed')).toBe(true);
    });

    it('all assets have metadata populated', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(result.assets.every((a) => a.metadata !== undefined)).toBe(true);
    });

    it('durationMs covers the full scan + parse time', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('scannedFiles reflects total .json files inspected', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(result.scannedFiles).toBeGreaterThanOrEqual(4);
    });
  });

  describe('run() — callbacks', () => {
    it('calls onScanComplete with the detected asset count', async () => {
      const onScanComplete = vi.fn();
      const animoria = new Animoria({ workspacePath: WORKSPACE, onScanComplete });
      await animoria.run();
      expect(onScanComplete).toHaveBeenCalledOnce();
      expect(onScanComplete).toHaveBeenCalledWith(3);
    });

    it('calls onAssetParsed once per asset', async () => {
      const onAssetParsed = vi.fn();
      const animoria = new Animoria({ workspacePath: WORKSPACE, onAssetParsed });
      await animoria.run();
      expect(onAssetParsed).toHaveBeenCalledTimes(3);
    });

    it('onAssetParsed receives asset, index, and total', async () => {
      const calls: Array<[number, number]> = [];
      const animoria = new Animoria({
        workspacePath: WORKSPACE,
        onAssetParsed: (_asset, index, total) => {
          calls.push([index, total]);
        },
      });
      await animoria.run();
      expect(calls.every(([_, total]) => total === 3)).toBe(true);
      const indices = calls.map(([i]) => i).sort((a, b) => a - b);
      expect(indices).toEqual([0, 1, 2]);
    });

    it('does not throw if callbacks are not provided', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      await expect(animoria.run()).resolves.not.toThrow();
    });
  });

  describe('getAssets()', () => {
    it('returns empty array before run() is called', () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      expect(animoria.getAssets()).toEqual([]);
    });

    it('returns the parsed assets after run() completes', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      await animoria.run();
      const assets = animoria.getAssets();
      expect(assets).toHaveLength(3);
      expect(assets.every((a) => a.status === 'parsed')).toBe(true);
    });

    it('returns the same reference as result.assets', async () => {
      const animoria = new Animoria({ workspacePath: WORKSPACE });
      const result = await animoria.run();
      expect(animoria.getAssets()).toBe(result.assets);
    });
  });

  describe('run() — config passthrough', () => {
    it('respects exclude config', async () => {
      const animoria = new Animoria({
        workspacePath: WORKSPACE,
        exclude: ['**/animations/**'],
      });
      const result = await animoria.run();
      expect(result.parsed).toBe(0);
    });

    it('respects concurrency config without errors', async () => {
      const animoria = new Animoria({
        workspacePath: WORKSPACE,
        concurrency: 1,
      });
      const result = await animoria.run();
      expect(result.parsed).toBe(3);
    });
  });
});
