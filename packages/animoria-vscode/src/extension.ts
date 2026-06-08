import * as vscode from 'vscode';
import { join, basename } from 'path';
import { Animoria, ThumbnailGenerator, GovernanceAnalyzer } from '@animoria/core';
import type { AnimoriaAsset, GovernanceReport } from '@animoria/core';
import { AnimoriaTreeProvider } from './providers/AnimoriaTreeProvider';
import type { AnimoriaGovernanceIssueItem } from './providers/AnimoriaTreeProvider';
import { AnimoriaPreviewPanel } from './panels/AnimoriaPreviewPanel';
import { AnimoriaFileWatcher } from './watchers/AnimoriaFileWatcher';
import { resolveChromiumPath } from './utils/chromium-path';
import { resolveScopePath } from './utils/resolve-scope-path';

let treeProvider: AnimoriaTreeProvider;
let fileWatcher: AnimoriaFileWatcher | undefined;
let lastGovernanceReport: GovernanceReport | undefined;

export async function activate(context: vscode.ExtensionContext) {
  // 1. Instantiate tree provider
  const initialWorkspacePath =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  treeProvider = new AnimoriaTreeProvider(initialWorkspacePath);

  // 2. Register tree view
  const treeView = vscode.window.createTreeView('animoria.gallery', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  // 3. Register commands

  const refreshCommand = vscode.commands.registerCommand(
    'animoria.refresh',
    () => runScan(context)
  );

  const openPreviewCommand = vscode.commands.registerCommand(
    'animoria.openPreview',
    (asset: AnimoriaAsset) => {
      if (!asset) return;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspacePath = workspaceFolders?.[0]?.uri.fsPath;
      const thumbPath = treeProvider.getThumbnail(asset.path);
      AnimoriaPreviewPanel.render(
        context.extensionUri,
        asset,
        thumbPath,
        workspacePath,
      );
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

  const searchCommand = vscode.commands.registerCommand(
    'animoria.search',
    () => {
      const quickPick = vscode.window.createQuickPick();
      quickPick.placeholder = 'Search animations...';
      quickPick.items = treeProvider.getAssets().map(a => ({
        label: a.stem,
        description: a.metadata
          ? `${a.metadata.fps}fps · ${a.metadata.durationSeconds}s`
          : a.status,
        detail: a.path,
      }));
      quickPick.onDidChangeValue(query => {
        treeProvider.setQuery(query);
      });
      quickPick.onDidHide(() => {
        treeProvider.setQuery('');
        quickPick.dispose();
      });
      quickPick.show();
    }
  );

  const governanceCommand = vscode.commands.registerCommand(
    'animoria.runGovernance',
    () => runGovernance()
  );

  const exportCommand = vscode.commands.registerCommand(
    'animoria.exportGovernanceReport',
    () => exportGovernanceReport()
  );

  const deleteCommand = vscode.commands.registerCommand(
    'animoria.deleteAsset',
    async (item: AnimoriaGovernanceIssueItem) => {
      if (!item?.issue) return;
      const asset = item.issue.asset;
      const confirm = await vscode.window.showWarningMessage(
        `Delete ${asset.name} permanently from disk?`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;
      await vscode.workspace.fs.delete(vscode.Uri.file(asset.path));
      treeProvider.removeAsset(asset.path);
      vscode.window.setStatusBarMessage(`Animoria: Deleted ${asset.name}`, 3000);
    }
  );

  context.subscriptions.push(
    treeView,
    refreshCommand,
    openPreviewCommand,
    revealCommand,
    searchCommand,
    governanceCommand,
    exportCommand,
    deleteCommand,
  );

  // 4. Run initial scan
  await runScan(context);

  // 5. Start file watcher
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspacePath = workspaceFolders[0].uri.fsPath;

    fileWatcher = new AnimoriaFileWatcher({
      onAssetAdded: (asset) => {
        treeProvider.addAsset(asset);
        vscode.window.setStatusBarMessage(`Animoria: Added ${asset.name}`, 3000);
      },
      onAssetChanged: (asset) => {
        treeProvider.updateAsset(asset);
        vscode.window.setStatusBarMessage(`Animoria: Updated ${asset.name}`, 3000);
      },
      onAssetRemoved: (path) => {
        const name = path.split('/').pop() ?? path;
        treeProvider.removeAsset(path);
        vscode.window.setStatusBarMessage(`Animoria: Removed ${name}`, 3000);
      },
    });

    fileWatcher.start(workspacePath);
    context.subscriptions.push({ dispose: () => fileWatcher?.dispose() });
  }

  // 6. Watch for workspace folder changes
  const workspaceFoldersWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    fileWatcher?.dispose();
    runScan(context);
  });
  context.subscriptions.push(workspaceFoldersWatcher);
}

async function runScan(_context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('Animoria: No workspace folder open.');
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Animoria: Scanning workspace...',
      cancellable: false,
    },
    async (progress) => {
      const animoria = new Animoria({
        workspacePath,
        onScanComplete: (count) => {
          progress.report({ message: `Found ${count} assets, parsing...` });
        },
        onAssetParsed: (_asset, index, total) => {
          progress.report({ message: `Parsing ${index + 1}/${total}...` });
        },
      });

      const result = await animoria.run();
      treeProvider.setAssets(result.assets);

      vscode.window.setStatusBarMessage(
        `Animoria: ${result.parsed} assets · ${result.failed} errors · ${Math.round(result.durationMs)}ms`,
        5000
      );

      // Thumbnail generation — non-blocking background task
      const thumbnailsEnabled = vscode.workspace
        .getConfiguration('animoria')
        .get<boolean>('enableThumbnails', true);

      if (thumbnailsEnabled) {
        const chromiumPath = resolveChromiumPath();

        if (!chromiumPath) {
          vscode.window.showWarningMessage(
            'Animoria: Chrome not found. Thumbnails disabled. ' +
            'Set animoria.chromiumPath in settings to enable.',
            'Open Settings'
          ).then(selection => {
            if (selection === 'Open Settings') {
              vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'animoria.chromiumPath'
              );
            }
          });
        } else {
          // Fire-and-forget — gallery is immediately usable
          generateThumbnailsInBackground(
            result.assets,
            workspacePath,
            chromiumPath,
            treeProvider
          );
        }
      }
    }
  );
}

async function generateThumbnailsInBackground(
  assets: AnimoriaAsset[],
  workspacePath: string,
  chromiumPath: string,
  provider: AnimoriaTreeProvider,
): Promise<void> {
  const generator = new ThumbnailGenerator({
    workspacePath,
    chromiumPath,
    frame: 'middle',
    concurrency: 4,
  });

  try {
    const batch = await generator.generateBatch(assets);

    for (const r of batch.results) {
      if (r.thumbnailPath) {
        provider.setThumbnail(r.asset.path, r.thumbnailPath);
      }
    }

    vscode.window.setStatusBarMessage(
      `Animoria: ${batch.generated} thumbnails generated · ` +
      `${batch.fromCache} cached · ${batch.failed} failed`,
      5000
    );
  } catch (err) {
    console.error('Animoria thumbnail generation failed:', err);
  } finally {
    await generator.dispose();
  }
}

async function runGovernance(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const assets = treeProvider.getAssets();

  if (assets.length === 0) {
    vscode.window.showInformationMessage(
      'Animoria: No assets found. Run a scan first.'
    );
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Animoria: Running governance analysis...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: `Analyzing ${assets.length} assets...` });

      const analyzer = new GovernanceAnalyzer({
        workspacePath,
        assets,
        overusedThreshold: vscode.workspace
          .getConfiguration('animoria')
          .get<number>('governance.overusedThreshold', 10),
        scopeResolver: (asset) => resolveScopePath(asset.path, workspacePath),
      });

      const report = await analyzer.analyze();
      lastGovernanceReport = report;
      treeProvider.setGovernanceReport(report);

      const total =
        report.unused.length + report.duplicates.length + report.overused.length;

      const summary = total === 0
        ? 'No governance issues found.'
        : [
            report.unused.length > 0 ? `${report.unused.length} unused` : '',
            report.duplicates.length > 0 ? `${report.duplicates.length} duplicate` : '',
            report.overused.length > 0 ? `${report.overused.length} overused` : '',
          ].filter(Boolean).join(' · ');

      vscode.window.setStatusBarMessage(`Animoria Governance: ${summary}`, 8000);

      if (total > 0) {
        vscode.window.showInformationMessage(
          `Animoria found ${total} governance issue(s): ${summary}`,
          'Export Report'
        ).then(selection => {
          if (selection === 'Export Report') exportGovernanceReport();
        });
      }
    }
  );
}

async function exportGovernanceReport(): Promise<void> {
  if (!lastGovernanceReport) {
    vscode.window.showWarningMessage(
      'Animoria: No governance report available. Run analysis first.'
    );
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  const report = lastGovernanceReport;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultUri = vscode.Uri.file(
    join(workspaceFolders[0].uri.fsPath, `animoria-governance-${timestamp}.md`)
  );

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { 'Markdown': ['md'], 'JSON': ['json'] },
    title: 'Export Governance Report',
  });

  if (!saveUri) return;

  const isJson = saveUri.fsPath.endsWith('.json');
  const content = isJson ? JSON.stringify(report, null, 2) : buildMarkdownReport(report);

  await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf-8'));

  const open = await vscode.window.showInformationMessage(
    `Animoria: Report exported to ${basename(saveUri.fsPath)}`,
    'Open Report'
  );
  if (open === 'Open Report') {
    await vscode.window.showTextDocument(saveUri);
  }
}

function buildMarkdownReport(report: GovernanceReport): string {
  const lines: string[] = [];

  lines.push('# Animoria Governance Report', '');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Total assets analyzed: ${report.totalAssets}`);
  lines.push(`Analysis duration: ${report.durationMs}ms`, '');

  lines.push('## Summary', '');
  lines.push('| Category | Count |');
  lines.push('| :--- | :---: |');
  lines.push(`| 🚫 Unused Assets | ${report.unused.length} |`);
  lines.push(`| 📋 Duplicate Assets | ${report.duplicates.length} |`);
  lines.push(`| 🔥 Overused Assets | ${report.overused.length} |`);
  lines.push('');

  if (report.unused.length > 0) {
    lines.push('## 🚫 Unused Assets', '');
    lines.push('These assets have no detected references in source files.');
    lines.push('Consider removing them to reduce bundle size.', '');
    lines.push('| Asset | Path |');
    lines.push('| :--- | :--- |');
    for (const issue of report.unused) {
      lines.push(`| \`${issue.asset.name}\` | ${issue.asset.path} |`);
    }
    lines.push('');
  }

  if (report.duplicates.length > 0) {
    lines.push('## 📋 Duplicate Assets', '');
    lines.push('These assets share identical file content.');
    lines.push('Keep one canonical copy and update references.', '');
    lines.push('| Asset | Identical To | Path |');
    lines.push('| :--- | :--- | :--- |');
    for (const issue of report.duplicates) {
      const others = issue.duplicateOf?.map(a => `\`${a.name}\``).join(', ') ?? '—';
      lines.push(`| \`${issue.asset.name}\` | ${others} | ${issue.asset.path} |`);
    }
    lines.push('');
  }

  if (report.overused.length > 0) {
    lines.push('## 🔥 Overused Assets', '');
    lines.push('These assets appear in many source files.');
    lines.push('Consider whether they should be centralized or split.', '');
    lines.push('| Asset | References | Path |');
    lines.push('| :--- | :---: | :--- |');
    for (const issue of report.overused) {
      lines.push(`| \`${issue.asset.name}\` | ${issue.referenceCount} | ${issue.asset.path} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by [Animoria](https://github.com/sxnnyside/animoria)*');

  return lines.join('\n');
}

export function deactivate() {
  fileWatcher?.dispose();
}
