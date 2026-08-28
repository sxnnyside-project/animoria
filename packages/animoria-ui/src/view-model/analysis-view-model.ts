import type {
  Asset,
  DuplicateGroup,
  HealthScoreReport,
  RuleDiagnostic,
  WorkspaceAnalysis,
} from '@animoria/contracts';

export interface AttributedAsset {
  readonly rootId: string;
  readonly rootName: string;
  readonly asset: Asset;
}

export interface AttributedDiagnostic {
  readonly rootId: string;
  readonly rootName: string;
  readonly diagnostic: RuleDiagnostic;
}

export interface FindingSection {
  readonly ruleId: string;
  readonly label: string;
  readonly diagnostics: readonly AttributedDiagnostic[];
}

export interface RootSummary {
  readonly rootId: string;
  readonly rootName: string;
  readonly rootPath: string;
  readonly assetCount: number;
  readonly findingCount: number;
  readonly healthScore: number;
}

export type RootFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'root'; readonly rootId: string };

export const ALL_ROOTS: RootFilter = { kind: 'all' };

export type ReferenceState = 'resolved' | 'incomplete' | 'unavailable';

export interface AnalysisViewModel {
  readonly analysis: WorkspaceAnalysis;
  readonly state: string;
  readonly stateLabel: string;

  readonly roots: readonly RootSummary[];
  readonly filter: RootFilter;
  readonly isSingleRoot: boolean;
  readonly activeRootId: string | null;

  readonly assets: readonly AttributedAsset[];
  readonly assetCount: number;
  readonly sections: readonly FindingSection[];
  readonly findingCount: number;
  readonly diagnosticsByAssetPath: ReadonlyMap<string, readonly RuleDiagnostic[]>;
  readonly rootIdByAssetPath: ReadonlyMap<string, string>;
  readonly referenceCounts: ReadonlyMap<string, number>;
  readonly duplicateGroups: readonly DuplicateGroup[];

  readonly health: HealthScoreReport | null;
  readonly isEmpty: boolean;
}

export function buildAnalysisViewModel(
  analysis: WorkspaceAnalysis,
  filter: RootFilter = ALL_ROOTS
): AnalysisViewModel {
  const rootId = analysis.root_id || 'root';
  const rootName = analysis.root_path
    ? analysis.root_path.split('/').pop() || 'Workspace'
    : 'Workspace';

  const rootSummary: RootSummary = {
    rootId,
    rootName,
    rootPath: analysis.root_path,
    assetCount: analysis.assets.length,
    findingCount: analysis.diagnostics.length,
    healthScore: analysis.health_score?.score ?? (analysis as any).health?.report?.score ?? 100,
  };

  const isFiltered = filter.kind === 'root' && filter.rootId !== rootId;
  const rawAssets = Array.isArray(analysis.assets) ? analysis.assets : [];
  const rawDiagnostics = Array.isArray(analysis.diagnostics) ? analysis.diagnostics : [];

  const assets: AttributedAsset[] = isFiltered
    ? []
    : rawAssets.map((raw: any) => {
        const asset: Asset = raw.asset ? raw.asset : raw;
        return {
          rootId,
          rootName,
          asset: {
            ...asset,
            name: asset.name || (asset.path ? asset.path.split(/[/\\]/).pop() || 'asset' : 'asset'),
            size_bytes: asset.size_bytes ?? (asset as any).sizeBytes ?? 0,
            format: asset.format || 'unknown',
            kind: asset.kind || 'static',
            is_valid: asset.is_valid ?? (asset as any).status !== 'error',
          },
        };
      });

  const byAsset = new Map<string, RuleDiagnostic[]>();
  const byRule = new Map<string, AttributedDiagnostic[]>();
  const rootIdByAssetPath = new Map<string, string>();
  const referenceCounts = new Map<string, number>();

  for (const item of assets) {
    rootIdByAssetPath.set(item.asset.path, item.rootId);
    referenceCounts.set(item.asset.path, 0);
  }

  const diagnostics: AttributedDiagnostic[] = isFiltered
    ? []
    : rawDiagnostics.map((raw: any) => {
        const ruleId = raw.rule_id || raw.ruleId || 'general';
        const assetPath = raw.target_asset_path || raw.targetAssetPath || raw.asset?.path || '';
        const diagnostic: RuleDiagnostic = {
          rule_id: ruleId,
          severity: raw.severity || 'warning',
          message: raw.message || 'Governance diagnostic',
          target_asset_path: assetPath,
          evidence_file: raw.evidence_file || raw.evidence?.file,
          evidence_line: raw.evidence_line || raw.evidence?.line,
          evidence_excerpt: raw.evidence_excerpt || raw.evidence?.excerpt,
        };
        const item: AttributedDiagnostic = { rootId, rootName, diagnostic };
        if (assetPath) {
          const list = byAsset.get(assetPath) ?? [];
          list.push(diagnostic);
          byAsset.set(assetPath, list);
        }
        const ruleList = byRule.get(ruleId) ?? [];
        ruleList.push(item);
        byRule.set(ruleId, ruleList);
        return item;
      });

  const sections: FindingSection[] = [...byRule.entries()]
    .map(([ruleId, entries]) => ({
      ruleId,
      label: humanizeRuleId(ruleId),
      diagnostics: entries,
    }))
    .sort(
      (a, b) => b.diagnostics.length - a.diagnostics.length || a.ruleId.localeCompare(b.ruleId)
    );

  return {
    analysis,
    state: analysis.state,
    stateLabel: describeLifecycle(analysis.state),
    roots: [rootSummary],
    filter,
    isSingleRoot: true,
    activeRootId: filter.kind === 'root' ? filter.rootId : null,
    assets,
    assetCount: assets.length,
    sections,
    findingCount: diagnostics.length,
    diagnosticsByAssetPath: byAsset,
    rootIdByAssetPath,
    referenceCounts,
    duplicateGroups: [],
    health: analysis.health_score ?? (analysis as any).health?.report ?? null,
    isEmpty: assets.length === 0,
  };
}

function humanizeRuleId(ruleId: string = ''): string {
  const safeId = ruleId || 'General';
  const words = safeId.replace(/^no-/, '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function describeLifecycle(state: string): string {
  switch (state) {
    case 'ready':
      return 'Ready';
    case 'initializing':
      return 'Initializing…';
    case 'stale':
      return 'Stale';
    default:
      return 'Error';
  }
}

export function confidenceLabel(confidence: string): string {
  return confidence.toUpperCase();
}

export function cleanupReasonLabel(reason: string): string {
  return reason;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function referenceStateOf(): ReferenceState {
  return 'resolved';
}

export function referenceLabel(count: number, state: ReferenceState): string {
  if (state === 'unavailable') return 'References unavailable';
  if (count === 0) return '0 references';
  if (count === 1) return '1 reference';
  return `${count} references`;
}

export function referenceExplanation(state: ReferenceState): string {
  switch (state) {
    case 'resolved':
      return 'Reference count from workspace indexing.';
    case 'incomplete':
      return 'Reference count may be partial.';
    case 'unavailable':
      return 'Scanning references…';
  }
}
