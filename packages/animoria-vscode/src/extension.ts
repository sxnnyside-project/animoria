import { basename } from 'node:path';
import type { Asset, DuplicateGroup, UsageReference, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';
import { VsCodeDaemonClient } from './daemon/daemon-client.js';
import { DiagnosticPublisher } from './diagnostics/diagnostic-publisher.js';
import { OutputChannelLogger } from './logging/output-channel-logger.js';
import { AnimoriaWorkspacePanel } from './panels/animoria-workspace-panel.js';
import {
  type MultiRootAnalysis,
  type WorkspaceSession,
  generateSnippetsForAsset,
} from './panels/vscode-host-bridge.js';
import { AnimoriaHoverProvider, HOVER_LANGUAGES } from './providers/animoria-hover-provider.js';
import {
  AnimoriaGovernanceIssueItem,
  AnimoriaTreeProvider,
} from './providers/animoria-tree-provider.js';
import { AnimoriaFileWatcher } from './watchers/animoria-file-watcher.js';
import { ActiveEditorTracker } from './workspace-context/active-editor-tracker.js';
import { buildIntegrationContext } from './workspace-context/build-integration-context.js';
import { ensureGitignoreContainsAnimoria } from './workspace-context/gitignore.js';

export class GovernanceReportContentProvider implements vscode.TextDocumentContentProvider {
  private _content = '';
  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  provideTextDocumentContent(): string {
    return this._content;
  }

  update(content: string): void {
    this._content = content;
    this._onDidChange.fire(GOVERNANCE_REPORT_URI);
  }
}

const GOVERNANCE_REPORT_SCHEME = 'animoria-governance';
const GOVERNANCE_REPORT_URI = vscode.Uri.parse(`${GOVERNANCE_REPORT_SCHEME}:/Governance Report.md`);
const governanceReportContentProvider = new GovernanceReportContentProvider();

let treeProvider: AnimoriaTreeProvider;
let daemonClient: VsCodeDaemonClient | undefined;
let fileWatcher: AnimoriaFileWatcher | undefined;
let lastAnalysis: WorkspaceAnalysis | undefined;
let lastAnalysisRoots: WorkspaceAnalysis[] = [];
let lastReferences: UsageReference[] = [];
let lastDuplicateGroups: DuplicateGroup[] = [];
let hoverRegistration: vscode.Disposable | undefined;
let diagnosticPublisher: DiagnosticPublisher | undefined;
let activeEditorTracker: ActiveEditorTracker | undefined;

function createSessionAdapter(): WorkspaceSession {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const rootPath = folders[0]?.uri.fsPath ?? process.cwd();
  const refCounts: Record<string, number> = {};
  for (const r of lastReferences) {
    const p = r.asset_id;
    if (p) refCounts[p] = (refCounts[p] ?? 0) + 1;
  }

  const effectiveRoots =
    lastAnalysisRoots.length > 0 ? lastAnalysisRoots : lastAnalysis ? [lastAnalysis] : [];
  const allAssets =
    effectiveRoots.length > 0
      ? effectiveRoots.flatMap((r) => r.assets)
      : (lastAnalysis?.assets ?? []);

  return {
    identity: 'root',
    roots: folders.map((f, i) => ({ id: `root-${i}`, name: f.name, path: f.uri.fsPath })),
    getAnalysis: (): MultiRootAnalysis => ({
      roots: effectiveRoots,
      assets: allAssets,
      duplicateGroups: lastDuplicateGroups,
      referenceCounts: refCounts,
      readiness: { referencesResolved: true },
    }),
    indexerForRoot: (id: string) => {
      const index = Number(id.replace('root-', ''));
      const analysis =
        effectiveRoots[index] ?? effectiveRoots.find((r) => r.root_id === id) ?? lastAnalysis;
      return analysis
        ? {
            getAnalysis: () => analysis,
            usageReferencesFor: (assetPath: string) =>
              lastReferences.filter((r) => r.asset_id === assetPath),
          }
        : null;
    },
    indexerForPath: (path: string) => {
      const match = folders.find((f) => path.startsWith(f.uri.fsPath));
      return {
        root: { path: match?.uri.fsPath ?? rootPath },
        indexer: {
          usageReferencesFor: (assetPath: string) =>
            lastReferences.filter((r) => r.asset_id === assetPath),
        },
      };
    },
  };
}

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Animoria');
  context.subscriptions.push(outputChannel);
  const logger = new OutputChannelLogger(outputChannel);

  diagnosticPublisher = new DiagnosticPublisher();
  context.subscriptions.push(diagnosticPublisher);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      GOVERNANCE_REPORT_SCHEME,
      governanceReportContentProvider
    )
  );

  const initialWorkspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  treeProvider = new AnimoriaTreeProvider(initialWorkspacePath);

  activeEditorTracker = new ActiveEditorTracker();
  context.subscriptions.push(activeEditorTracker);

  const treeView = vscode.window.createTreeView('animoria.gallery', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  daemonClient = new VsCodeDaemonClient(undefined, context.extensionPath);

  const refreshCommand = vscode.commands.registerCommand('animoria.refresh', () => scanWorkspace());

  const openPreviewCommand = vscode.commands.registerCommand(
    'animoria.openPreview',
    (arg: Asset | { asset: Asset }) => {
      const asset = arg && 'asset' in arg ? arg.asset : arg;
      if (!asset || typeof asset !== 'object' || !('path' in asset)) return;

      AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'inspector', {
        tab: 'assets',
        assetPath: asset.path,
      });
    }
  );

  const openWorkspaceCommand = vscode.commands.registerCommand('animoria.openWorkspace', () => {
    AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'inspector', {
      tab: 'assets',
    });
  });

  const revealCommand = vscode.commands.registerCommand(
    'animoria.revealInExplorer',
    async (item: { asset?: Asset; path?: string } | Asset) => {
      const path = 'path' in item ? item.path : item.asset?.path;
      if (!path) return;
      const uri = vscode.Uri.file(path);
      await vscode.commands.executeCommand('revealInExplorer', uri);
    }
  );

  const searchCommand = vscode.commands.registerCommand('animoria.search', () => {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Search visual assets...';
    quickPick.items = treeProvider.getAssets().map((a) => ({
      label: a.stem,
      description: `${a.kind} · ${a.format}`,
      detail: a.path,
    }));
    quickPick.onDidChangeValue((query) => {
      treeProvider.setSearchQuery(query);
    });
    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0];
      const asset = selected
        ? treeProvider.getAssets().find((a) => a.path === selected.detail)
        : undefined;
      quickPick.hide();
      if (asset) {
        void vscode.commands.executeCommand('animoria.openPreview', asset);
      }
    });
    quickPick.onDidHide(() => {
      treeProvider.setSearchQuery('');
      quickPick.dispose();
    });
    quickPick.show();
  });

  const governanceCommand = vscode.commands.registerCommand('animoria.runGovernance', async () => {
    // Rescan alone updates the tree silently; opening the report makes this an audit.
    await scanWorkspace();
    if (lastAnalysis) await viewGovernanceReport();
  });

  const viewReportCommand = vscode.commands.registerCommand('animoria.viewGovernanceReport', () =>
    viewGovernanceReport()
  );

  const generateSnippetCommand = vscode.commands.registerCommand(
    'animoria.generateSnippet',
    (arg: Asset | { asset: Asset }) => {
      const asset = arg && 'asset' in arg ? arg.asset : arg;
      if (asset) generateSnippet(asset);
    }
  );

  const toggleViewModeCommand = vscode.commands.registerCommand('animoria.toggleViewMode', () => {
    const mode = treeProvider.toggleViewMode();
    vscode.window.setStatusBarMessage(
      `Animoria: ${mode === 'tree' ? 'Directory Tree' : 'Flat'} view`,
      3000
    );
  });

  const viewFindingsCommand = vscode.commands.registerCommand('animoria.viewFindings', () => {
    AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'findings', {
      tab: 'findings',
    });
  });

  const viewDuplicatesCommand = vscode.commands.registerCommand('animoria.viewDuplicates', () => {
    AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'duplicates', {
      tab: 'duplicates',
    });
  });

  const exportReportCommand = vscode.commands.registerCommand(
    'animoria.exportGovernanceReport',
    async () => {
      if (!lastAnalysis) {
        vscode.window.showWarningMessage('Animoria: No governance report available to export.');
        return;
      }
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('animoria-governance-report.md'),
        filters: { Markdown: ['md'] },
      });
      if (uri) {
        const content = [
          '# Animoria Visual Governance Report',
          '',
          `**Health Score:** ${lastAnalysis.health_score?.score ?? 100}/100`,
          `**Total Assets Analyzed:** ${lastAnalysis.assets.length}`,
          `**Total Findings:** ${lastAnalysis.diagnostics.length}`,
          '',
          ...lastAnalysis.diagnostics.map(
            (d) => `- [${d.severity}] ${d.rule_id}: ${d.message} (\`${d.target_asset_path}\`)`
          ),
        ].join('\n');
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        vscode.window.showInformationMessage(`Animoria: Report exported to ${uri.fsPath}`);
      }
    }
  );

  const deleteAssetCommand = vscode.commands.registerCommand(
    'animoria.deleteAsset',
    async (item: { asset?: Asset; path?: string } | Asset | AnimoriaGovernanceIssueItem) => {
      let assetId: string | undefined;
      let path: string | undefined;

      if (item instanceof AnimoriaGovernanceIssueItem) {
        assetId = item.diagnostic.target_asset_id;
        path = item.diagnostic.target_asset_path;
      } else {
        path = 'path' in item ? item.path : item.asset?.path;
        assetId = 'asset' in item ? item.asset?.id : (item as Asset).id;
      }
      if (!path || !assetId) return;

      const confirm = await vscode.window.showWarningMessage(
        `Move asset "${path.split(/[/\\]/).pop()}" to trash?`,
        { modal: true },
        'Move to Trash'
      );
      if (confirm !== 'Move to Trash') return;

      if (!daemonClient) {
        vscode.window.showErrorMessage('Animoria: daemon is not running.');
        return;
      }

      const folders = vscode.workspace.workspaceFolders ?? [];
      const workspacePath = folders[0]?.uri.fsPath ?? process.cwd();

      try {
        const autoGitignore = vscode.workspace
          .getConfiguration('animoria')
          .get<boolean>('autoGitignore', true);
        if (autoGitignore) {
          void ensureGitignoreContainsAnimoria(workspacePath);
        }

        // Uses the daemon's plan-based trash (.animoria/trash/, restorable), not vscode.workspace.fs.delete.
        await daemonClient.trashAsset(workspacePath, assetId, path);
        void scanWorkspace();
        vscode.window.showInformationMessage('Animoria: Asset moved to trash.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to delete asset: ${msg}`);
      }
    }
  );

  const startCleanupReviewCommand = vscode.commands.registerCommand(
    'animoria.startCleanupReview',
    () => {
      AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'cleanup', {
        tab: 'cleanup',
      });
    }
  );

  const restoreCleanupCommand = vscode.commands.registerCommand('animoria.restoreCleanup', () => {
    AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'cleanup', {
      tab: 'cleanup',
    });
  });

  const resolveDuplicatesCommand = vscode.commands.registerCommand(
    'animoria.resolveDuplicates',
    () => {
      AnimoriaWorkspacePanel.show(context, createSessionAdapter, () => daemonClient, 'duplicates', {
        tab: 'duplicates',
      });
    }
  );

  context.subscriptions.push(
    treeView,
    refreshCommand,
    openPreviewCommand,
    openWorkspaceCommand,
    revealCommand,
    searchCommand,
    governanceCommand,
    viewReportCommand,
    viewFindingsCommand,
    viewDuplicatesCommand,
    exportReportCommand,
    deleteAssetCommand,
    startCleanupReviewCommand,
    restoreCleanupCommand,
    resolveDuplicatesCommand,
    generateSnippetCommand,
    toggleViewModeCommand
  );

  // Setup hover provider
  hoverRegistration = vscode.languages.registerHoverProvider(
    HOVER_LANGUAGES.map((lang) => ({ language: lang })),
    new AnimoriaHoverProvider(() => lastAnalysis ?? null, treeProvider)
  );
  context.subscriptions.push(hoverRegistration);

  // Initial scan
  await scanWorkspace();

  // Watch for changes
  fileWatcher = new AnimoriaFileWatcher(() => {
    void scanWorkspace();
  });
  context.subscriptions.push(fileWatcher);

  const workspaceFoldersWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await scanWorkspace();
  });
  context.subscriptions.push(workspaceFoldersWatcher);
}

/** Shuts down the daemon subprocess so it doesn't outlive the extension host. */
export async function deactivate() {
  if (daemonClient) {
    await daemonClient.shutdown();
    daemonClient = undefined;
  }
}

// Scans all open workspace folders and aggregates multi-root analysis.
async function scanWorkspace(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0 || !daemonClient) return;

  try {
    const enableAuditLog = vscode.workspace
      .getConfiguration('animoria')
      .get<boolean>('enableAuditLog', false);
    const autoGitignore = vscode.workspace
      .getConfiguration('animoria')
      .get<boolean>('autoGitignore', true);

    const scannedRoots: WorkspaceAnalysis[] = [];
    const allReferences: UsageReference[] = [];
    const allDuplicateGroups: DuplicateGroup[] = [];

    for (const folder of folders) {
      const rootPath = folder.uri.fsPath;
      try {
        const result = await daemonClient.scan(rootPath, [], enableAuditLog);
        scannedRoots.push(result.analysis);
        allReferences.push(...result.references);
        allDuplicateGroups.push(...result.duplicate_groups);

        if (autoGitignore && result.analysis.assets.length > 0) {
          void ensureGitignoreContainsAnimoria(rootPath);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Animoria Scan Failed for "${folder.name}": ${msg}`);
      }
    }

    const firstScanned = scannedRoots[0];
    const firstFolder = folders[0];
    if (!firstScanned || !firstFolder) return;

    lastAnalysisRoots = scannedRoots;
    lastReferences = allReferences;
    lastDuplicateGroups = allDuplicateGroups;

    let combinedHealth = firstScanned.health_score;
    if (scannedRoots.length > 1) {
      try {
        combinedHealth = await daemonClient.aggregateHealthScores(
          scannedRoots.map((r) => ({
            report: r.health_score,
            asset_count: r.assets.length,
          }))
        );
      } catch {
        // Fallback to first root score
      }
    }

    const combinedAnalysis: WorkspaceAnalysis = {
      root_id: scannedRoots.length === 1 ? firstScanned.root_id : 'multi-root',
      root_path: firstFolder.uri.fsPath,
      state: scannedRoots.every((r) => r.state === 'ready') ? 'ready' : 'incomplete',
      assets: scannedRoots.flatMap((r) => r.assets),
      diagnostics: scannedRoots.flatMap((r) => r.diagnostics),
      health_score: combinedHealth,
      indexed_at_ms: Date.now(),
    };

    lastAnalysis = combinedAnalysis;

    treeProvider.updateAnalysis(combinedAnalysis, allReferences, allDuplicateGroups);

    if (diagnosticPublisher) {
      diagnosticPublisher.publish(combinedAnalysis);
    }

    const refCounts: Record<string, number> = {};
    for (const r of allReferences) {
      const p = r.asset_id;
      if (p) refCounts[p] = (refCounts[p] ?? 0) + 1;
    }

    AnimoriaWorkspacePanel.broadcast({
      roots: scannedRoots,
      assets: combinedAnalysis.assets,
      duplicateGroups: allDuplicateGroups,
      referenceCounts: refCounts,
      readiness: { referencesResolved: true },
    });

    const rootSummary =
      scannedRoots.length > 1 ? ` across ${scannedRoots.length} workspace folders` : '';
    vscode.window.setStatusBarMessage(
      `Animoria: ${combinedAnalysis.assets.length} assets indexed${rootSummary} (Health: ${combinedAnalysis.health_score?.score ?? 100}%)`,
      4000
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Animoria Scan Failed: ${msg}`);
  }
}

// Falls back to a plain untitled document if the virtual-document scheme isn't registered yet (e.g. early in activation).
async function viewGovernanceReport(): Promise<void> {
  if (!lastAnalysis) {
    vscode.window.showWarningMessage(
      'Animoria: No governance report available yet. Run a scan first.'
    );
    return;
  }

  const lines = [
    '# Animoria Visual Governance Report',
    '',
    `**Health Score:** ${lastAnalysis.health_score?.score ?? 100}/100`,
    '',
    `**Total Assets Analyzed:** ${lastAnalysis.assets.length}`,
    `**Total Findings:** ${lastAnalysis.diagnostics.length}`,
    '',
    '## Category Breakdown',
    '',
  ];

  if (lastAnalysis.health_score?.categories) {
    for (const cat of lastAnalysis.health_score.categories) {
      lines.push(`- **${cat.category}:** ${cat.score}% (${cat.violations_count} issues)`);
    }
  }

  if (lastAnalysis.diagnostics.length > 0) {
    lines.push('', '## Diagnostics', '');
    for (const d of lastAnalysis.diagnostics) {
      lines.push(`- **[${d.severity}] ${d.rule_id}:** ${d.message} (\`${d.target_asset_path}\`)`);
    }
  }

  const markdownContent = lines.join('\n');
  governanceReportContentProvider.update(markdownContent);

  try {
    const doc = await vscode.workspace.openTextDocument(GOVERNANCE_REPORT_URI);
    await vscode.window.showTextDocument(doc, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });
  } catch {
    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: markdownContent,
    });
    await vscode.window.showTextDocument(doc, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }
}

async function generateSnippet(asset: Asset): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const ctx = buildIntegrationContext(asset, folder, activeEditorTracker);
  const snippets = generateSnippetsForAsset(asset, ctx.importPath, folder);

  if (snippets.length === 0) {
    vscode.window.showWarningMessage(
      `Animoria: No snippet generator supports ${asset.format} assets.`
    );
    return;
  }

  if (snippets.length === 1) {
    const s = snippets[0]!;
    const fullSnippet = s.imports ? `${s.imports}\n\n${s.code}` : s.code;
    await vscode.env.clipboard.writeText(fullSnippet);
    vscode.window.setStatusBarMessage(`Animoria: ${s.label} snippet copied to clipboard`, 3000);
    return;
  }

  const items = snippets.map((s) => ({
    label: s.label,
    description: s.installHint ?? '',
    detail: s.imports ? `${s.imports}\n${s.code}` : s.code,
    snippet: s,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Select framework snippet to copy for ${asset.name}`,
    title: 'Copy Integration Snippet',
  });

  if (picked) {
    const s = picked.snippet;
    const fullSnippet = s.imports ? `${s.imports}\n\n${s.code}` : s.code;
    await vscode.env.clipboard.writeText(fullSnippet);
    vscode.window.setStatusBarMessage(`Animoria: ${s.label} snippet copied to clipboard`, 3000);
  }
}
