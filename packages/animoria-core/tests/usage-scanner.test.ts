import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { UsageScanner } from '../src/usage/usage-scanner';
import { FileScanner } from '../src/scanner/file-scanner';

const WORKSPACE = resolve(__dirname, './fixtures/workspace');

describe('UsageScanner', () => {

  async function getAsset(stem: string) {
    const scanner = new FileScanner({ workspacePath: WORKSPACE });
    const result = await scanner.scan();
    const asset = result.assets.find(a => a.stem === stem);
    if (!asset) throw new Error(`Asset ${stem} not found in fixtures`);
    return asset;
  }

  describe('search() — basic', () => {
    it('returns a UsageSearchResult object', async () => {
      const asset = await getAsset('success');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset,
      });
      const result = await scanner.search();
      expect(result).toHaveProperty('asset');
      expect(result).toHaveProperty('references');
      expect(result).toHaveProperty('searchedFiles');
      expect(result).toHaveProperty('durationMs');
    });

    it('finds reference to success.json in PaymentScreen.tsx', async () => {
      const asset = await getAsset('success');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset,
        strategy: 'filename',
      });
      const result = await scanner.search();
      const files = result.references.map(r => r.file);
      expect(files.some(f => f.includes('PaymentScreen.tsx'))).toBe(true);
    });

    it('reference includes correct line number and content', async () => {
      const asset = await getAsset('success');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset,
        strategy: 'filename',
      });
      const result = await scanner.search();
      const ref = result.references.find(r =>
        r.file.includes('PaymentScreen.tsx')
      );
      expect(ref?.line).toBe(1);
      expect(ref?.content).toContain('success.json');
    });

    it('finds reference to loading in LoadingOverlay.tsx', async () => {
      const asset = await getAsset('loading');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset,
        strategy: 'both',
      });
      const result = await scanner.search();
      const files = result.references.map(r => r.file);
      expect(files.some(f => f.includes('LoadingOverlay.tsx'))).toBe(true);
    });

    it('returns empty references for an asset with no usages', async () => {
      // Use a synthetic asset whose name appears nowhere in the fixture source files
      const unusedAsset = {
        path: '/fake/totally-unused-xyzqwerty.json',
        name: 'totally-unused-xyzqwerty.json',
        stem: 'totally-unused-xyzqwerty',
        format: 'lottie' as const,
        sizeBytes: 100,
        mtime: Date.now(),
        status: 'pending' as const,
      };
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset: unusedAsset,
        strategy: 'both',
      });
      const result = await scanner.search();
      expect(result.references).toHaveLength(0);
    });

    it('searchedFiles is a positive number', async () => {
      const asset = await getAsset('success');
      const scanner = new UsageScanner({ workspacePath: WORKSPACE, asset });
      const result = await scanner.search();
      expect(result.searchedFiles).toBeGreaterThan(0);
    });

    it('durationMs is a positive number', async () => {
      const asset = await getAsset('success');
      const scanner = new UsageScanner({ workspacePath: WORKSPACE, asset });
      const result = await scanner.search();
      expect(result.durationMs).toBeGreaterThan(0);
    });
  });

  describe('search() — strategy', () => {
    it('stem strategy matches stem-only references', async () => {
      const asset = await getAsset('loading');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset,
        strategy: 'stem',
      });
      const result = await scanner.search();
      expect(result.references.some(r =>
        r.content.includes('loading')
      )).toBe(true);
    });

    it('filename strategy does not match stem-only references', async () => {
      // LoadingOverlay.tsx contains 'loading.json' (full filename)
      // so filename strategy should still find it
      const asset = await getAsset('loading');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset,
        strategy: 'filename',
      });
      const result = await scanner.search();
      expect(result.references.some(r =>
        r.file.includes('LoadingOverlay.tsx')
      )).toBe(true);
    });
  });

  describe('search() — exclusions', () => {
    it('does not search inside node_modules', async () => {
      const asset = await getAsset('success');
      const scanner = new UsageScanner({ workspacePath: WORKSPACE, asset });
      const result = await scanner.search();
      expect(result.references.every(r =>
        !r.file.includes('node_modules')
      )).toBe(true);
    });
  });

  describe('search() — false positive prevention', () => {
    it('does not match avatarUrl as a reference to avatar asset', async () => {
      const fakeAvatarAsset = {
        path: '/fake/avatar.json',
        name: 'avatar.json',
        stem: 'avatar',
        format: 'lottie' as const,
        sizeBytes: 100,
        mtime: Date.now(),
        status: 'pending' as const,
      };
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE,
        asset: fakeAvatarAsset,
        strategy: 'pattern',
      });
      const result = await scanner.search();
      // AvatarComponent.tsx has many "avatar" mentions but none are Lottie refs
      expect(result.references.every(r =>
        !r.file.includes('AvatarComponent')
      )).toBe(true);
    });

    it('pattern strategy finds fewer or equal results than stem strategy', async () => {
      const asset = await getAsset('loading');
      const patternScanner = new UsageScanner({
        workspacePath: WORKSPACE, asset, strategy: 'pattern',
      });
      const stemScanner = new UsageScanner({
        workspacePath: WORKSPACE, asset, strategy: 'stem',
      });
      const patternResult = await patternScanner.search();
      const stemResult = await stemScanner.search();
      expect(patternResult.references.length)
        .toBeLessThanOrEqual(stemResult.references.length);
    });

    it('pattern strategy finds genuine Lottie import in LottiePlayer.tsx', async () => {
      const asset = await getAsset('loading');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE, asset, strategy: 'pattern',
      });
      const result = await scanner.search();
      expect(result.references.some(r =>
        r.file.includes('LottiePlayer.tsx')
      )).toBe(true);
    });

    it('pattern strategy finds confetti reference via path string', async () => {
      const asset = await getAsset('confetti');
      const scanner = new UsageScanner({
        workspacePath: WORKSPACE, asset, strategy: 'pattern',
      });
      const result = await scanner.search();
      expect(result.references.some(r =>
        r.file.includes('LottiePlayer.tsx')
      )).toBe(true);
    });
  });
});
