import { basename, join } from 'node:path';
import {
  GovernanceAnalyzer,
  StaticAssetScanner,
  ThumbnailEngine,
  WorkspaceIndexer,
  buildJsonReport,
  buildMarkdownReport,
  integrationRegistry,
  logDebug,
  logWarn,
  setLogger,
} from '@animoria/core';
import type {
  AnimoriaAsset,
  AnimoriaStaticAsset,
  DuplicateCandidate,
  DuplicateGroup,
  GovernanceReport,
  WorkspaceIndexUpdate,
} from '@animoria/core';
import * as vscode from 'vscode';
import { purgeExpiredTrashSessions } from './cleanup/CleanupTrash';
import { OutputChannelLogger } from './logging/OutputChannelLogger';
import { AnimoriaCleanupPanel } from './panels/AnimoriaCleanupPanel';
import { AnimoriaDuplicateResolver } from './panels/AnimoriaDuplicateResolver';
import { AnimoriaPreviewPanel, ensureProvidersRegistered } from './panels/AnimoriaPreviewPanel';
import { AnimoriaHoverProvider, HOVER_LANGUAGES } from './providers/AnimoriaHoverProvider';
import { AnimoriaTreeProvider } from './providers/AnimoriaTreeProvider';
import type { AnimoriaGovernanceIssueItem } from './providers/AnimoriaTreeProvider';
import { ActiveEditorTracker } from './utils/ActiveEditorTracker';
import { buildIntegrationContext } from './utils/build-integration-context';
import { resolveScopePath } from './utils/resolve-scope-path';
import { AnimoriaFileWatcher } from './watchers/AnimoriaFileWatcher';

/**
 * Serves the governance report's Markdown content under a single, fixed
 * URI (`animoria-governance:/Governance Report.md`) rather than a fresh
 * `untitled:` document per `viewGovernanceReport()` call.
 *
 * ## Why a fixed URI
 * `vscode.workspace.openTextDocument({ content, language })` allocates a
 * brand-new untitled document — and therefore a brand-new editor tab —
 * on every call. Pairing that with `markdown.showPreview` opened both the
 * raw untitled source tab and its rendered preview tab side by side, and
 * repeated "View Report" clicks kept stacking more of both. Since every
 * call targets the *same* URI here, VS Code reuses the existing preview
 * tab instead of creating a new one; `onDidChange` tells the already-open
 * preview to re-render when the report is refreshed.
 */
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
let indexer: WorkspaceIndexer | undefined;
let fileWatcher: AnimoriaFileWatcher | undefined;
let lastGovernanceReport: GovernanceReport | undefined;
let hoverRegistration: vscode.Disposable | undefined;

const activeGenerators = new Set<{
  generator: ThumbnailEngine;
  abortController: AbortController;
}>();

export async function activate(context: vscode.ExtensionContext) {
  // 0. Install the diagnostic logger before anything else runs, so every
  // subsequent operation — including the initial workspace scan — has
  // somewhere to report intentionally silent failures. See
  // `@animoria/core`'s `logging/logger.ts` for the taxonomy and
  // `OutputChannelLogger` for how entries reach this channel.
  const outputChannel = vscode.window.createOutputChannel('Animoria');
  context.subscriptions.push(outputChannel);
  setLogger(new OutputChannelLogger(outputChannel));

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      GOVERNANCE_REPORT_SCHEME,
      governanceReportContentProvider
    )
  );

  // 1. Instantiate tree provider
  const initialWorkspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  treeProvider = new AnimoriaTreeProvider(initialWorkspacePath);

  // Track the last real, on-disk editor to focus so Snippet Generation can
  // anchor generated import paths to it (see ActiveEditorTracker's doc).
  const activeEditorTracker = new ActiveEditorTracker();
  AnimoriaPreviewPanel.activeEditorTracker = activeEditorTracker;
  context.subscriptions.push(activeEditorTracker);

  // 2. Register tree view
  const treeView = vscode.window.createTreeView('animoria.gallery', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  // 3. Register commands

  const refreshCommand = vscode.commands.registerCommand('animoria.refresh', () =>
    forceFullReindex()
  );

  const openPreviewCommand = vscode.commands.registerCommand(
    'animoria.openPreview',
    (arg: AnimoriaAsset | AnimoriaStaticAsset | { asset: AnimoriaAsset | AnimoriaStaticAsset }) => {
      // Invoked two different ways with two different argument shapes:
      // a tree item's own `.command` passes the plain asset directly
      // (set explicitly in `AnimoriaTreeItem`/`AnimoriaStaticAssetItem`'s
      // constructor), but VS Code's inline `view/item/context` icon
      // invokes the command with the tree item *element* itself — which
      // has the asset nested under `.asset`, not flattened. Unwrapping
      // here means both call paths work for every asset type, instead of
      // the inline icon silently opening the panel with the wrong shape.
      const asset = arg && 'asset' in arg ? arg.asset : arg;
      if (!asset || typeof asset !== 'object' || !('path' in asset)) return;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspacePath = workspaceFolders?.[0]?.uri.fsPath;
      const thumbPath = treeProvider.getThumbnail(asset.path);
      AnimoriaPreviewPanel.render(context, asset, thumbPath, workspacePath);
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
    quickPick.placeholder = 'Search animations...';
    quickPick.items = treeProvider.getAssets().map((a) => ({
      label: a.stem,
      description: a.metadata
        ? `${'fps' in a.metadata ? `${a.metadata.fps}fps · ` : ''}${a.metadata.durationSeconds}s`
        : a.status,
      detail: a.path,
    }));
    quickPick.onDidChangeValue((query) => {
      treeProvider.setQuery(query);
    });
    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0];
      const asset = selected
        ? treeProvider.getAssets().find((a) => a.path === selected.detail)
        : undefined;
      quickPick.hide();
      if (asset) {
        const thumbPath = treeProvider.getThumbnail(asset.path);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        AnimoriaPreviewPanel.render(context, asset, thumbPath, workspaceFolders?.[0]?.uri.fsPath);
      }
    });
    quickPick.onDidHide(() => {
      treeProvider.setQuery('');
      quickPick.dispose();
    });
    quickPick.show();
  });

  const governanceCommand = vscode.commands.registerCommand('animoria.runGovernance', () =>
    runGovernance()
  );

  const viewReportCommand = vscode.commands.registerCommand('animoria.viewGovernanceReport', () =>
    viewGovernanceReport()
  );

  const exportCommand = vscode.commands.registerCommand('animoria.exportGovernanceReport', () =>
    exportGovernanceReport()
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
      // The file watcher will independently observe this deletion and
      // reach the same conclusion via the reactive index; removing it
      // here too just avoids waiting out the debounce window for
      // feedback on an action the user just took themselves.
      treeProvider.removeAsset(asset.path);
      vscode.window.setStatusBarMessage(`Animoria: Deleted ${asset.name}`, 3000);
    }
  );

  const resolveDuplicatesCommand = vscode.commands.registerCommand(
    'animoria.resolveDuplicates',
    (item: AnimoriaGovernanceIssueItem) => resolveDuplicates(item)
  );

  const generateSnippetCommand = vscode.commands.registerCommand(
    'animoria.generateSnippet',
    (arg: AnimoriaAsset | { asset: AnimoriaAsset }) => {
      const asset = arg && 'asset' in arg ? arg.asset : arg;
      if (asset) void generateSnippet(asset);
    }
  );

  const cleanupReviewCommand = vscode.commands.registerCommand('animoria.startCleanupReview', () =>
    startCleanupReview(context)
  );

  const toggleViewModeCommand = vscode.commands.registerCommand('animoria.toggleViewMode', () => {
    const mode = treeProvider.toggleViewMode();
    vscode.window.setStatusBarMessage(
      `Animoria: ${mode === 'tree' ? 'Directory Tree' : 'Flat'} view`,
      3000
    );
  });

  context.subscriptions.push(
    treeView,
    refreshCommand,
    openPreviewCommand,
    revealCommand,
    searchCommand,
    governanceCommand,
    viewReportCommand,
    exportCommand,
    deleteCommand,
    resolveDuplicatesCommand,
    generateSnippetCommand,
    cleanupReviewCommand,
    toggleViewModeCommand
  );

  // 4. Bring up the reactive index for the current workspace, if any.
  await startWorkspace();

  // 5. Re-bootstrap the whole pipeline if the workspace folder changes.
  const workspaceFoldersWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    stopWorkspace();
    await startWorkspace();
  });
  context.subscriptions.push(workspaceFoldersWatcher);
}

/**
 * Tears down the previous workspace's indexer and file watcher (if any)
 * and brings up a fresh {@link WorkspaceIndexer} for the current first
 * workspace folder, performing its one-time initial scan and then
 * switching into continuous, event-driven synchronization.
 *
 * This is the single entry point for "start being reactive" — called
 * both on extension activation and whenever the workspace folder set
 * changes. There is deliberately no separate "manual scan" code path:
 * {@link forceFullReindex} reuses this same function instead of
 * duplicating the initial-population logic.
 */
async function startWorkspace(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('Animoria: No workspace folder open.');
    return;
  }
  const workspacePath = workspaceFolders[0]!.uri.fsPath;

  // Best-effort, non-blocking: bounds how long Bulk Cleanup's trash
  // (`.animoria/trash/`) can accumulate. Never awaited — a slow or
  // failing purge must not delay workspace activation, and
  // `purgeExpiredTrashSessions` itself never throws.
  void purgeExpiredTrashSessions(workspacePath);

  const activeIndexer = new WorkspaceIndexer({
    workspacePath,
    scopeResolver: (asset) => resolveScopePath(asset.path, workspacePath),
  });
  indexer = activeIndexer;

  activeIndexer.onDidUpdate((update) => applyIndexUpdate(update, workspacePath));

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Animoria: Scanning workspace...',
      cancellable: false,
    },
    async () => {
      const snapshot = await activeIndexer.initialize();
      const assets = [...snapshot.assets];
      treeProvider.setAssets(assets);
      treeProvider.setGovernanceState({
        ruleReport: snapshot.ruleReport,
        healthScore: snapshot.healthScore,
        referenceCounts: snapshot.referenceCounts,
      });
      reportRuleDiagnostics(snapshot.ruleReport?.diagnostics.length ?? 0);

      vscode.window.setStatusBarMessage(`Animoria: ${assets.length} assets indexed`, 5000);

      maybeGenerateThumbnails(assets, workspacePath);
      // Awaited deliberately: this progress indicator is the user's only
      // signal that "Refresh" has finished. Governance state (used/unused,
      // duplicates, overused) previously recomputed here via a fire-and-forget
      // call, so the spinner could disappear — and the command visibly
      // "complete" — before the recompute had actually finished, leaving the
      // sidebar showing pre-refresh state for a period with no indication
      // anything was still happening. Awaiting means "done" only ever means
      // governance is actually current.
      await runGovernanceSilently(workspacePath);
      void scanAndApplyStaticAssets(assets, workspacePath);
    }
  );

  fileWatcher = new AnimoriaFileWatcher(activeIndexer);
  fileWatcher.start(workspacePath);

  // Register (or re-register) the hover provider now that a live indexer
  // is available. Dispose any previous registration first so there is never
  // more than one active provider per language.
  hoverRegistration?.dispose();
  hoverRegistration = vscode.languages.registerHoverProvider(
    HOVER_LANGUAGES.map((lang) => ({ language: lang })),
    new AnimoriaHoverProvider(activeIndexer, treeProvider)
  );
  // Not pushed onto context.subscriptions because this function can run
  // multiple times (workspace folder changes, refresh). We manage the
  // registration's lifetime directly via hoverRegistration.dispose() above.
  // Deliberately not registered as a VS Code disposable: this function
  // can run many times over the extension's lifetime (workspace folder
  // changes, `animoria.refresh`), and `stopWorkspace` — called both by
  // `deactivate` and before every re-run of this function — already
  // disposes exactly the current `fileWatcher`/`indexer` instances
  // directly. Registering a disposable here too would just accumulate
  // one redundant closure per refresh for the life of the session.
}

function stopWorkspace(): void {
  fileWatcher?.dispose();
  fileWatcher = undefined;
  indexer?.dispose();
  indexer = undefined;
  hoverRegistration?.dispose();
  hoverRegistration = undefined;
}

/**
 * Forces a full re-scan and re-initialization of the index for the
 * current workspace, bound to the `animoria.refresh` command.
 *
 * With the reactive indexer in place, this is no longer how governance
 * state normally stays current — it is an explicit escape hatch for the
 * rare case a user suspects the live index has drifted (e.g. changes
 * made while VS Code itself was closed) and wants a guaranteed-fresh
 * baseline, without waiting for the next incidental filesystem event.
 */
async function forceFullReindex(): Promise<void> {
  stopWorkspace();
  await startWorkspace();
}

/**
 * Applies one settled batch from the reactive index to the tree view and
 * (for newly touched assets only) kicks off thumbnail generation.
 *
 * This is the single place incremental updates are translated into UI
 * changes — deliberately narrow: only the assets the indexer says were
 * actually upserted or removed are touched, so an edit to one asset
 * never invalidates the thumbnail cache or usage-reference cache of any
 * other asset in the workspace.
 */
function applyIndexUpdate(update: WorkspaceIndexUpdate, workspacePath: string): void {
  const assetsByPath = new Map(update.snapshot.assets.map((a) => [a.path, a] as const));

  for (const path of update.removedAssetPaths) {
    treeProvider.removeAsset(path);
  }

  const touchedAssets: AnimoriaAsset[] = [];
  for (const path of update.upsertedAssetPaths) {
    const asset = assetsByPath.get(path);
    if (!asset) continue;
    treeProvider.updateAsset(asset);
    touchedAssets.push(asset);
  }

  treeProvider.setGovernanceState({
    ruleReport: update.snapshot.ruleReport,
    healthScore: update.snapshot.healthScore,
    referenceCounts: update.snapshot.referenceCounts,
  });
  reportRuleDiagnostics(update.snapshot.ruleReport?.diagnostics.length ?? 0);

  if (touchedAssets.length > 0) {
    maybeGenerateThumbnails(touchedAssets, workspacePath);
  }

  void runGovernanceSilently(workspacePath);
  void scanAndApplyStaticAssets(update.snapshot.assets, workspacePath);
}

function reportRuleDiagnostics(count: number): void {
  if (count > 0) {
    vscode.window.setStatusBarMessage(`Animoria: ${count} rule violation(s)`, 5000);
  }
}

/**
 * Scans the workspace for static visual assets (SVG without animation,
 * PNG, JPEG, WebP, AVIF) and applies the result to the sidebar's Static
 * Assets section.
 *
 * A one-shot scan, not reactively tracked per file-watcher event like
 * animated assets — see `AnimoriaTreeProvider.setStaticAssets`. Run
 * during initial indexing and on manual refresh.
 */
async function scanAndApplyStaticAssets(
  animatedAssets: readonly AnimoriaAsset[],
  workspacePath: string
): Promise<void> {
  // Shares the reactive indexer's already-loaded `.animoriaignore`
  // patterns rather than reloading and re-parsing the file — the indexer
  // is the single source of truth for which patterns are currently in effect.
  const scanner = new StaticAssetScanner({
    workspacePath,
    exclude: indexer ? [...indexer.getIgnorePatterns()] : [],
  });
  const result = await scanner.scan();

  // A given `.svg` is claimed by exactly one pipeline: animated (if it
  // has animation evidence) or static (otherwise). The static scanner
  // doesn't know which `.svg` files the animated pipeline already
  // claimed, so exclude those paths here rather than teach the static
  // scanner about animated-asset classification.
  const animatedPaths = new Set(animatedAssets.map((a) => a.path));
  const staticOnly = result.assets.filter((a) => !animatedPaths.has(a.path));

  treeProvider.setStaticAssets(staticOnly);
}

function maybeGenerateThumbnails(assets: AnimoriaAsset[], workspacePath: string): void {
  const thumbnailsEnabled = vscode.workspace
    .getConfiguration('animoria')
    .get<boolean>('enableThumbnails', true);

  if (thumbnailsEnabled && assets.length > 0) {
    // Fire-and-forget — the gallery is immediately usable. No external
    // browser process required: rendering runs natively in-process.
    generateThumbnailsInBackground(assets, workspacePath, treeProvider);
  }
}

async function generateThumbnailsInBackground(
  assets: AnimoriaAsset[],
  workspacePath: string,
  provider: AnimoriaTreeProvider
): Promise<void> {
  const abortController = new AbortController();
  const generator = new ThumbnailEngine({
    workspacePath,
    frame: 'middle',
  });

  const entry = { generator, abortController };
  activeGenerators.add(entry);

  try {
    const batch = await generator.generateBatch(assets, abortController.signal);

    for (const r of batch.results) {
      if (r.thumbnailPath) {
        provider.setThumbnail(r.asset.path, r.thumbnailPath);
      } else {
        provider.markThumbnailUnavailable(r.asset.path);
      }
    }

    vscode.window.setStatusBarMessage(
      `Animoria: ${batch.generated} thumbnails generated · ` +
        `${batch.fromCache} cached · ${batch.failed} failed`,
      5000
    );
  } catch (err) {
    if (abortController.signal.aborted) {
      console.log('Animoria: Thumbnail generation aborted successfully.');
    } else {
      console.error('Animoria thumbnail generation failed:', err);
    }
  } finally {
    activeGenerators.delete(entry);
    await generator.dispose();
  }
}

/**
 * Opens the Assist Duplicate Resolution panel for the duplicate group a
 * governance-tree item belongs to.
 *
 * The group is assembled from data already computed by
 * `GovernanceAnalyzer` (`item.issue.asset` and `item.issue.duplicateOf`,
 * from the "Run Governance" flow) and the live reactive index's current
 * reference counts (`indexer.getSnapshot().referenceCounts`) — this
 * function performs no content hashing or usage scanning of its own. It
 * exists solely to translate an already-known duplicate relationship
 * into the `DuplicateGroup` shape `AnimoriaDuplicateResolver` expects.
 */
function resolveDuplicates(item: AnimoriaGovernanceIssueItem): void {
  if (!item?.issue || item.issue.category !== 'duplicate') return;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0 || !indexer) return;
  const workspacePath = workspaceFolders[0]!.uri.fsPath;

  const groupAssets = [item.issue.asset, ...(item.issue.duplicateOf ?? [])];
  const referenceCounts = indexer.getSnapshot().referenceCounts;

  const candidates: DuplicateCandidate[] = groupAssets.map((asset) => ({
    asset,
    referenceCount: referenceCounts.get(asset.path) ?? 0,
  }));

  const group: DuplicateGroup = {
    id: groupAssets
      .map((a) => a.path)
      .sort()
      .join('|'),
    candidates,
    sizeBytes: item.issue.asset.sizeBytes,
    potentialSavingsBytes: (candidates.length - 1) * item.issue.asset.sizeBytes,
  };

  AnimoriaDuplicateResolver.render(workspacePath, group, indexer);
}

/**
 * Snippet Generation from the tree view context menu — the counterpart to
 * the Preview Panel's Integrate section, per `TASK-4.2`'s original
 * acceptance criteria (a sidebar entry point, not only a panel one).
 * Shares `buildIntegrationContext` with the panel so path resolution can't
 * diverge between the two entry points.
 */
async function generateSnippet(asset: AnimoriaAsset): Promise<void> {
  ensureProvidersRegistered();

  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const context = buildIntegrationContext(
    asset,
    workspacePath,
    AnimoriaPreviewPanel.activeEditorTracker
  );

  const results = integrationRegistry.generate(context);
  if (results.length === 0) {
    vscode.window.showInformationMessage(
      `Animoria: No snippet generator supports ${asset.format} assets.`
    );
    return;
  }

  const picked = await vscode.window.showQuickPick(
    results.map((r) => ({ label: r.label, result: r })),
    { placeHolder: 'Copy snippet for…' }
  );
  if (!picked) return;

  const parts = [];
  if (picked.result.imports) parts.push(picked.result.imports);
  parts.push(picked.result.code);
  if (picked.result.installHint) parts.push(`// Install: ${picked.result.installHint}`);

  await vscode.env.clipboard.writeText(parts.join('\n\n'));
  vscode.window.setStatusBarMessage(`Animoria: ${picked.result.label} snippet copied`, 2500);
}

/**
 * Opens the Bulk Cleanup Review panel, building a fresh {@link CleanupProposal}
 * from the current reactive index snapshot.
 *
 * If no indexer is active (e.g. no workspace open) the function shows a
 * warning and returns. The panel handles the full Analyze → Review → Understand
 * → Approve → Execute → Summarize workflow internally.
 */
async function startCleanupReview(context: vscode.ExtensionContext): Promise<void> {
  if (!indexer) {
    vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
    return;
  }
  await AnimoriaCleanupPanel.render(context, indexer);
}

/**
 * Runs the full unused/duplicate/overused governance analysis and applies
 * the result to `treeProvider` and `lastGovernanceReport`.
 *
 * This is the single computation both the automatic pass (triggered from
 * `startWorkspace` and every reactive index update) and the manual
 * `animoria.runGovernance` command go through — there is deliberately no
 * second, parallel implementation of this analysis anywhere in the
 * extension.
 */
async function computeAndApplyGovernance(
  assets: readonly AnimoriaAsset[],
  workspacePath: string
): Promise<GovernanceReport> {
  const analyzer = new GovernanceAnalyzer({
    workspacePath,
    assets: [...assets],
    overusedThreshold: vscode.workspace
      .getConfiguration('animoria')
      .get<number>('governance.overusedThreshold', 10),
    scopeResolver: (asset) => resolveScopePath(asset.path, workspacePath),
  });

  const report = await analyzer.analyze();
  lastGovernanceReport = report;
  treeProvider.setGovernanceReport(report);
  return report;
}

/**
 * Whether the one-time "governance analysis complete" notification has
 * already been shown this session. Automatic governance runs on every
 * reactive index update (see `applyIndexUpdate`), and a toast per file
 * change would be noise — but showing the very first result at least
 * once is what makes the automatic pass's outcome actually reachable
 * without the developer already knowing the manual command or the
 * governance section's context menu exist.
 */
let hasShownInitialGovernanceNotice = false;

/**
 * Runs governance analysis automatically, with no progress dialog and
 * (after the first run this session) no notification — used for the
 * initial scan and every subsequent reactive index update, where a toast
 * per file change would be noise rather than signal. Errors are
 * swallowed: automatic passes must never interrupt the developer, and the
 * manual command remains available to surface a report explicitly.
 */
async function runGovernanceSilently(workspacePath: string): Promise<void> {
  const assets = treeProvider.getAssets();
  if (assets.length === 0) return;
  try {
    const report = await computeAndApplyGovernance(assets, workspacePath);

    if (!hasShownInitialGovernanceNotice) {
      hasShownInitialGovernanceNotice = true;
      const total = report.unused.length + report.duplicates.length + report.overused.length;
      const message =
        total > 0
          ? `Animoria: Governance analysis complete — ${total} issue(s) found.`
          : 'Animoria: Governance analysis complete — no issues found.';
      vscode.window.showInformationMessage(message, 'View Report').then(
        (selection) => {
          if (selection === 'View Report') viewGovernanceReport();
        },
        () => {
          // Dismissed — the report remains reachable via
          // `animoria.runGovernance` or the governance section's context menu.
        }
      );
    }
  } catch (err) {
    logWarn(
      'governance-run',
      'runGovernanceSilently',
      'Automatic governance analysis pass failed',
      {
        assetPath: workspacePath,
        reason: 'computeAndApplyGovernance threw',
        error: err,
        recovery: 'no notification shown; manual "Run Governance Analysis" remains available',
      }
    );
    // Silent to the user by design — see doc comment above. The one-time
    // notice above only fires on success, so a failure here never shows a
    // false "complete".
  }
}

/**
 * The manual "Run Governance Analysis" command. Automatic governance
 * execution (see `runGovernanceSilently`) now covers initial indexing and
 * workspace changes, so this command's role is explicit revalidation —
 * useful when a developer wants an on-demand, user-visible confirmation
 * rather than waiting on the background pass. It is not the primary
 * execution path anymore, but it is not removed.
 */
async function runGovernance(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const workspacePath = workspaceFolders[0]!.uri.fsPath;
  const assets = treeProvider.getAssets();

  if (assets.length === 0) {
    vscode.window.showInformationMessage('Animoria: No assets found. Run a scan first.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Animoria: Revalidating governance...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: `Analyzing ${assets.length} assets...` });

      const report = await computeAndApplyGovernance(assets, workspacePath);

      const total = report.unused.length + report.duplicates.length + report.overused.length;

      const summary =
        total === 0
          ? 'No governance issues found.'
          : [
              report.unused.length > 0 ? `${report.unused.length} unused` : '',
              report.duplicates.length > 0 ? `${report.duplicates.length} duplicate` : '',
              report.overused.length > 0 ? `${report.overused.length} overused` : '',
            ]
              .filter(Boolean)
              .join(' · ');

      vscode.window.setStatusBarMessage(`Animoria Governance: ${summary}`, 8000);

      // Always offer a durable way to see the report — a status bar
      // message disappears after 8 seconds and is easy to miss, and a
      // clean result (`total === 0`) is exactly the case a developer most
      // wants confirmed by an actual report, not just inferred from the
      // absence of a toast.
      const message =
        total > 0
          ? `Animoria found ${total} governance issue(s): ${summary}`
          : 'Animoria: Governance analysis complete — no issues found.';

      vscode.window.showInformationMessage(message, 'View Report', 'Export to File').then(
        (selection) => {
          if (selection === 'View Report') viewGovernanceReport();
          if (selection === 'Export to File') exportGovernanceReport();
        },
        () => {
          // Notification dismissed or superseded — nothing to do; the
          // report remains reachable via the governance section's
          // context menu and `animoria.viewGovernanceReport`.
        }
      );
    }
  );
}

/**
 * Opens the current governance report as a rendered Markdown Preview —
 * no disk write involved. This is the primary way to read a report;
 * `exportGovernanceReport` (saving a file to disk) is the secondary
 * option for developers who specifically want a persisted copy (e.g. to
 * attach to a PR).
 *
 * Content is pushed through {@link governanceReportContentProvider}'s
 * fixed URI rather than a freshly-allocated `untitled:` document per
 * call — see that class's doc comment for why: allocating a new document
 * on every call opened both the raw source tab and its preview tab,
 * duplicating on every subsequent "View Report" click.
 */
async function viewGovernanceReport(): Promise<void> {
  if (!lastGovernanceReport) {
    vscode.window.showWarningMessage(
      'Animoria: No governance report available. Run analysis first.'
    );
    return;
  }

  governanceReportContentProvider.update(buildMarkdownReport(lastGovernanceReport));
  // `showTextDocument`'s `preview: true` means a reusable editor tab, not
  // a rendered Markdown view — it shows raw `##`/`|---|` source. The
  // report is meant to be read, not edited, so open VS Code's built-in
  // Markdown Preview instead of the raw document.
  await vscode.commands.executeCommand('markdown.showPreview', GOVERNANCE_REPORT_URI);
}

async function exportGovernanceReport(): Promise<void> {
  if (!lastGovernanceReport) {
    vscode.window.showWarningMessage(
      'Animoria: No governance report available. Run analysis first.'
    );
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const report = lastGovernanceReport;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultUri = vscode.Uri.file(
    join(workspaceFolders[0]!.uri.fsPath, `animoria-governance-${timestamp}.md`)
  );

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { Markdown: ['md'], JSON: ['json'] },
    title: 'Export Governance Report',
  });

  if (!saveUri) return;

  const isJson = saveUri.fsPath.endsWith('.json');
  const content = isJson ? buildJsonReport(report) : buildMarkdownReport(report);

  await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf-8'));

  const open = await vscode.window.showInformationMessage(
    `Animoria: Report exported to ${basename(saveUri.fsPath)}`,
    'Open Report'
  );
  if (open === 'Open Report') {
    await vscode.window.showTextDocument(saveUri);
  }
}

export async function deactivate(): Promise<void> {
  stopWorkspace();

  if (activeGenerators.size > 0) {
    const disposePromises = Array.from(activeGenerators).map(async (entry) => {
      entry.abortController.abort();
      try {
        await entry.generator.dispose();
      } catch (err) {
        logDebug(
          'extension-deactivate',
          'deactivate',
          'Thumbnail generator failed to dispose cleanly during shutdown',
          {
            reason: 'generator.dispose() threw',
            error: err,
            recovery: 'shutdown continues; process is exiting regardless',
          }
        );
      }
    });

    // Wait at most 1500ms for clean shutdown of all generators
    await Promise.race([
      Promise.all(disposePromises),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
    activeGenerators.clear();
  }
}
