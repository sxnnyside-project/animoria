import { describe, expect, it } from 'vitest';
import { AssetResolver, findTokenRange } from '../../src/hover/asset-resolver.js';
import { buildAnalysis, buildAsset } from '../support/fakes.js';

describe('findTokenRange', () => {
  it('identifies token bounds and confirms if character position is inside', () => {
    const line = 'import logo from "./assets/logo.png";';
    // "logo.png" starts at index 27 and ends at 35
    expect(findTokenRange(line, 'logo.png', 28)).toEqual([27, 35]);
    // Cursor at index 0 (on "import") should return null
    expect(findTokenRange(line, 'logo.png', 0)).toBeNull();
  });
});

describe('AssetResolver precision', () => {
  const hero = buildAsset({
    id: 'asset-hero',
    name: 'hero.png',
    stem: 'hero',
    path: '/project/assets/hero.png',
  });
  const logo = buildAsset({
    id: 'asset-logo',
    name: 'logo.png',
    stem: 'logo',
    path: '/project/assets/logo.png',
  });
  const snapshot = buildAnalysis({ assets: [hero, logo] });

  it('returns null when cursor is not over the asset token, even if asset name is on the line', () => {
    const fakeDoc = {
      lineAt: () => ({ text: 'const unused = 123; import "./assets/hero.png";' }),
    } as never;

    // Cursor at character 5 (on "unused")
    const resolved = AssetResolver.resolveFromPosition(
      fakeDoc,
      { line: 0, character: 5 } as never,
      snapshot
    );
    expect(resolved).toBeNull();
  });

  it('returns the exact asset when multiple assets are on the same line', () => {
    const fakeDoc = {
      lineAt: () => ({ text: '<img src="hero.png" /> <img src="logo.png" />' }),
    } as never;

    // Cursor over "hero.png" (index 12)
    const resolvedHero = AssetResolver.resolveFromPosition(
      fakeDoc,
      { line: 0, character: 12 } as never,
      snapshot
    );
    expect(resolvedHero?.id).toBe('asset-hero');

    // Cursor over "logo.png" (index 35)
    const resolvedLogo = AssetResolver.resolveFromPosition(
      fakeDoc,
      { line: 0, character: 35 } as never,
      snapshot
    );
    expect(resolvedLogo?.id).toBe('asset-logo');
  });
});
