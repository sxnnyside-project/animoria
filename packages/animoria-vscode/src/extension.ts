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
let lastReferences: UsageReference[] = [];
let lastDuplicateGroups: DuplicateGroup[] = [];
let hoverRegistration: vscode.Disposable | undefined;
let diagnosticPublisher: DiagnosticPublisher | undefined;
let activeEditorTracker: ActiveEditorTracker | undefined;

/**
 * Adapts this extension's module-level scan state (`lastAnalysis`,
 * `lastReferences`, `lastDuplicateGroups`) into the `WorkspaceSession`
 * interface `VsCodeHostBridge` expects. Built fresh on every panel open
 * rather than cached, so a panel always reads whatever the last scan left
 * behind — there is exactly one workspace root today (`folders[0]`), so
 * `indexerForRoot`/`indexerForPath` ignore the id/path they're given.
 */
function createSessionAdapter(): WorkspaceSession {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const rootPath = folders[0]?.uri.fsPath ?? process.cwd();
  const refCounts: Record<string, number> = {};
  for (const r of lastReferences) {
    const p = r.asset_id;
    if (p) refCounts[p] = (refCounts[p] ?? 0) + 1;
  }

  return {
    identity: 'root',
    roots: folders.map((f, i) => ({ id: `root-${i}`, name: f.name, path: f.uri.fsPath })),
    getAnalysis: (): MultiRootAnalysis => ({
      roots: lastAnalysis ? [lastAnalysis] : [],
      assets: lastAnalysis?.assets ?? [],
      duplicateGroups: lastDuplicateGroups,
      referenceCounts: refCounts,
      readiness: { referencesResolved: true },
    }),
    indexerForRoot: (_id: string) =>
      lastAnalysis
        ? {
            getAnalysis: () => lastAnalysis as WorkspaceAnalysis,
            usageReferencesFor: (assetPath: string) =>
              lastReferences.filter((r) => r.asset_id === assetPath),
          }
        : null,
    indexerForPath: (_path: string) => ({
      root: { path: rootPath },
      indexer: {
        usageReferencesFor: (assetPath: string) =>
          lastReferences.filter((r) => r.asset_id === assetPath),
      },
    }),
  };
}

/**
 * Extension entry point: wires the tree view, hover provider, diagnostics,
 * file watcher, and every `animoria.*` command to a single daemon client and
 * the module-level scan state those commands and `scanWorkspace` share.
 * Runs one scan immediately so the tree/hover/diagnostics are populated
 * before the developer does anything, then re-scans on file changes and on
 * workspace-folder changes.
 */
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
    // "Run Governance" must leave something to look at — a rescan alone updates
    // the tree silently, which is indistinguishable from nothing having
    // happened. Opening the report is what makes this an audit rather than a
    // background refresh, and matches JetBrains' `runGovernance()`.
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
        // Routes through the daemon's plan-based remediation (`.animoria/trash/`
        // staging, restorable) instead of vscode.workspace.fs.delete, which
        // bypasses Animoria's trash system entirely.
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

/**
 * Runs a fresh daemon scan of the first workspace folder and fans the result
 * out to every surface that renders it: the tree view, diagnostics, hover
 * provider (all three read the module-level `lastAnalysis` this sets), and
 * every open `AnimoriaWorkspacePanel`. Only the first folder is scanned —
 * true multi-root support is a `WorkspaceSession`-level concern this
 * extension doesn't yet implement, matching `createSessionAdapter`.
 */
async function scanWorkspace(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0 || !daemonClient) return;

  const first = folders[0];
  if (!first) return;
  const rootPath = first.uri.fsPath;

  try {
    const result = await daemonClient.scan(rootPath);
    lastAnalysis = result.analysis;
    lastReferences = result.references;
    lastDuplicateGroups = result.duplicate_groups;

    treeProvider.updateAnalysis(result.analysis, result.references, result.duplicate_groups);

    if (diagnosticPublisher) {
      diagnosticPublisher.publish(result.analysis);
    }

    const refCounts: Record<string, number> = {};
    for (const r of result.references) {
      const p = r.asset_id;
      if (p) refCounts[p] = (refCounts[p] ?? 0) + 1;
    }

    AnimoriaWorkspacePanel.broadcast({
      roots: [result.analysis],
      assets: result.analysis.assets,
      duplicateGroups: result.duplicate_groups,
      referenceCounts: refCounts,
      readiness: { referencesResolved: true },
    });

    vscode.window.setStatusBarMessage(
      `Animoria: ${result.analysis.assets.length} assets indexed (Health: ${result.analysis.health_score?.score ?? 100}%)`,
      4000
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Animoria Scan Failed: ${msg}`);
  }
}

/**
 * Renders `lastAnalysis` as Markdown into the read-only
 * `animoria-governance` virtual document. Falls back to an ordinary
 * untitled Markdown document if the virtual-document scheme fails to open
 * (`vscode.workspace.openTextDocument` on a registered scheme can throw if
 * the provider hasn't been registered yet, e.g. very early in activation).
 */
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

/**
 * Copies an integration snippet for `asset` to the clipboard — straight to
 * the clipboard when only one framework's generator matched, or via a quick
 * pick when several did (e.g. an SVG has both a React and a plain-HTML
 * snippet). Snippet generation itself is Core's (`generateSnippetsForAsset`);
 * this only decides how to present the choice and deliver the result.
 */
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
