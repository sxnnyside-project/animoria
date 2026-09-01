import type {
  Asset,
  DuplicateGroup,
  HealthScoreReport,
  RuleDiagnostic,
  WorkspaceAnalysis,
} from '@animoria/contracts';
import type { CleanupReason, MultiRootAnalysis } from '../bridge/types.js';

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
  readonly analysis: WorkspaceAnalysis | MultiRootAnalysis;
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
  analysis: WorkspaceAnalysis | MultiRootAnalysis,
  filter: RootFilter = ALL_ROOTS
): AnalysisViewModel {
  if ('roots' in analysis && Array.isArray(analysis.roots)) {
    const multi = analysis;
    const roots: RootSummary[] = multi.roots.map((root) => ({
      rootId: root.root_id || 'root',
      rootName: root.root_path ? root.root_path.split(/[/\\]/).pop() || 'Root' : 'Root',
      rootPath: root.root_path,
      assetCount: root.assets.length,
      findingCount: root.diagnostics.length,
      healthScore: root.health_score?.score ?? 100,
    }));

    const assets: AttributedAsset[] = [];
    const diagnostics: AttributedDiagnostic[] = [];
    const byAsset = new Map<string, RuleDiagnostic[]>();
    const byRule = new Map<string, AttributedDiagnostic[]>();
    const rootIdByAssetPath = new Map<string, string>();
    const referenceCounts = new Map<string, number>();

    const rawCounts = (
      multi as { referenceCounts?: ReadonlyMap<string, number> | Record<string, number> }
    ).referenceCounts;
    if (rawCounts instanceof Map) {
      for (const [k, v] of rawCounts.entries()) {
        referenceCounts.set(k, v);
      }
    } else if (rawCounts && typeof rawCounts === 'object') {
      for (const [k, v] of Object.entries(rawCounts)) {
        referenceCounts.set(k, Number(v) || 0);
      }
    }

    for (const root of multi.roots) {
      const rootId = root.root_id || 'root';
      const rootName = root.root_path ? root.root_path.split(/[/\\]/).pop() || 'Root' : 'Root';
      const isFiltered = filter.kind === 'root' && filter.rootId !== rootId;
      if (isFiltered) continue;

      for (const asset of root.assets) {
        assets.push({ rootId, rootName, asset });
        rootIdByAssetPath.set(asset.path, rootId);
        if (!referenceCounts.has(asset.path)) {
          referenceCounts.set(asset.path, 0);
        }
      }

      for (const diagnostic of root.diagnostics) {
        const item: AttributedDiagnostic = { rootId, rootName, diagnostic };
        diagnostics.push(item);
        const assetPath = diagnostic.target_asset_path || '';
        if (assetPath) {
          const list = byAsset.get(assetPath) ?? [];
          list.push(diagnostic);
          byAsset.set(assetPath, list);
        }
        const ruleId = diagnostic.rule_id || 'general';
        const ruleList = byRule.get(ruleId) ?? [];
        ruleList.push(item);
        byRule.set(ruleId, ruleList);
      }
    }

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
      analysis: multi,
      state: 'ready',
      stateLabel: 'Ready',
      roots,
      filter,
      isSingleRoot: multi.roots.length === 1,
      activeRootId: filter.kind === 'root' ? filter.rootId : null,
      assets,
      assetCount: assets.length,
      sections,
      findingCount: diagnostics.length,
      diagnosticsByAssetPath: byAsset,
      rootIdByAssetPath,
      referenceCounts,
      duplicateGroups: multi.duplicateGroups,
      health: multi.roots[0]?.health_score ?? null,
      isEmpty: assets.length === 0,
    };
  }

  const single = analysis as WorkspaceAnalysis;
  const rootId = single.root_id || 'root';
  const rootName = single.root_path
    ? single.root_path.split(/[/\\]/).pop() || 'Workspace'
    : 'Workspace';

  const rootSummary: RootSummary = {
    rootId,
    rootName,
    rootPath: single.root_path,
    assetCount: single.assets.length,
    findingCount: single.diagnostics.length,
    healthScore: single.health_score?.score ?? 100,
  };

  const isFiltered = filter.kind === 'root' && filter.rootId !== rootId;
  const rawAssets = Array.isArray(single.assets) ? single.assets : [];
  const rawDiagnostics = Array.isArray(single.diagnostics) ? single.diagnostics : [];

  const assets: AttributedAsset[] = isFiltered
    ? []
    : rawAssets.map((asset: Asset) => ({
        rootId,
        rootName,
        asset: {
          ...asset,
          name: asset.name || (asset.path ? asset.path.split(/[/\\]/).pop() || 'asset' : 'asset'),
          size_bytes: asset.size_bytes ?? 0,
          format: asset.format || 'unknown',
          kind: asset.kind || 'static',
          is_valid: asset.is_valid ?? true,
        },
      }));

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
    : rawDiagnostics.map((diagnostic: RuleDiagnostic) => {
        const ruleId = diagnostic.rule_id || 'general';
        const assetPath = diagnostic.target_asset_path || '';
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
    analysis: single,
    state: single.state,
    stateLabel: describeLifecycle(single.state),
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
    health: single.health_score ?? null,
    isEmpty: assets.length === 0,
  };
}

function humanizeRuleId(ruleId = ''): string {
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

export function cleanupReasonLabel(reason: string | CleanupReason): string {
  if (typeof reason === 'string') return reason;
  return reason.message || reason.code;
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
