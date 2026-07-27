import { describe, expect, it } from 'vitest';
import { buildAssetFlatProjection } from '../../src/navigation/asset-flat-projection';
import type { AnimoriaAsset } from '../../src/types/asset';

function asset(name: string): AnimoriaAsset {
  return {
    path: `/w/${name}`,
    name,
    stem: name.replace(/\.\w+$/, ''),
    format: 'lottie',
    sizeBytes: 10,
    mtime: 0,
    status: 'parsed',
  };
}

describe('buildAssetFlatProjection', () => {
  it('sorts assets alphabetically by name', () => {
    const result = buildAssetFlatProjection([asset('c.json'), asset('a.json'), asset('b.json')]);
    expect(result.map((a) => a.name)).toEqual(['a.json', 'b.json', 'c.json']);
  });

  it('does not mutate the input array', () => {
    const input = [asset('b.json'), asset('a.json')];
    const original = [...input];
    buildAssetFlatProjection(input);
    expect(input).toEqual(original);
  });

  it('returns an empty projection for no assets', () => {
    expect(buildAssetFlatProjection([])).toEqual([]);
  });
});
