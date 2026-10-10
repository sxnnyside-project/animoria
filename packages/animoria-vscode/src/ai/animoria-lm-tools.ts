import type { DuplicateGroup, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';

export interface SearchAssetsToolParameters {
  query?: string;
  format?: string;
  kind?: string;
}

/**
 * Registers Copilot & Language Model tools so AI agents can query
 * visual asset inventory and audit workspace governance health.
 */
export function registerLanguageModelTools(
  context: vscode.ExtensionContext,
  getAnalysis: () => WorkspaceAnalysis | null,
  getDuplicateGroups: () => readonly DuplicateGroup[] = () => [],
): vscode.Disposable {
  const disposables: vscode.Disposable[] = [];

  // Check if VS Code runtime supports Language Model Tools API (vscode.lm)
  const lm = (
    vscode as unknown as {
      lm?: { registerTool?: (name: string, tool: unknown) => vscode.Disposable };
    }
  ).lm;
  if (!lm || typeof lm.registerTool !== 'function') {
    return new vscode.Disposable(() => {});
  }

  // 1. Tool: animoria_searchAssets
  const searchToolDisposable = lm.registerTool('animoria_searchAssets', {
    invoke: async (
      options: { input?: SearchAssetsToolParameters },
      _token: vscode.CancellationToken,
    ) => {
      const analysis = getAnalysis();
      if (!analysis) {
        return { content: [{ type: 'text', value: 'Workspace is not yet analyzed by Animoria.' }] };
      }

      const query = options?.input?.query?.toLowerCase() ?? '';
      const format = options?.input?.format?.toLowerCase();
      const kind = options?.input?.kind?.toLowerCase();

      let matched = analysis.assets;

      if (query) {
        matched = matched.filter(
          (a) => a.name.toLowerCase().includes(query) || a.stem.toLowerCase().includes(query),
        );
      }
      if (format) {
        matched = matched.filter((a) => a.format.toLowerCase() === format);
      }
      if (kind) {
        matched = matched.filter((a) => a.kind.toLowerCase() === kind);
      }

      const summary = matched.slice(0, 50).map((a) => ({
        id: a.id,
        name: a.name,
        path: a.path,
        relative_path: a.relative_path,
        format: a.format,
        kind: a.kind,
        size_bytes: a.size_bytes,
        dimensions: a.dimensions,
      }));

      return {
        content: [
          {
            type: 'text',
            value: JSON.stringify({ total: matched.length, assets: summary }, null, 2),
          },
        ],
      };
    },
  });
  disposables.push(searchToolDisposable);

  // 2. Tool: animoria_getGovernanceReport
  const reportToolDisposable = lm.registerTool('animoria_getGovernanceReport', {
    invoke: async (_options: unknown, _token: vscode.CancellationToken) => {
      const analysis = getAnalysis();
      if (!analysis) {
        return { content: [{ type: 'text', value: 'Workspace is not yet analyzed by Animoria.' }] };
      }

      const dupGroups = getDuplicateGroups();
      const unreferenced = analysis.diagnostics.filter(
        (d) => d.rule_id === 'no-unreferenced-assets',
      );

      const report = {
        healthScore: analysis.health_score?.score ?? 100,
        grade: analysis.health_score?.grade ?? 'A',
        totalAssets: analysis.assets.length,
        totalFindings: analysis.diagnostics.length,
        duplicateGroupsCount: dupGroups.length,
        unreferencedCount: unreferenced.length,
        unreferencedAssets: unreferenced.map((u) => u.target_asset_path),
      };

      return {
        content: [
          {
            type: 'text',
            value: JSON.stringify(report, null, 2),
          },
        ],
      };
    },
  });
  disposables.push(reportToolDisposable);

  return vscode.Disposable.from(...disposables);
}
