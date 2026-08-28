import type {
  Asset,
  RuleDiagnostic,
  WorkspaceAnalysis,
  HealthScoreReport,
} from '@animoria/contracts';

export function buildAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    path: '/workspace/assets/hero.json',
    relative_path: 'assets/hero.json',
    name: 'hero.json',
    stem: 'hero',
    kind: 'Motion',
    format: 'Lottie',
    size_bytes: 2048,
    is_valid: true,
    dimensions: { width: 500, height: 500 },
    motion: {
      duration_secs: 2.5,
      fps: 60,
      frame_count: 150,
      layer_count: 12,
    },
    ...overrides,
  };
}

export function buildDiagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  return {
    rule_id: 'no-unreferenced-assets',
    severity: 'Warning',
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
    workspace_id: 'ws-1',
    root_path: '/workspace',
    timestamp: '2026-01-01T00:00:00.000Z',
    assets: [],
    diagnostics: [],
    health_score: buildHealthScore(),
    ...overrides,
  };
}
