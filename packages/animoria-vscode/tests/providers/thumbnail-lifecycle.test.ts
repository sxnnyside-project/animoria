import { beforeEach, describe, expect, it } from 'vitest';
import { AnimoriaTreeProvider } from '../../src/providers/animoria-tree-provider.js';
import { buildAnalysis, buildAsset } from '../support/fakes.js';
import { resetTestWorkspace } from '../harness.js';

const A = buildAsset({ path: '/workspace/assets/a.json', name: 'a.json', stem: 'a' });
const B = buildAsset({ path: '/workspace/assets/b.json', name: 'b.json', stem: 'b' });

beforeEach(() => {
  resetTestWorkspace();
});

describe('thumbnails — a settled asset stays settled across an analysis', () => {
  it('keeps and exposes assets from analysis update', () => {
    const provider = new AnimoriaTreeProvider('/workspace');
    provider.updateAnalysis(buildAnalysis({ assets: [A, B] }));

    expect(provider.getAssets()).toHaveLength(2);
  });
});
