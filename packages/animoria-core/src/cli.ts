#!/usr/bin/env node
import { existsSync, watch } from 'node:fs';
import { createInterface } from 'node:readline';
import { extname, join } from 'node:path';
import { runCheckCommand } from './cli/check-command.js';
import { moveAssetsToTrash } from './cleanup/trash.js';
import { GovernanceAnalyzer } from './governance/governance-analyzer.js';
import { buildJsonReport, buildMarkdownReport } from './governance/report-formatter.js';
import { logWarn } from './logging/logger.js';
import { SUPPORTED_ASSET_EXTENSIONS } from './types/formats.js';
import type { AnimoriaAsset, GovernanceReport } from './types/index.js';
import { WorkspaceIndexer } from './indexer/workspace-indexer.js';
import { StaticAssetScanner } from './scanner/static-asset-scanner.js';
import { ThumbnailEngine } from './thumbnails/index.js';
import { UsageScanner } from './usage/usage-scanner.js';
import {
  computeWorkspaceRelativePath,
  integrationRegistry,
  toImportSpecifier,
} from './integration/index.js';
import type { FileChangeKind } from './indexer/types.js';

/** Cross-command state the daemon keeps for the lifetime of one workspace process. */
interface DaemonState {
  lastGovernanceReport?: GovernanceReport;
}

// Canonical definition and rationale: `types/formats.ts`.
const SUPPORTED_EXTENSIONS = new Set(SUPPORTED_ASSET_EXTENSIONS);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.animoria']);

/**
 * Entry point dispatcher for the `animoria` executable.
 *
 * ## Two consumers, one binary
 * `dist/cli.js` serves two distinct callers:
 *
 * 1. `animoria check [...]` — the headless CI/CD validation command.
 *    See `cli/check-command.js` for the actual orchestration; this
 *    file's only involvement is recognizing the `check` subcommand and
 *    translating its result into process-level effects (stdout,
 *    `process.exitCode`).
 * 2. `node cli.js <workspacePath>` (no subcommand) — a long-running,
 *    NDJSON-event-emitting watch process that IDE integrations spawn as
 *    a subprocess. Bidirectional: IDE sends commands via stdin, daemon
 *    emits results via stdout (see `CoreProcessManager.kt`).
 *
 * Dispatch is a single, explicit check on the first argument — no
 * shared state, no fallthrough between the two modes.
 */
async function main(): Promise<void> {
  if (process.argv[2] === 'check') {
    const result = await runCheckCommand(process.argv.slice(3));
    process.stdout.write(`${result.output}\n`);
    process.exitCode = result.exitCode;
    return;
  }

  await runWatchDaemon();
}

/**
 * Emits one NDJSON line to stdout.
 * All daemon output uses this function so the envelope shape is
 * consistent across push events and request/response replies.
 */
function emit(event: string, data: unknown, requestId?: string): void {
  const envelope: Record<string, unknown> = { event, data };
  if (requestId !== undefined) envelope.requestId = requestId;
  process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

/**
 * Scans a workspace once, emits an NDJSON `scanComplete` event with
 * every discovered asset, then watches the directory indefinitely,
 * emitting an NDJSON `watcherEvent` per filesystem change.
 *
 * Also reads stdin for inbound commands from the IDE host (JetBrains
 * `CoreProcessManager`). Each command line is a JSON object with a
 * `command` string, an optional `data` object, and an optional
 * `requestId` string. Responses are emitted on stdout with the matching
 * `requestId` so the caller can correlate them without ordering assumptions.
 *
 * A long-lived process meant to be read from as a subprocess's stdout
 * stream, not a one-shot command with an exit code — unrelated to
 * `animoria check`.
 */
async function runWatchDaemon(): Promise<void> {
  const rawWorkspacePath = process.argv[2];
  if (!rawWorkspacePath) {
    process.stderr.write(
      `${JSON.stringify({ event: 'error', data: { message: 'No workspace path provided' } })}\n`
    );
    process.exitCode = 1;
    return;
  }
  const workspacePath: string = rawWorkspacePath;

  emit('scanProgress', { percent: 10, message: 'Initializing workspace indexer...' });

  const indexer = new WorkspaceIndexer({ workspacePath });

  let initialScanDone = false;
  // Latest snapshot from the reactive indexer — used by on-demand commands.
  let latestAssets: readonly AnimoriaAsset[] = [];
  const daemonState: DaemonState = {};

  indexer.onDidUpdate(async (update) => {
    try {
      const scanner = new StaticAssetScanner({
        workspacePath,
        exclude: [...indexer.getIgnorePatterns()],
      });
      const staticResult = await scanner.scan();
      const animatedPaths = new Set(update.snapshot.assets.map((a) => a.path));
      const staticOnly = staticResult.assets.filter((a) => !animatedPaths.has(a.path));

      latestAssets = update.snapshot.assets;

      emit(initialScanDone ? 'watcherEvent' : 'scanComplete', {
        type: initialScanDone ? 'indexUpdate' : undefined,
        assets: update.snapshot.assets,
        ruleReport: update.snapshot.ruleReport,
        healthScore: update.snapshot.healthScore,
        referenceCounts: Array.from(update.snapshot.referenceCounts.entries()),
        staticAssets: staticOnly,
      });

      if (!initialScanDone) {
        initialScanDone = true;
      }
    } catch (err) {
      emit('error', {
        message: err instanceof Error ? err.message : 'Error processing indexer update',
      });
    }
  });

  try {
    await indexer.initialize();
    startWatcher(workspacePath, indexer);
  } catch (error) {
    emit('error', {
      message: error instanceof Error ? error.message : 'Error during scan execution',
    });
  }

  // ── Bidirectional stdin command handler ──────────────────────────────────
  // Commands arrive one JSON object per line from the IDE host.
  // The `requestId` field is echoed back on the response so the caller
  // can correlate requests and responses without ordering assumptions.
  const rl = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) return;

    let parsed: { command?: string; data?: Record<string, unknown>; requestId?: string };
    try {
      parsed = JSON.parse(trimmed) as typeof parsed;
    } catch {
      return;
    }

    const { command, data = {}, requestId } = parsed;
    if (!command) return;

    // Run each handler asynchronously; errors are emitted back to the
    // caller so the IDE can surface them without crashing the daemon.
    handleCommand(
      command,
      data,
      requestId,
      indexer,
      workspacePath,
      latestAssets,
      daemonState
    ).catch((err: unknown) => {
      emit(
        'commandError',
        { command, message: err instanceof Error ? err.message : String(err) },
        requestId
      );
    });
  });
}

/**
 * Dispatches a single inbound command to the appropriate handler.
 *
 * All handlers are async and report results by calling `emit()` with the
 * matching `requestId`. A handler that throws causes a `commandError`
 * envelope emitted by `runWatchDaemon`'s catch block.
 */
async function handleCommand(
  command: string,
  data: Record<string, unknown>,
  requestId: string | undefined,
  indexer: WorkspaceIndexer,
  workspacePath: string,
  latestAssets: readonly AnimoriaAsset[],
  daemonState: DaemonState
): Promise<void> {
  switch (command) {
    case 'runGovernance': {
      const overusedThreshold =
        typeof data.overusedThreshold === 'number' ? data.overusedThreshold : 10;
      const assets =
        latestAssets.length > 0 ? [...latestAssets] : [...indexer.getSnapshot().assets];

      if (assets.length === 0) {
        const emptyReport: GovernanceReport = {
          unused: [],
          duplicates: [],
          overused: [],
          totalAssets: 0,
          durationMs: 0,
          generatedAt: new Date().toISOString(),
        };
        daemonState.lastGovernanceReport = emptyReport;
        emit('governanceResult', emptyReport, requestId);
        return;
      }

      const analyzer = new GovernanceAnalyzer({ workspacePath, assets, overusedThreshold });
      const report = await analyzer.analyze();
      daemonState.lastGovernanceReport = report;
      emit('governanceResult', report, requestId);
      break;
    }

    case 'generateThumbnail': {
      const assetPath = data.assetPath as string | undefined;
      if (!assetPath) {
        emit(
          'thumbnailResult',
          { assetPath: '', thumbnailPath: null, error: 'assetPath required' },
          requestId
        );
        return;
      }

      const snapshot = indexer.getSnapshot();
      const asset = snapshot.assets.find((a) => a.path === assetPath);
      if (!asset) {
        emit(
          'thumbnailResult',
          { assetPath, thumbnailPath: null, error: 'asset not in index' },
          requestId
        );
        return;
      }

      const engine = new ThumbnailEngine({ workspacePath, frame: 'middle' });
      try {
        const abortController = new AbortController();
        const batch = await engine.generateBatch([asset], abortController.signal);
        const result = batch.results[0];
        emit(
          'thumbnailResult',
          {
            assetPath,
            thumbnailPath: result?.thumbnailPath ?? null,
            error: result?.error ?? null,
          },
          requestId
        );
      } finally {
        await engine.dispose();
      }
      break;
    }

    case 'generateSnippet': {
      const assetPath = data.assetPath as string | undefined;
      if (!assetPath) {
        emit('snippetResult', { results: [], error: 'assetPath required' }, requestId);
        return;
      }

      const snapshot = indexer.getSnapshot();
      const asset = snapshot.assets.find((a) => a.path === assetPath);
      if (!asset) {
        emit('snippetResult', { results: [], error: 'asset not in index' }, requestId);
        return;
      }

      const workspaceRelativePath = computeWorkspaceRelativePath(workspacePath, asset.path);
      const importPath = toImportSpecifier(workspaceRelativePath);
      const context = {
        asset,
        importPath,
        workspaceRelativePath,
        pathResolutionBasis: 'workspace-root' as const,
        workspacePath,
      };
      const results = integrationRegistry.generate(context);
      emit('snippetResult', { results }, requestId);
      break;
    }

    case 'buildCleanupProposal': {
      // The daemon provides a governance-driven proposal. Actual file
      // deletion is handled by the Kotlin side via the standard `vfs.delete`
      // API — CleanupExecutor is VS Code-specific (uses vscode.WorkspaceEdit).
      const snapshot = indexer.getSnapshot();
      const assets = [...snapshot.assets];

      if (assets.length === 0) {
        emit(
          'cleanupProposal',
          {
            candidates: [],
            totalSizeBytes: 0,
            affectedReferencesCount: 0,
            affectedFolders: [],
            estimatedHealthScoreDelta: 0,
            estimatedExecutionMs: 0,
            generatedAt: new Date().toISOString(),
          },
          requestId
        );
        return;
      }

      const dismissedPaths = new Set<string>(
        Array.isArray(data.dismissedPaths) ? (data.dismissedPaths as string[]) : []
      );

      const analyzer = new GovernanceAnalyzer({ workspacePath, assets, overusedThreshold: 10 });
      const report = await analyzer.analyze();
      const referenceCounts = snapshot.referenceCounts;

      const orphanCandidates = report.unused
        .filter((issue) => !dismissedPaths.has(issue.asset.path))
        .map((issue) => ({
          asset: issue.asset,
          reasons: ['orphaned'],
          confidence: 'high',
          referenceCount: referenceCounts.get(issue.asset.path) ?? 0,
          affectedReferences: [],
          sizeBytes: issue.asset.sizeBytes,
          dismissed: false,
        }));

      const duplicateCandidates = report.duplicates
        .filter((issue) => !dismissedPaths.has(issue.asset.path))
        .map((issue) => ({
          asset: issue.asset,
          reasons: ['duplicate'],
          confidence: 'high',
          referenceCount: referenceCounts.get(issue.asset.path) ?? 0,
          affectedReferences: [],
          sizeBytes: issue.asset.sizeBytes,
          dismissed: false,
        }));

      const allCandidates = [...orphanCandidates, ...duplicateCandidates];
      const totalSizeBytes = allCandidates.reduce((sum, c) => sum + c.sizeBytes, 0);
      const affectedFolders = [
        ...new Set(allCandidates.map((c) => c.asset.path.split('/').slice(0, -1).join('/'))),
      ];

      emit(
        'cleanupProposal',
        {
          candidates: allCandidates,
          totalSizeBytes,
          affectedReferencesCount: 0,
          affectedFolders,
          estimatedHealthScoreDelta: Math.min(allCandidates.length * 2, 20),
          estimatedExecutionMs: allCandidates.length * 50,
          generatedAt: new Date().toISOString(),
        },
        requestId
      );
      break;
    }

    case 'executeCleanup': {
      const assetPaths = Array.isArray(data.assetPaths) ? (data.assetPaths as string[]) : [];
      const snapshot = indexer.getSnapshot();
      const healthScoreBefore = snapshot.healthScore?.score ?? 0;

      const toMove = assetPaths
        .map((path) => snapshot.assets.find((a) => a.path === path))
        .filter((a): a is AnimoriaAsset => a !== undefined);

      if (toMove.length === 0) {
        emit(
          'cleanupSummary',
          {
            removedAssetPaths: [],
            bytesReclaimed: 0,
            healthScoreBefore,
            healthScoreAfter: healthScoreBefore,
            remainingCandidates: 0,
            completedAt: new Date().toISOString(),
            trashLocation: null,
          },
          requestId
        );
        return;
      }

      const { trashDir, moved, bytesReclaimed } = await moveAssetsToTrash(workspacePath, toMove);
      for (const path of moved) indexer.notifyFileChanged(path, 'deleted');

      emit(
        'cleanupSummary',
        {
          removedAssetPaths: moved,
          bytesReclaimed,
          healthScoreBefore,
          healthScoreAfter: Math.min(100, healthScoreBefore + Math.min(moved.length * 2, 20)),
          remainingCandidates: Math.max(0, assetPaths.length - moved.length),
          completedAt: new Date().toISOString(),
          trashLocation: trashDir,
        },
        requestId
      );
      break;
    }

    case 'resolveDuplicates': {
      const keepPath = data.keepPath as string | undefined;
      const removePaths = Array.isArray(data.removePaths) ? (data.removePaths as string[]) : [];

      if (!keepPath || removePaths.length === 0) {
        emit(
          'duplicateResolutionResult',
          {
            removedAssetPaths: [],
            trashLocation: null,
            error: 'keepPath and removePaths required',
          },
          requestId
        );
        return;
      }

      const snapshot = indexer.getSnapshot();
      const toRemove = removePaths
        .filter((path) => path !== keepPath)
        .map((path) => snapshot.assets.find((a) => a.path === path))
        .filter((a): a is AnimoriaAsset => a !== undefined);

      if (toRemove.length === 0) {
        emit(
          'duplicateResolutionResult',
          { removedAssetPaths: [], trashLocation: null },
          requestId
        );
        return;
      }

      const { trashDir, moved } = await moveAssetsToTrash(workspacePath, toRemove);
      for (const path of moved) indexer.notifyFileChanged(path, 'deleted');

      emit(
        'duplicateResolutionResult',
        { removedAssetPaths: moved, trashLocation: trashDir },
        requestId
      );
      break;
    }

    case 'exportGovernanceReport': {
      const format = data.format === 'json' ? 'json' : 'markdown';
      const report = daemonState.lastGovernanceReport;

      if (!report) {
        emit(
          'governanceReportExport',
          { content: '', format, error: 'No governance report available. Run analysis first.' },
          requestId
        );
        return;
      }

      const content = format === 'json' ? buildJsonReport(report) : buildMarkdownReport(report);
      emit('governanceReportExport', { content, format }, requestId);
      break;
    }

    case 'getUsageReferences': {
      const assetPath = data.assetPath as string | undefined;
      if (!assetPath) {
        emit(
          'usageReferencesResult',
          { assetPath: '', references: [], error: 'assetPath required' },
          requestId
        );
        return;
      }

      const snapshot = indexer.getSnapshot();
      const asset = snapshot.assets.find((a) => a.path === assetPath);
      if (!asset) {
        emit(
          'usageReferencesResult',
          { assetPath, references: [], error: 'asset not in index' },
          requestId
        );
        return;
      }

      const scanner = new UsageScanner({ workspacePath, asset, strategy: 'pattern' });
      const result = await scanner.search();
      emit(
        'usageReferencesResult',
        { assetPath, references: result.references, durationMs: result.durationMs },
        requestId
      );
      break;
    }

    case 'getSnapshot': {
      const snapshot = indexer.getSnapshot();
      emit(
        'snapshotResult',
        {
          assets: [...snapshot.assets],
          ruleReport: snapshot.ruleReport,
          healthScore: snapshot.healthScore,
          referenceCounts: Array.from(snapshot.referenceCounts.entries()),
        },
        requestId
      );
      break;
    }

    default: {
      emit('commandError', { command, message: `Unknown command: ${command}` }, requestId);
    }
  }
}

function startWatcher(dir: string, indexer: WorkspaceIndexer): void {
  try {
    watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Skip common excluded folders early
      const parts = filename.split(/[/\\]/);
      if (parts.some((part) => EXCLUDE_DIRS.has(part))) {
        return;
      }

      const ext = extname(filename).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) return;

      const fullPath = join(dir, filename);
      const exists = existsSync(fullPath);

      const kind: FileChangeKind = !exists
        ? 'deleted'
        : eventType === 'rename'
          ? 'created'
          : 'changed';

      indexer.notifyFileChanged(fullPath, kind);
    });
  } catch (err) {
    logWarn('cli-watch', 'cli.startWatcher', 'Filesystem watcher could not be started', {
      assetPath: dir,
      reason: 'fs.watch failed (unsupported platform or inaccessible directory)',
      error: err,
      recovery: 'watch mode disabled for this process; no further file events will be emitted',
    });
  }
}

void main();
