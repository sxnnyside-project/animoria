import { basename, join } from 'node:path';
import {
  StaticAssetScanner,
  ThumbnailEngine,
  WorkspaceSession,
  buildJsonReport,
  buildMarkdownReport,
  duplicateGroupForAsset,
  integrationRegistry,
  listTrashSessions,
  logDebug,
  logWarn,
  moveAssetsToTrash,
  purgeExpiredTrashSessions,
  restoreTrashSession,
  setLogger,
} from '@animoria/core';
import type { AnimoriaAsset, AnimoriaStaticAsset, MultiRootAnalysis } from '@animoria/core';
import * as vscode from 'vscode';
import { DiagnosticPublisher } from './diagnostics/DiagnosticPublisher';
import { OutputChannelLogger } from './logging/OutputChannelLogger';
import { AnimoriaWorkspacePanel } from './panels/AnimoriaWorkspacePanel';
import { AnimoriaHoverProvider, HOVER_LANGUAGES } from './providers/AnimoriaHoverProvider';
import { AnimoriaTreeProvider } from './providers/AnimoriaTreeProvider';
import type { AnimoriaGovernanceIssueItem } from './providers/AnimoriaTreeProvider';
import { ActiveEditorTracker } from './utils/ActiveEditorTracker';
import { buildIntegrationContext } from './utils/build-integration-context';
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
/**
 * Every open root's indexers, as one session.
 *
 * Replaces the single `WorkspaceIndexer` over `workspaceFolders[0]`. Commands that
 * need "the workspace" ask this; commands that need a specific root ask it to route.
 */
let session: WorkspaceSession | undefined;
/** One per root. A single watcher over the first folder saw none of the others' changes. */
let fileWatchers: (AnimoriaFileWatcher | null)[] = [];
/** The most recent aggregate. Read by commands that report on "the workspace". */
let lastAggregate: MultiRootAnalysis | undefined;
let hoverRegistration: vscode.Disposable | undefined;
let diagnosticPublisher: DiagnosticPublisher | undefined;
/**
 * Module-level so commands invoked outside `activate`'s closure can reach them.
 * Both are set once, in `activate`, and never reassigned — the alternative was
 * hanging them off a panel class as static state, which is how
 * `AnimoriaPreviewPanel.activeEditorTracker` came to be a global in disguise.
 */
let extensionContext: vscode.ExtensionContext | undefined;
let activeEditorTracker: ActiveEditorTracker | undefined;

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

  // Governance findings belong in the Problems panel, where a VS Code developer
  // looks for them, rather than in a status-bar message that disappears.
  diagnosticPublisher = new DiagnosticPublisher();
  context.subscriptions.push(diagnosticPublisher);

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
  extensionContext = context;
  activeEditorTracker = new ActiveEditorTracker();
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
      if (!session) {
        vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
        return;
      }

      // A static asset goes to VS Code's own image viewer.
      //
      // It is not in the analysis — static assets are discovered separately and the
      // canonical pipeline for them is a later wave — so focusing the shared panel on
      // one selects a path the grid does not contain, and the developer lands on an
      // asset list that does not include the asset they clicked. VS Code's built-in
      // image preview is a genuinely good viewer for a PNG or a WebP, and it is
      // *native*, which is the right answer here rather than a placeholder in a
      // webview.
      if (!isAnimatedAsset(asset)) {
        void vscode.commands.executeCommand('vscode.open', vscode.Uri.file(asset.path), {
          preview: true,
        });
        return;
      }

      // The panel opens *on this asset*.
      //
      // It used to unwrap the argument, validate it, and then discard it — rendering
      // the panel on the assets tab with nothing selected. "Open Preview" on a
      // specific file therefore produced a grid of every file, and the developer had
      // to find theirs again. The asset's identity is the whole point of the command.
      AnimoriaWorkspacePanel.show(context, () => session, 'inspector', {
        tab: 'assets',
        assetPath: asset.path,
        rootId: session.indexerForPath(asset.path)?.root.id ?? '',
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
        void vscode.commands.executeCommand('animoria.openPreview', asset);
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
      if (!item?.diagnostic) return;
      const asset = item.diagnostic.asset;
      const workspacePath = session?.indexerForPath(asset.path)?.root.path;
      if (!workspacePath) return;

      // Staged, not permanent. This command previously called
      // `vscode.workspace.fs.delete` with no `useTrash` and no staging — an
      // irreversible deletion — while Bulk Cleanup in this same extension staged to
      // `.animoria/trash/` and the JetBrains equivalent told the user the file could
      // be recovered. The same user intent must not be reversible in one client and
      // irreversible in another.
      const confirm = await vscode.window.showWarningMessage(
        `Move ${asset.name} to .animoria/trash/?`,
        {
          modal: true,
          detail:
            'The file leaves its current location but is preserved on disk and can be restored by moving it back.',
        },
        'Move to Trash'
      );
      if (confirm !== 'Move to Trash') return;

      const { trashDir, moved } = await moveAssetsToTrash(workspacePath, [asset]);
      if (moved.length === 0) {
        vscode.window.showWarningMessage(
          `Animoria: ${asset.name} could not be moved to trash — it may already be gone. See the Animoria output channel.`
        );
        return;
      }

      // The file watcher will independently observe this move and reach the same
      // conclusion via the reactive index; removing it here too just avoids waiting
      // out the debounce window for feedback on an action the user just took.
      treeProvider.removeAsset(asset.path);
      vscode.window.setStatusBarMessage(
        `Animoria: ${asset.name} moved to ${basename(trashDir)}`,
        4000
      );
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

  // Each capability opens its own surface. A tab bar inside one webview made every
  // one of these land the developer in a workspace browser.
  const viewFindingsCommand = vscode.commands.registerCommand('animoria.viewFindings', () => {
    if (!session) {
      vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
      return;
    }
    AnimoriaWorkspacePanel.show(context, () => session, 'findings', { tab: 'findings' });
  });

  const viewDuplicatesCommand = vscode.commands.registerCommand('animoria.viewDuplicates', () => {
    if (!session) {
      vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
      return;
    }
    AnimoriaWorkspacePanel.show(context, () => session, 'duplicates', { tab: 'duplicates' });
  });

  const cleanupReviewCommand = vscode.commands.registerCommand('animoria.startCleanupReview', () =>
    startCleanupReview(context)
  );

  const restoreCleanupCommand = vscode.commands.registerCommand('animoria.restoreCleanup', () =>
    restoreCleanup()
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
    viewFindingsCommand,
    viewDuplicatesCommand,
    cleanupReviewCommand,
    restoreCleanupCommand,
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
 * and brings up a fresh {@link WorkspaceSession} over every open workspace folder,
 * performing its one-time initial scan and then
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

  // V2: every folder, not `workspaceFolders[0]`.
  //
  // Eight sites read the first folder and silently ignored the rest, so in a
  // multi-root workspace two thirds of a developer's assets were invisible — not
  // reported as unscanned, simply absent, which reads as "you have none".
  //
  // `WorkspaceSession` owns one `WorkspaceIndexer` per root, because `.animoriarc`
  // is root-scoped and a merged scan would apply one root's policy to files it does
  // not govern (D-05).
  const rootPaths = workspaceFolders.map((folder) => folder.uri.fsPath);
  const activeSession = new WorkspaceSession(rootPaths);
  session = activeSession;

  // Purge each root's own trash. Best-effort and never awaited: a slow purge must
  // not delay activation, and `purgeExpiredTrashSessions` never throws.
  for (const rootPath of rootPaths) void purgeExpiredTrashSessions(rootPath);

  for (const root of activeSession.roots) {
    activeSession
      .indexerForRoot(root.id)
      ?.onDidUpdate(() => applyIndexUpdate(activeSession, root.path));
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Animoria: Scanning workspace...',
      cancellable: false,
    },
    async () => {
      const aggregate = await activeSession.initializeFast();
      applyAggregate(aggregate);

      const assets = aggregate.assets.map((entry) => entry.asset);
      const rootSuffix =
        activeSession.roots.length > 1 ? ` across ${activeSession.roots.length} roots` : '';
      vscode.window.setStatusBarMessage(
        `Animoria: ${assets.length} assets indexed${rootSuffix}`,
        5000
      );

      // Thumbnails and static assets are per-root: both write into that root's
      // `.animoria/` and resolve paths against it.
      for (const { root, analysis } of aggregate.roots) {
        const rootAssets = [...analysis.assets];
        maybeGenerateThumbnails(rootAssets, root.path);
        // Reported rather than dropped. `void` on a promise that can reject means a
        // failed static-asset scan leaves the sidebar section silently empty, which
        // is indistinguishable from a workspace that has no static assets.
        scanAndApplyStaticAssets(rootAssets, root.path).catch((error: unknown) => {
          logWarn('file-scan', 'scanAndApplyStaticAssets', 'Static asset scan failed', {
            reason: `scanning ${root.path} threw`,
            error,
            recovery: 'the Static Assets section keeps its previous contents',
          });
        });
      }
    }
  );

  // One watcher per root. A single watcher over the first folder saw none of the
  // others' changes, so their analyses were frozen at activation.
  fileWatchers = activeSession.roots.map((root) => {
    const indexerForRoot = activeSession.indexerForRoot(root.id);
    if (!indexerForRoot) return null;
    const watcher = new AnimoriaFileWatcher(indexerForRoot);
    watcher.start(root.path);
    return watcher;
  });

  // Register (or re-register) the hover provider now that a live indexer
  // is available. Dispose any previous registration first so there is never
  // more than one active provider per language.
  hoverRegistration?.dispose();
  // The hover resolves an asset by path, so it needs the indexer that owns that
  // path. In a single-root workspace this is the only indexer; in a multi-root one
  // the first root's is used as the lookup entry point and the session routes from
  // there.
  const primaryIndexer = activeSession.indexerForRoot(activeSession.roots[0]!.id);
  hoverRegistration = primaryIndexer
    ? vscode.languages.registerHoverProvider(
        HOVER_LANGUAGES.map((lang) => ({ language: lang })),
        new AnimoriaHoverProvider(primaryIndexer, treeProvider)
      )
    : undefined;
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
  diagnosticPublisher?.clear();
  for (const watcher of fileWatchers) watcher?.dispose();
  fileWatchers = [];
  // Disposes every root's indexer. Nothing else holds one, so no root's background
  // work can outlive the session.
  session?.dispose();
  session = undefined;
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
 * The indexer and root path the shared UI panel is mounted over.
 *
 * The panel's `VsCodeHostBridge` reads one `WorkspaceAnalysis`; in a multi-root
 * workspace that is the first root's. This is a stated limitation rather than a
 * hidden one — the tree, the Problems panel and every command below are multi-root,
 * and the panel's own multi-root pass is Wave 6 work tracked as U5.


/**
 * Pushes one aggregate into every surface that renders workspace state.
 *
 * One function rather than four call sites, so the tree, the Problems panel, the
 * cached analysis and the status report cannot drift into describing different
 * subsets of the workspace — which is exactly what happened when each root was
 * published independently.
 */
function applyAggregate(aggregate: MultiRootAnalysis): void {
  treeProvider.setAssets(aggregate.assets.map((entry) => entry.asset));
  treeProvider.setMultiRootAnalysis(aggregate);

  // One publication covering every root. Publishing per root would clear the
  // previous root's diagnostics, leaving only the last one visible.
  diagnosticPublisher?.publishAll(aggregate.roots.map((entry) => entry.analysis));

  lastAggregate = aggregate;
  reportRuleDiagnostics(aggregate.diagnostics.length);
  AnimoriaWorkspacePanel.broadcast(aggregate);

  // Any asset still without a thumbnail decision gets one.
  //
  // Applying an aggregate is the only thing "Run Governance Analysis" does, and it
  // used to leave the tree full of spinners: the thumbnail state was cleared and no
  // generation pass followed. Asking here means every path that publishes an analysis
  // also settles the gallery, rather than each caller having to remember.
  settlePendingThumbnails();
}

/**
 * Starts a generation pass for assets that have no thumbnail answer yet.
 *
 * Grouped by root because a `ThumbnailEngine` writes into one root's `.animoria/`
 * and resolves paths against it.
 */
function settlePendingThumbnails(): void {
  const activeSession = session;
  if (!activeSession) return;

  const pending = treeProvider.assetsAwaitingThumbnails();
  if (pending.length === 0) return;

  const byRoot = new Map<string, AnimoriaAsset[]>();
  for (const asset of pending) {
    const rootPath = activeSession.indexerForPath(asset.path)?.root.path;
    if (!rootPath) {
      // Unattributable, so no engine can render it. Settled rather than left spinning.
      treeProvider.markThumbnailUnavailable(asset.path);
      continue;
    }
    const forRoot = byRoot.get(rootPath) ?? [];
    forRoot.push(asset);
    byRoot.set(rootPath, forRoot);
  }

  for (const [rootPath, assets] of byRoot) maybeGenerateThumbnails(assets, rootPath);
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
function applyIndexUpdate(activeSession: WorkspaceSession, changedRootPath: string): void {
  // Re-derived from the whole session rather than from the one root's update: the
  // tree, the diagnostics and the health widget describe the *workspace*, and
  // rendering one root's batch over them would blank the others.
  const aggregate = activeSession.getAnalysis();
  applyAggregate(aggregate);

  const changedRoot = aggregate.roots.find((entry) => entry.root.path === changedRootPath);
  const touchedAssets = changedRoot ? [...changedRoot.analysis.assets] : [];

  if (touchedAssets.length > 0) {
    maybeGenerateThumbnails(touchedAssets, changedRootPath);
  }

  if (changedRoot) {
    scanAndApplyStaticAssets(touchedAssets, changedRootPath).catch((error: unknown) => {
      logWarn('file-scan', 'scanAndApplyStaticAssets', 'Static asset rescan failed', {
        reason: `rescanning ${changedRootPath} threw`,
        error,
        recovery: 'the Static Assets section keeps its previous contents',
      });
    });
  }
}

function reportRuleDiagnostics(count: number): void {
  if (count > 0) {
    vscode.window.setStatusBarMessage(`Animoria: ${count} rule finding(s)`, 5000);
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
/**
 * Whether this is an asset the shared panel can show.
 *
 * `format` is present on every `AnimoriaAsset` and absent on `AnimoriaStaticAsset`'s
 * animated counterpart set — the distinction the tree already makes, read here rather
 * than re-derived from the extension.
 */
function isAnimatedAsset(asset: AnimoriaAsset | AnimoriaStaticAsset): asset is AnimoriaAsset {
  return session?.getAnalysis().assets.some((entry) => entry.asset.path === asset.path) ?? false;
}

async function scanAndApplyStaticAssets(
  animatedAssets: readonly AnimoriaAsset[],
  workspacePath: string
): Promise<void> {
  // Shares the reactive indexer's already-loaded `.animoriaignore`
  // patterns rather than reloading and re-parsing the file — the indexer
  // is the single source of truth for which patterns are currently in effect.
  // Each root's own ignore patterns. Using the first root's for every root would
  // apply one project's `.animoriaignore` to another's files.
  const rootIndexer = session?.indexerForPath(join(workspacePath, '.'))?.indexer;
  const scanner = new StaticAssetScanner({
    workspacePath,
    exclude: rootIndexer ? [...rootIndexer.getIgnorePatterns()] : [],
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

  if (!thumbnailsEnabled) {
    // Turned off is an answer. Left unsettled, every asset would show the spinner
    // that means "still generating" for a pass that will never run.
    for (const asset of assets) treeProvider.markThumbnailUnavailable(asset.path);
    return;
  }

  if (assets.length > 0) {
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

    // Anything the batch did not report on is settled here.
    //
    // `generateBatch` returns a result per asset it processed; an asset it skipped —
    // or one the engine dropped — would otherwise keep its spinner forever, because
    // "no thumbnail and no recorded failure" *is* the loading state.
    const reported = new Set(batch.results.map((result) => result.asset.path));
    for (const asset of assets) {
      if (!reported.has(asset.path)) provider.markThumbnailUnavailable(asset.path);
    }

    vscode.window.setStatusBarMessage(
      `Animoria: ${batch.generated} thumbnails generated · ` +
        `${batch.fromCache} cached · ${batch.failed} failed`,
      5000
    );
  } catch (err) {
    // Every asset settles, including on failure and cancellation.
    //
    // This used to log and return, leaving every asset in the batch with neither a
    // thumbnail nor a failure — the exact state the tree renders as a spinner. One
    // thrown batch meant a permanently loading gallery with nothing in the UI to say
    // so.
    for (const asset of assets) provider.markThumbnailUnavailable(asset.path);

    if (abortController.signal.aborted) {
      logDebug('thumbnail-generation', 'generateThumbnailsInBackground', 'Cancelled', {
        reason: 'a newer generation pass or shutdown superseded this one',
        recovery: 'assets show the format placeholder until the next pass',
      });
    } else {
      logWarn('thumbnail-generation', 'generateThumbnailsInBackground', 'Generation failed', {
        reason: 'generateBatch threw',
        error: err,
        recovery: 'assets show the format placeholder rather than a permanent spinner',
      });
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
 * reference counts (`indexer.getAnalysis().referenceCounts`) — this
 * function performs no content hashing or usage scanning of its own. It
 * exists solely to translate an already-known duplicate relationship
 * into the `DuplicateGroup` shape the shared duplicates view expects.
 */
function resolveDuplicates(item: AnimoriaGovernanceIssueItem): void {
  // `item?.` is load-bearing: this is a command handler, and VS Code invokes it with
  // no argument when the command is run from the palette rather than the tree context
  // menu. Collapsing this to `item.diagnostic?.…` satisfies the same lint rule and
  // throws on that path.
  if (item?.diagnostic?.ruleId !== 'no-duplicate-content') return;

  // Routed to the root that owns the asset, not to the first folder. In a
  // multi-root workspace those differ, and resolving a duplicate against the wrong
  // root would build a plan whose paths do not exist.
  const located = session?.indexerForPath(item.diagnostic.asset.path);
  if (!located) return;

  // The group comes from the analysis, which computed it by content hash. It used to
  // be reassembled here from `GovernanceIssue.duplicateOf` — a second engine's view
  // of the same relationship, with an id synthesised from sorted paths rather than
  // the hash that established it.
  const group = duplicateGroupForAsset(located.indexer.getAnalysis(), item.diagnostic.asset.path);
  if (!group) return;

  // The group travels with the request.
  //
  // `void group;` stood here: the group was computed, deliberately discarded, and
  // the panel opened on a bare duplicates tab. A developer who clicked "Resolve
  // Duplicates" on one specific finding arrived at a list of every duplicate group
  // in the workspace with no indication which one they had asked about — the
  // regression that made this audit necessary.
  if (!extensionContext) return;
  AnimoriaWorkspacePanel.show(extensionContext, () => session, 'duplicates', {
    tab: 'duplicates',
    groupId: group.id,
    rootId: located.root.id,
  });
}

/**
 * Snippet Generation from the tree view context menu — the counterpart to
 * the Preview Panel's Integrate section, per `TASK-4.2`'s original
 * acceptance criteria (a sidebar entry point, not only a panel one).
 * Shares `buildIntegrationContext` with the panel so path resolution can't
 * diverge between the two entry points.
 */
async function generateSnippet(asset: AnimoriaAsset): Promise<void> {
  const workspacePath = session?.indexerForPath(asset.path)?.root.path ?? '';
  const context = buildIntegrationContext(asset, workspacePath, activeEditorTracker);

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
  const activeSession = session;
  if (!activeSession) {
    vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
    return;
  }
  AnimoriaWorkspacePanel.show(context, () => session, 'cleanup', { tab: 'cleanup' });
}

/**
 * The "Restore from Trash" command.
 *
 * Every Bulk Cleanup removal moves assets into `.animoria/trash/<sessionId>/`
 * rather than deleting them (`@animoria/core`'s `cleanup/trash.ts`) — this is
 * the other half of that guarantee: a session id alone was never enough to
 * make trash *usable*, since a developer restoring a mistaken cleanup has no
 * reason to know or remember one. This command lists what is actually
 * recoverable and lets the developer pick from that, in plain terms
 * ("N asset(s), reclaiming X"), rather than asking them to already know
 * which directory under `.animoria/trash/` they want.
 */
async function restoreCleanup(): Promise<void> {
  const activeSession = session;
  if (!activeSession) {
    vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
    return;
  }

  // Every root's trash, each tagged with the root it belongs to. A restore offering
  // only the first root's sessions would silently make the other roots' cleanups
  // unrecoverable through the UI.
  const perRoot = await Promise.all(
    activeSession.roots.map(async (root) => ({
      root,
      sessions: await listTrashSessions(root.path),
    }))
  );
  const sessions = perRoot.flatMap((entry) =>
    entry.sessions.map((trashSession) => ({ ...trashSession, root: entry.root }))
  );
  if (sessions.length === 0) {
    vscode.window.showInformationMessage('Animoria: Nothing in trash to restore.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    sessions.map((session) => {
      const totalBytes = session.entries.reduce((sum, e) => sum + e.sizeBytes, 0);
      return {
        label: `${session.entries.length} asset(s) — ${formatBytesShort(totalBytes)}`,
        description: new Date(session.movedAt).toLocaleString(),
        detail: session.entries.map((e) => e.originalPath).join(', '),
        session,
      };
    }),
    {
      title: 'Restore from Trash',
      placeHolder: 'Choose which cleanup run to undo',
    }
  );
  if (!picked) return;

  // Restored into the root the session came from, and the change routed back to
  // that root's indexer.
  const result = await restoreTrashSession(picked.session.root.path, picked.session.sessionId);
  for (const path of result.restoredPaths) {
    activeSession.notifyFileChanged(path, 'created');
  }

  if (result.failures.length === 0) {
    vscode.window.showInformationMessage(
      `Animoria: Restored ${result.restoredPaths.length} asset(s).`
    );
    return;
  }

  const occupied = result.failures.filter((f) => f.reason === 'destination-occupied');
  const messages = [
    `Restored ${result.restoredPaths.length} of ${picked.session.entries.length} asset(s).`,
  ];
  if (occupied.length > 0) {
    messages.push(
      `${occupied.length} could not be restored because something new now exists at their original path: ${occupied.map((f) => f.originalPath).join(', ')}`
    );
  }
  vscode.window.showWarningMessage(`Animoria: ${messages.join(' ')}`);
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The "Run Governance Analysis" command.
 *
 * ## Why this no longer runs an analysis
 * It used to construct a `GovernanceAnalyzer` and re-scan the workspace — a second
 * governance pass alongside the one the reactive indexer already performs, producing
 * a differently-shaped result that fed nothing into the Health Score shown beside it.
 * A silent copy of that pass also ran on *every* file save.
 *
 * The indexer maintains the canonical analysis continuously, so this command's job is
 * to make the current one visible and confirm it is complete — which is what a
 * developer actually wants from a button labelled "run".
 */
async function runGovernance(): Promise<void> {
  const activeSession = session;
  if (!activeSession) {
    vscode.window.showWarningMessage('Animoria: No workspace indexed. Open a folder first.');
    return;
  }

  const ANALYSIS_TIMEOUT_MS = 30_000;

  const analysis = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Animoria: Completing analysis...',
      // Cancellable so the user can escape if a large workspace stalls.
      cancellable: true,
    },
    // Race `analyzeComplete()` against a 30-second timeout. If the background
    // reference-resolution pass hasn't settled, fall back to the cached
    // `getAnalysis()` rather than hanging indefinitely.
    (_progress, token) => {
      const complete = activeSession.analyzeComplete();
      const timeout = new Promise<MultiRootAnalysis>((resolve) => {
        const id = setTimeout(() => resolve(activeSession.getAnalysis()), ANALYSIS_TIMEOUT_MS);
        // Clean up the timer when the token fires so we don't leak it if the
        // user cancels before the 30s elapses.
        token.onCancellationRequested(() => {
          clearTimeout(id);
          resolve(activeSession.getAnalysis());
        });
      });
      return Promise.race([complete, timeout]);
    }
  );

  applyAggregate(analysis);

  const total = analysis.diagnostics.length;
  const message =
    total > 0
      ? `Animoria found ${total} governance finding(s).`
      : 'Animoria: Analysis complete — no findings.';

  vscode.window.showInformationMessage(message, 'View Report', 'Export to File').then(
    (selection) => {
      if (selection === 'View Report') viewGovernanceReport();
      if (selection === 'Export to File') exportGovernanceReport();
    },
    () => {
      // Dismissed — the report stays reachable via the governance section's context
      // menu and `animoria.viewGovernanceReport`.
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
  if (!lastAggregate) {
    vscode.window.showWarningMessage(
      'Animoria: No governance report available. Run analysis first.'
    );
    return;
  }

  // One report section per root. `buildMarkdownReport` describes one analysis; a
  // multi-root workspace is several, and concatenating them under root headings is
  // honest where merging them would not be — the roots may have different policies.
  const sections = lastAggregate.roots.map(({ root, analysis }) =>
    lastAggregate!.workspace.isSingleRoot
      ? buildMarkdownReport(analysis)
      : `## ${root.name}\n\n${buildMarkdownReport(analysis)}`
  );
  governanceReportContentProvider.update(sections.join('\n\n---\n\n'));
  // `showTextDocument`'s `preview: true` means a reusable editor tab, not
  // a rendered Markdown view — it shows raw `##`/`|---|` source. The
  // report is meant to be read, not edited, so open VS Code's built-in
  // Markdown Preview instead of the raw document.
  await vscode.commands.executeCommand('markdown.showPreview', GOVERNANCE_REPORT_URI);
}

async function exportGovernanceReport(): Promise<void> {
  if (!lastAggregate) {
    vscode.window.showWarningMessage(
      'Animoria: No governance report available. Run analysis first.'
    );
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const aggregate = lastAggregate;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultUri = vscode.Uri.file(
    // The first folder is the *save dialog's default location*, not the scope of the
    // report — the report below covers every root. A dialog needs one directory to
    // open in, and the developer can change it.
    join(workspaceFolders[0]!.uri.fsPath, `animoria-governance-${timestamp}.md`)
  );

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { Markdown: ['md'], JSON: ['json'] },
    title: 'Export Governance Report',
  });

  if (!saveUri) return;

  // Per root, for the same reason the viewed report is: the roots may govern
  // themselves differently, so one merged report would have to pick a policy.
  const isJson = saveUri.fsPath.endsWith('.json');
  const content = isJson
    ? JSON.stringify(
        {
          workspace: aggregate.workspace,
          roots: aggregate.roots.map(({ root, analysis }) => ({
            root,
            report: JSON.parse(buildJsonReport(analysis)) as unknown,
          })),
        },
        null,
        2
      )
    : aggregate.roots
        .map(({ root, analysis }) =>
          aggregate.workspace.isSingleRoot
            ? buildMarkdownReport(analysis)
            : `## ${root.name}\n\n${buildMarkdownReport(analysis)}`
        )
        .join('\n\n---\n\n');

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
