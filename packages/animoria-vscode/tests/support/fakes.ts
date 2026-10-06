import type {
  Asset,
  HealthScoreReport,
  RuleDiagnostic,
  WorkspaceAnalysis,
} from '@animoria/contracts';

export function buildAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    path: '/workspace/assets/hero.json',
    relative_path: 'assets/hero.json',
    name: 'hero.json',
    stem: 'hero',
    kind: 'motion',
    format: 'lottie',
    size_bytes: 2048,
    is_valid: true,
    dimensions: { width: 500, height: 500 },
    motion: {
      duration_secs: 2.5,
      fps: 60,
      total_frames: 150,
      layer_count: 12,
      is_animated: true,
    },
    ...overrides,
  };
}

export function buildDiagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  return {
    rule_id: 'no-unreferenced-assets',
    severity: 'warning',
    message: 'hero.json is not referenced by any scanned file.',
    target_asset_path: '/workspace/assets/hero.json',
    ...overrides,
  };
}

export function buildHealthScore(overrides: Partial<HealthScoreReport> = {}): HealthScoreReport {
  return {
    score: 100,
    grade: 'A+',
    categories: [
      { category: 'Hygiene', score: 100, weight: 0.35, violations_count: 0 },
      { category: 'Performance', score: 100, weight: 0.35, violations_count: 0 },
      { category: 'Compliance', score: 100, weight: 0.3, violations_count: 0 },
    ],
    summary: 'Workspace visual assets are in pristine health.',
    ...overrides,
  };
}

export function buildAnalysis(overrides: Partial<WorkspaceAnalysis> = {}): WorkspaceAnalysis {
  return {
    root_id: 'ws-1',
    root_path: '/workspace',
    state: 'ready',
    indexed_at_ms: 1767225600000,
    assets: [],
    diagnostics: [],
    health_score: buildHealthScore(),
    ...overrides,
  };
}
