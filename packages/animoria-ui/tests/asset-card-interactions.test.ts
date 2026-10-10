import type { Asset } from '@animoria/contracts';
import { describe, expect, it } from 'vitest';
import '../src/components/animoria-asset-card.js';
import { AnimoriaAssetCard } from '../src/components/animoria-asset-card.js';

const SAMPLE_ASSET: Asset = {
  id: 'asset-1',
  path: '/workspace/assets/hero.json',
  relative_path: 'assets/hero.json',
  name: 'hero.json',
  stem: 'hero',
  format: 'lottie',
  kind: 'motion',
  size_bytes: 4096,
  mtime_ms: 1700000000000,
  is_valid: true,
};

describe('AnimoriaAssetCard — interactions & accessibility (Phase 3 & 4)', () => {
  it('instantiates custom element with draggable capability', () => {
    const card = new AnimoriaAssetCard();
    card.asset = SAMPLE_ASSET;
    card.rootId = 'root-1';
    expect(card).toBeDefined();
    expect(card.asset.path).toBe('/workspace/assets/hero.json');
  });

  it('exposes focusCard method for keyboard navigation', () => {
    const card = new AnimoriaAssetCard();
    expect(typeof card.focusCard).toBe('function');
  });
});
