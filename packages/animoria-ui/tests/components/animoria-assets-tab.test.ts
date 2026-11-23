import type { Asset, WorkspaceAnalysis } from '@animoria/contracts';
import { describe, expect, it } from 'vitest';
import '../../src/components/workspace/animoria-assets-tab.js';
import { AnimoriaAssetsTab } from '../../src/components/workspace/animoria-assets-tab.js';
import { buildAnalysisViewModel } from '../../src/view-model/analysis-view-model.js';

const ASSET_LOTTIE: Asset = {
  id: 'asset-lottie',
  path: 'assets/spinner.json',
  relative_path: 'assets/spinner.json',
  name: 'spinner.json',
  stem: 'spinner',
  format: 'lottie',
  kind: 'motion',
  size_bytes: 2048,
  mtime_ms: 1700000000000,
  is_valid: true,
};

const ASSET_SVG: Asset = {
  id: 'asset-svg',
  path: 'assets/logo.svg',
  relative_path: 'assets/logo.svg',
  name: 'logo.svg',
  stem: 'logo',
  format: 'svg',
  kind: 'static',
  size_bytes: 1024,
  mtime_ms: 1700000000000,
  is_valid: true,
};

const SAMPLE_ANALYSIS: WorkspaceAnalysis = {
  root_id: 'root-1',
  root_path: '/workspace',
  state: 'ready',
  assets: [ASSET_LOTTIE, ASSET_SVG],
  diagnostics: [],
  health_score: { score: 100, grade: 'A', categories: [], summary: 'Healthy' },
  indexed_at_ms: 1700000000000,
};

describe('AnimoriaAssetsTab — gallery, filtering and sorting', () => {
  it('instantiates custom element and binds properties', () => {
    const tab = new AnimoriaAssetsTab();
    expect(tab).toBeDefined();
    expect(tab.selectedAssetPath).toBe('');
    expect(tab.thumbnails.size).toBe(0);
  });

  it('filters assets correctly by animated kind and search query', () => {
    const tab = new AnimoriaAssetsTab();
    const model = buildAnalysisViewModel(SAMPLE_ANALYSIS);
    tab.model = model;

    // Default filtered assets (all)
    const allFiltered = (
      tab as unknown as { _filteredAssets: (m: typeof model) => unknown[] }
    )._filteredAssets(model);
    expect(allFiltered.length).toBe(2);

    // Filter by animated
    (tab as unknown as { _assetKindFilter: string })._assetKindFilter = 'animated';
    const animatedOnly = (
      tab as unknown as { _filteredAssets: (m: typeof model) => unknown[] }
    )._filteredAssets(model);
    expect(animatedOnly.length).toBe(1);

    // Filter by search query
    (tab as unknown as { _assetKindFilter: string })._assetKindFilter = 'all';
    (tab as unknown as { _query: string })._query = 'logo';
    const logoOnly = (
      tab as unknown as { _filteredAssets: (m: typeof model) => unknown[] }
    )._filteredAssets(model);
    expect(logoOnly.length).toBe(1);
  });
});
