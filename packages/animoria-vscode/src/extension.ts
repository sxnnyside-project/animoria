import { basename, join } from 'node:path';
import type {
  Asset,
  DuplicateGroup,
  RuleDiagnostic,
  UsageReference,
  WorkspaceAnalysis,
} from '@animoria/contracts';
import * as vscode from 'vscode';
import { DiagnosticPublisher } from './diagnostics/diagnostic-publisher.js';
import { OutputChannelLogger } from './logging/output-channel-logger.js';
import { AnimoriaHoverProvider, HOVER_LANGUAGES } from './providers/animoria-hover-provider.js';
import {
  AnimoriaTreeProvider,
  type AnimoriaGovernanceIssueItem,
} from './providers/animoria-tree-provider.js';
import { ActiveEditorTracker } from './utils/active-editor-tracker.js';
import { buildIntegrationContext } from './utils/build-integration-context.js';
import { AnimoriaFileWatcher } from './watchers/animoria-file-watcher.js';
import { VsCodeDaemonClient } from './daemon/daemon-client.js';

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
let hoverRegistration: vscode.Disposable | undefined;
let diagnosticPublisher: DiagnosticPublisher | undefined;
let activeEditorTracker: ActiveEditorTracker | undefined;

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

  daemonClient = new VsCodeDaemonClient();

  const refreshCommand = vscode.commands.registerCommand('animoria.refresh', () => scanWorkspace());

  const openPreviewCommand = vscode.commands.registerCommand(
    'animoria.openPreview',
    (arg: Asset | { asset: Asset }) => {
      const asset = arg && 'asset' in arg ? arg.asset : arg;
      if (!asset || typeof asset !== 'object' || !('path' in asset)) return;

      void vscode.commands.executeCommand('vscode.open', vscode.Uri.file(asset.path), {
        preview: true,
      });
    }
  );

  const revealCommand = vscode.commands.registerCommand(
    'animoria.revealInExplorer',
    async (item) => {
      if (!item?.asset?.path) return;
      const uri = vscode.Uri.file(item.asset.path);
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

  const governanceCommand = vscode.commands.registerCommand('animoria.runGovernance', () =>
    scanWorkspace()
  );

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
    if (!lastAnalysis || lastAnalysis.diagnostics.length === 0) {
      vscode.window.showInformationMessage('Animoria: No governance findings in workspace.');
      return;
    }
    viewGovernanceReport();
  });

  const viewDuplicatesCommand = vscode.commands.registerCommand('animoria.viewDuplicates', () => {
    const dups = treeProvider.getAssets().filter((a) => a.kind === 'motion' || a.kind === 'static');
    vscode.window.showInformationMessage(
      `Animoria: Tracking ${dups.length} assets across workspace.`
    );
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
          `**Health Score:** ${Math.round(lastAnalysis.health_score.score)}/100 (Grade: ${lastAnalysis.health_score.grade})`,
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
    async (item: any) => {
      const path = item?.asset?.path || item?.path;
      if (!path) return;
      const confirm = await vscode.window.showWarningMessage(
        `Move asset "${path.split(/[/\\]/).pop()}" to trash?`,
        { modal: true },
        'Move to Trash'
      );
      if (confirm === 'Move to Trash') {
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(path), { useTrash: true });
          void scanWorkspace();
          vscode.window.showInformationMessage(`Animoria: Asset moved to trash.`);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to delete asset: ${err.message}`);
        }
      }
    }
  );

  const startCleanupReviewCommand = vscode.commands.registerCommand(
    'animoria.startCleanupReview',
    () => {
      vscode.window.showInformationMessage('Animoria: Cleanup review scan triggered.');
      void scanWorkspace();
    }
  );

  const restoreCleanupCommand = vscode.commands.registerCommand('animoria.restoreCleanup', () => {
    vscode.window.showInformationMessage('Animoria: Opening trash & restoration review.');
  });

  const resolveDuplicatesCommand = vscode.commands.registerCommand(
    'animoria.resolveDuplicates',
    () => {
      vscode.window.showInformationMessage('Animoria: Duplicate resolution wizard.');
      void scanWorkspace();
    }
  );

  context.subscriptions.push(
    treeView,
    refreshCommand,
    openPreviewCommand,
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

export async function deactivate() {
  if (daemonClient) {
    await daemonClient.shutdown();
    daemonClient = undefined;
  }
}

async function scanWorkspace(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0 || !daemonClient) return;

  const first = folders[0];
  if (!first) return;
  const rootPath = first.uri.fsPath;

  try {
    const result = await daemonClient.scan(rootPath);
    lastAnalysis = result.analysis;

    treeProvider.updateAnalysis(result.analysis, result.references, result.duplicate_groups);

    if (diagnosticPublisher) {
      diagnosticPublisher.publish(result.analysis);
    }

    vscode.window.setStatusBarMessage(
      `Animoria: ${result.analysis.assets.length} assets indexed (Health: ${Math.round(result.analysis.health_score.score)}%)`,
      4000
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(`Animoria Scan Failed: ${err.message}`);
  }
}

function viewGovernanceReport(): void {
  if (!lastAnalysis) {
    vscode.window.showWarningMessage('Animoria: No governance report available yet.');
    return;
  }

  const lines = [
    '# Animoria Visual Governance Report',
    '',
    `**Health Score:** ${Math.round(lastAnalysis.health_score.score)}/100 (Grade: ${lastAnalysis.health_score.grade})`,
    '',
    `**Total Assets Analyzed:** ${lastAnalysis.assets.length}`,
    `**Total Findings:** ${lastAnalysis.diagnostics.length}`,
    '',
    '## Category Breakdown',
    '',
  ];

  for (const cat of lastAnalysis.health_score.categories) {
    lines.push(`- **${cat.category}:** ${cat.score}% (${cat.violations_count} issues)`);
  }

  if (lastAnalysis.diagnostics.length > 0) {
    lines.push('', '## Diagnostics', '');
    for (const d of lastAnalysis.diagnostics) {
      lines.push(`- **[${d.severity}] ${d.rule_id}:** ${d.message} (\`${d.target_asset_path}\`)`);
    }
  }

  governanceReportContentProvider.update(lines.join('\n'));
  void vscode.commands.executeCommand('markdown.showPreview', GOVERNANCE_REPORT_URI);
}

function generateSnippet(asset: Asset): void {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const ctx = buildIntegrationContext(asset, folder, activeEditorTracker);

  const snippet = `import ${asset.stem} from '${ctx.importPath}';`;
  void vscode.env.clipboard.writeText(snippet);
  vscode.window.setStatusBarMessage(`Animoria: Snippet copied to clipboard: ${snippet}`, 3000);
}
