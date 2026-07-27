import { describe, expect, it } from 'vitest';
import type { AnimatedFormat } from '../../src/types/asset';
import { ASSET_EXTENSIONS_BY_FORMAT, SUPPORTED_ASSET_EXTENSIONS } from '../../src/types/formats';

describe('ASSET_EXTENSIONS_BY_FORMAT', () => {
  it('maps every AnimatedFormat to its real on-disk extension', () => {
    const expected: Record<AnimatedFormat, string> = {
      lottie: '.json',
      dotlottie: '.lottie',
      rive: '.riv',
      gif: '.gif',
      apng: '.apng',
      'animated-svg': '.svg',
    };
    expect(ASSET_EXTENSIONS_BY_FORMAT).toEqual(expected);
  });

  it('uses the real Rive extension (.riv), not the incorrect ".rive"', () => {
    expect(ASSET_EXTENSIONS_BY_FORMAT.rive).toBe('.riv');
  });
});

describe('SUPPORTED_ASSET_EXTENSIONS', () => {
  it('is derived from ASSET_EXTENSIONS_BY_FORMAT and contains every extension exactly once', () => {
    expect(new Set(SUPPORTED_ASSET_EXTENSIONS).size).toBe(SUPPORTED_ASSET_EXTENSIONS.length);
    expect(SUPPORTED_ASSET_EXTENSIONS.sort()).toEqual(
      Object.values(ASSET_EXTENSIONS_BY_FORMAT).sort()
    );
  });

  it('does not contain the stale ".rive" extension', () => {
    expect(SUPPORTED_ASSET_EXTENSIONS).not.toContain('.rive');
    expect(SUPPORTED_ASSET_EXTENSIONS).toContain('.riv');
  });
});
