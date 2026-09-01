import { promises as fs, existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type {
  Asset,
  DuplicateGroup,
  ReferenceRewriteProposal,
  ResolutionPlan,
  TrashItem,
  UsageReference,
  WorkspaceAnalysis,
} from '@animoria/contracts';
import type {
  CleanupEntry,
  CleanupExecutionResult,
  CleanupPlan,
  CleanupRefusal,
  HostCapabilities,
  HostInbound,
  HostOutbound,
  MultiRootAnalysis,
  RestoreResult,
  ReviewableCleanupProposal,
  SessionManifest,
  UiPreferences,
} from '@animoria/ui/bridge';
import {
  BROWSER_ANIMATED_FORMATS,
  DEFAULT_PREFERENCES,
  LOTTIE_FORMATS,
  buildAnimationPreview,
  validateOutbound,
} from '@animoria/ui/bridge';
import * as vscode from 'vscode';
import type { VsCodeDaemonClient } from '../daemon/daemon-client.js';
import { buildIntegrationContext } from '../workspace-context/build-integration-context.js';

export type { MultiRootAnalysis, CleanupPlan, CleanupExecutionResult };

export interface WorkspaceSession {
  readonly identity: string;
  readonly roots: readonly { readonly id: string; readonly name: string; readonly path: string }[];
  getAnalysis(): MultiRootAnalysis;
  indexerForRoot(rootId: string): { getAnalysis(): WorkspaceAnalysis } | null;
  indexerForPath(path: string): { root: { path: string } } | null;
}

const logWarn = (category: string, source: string, message: string, details?: unknown): void => {
  const detail = details !== undefined ? ` ${JSON.stringify(details)}` : '';
  console.warn(`[animoria:${category}] ${source}: ${message}${detail}`);
};

// Matches the longest root path so a nested root attributes to the more specific one; null (never cwd()) if none matches.
function rootForPath(
  roots: readonly { readonly id: string; readonly name: string; readonly path: string }[],
  path: string
): { readonly id: string; readonly name: string; readonly path: string } | null {
  let best: (typeof roots)[number] | null = null;
  for (const root of roots) {
    if (
      path === root.path ||
      path.startsWith(`${root.path}/`) ||
      path.startsWith(`${root.path}\\`)
    ) {
      if (!best || root.path.length > best.path.length) best = root;
    }
  }
  return best ?? roots[0] ?? null;
}

export interface ResolutionResult {
  status: 'applied' | 'rejected' | 'failed';
  removedAssetPaths: readonly string[];
  recoveredBytes: number;
  trashSessionId: string | null;
  error?: string | null;
  issues?: readonly { message: string }[];
}

type CleanupCandidate = ReviewableCleanupProposal['candidates'][number];

// Assembles candidates from Core's existing no-unreferenced-assets diagnostics; invents no new eligibility logic.
function buildCleanupCandidates(
  analysis: WorkspaceAnalysis,
  opts?: { dismissedPaths: ReadonlySet<string> }
): CleanupCandidate[] {
  const dismissed = opts?.dismissedPaths ?? new Set<string>();
  const assetsByPath = new Map(analysis.assets.map((a) => [a.path, a]));
  const assetsById = new Map(analysis.assets.map((a) => [a.id, a]));

  const candidates: CleanupCandidate[] = [];
  for (const d of analysis.diagnostics) {
    if (d.rule_id !== 'no-unreferenced-assets') continue;
    const asset =
      assetsByPath.get(d.target_asset_path) ??
      (d.target_asset_id ? assetsById.get(d.target_asset_id) : undefined);
    if (!asset || dismissed.has(asset.path)) continue;
    candidates.push({
      asset,
      reasons: [{ code: d.rule_id, message: d.message }],
      sizeBytes: asset.size_bytes,
      referenceCount: 0,
      eligibility: { eligible: true },
      severity: d.severity,
    });
  }
  return candidates;
}

async function buildReviewableProposal(
  candidates: CleanupCandidate[],
  _analysis?: WorkspaceAnalysis
): Promise<ReviewableCleanupProposal> {
  return {
    candidates,
    totalSizeBytes: candidates.reduce((sum, c) => sum + (c.sizeBytes ?? 0), 0),
  };
}

// One-to-one relabel of Core's severity into UI confidence vocabulary, not a new judgment.
function confidenceFor(severity: string | undefined): string {
  return severity === 'error' ? 'certain' : severity === 'warning' ? 'moderate' : 'low';
}

function buildCleanupPlan(
  proposal: ReviewableCleanupProposal,
  assetPaths: readonly string[] = []
): CleanupPlan {
  const wanted = new Set(
    assetPaths.length > 0 ? assetPaths : proposal.candidates.map((c) => c.asset.path)
  );
  const byPath = new Map(proposal.candidates.map((c) => [c.asset.path, c]));

  const entries: CleanupEntry[] = [];
  const refusals: CleanupRefusal[] = [];
  for (const path of wanted) {
    const candidate = byPath.get(path);
    if (!candidate) {
      refusals.push({ assetPath: path, explanation: 'Not currently proposed for cleanup.' });
      continue;
    }
    entries.push({
      asset: candidate.asset,
      reasons: candidate.reasons,
      confidence: confidenceFor(candidate.severity),
      sizeBytes: candidate.sizeBytes ?? candidate.asset.size_bytes,
    });
  }

  return {
    planId: `cleanup-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    entries,
    refusals,
    safety: refusals.length > 0 ? 'partial' : 'safe',
    bytesReclaimed: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
  };
}

/** One trashed asset paired with the size it reclaimed, for the trash-session manifest. */
interface TrashedItem {
  readonly item: TrashItem;
  readonly sizeBytes: number;
}

// Stops at the first failed entry unless allowPartial is set — partial application is refused unless opted into.
async function executeCleanupPlan(
  plan: CleanupPlan,
  opts: { daemon: VsCodeDaemonClient; workspacePath: string; allowPartial?: boolean }
): Promise<CleanupExecutionResult & { trashedItems: TrashedItem[] }> {
  if (plan.refusals.length > 0 && !opts.allowPartial) {
    return {
      status: 'failed',
      removedAssetPaths: [],
      recoveredBytes: 0,
      trashSessionId: '',
      error: `${plan.refusals.length} asset(s) could not be resolved for cleanup; refusing a partial application.`,
      trashedItems: [],
    };
  }

  const removedAssetPaths: string[] = [];
  const trashedItems: TrashedItem[] = [];
  let recoveredBytes = 0;
  let firstError: string | null = null;

  for (const entry of plan.entries) {
    try {
      const item = await opts.daemon.trashAsset(
        opts.workspacePath,
        entry.asset.id,
        entry.asset.path
      );
      trashedItems.push({ item, sizeBytes: entry.sizeBytes });
      removedAssetPaths.push(entry.asset.path);
      recoveredBytes += entry.sizeBytes;
    } catch (err) {
      firstError = err instanceof Error ? err.message : String(err);
      if (!opts.allowPartial) break;
    }
  }

  const status: CleanupExecutionResult['status'] =
    removedAssetPaths.length === 0
      ? 'failed'
      : removedAssetPaths.length < plan.entries.length
        ? 'partial'
        : 'applied';

  return {
    status,
    removedAssetPaths,
    recoveredBytes,
    trashSessionId: trashedItems.length > 0 ? `session-${Date.now()}` : '',
    error: status === 'failed' ? firstError : null,
    trashedItems,
  };
}

// Reuses Core's remediate_plan rather than reimplementing "which copies get deleted" here.
async function buildResolutionPlan(opts: {
  daemon: VsCodeDaemonClient;
  group: DuplicateGroup;
}): Promise<ResolutionPlan> {
  return opts.daemon.remediatePlan(opts.group);
}

async function executeResolutionPlan(
  plan: ResolutionPlan,
  opts: {
    daemon: VsCodeDaemonClient;
    workspacePath: string;
    assetsById: ReadonlyMap<string, Asset>;
    allowPartial?: boolean;
  }
): Promise<ResolutionResult & { trashedItems: TrashedItem[] }> {
  const removedAssetPaths: string[] = [];
  const trashedItems: TrashedItem[] = [];
  let recoveredBytes = 0;
  let firstError: string | null = null;

  for (const assetId of plan.target_assets_to_delete) {
    const asset = opts.assetsById.get(assetId);
    if (!asset) {
      firstError = `Asset '${assetId}' from the resolution plan is no longer in the analysis.`;
      if (!opts.allowPartial) break;
      continue;
    }
    try {
      const item = await opts.daemon.trashAsset(opts.workspacePath, asset.id, asset.path);
      trashedItems.push({ item, sizeBytes: asset.size_bytes });
      removedAssetPaths.push(asset.path);
      recoveredBytes += asset.size_bytes;
    } catch (err) {
      firstError = err instanceof Error ? err.message : String(err);
      if (!opts.allowPartial) break;
    }
  }

  const status: ResolutionResult['status'] = removedAssetPaths.length === 0 ? 'failed' : 'applied';

  return {
    status,
    removedAssetPaths,
    recoveredBytes,
    trashSessionId: trashedItems.length > 0 ? `session-${Date.now()}` : null,
    error: status === 'failed' ? firstError : null,
    trashedItems,
  };
}

export interface SnippetOption {
  label: string;
  language: string;
  code: string;
  imports?: string | undefined;
  installHint?: string | undefined;
}

function toCamelCase(stem: string): string {
  return stem
    .replace(/[-_.\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/[^a-zA-Z0-9$_]/g, '');
}

function toPascalCase(stem: string): string {
  return stem
    .replace(/[-_.\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9$_]/g, '');
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

// Falls back to npm not because it's assumed present, but because it's guaranteed to work with no prior setup.
function detectPackageManager(workspacePath: string): PackageManager {
  if (existsSync(join(workspacePath, 'bun.lockb')) || existsSync(join(workspacePath, 'bun.lock'))) {
    return 'bun';
  }
  if (existsSync(join(workspacePath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(workspacePath, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function installCommand(pkgManager: PackageManager, packageName: string): string {
  switch (pkgManager) {
    case 'pnpm':
      return `pnpm add ${packageName}`;
    case 'yarn':
      return `yarn add ${packageName}`;
    case 'bun':
      return `bun add ${packageName}`;
    default:
      return `npm install ${packageName}`;
  }
}

export function generateSnippetsForAsset(
  asset: Asset,
  importPath: string,
  workspacePath?: string
): SnippetOption[] {
  const varName = toCamelCase(asset.stem);
  const compName = toPascalCase(asset.stem);
  const format = asset.format.toLowerCase();
  const pkgManager = workspacePath ? detectPackageManager(workspacePath) : 'npm';
  const npm = (packageName: string) => installCommand(pkgManager, packageName);

  const snippets: SnippetOption[] = [];

  if (format === 'lottie' || format === 'dotlottie') {
    const isDotLottie = format === 'dotlottie';

    // 1. React
    snippets.push({
      label: 'React (lottie-react)',
      language: 'tsx',
      imports: [
        `import Lottie from 'lottie-react';`,
        `import ${varName}Data from '${importPath}';`,
      ].join('\n'),
      code: [
        '<Lottie',
        `  animationData={${varName}Data}`,
        '  loop={true}',
        '  autoplay={true}',
        '/>',
      ].join('\n'),
      installHint: npm('lottie-react'),
    });

    // 2. React Native
    snippets.push({
      label: 'React Native (lottie-react-native)',
      language: 'tsx',
      imports: [
        `import LottieView from 'lottie-react-native';`,
        `import ${varName}Data from '${importPath}';`,
      ].join('\n'),
      code: [
        '<LottieView',
        `  source={${varName}Data}`,
        '  autoPlay',
        '  loop',
        '  style={{ width: 200, height: 200 }}',
        '/>',
      ].join('\n'),
      installHint: npm('lottie-react-native'),
    });

    // 3. Astro / Web Component
    if (isDotLottie) {
      snippets.push({
        label: 'Astro / dotLottie Web Component',
        language: 'astro',
        imports: `import '@lottiefiles/dotlottie-wc';`,
        code: [
          '<dotlottie-player',
          `  src="${importPath}"`,
          '  autoplay',
          '  loop',
          `  style="width: 250px; height: 250px;"`,
          '></dotlottie-player>',
        ].join('\n'),
        installHint: npm('@lottiefiles/dotlottie-wc'),
      });
    } else {
      snippets.push({
        label: 'Astro (lottie-web)',
        language: 'astro',
        imports: [
          '---',
          '// Astro Frontmatter',
          `import ${varName}Data from '${importPath}';`,
          '---',
        ].join('\n'),
        code: [
          `<div id="lottie-${varName}" style="width: 250px; height: 250px;"></div>`,
          '<script>',
          `  import lottie from 'lottie-web';`,
          `  import animationData from '${importPath}';`,
          '  lottie.loadAnimation({',
          `    container: document.getElementById('lottie-${varName}')!,`,
          `    renderer: 'svg',`,
          '    loop: true,',
          '    autoplay: true,',
          '    animationData,',
          '  });',
          '</script>',
        ].join('\n'),
        installHint: npm('lottie-web'),
      });
    }

    // 4. Vue 3
    snippets.push({
      label: 'Vue 3 (vue3-lottie)',
      language: 'vue',
      imports: [
        '<script setup>',
        `import Vue3Lottie from 'vue3-lottie';`,
        `import ${varName}Data from '${importPath}';`,
        '</script>',
      ].join('\n'),
      code: [
        '<template>',
        '  <Vue3Lottie',
        `    :animationData="${varName}Data"`,
        `    :loop="true"`,
        `    :autoPlay="true"`,
        '  />',
        '</template>',
      ].join('\n'),
      installHint: npm('vue3-lottie'),
    });

    // 5. SwiftUI
    snippets.push({
      label: 'SwiftUI (Lottie)',
      language: 'swift',
      imports: 'import SwiftUI\nimport Lottie',
      code: [
        `LottieView(animation: .named("${asset.stem}"))`,
        '    .playbackMode(.playing(.toProgress(1, loopMode: .loop)))',
        '    .frame(width: 200, height: 200)',
      ].join('\n'),
      installHint: 'Swift Package Manager: lottie-spm',
    });

    // 6. Flutter
    snippets.push({
      label: 'Flutter (lottie)',
      language: 'dart',
      imports: `import 'package:lottie/lottie.dart';`,
      code: [
        'Lottie.asset(',
        `  '${importPath.replace(/^\.\//, '')}',`,
        '  repeat: true,',
        '  animate: true,',
        ')',
      ].join('\n'),
      installHint: 'flutter pub add lottie',
    });

    // 7. Jetpack Compose
    snippets.push({
      label: 'Jetpack Compose (lottie-compose)',
      language: 'kotlin',
      imports: [
        'import com.airbnb.lottie.compose.LottieAnimation',
        'import com.airbnb.lottie.compose.LottieCompositionSpec',
        'import com.airbnb.lottie.compose.rememberLottieComposition',
      ].join('\n'),
      code: [
        '@Composable',
        `fun ${compName}Animation() {`,
        `    val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(R.raw.${varName}))`,
        '    LottieAnimation(composition = composition, iterations = Int.MAX_VALUE)',
        '}',
      ].join('\n'),
      installHint: 'implementation("com.airbnb.android:lottie-compose:6.4.0")',
    });
  } else if (format === 'rive') {
    snippets.push({
      label: 'React (@rive-app/react-canvas)',
      language: 'tsx',
      imports: `import { useRive } from '@rive-app/react-canvas';`,
      code: [
        'const { RiveComponent } = useRive({',
        `  src: '${importPath}',`,
        '  autoplay: true,',
        '});',
        'return <RiveComponent style={{ width: 300, height: 300 }} />;',
      ].join('\n'),
      installHint: npm('@rive-app/react-canvas'),
    });
  } else {
    // Static or image assets: SVG, PNG, WebP, AVIF, JPEG, GIF, APNG
    snippets.push({
      label: 'React / Next.js Image',
      language: 'tsx',
      imports: `import ${varName}Img from '${importPath}';`,
      code: `<img src={${varName}Img} alt="${asset.stem}" loading="lazy" />`,
    });

    snippets.push({
      label: 'React Native Image',
      language: 'tsx',
      imports: `import { Image } from 'react-native';\nimport ${varName}Img from '${importPath}';`,
      code: `<Image source={${varName}Img} style={{ width: 100, height: 100 }} />`,
    });

    snippets.push({
      label: 'HTML / Astro <img>',
      language: 'html',
      code: `<img src="${importPath}" alt="${asset.stem}" width="200" height="200" />`,
    });

    snippets.push({
      label: 'Vue 3 <img>',
      language: 'vue',
      imports: `<script setup>\nimport ${varName}Img from '${importPath}';\n</script>`,
      code: `<template>\n  <img :src="${varName}Img" alt="${asset.stem}" />\n</template>`,
    });
  }

  return snippets;
}

async function readLottieDocument(
  path: string
): Promise<{ animation: Record<string, unknown>; totalFrames: number; frameRate: number } | null> {
  try {
    const raw = await fs.readFile(path, 'utf8');
    const animation = JSON.parse(raw);
    const ip = typeof animation.ip === 'number' ? animation.ip : 0;
    const op = typeof animation.op === 'number' ? animation.op : 0;
    const fr = typeof animation.fr === 'number' ? animation.fr : 30;
    return {
      animation,
      totalFrames: Math.max(0, op - ip),
      frameRate: fr,
    };
  } catch {
    return null;
  }
}

/**
 * VS Code host bridge implementation for `@animoria/ui`.
 */
export class VsCodeHostBridge {
  private readonly _post: (message: HostInbound) => void;
  private readonly _sessionOf: () => WorkspaceSession | undefined;
  private readonly _daemonOf: () => VsCodeDaemonClient | undefined;

  private readonly _cleanupPlans = new Map<
    string,
    { planId: string; rootId: string; rootName: string; plan: CleanupPlan }
  >();
  private readonly _resolutionPlans = new Map<
    string,
    {
      rootId: string;
      rootName: string;
      planId: string;
      plan: ResolutionPlan;
      workspacePath: string;
    }
  >();
  private _planCounter = 0;

  private readonly _onReady: (() => void) | undefined;
  private readonly _memento: vscode.Memento | undefined;

  constructor(options: {
    session: () => WorkspaceSession | undefined;
    daemon?: () => VsCodeDaemonClient | undefined;
    post: (message: HostInbound) => void;
    onReady?: () => void;
    memento?: vscode.Memento;
  }) {
    this._sessionOf = options.session;
    this._daemonOf = options.daemon ?? (() => undefined);
    this._post = options.post;
    this._onReady = options.onReady;
    this._memento = options.memento;
  }

  private get _session(): WorkspaceSession | null {
    return this._sessionOf() ?? null;
  }

  private _requireDaemon(): VsCodeDaemonClient | null {
    const daemon = this._daemonOf();
    if (!daemon) {
      this._post({
        type: 'error',
        message:
          'Animoria has no connection to the native engine. Reload the window and try again.',
        recoverable: true,
      });
      return null;
    }
    return daemon;
  }

  static capabilities(): HostCapabilities {
    return {
      canMutate: true,
      canRestore: true,
      canRevealInFileManager: true,
      canOpenReference: true,
      canGenerateSnippet: true,
      canCopyToClipboard: true,
      mutationUnavailableReason: null,
    };
  }

  async handle(raw: unknown): Promise<void> {
    const validated = validateOutbound(raw);
    if (!validated.ok) {
      void vscode.window.showWarningMessage(`Animoria: ignored a message — ${validated.reason}`);
      return;
    }

    try {
      await this._dispatch(validated.message);
    } catch (error) {
      logWarn('host-bridge', 'VsCodeHostBridge.handle', 'A host operation failed', {
        reason: `dispatching "${validated.message.type}" threw`,
        error,
        recovery: 'the UI is told the operation failed and re-enables its controls',
      });
      this._post({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
    }
  }

  publishAnalysis(analysis: MultiRootAnalysis): void {
    this._post({ type: 'analysis', analysis: toWireAnalysis(analysis) });
  }

  publishRoots(analysis: MultiRootAnalysis): void {
    this._post({
      type: 'roots-changed',
      roots: [{ id: 'root', name: 'Workspace', path: process.cwd() }],
    });
  }

  publishProgress(
    readiness: {
      assetsIndexed?: boolean;
      referencesResolved?: boolean;
      duplicatesResolved?: boolean;
      complete?: boolean;
    },
    message: string
  ): void {
    this._post({
      type: 'analysis-progress',
      readiness: {
        assetsIndexed: readiness?.assetsIndexed ?? true,
        referencesResolved: readiness?.referencesResolved ?? true,
        duplicatesResolved: readiness?.duplicatesResolved ?? true,
        complete: readiness?.complete ?? true,
      },
      message,
    });
  }

  dispose(): void {
    this._cleanupPlans.clear();
    this._resolutionPlans.clear();
  }

  private async _dispatch(message: HostOutbound): Promise<void> {
    const session = this._session;
    if (!session) {
      this._post({
        type: 'error',
        message: 'Animoria has no workspace open. Open a folder and run the analysis again.',
        recoverable: true,
      });
      return;
    }

    switch (message.type) {
      case 'ready':
        this._post({ type: 'capabilities', capabilities: VsCodeHostBridge.capabilities() });
        this._post({ type: 'preferences', preferences: this._preferences() });
        this.publishAnalysis(session.getAnalysis());
        this._onReady?.();
        return;

      case 'run-analysis': {
        await vscode.commands.executeCommand('animoria.refresh');
        const refreshed = this._session;
        if (refreshed) this.publishAnalysis(refreshed.getAnalysis());
        return;
      }

      case 'open-asset':
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.assetPath), {
          preview: true,
        });
        return;

      case 'reveal-asset':
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(message.assetPath));
        return;

      case 'open-reference': {
        try {
          const filePath =
            message.file ||
            (message as { file_path?: string }).file_path ||
            (message as { filePath?: string }).filePath;
          if (!filePath) return;
          const line = message.line || (message as { line_number?: number }).line_number || 1;
          const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
          const editor = await vscode.window.showTextDocument(document, { preview: true });
          const posLine = Math.max(0, line - 1);
          const position = new vscode.Position(posLine, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          void vscode.window.showWarningMessage(`Could not open reference file: ${msg}`);
        }
        return;
      }

      case 'copy-to-clipboard':
        await vscode.env.clipboard.writeText(message.text);
        void vscode.window.setStatusBarMessage(`Animoria: ${message.label} copied`, 2000);
        return;

      case 'request-thumbnail': {
        const asset = this._assetFor(message.assetPath);
        this._post({
          type: 'thumbnail',
          assetPath: message.assetPath,
          source: asset?.path ? await this._dataUri(asset.path) : null,
        });
        return;
      }

      case 'request-animation-data': {
        const asset = this._assetFor(message.assetPath);
        if (!asset) {
          this._post({
            type: 'animation-data',
            assetPath: message.assetPath,
            preview: null,
            error: 'That asset is not in the current analysis. Refresh and try again.',
          });
          return;
        }

        const format = asset.format.toLowerCase();
        const isBrowserAnimated =
          BROWSER_ANIMATED_FORMATS.includes(format as (typeof BROWSER_ANIMATED_FORMATS)[number]) ||
          format === 'gif' ||
          format === 'apng';
        const isStaticImage = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg'].includes(format);
        const isLottie =
          LOTTIE_FORMATS.includes(format as (typeof LOTTIE_FORMATS)[number]) ||
          format === 'lottie' ||
          format === 'dot-lottie';

        const sourceUrl =
          isBrowserAnimated || isStaticImage ? await this._dataUri(asset.path) : null;
        const document = isLottie ? await readLottieDocument(asset.path) : null;
        const stillUrl = asset.thumbnail_path ? await this._dataUri(asset.thumbnail_path) : null;

        const previewFormat = (
          format === 'gif' || format === 'apng' || format === 'svg'
            ? format
            : isLottie
              ? 'lottie'
              : format
        ) as Parameters<typeof buildAnimationPreview>[0]['format'];

        this._post({
          type: 'animation-data',
          assetPath: message.assetPath,
          preview: buildAnimationPreview({
            format: previewFormat,
            sourceUrl,
            stillUrl,
            animation: document?.animation ?? null,
            totalFrames: document?.totalFrames ?? 0,
            frameRate: document?.frameRate ?? 0,
          }),
          error: null,
        });
        return;
      }

      case 'request-cleanup-proposal': {
        const proposals = [];
        for (const root of session.roots) {
          const indexer = session.indexerForRoot(root.id);
          if (!indexer) continue;
          const analysis = indexer.getAnalysis();
          const proposal = await buildReviewableProposal(
            buildCleanupCandidates(analysis, { dismissedPaths: this._dismissed() }),
            analysis
          );
          proposals.push({ rootId: root.id, rootName: root.name, proposal });
        }
        this._post({ type: 'cleanup-proposal', roots: proposals });
        return;
      }

      case 'request-cleanup-plan': {
        const plans = [];
        const pathsByRoot = new Map<string, string[]>();
        for (const path of message.assetPaths) {
          const root = rootForPath(session.roots, path);
          if (root) {
            const list = pathsByRoot.get(root.id) ?? [];
            list.push(path);
            pathsByRoot.set(root.id, list);
          }
        }

        for (const [rootId, assetPaths] of pathsByRoot.entries()) {
          const indexer = session.indexerForRoot(rootId);
          const root = session.roots.find((r) => r.id === rootId);
          if (!indexer || !root) continue;
          const analysis = indexer.getAnalysis();
          const proposal = await buildReviewableProposal(
            buildCleanupCandidates(analysis, { dismissedPaths: this._dismissed() }),
            analysis
          );
          const plan = buildCleanupPlan(proposal, assetPaths);
          this._cleanupPlans.set(plan.planId, {
            planId: plan.planId,
            rootId: root.id,
            rootName: root.name,
            plan,
          });
          plans.push({ planId: plan.planId, rootId: root.id, rootName: root.name, plan });
        }
        this._post({ type: 'cleanup-plan', plans });
        return;
      }

      case 'apply-cleanup-plan': {
        const stored = this._cleanupPlans.get(message.planId);
        if (!stored) {
          this._post({
            type: 'error',
            message: 'That cleanup preview is no longer available. Preview the removal again.',
            recoverable: true,
          });
          return;
        }

        const root = session.roots.find((r) => r.id === stored.rootId);
        const daemon = this._requireDaemon();
        if (!root || !daemon) {
          this._post({
            type: 'cleanup-result',
            result: refusedCleanup('That root is no longer part of this workspace.'),
          });
          return;
        }

        const { trashedItems, ...result } = await executeCleanupPlan(stored.plan, {
          daemon,
          workspacePath: root.path,
          allowPartial: message.allowPartial,
        });
        this._cleanupPlans.delete(message.planId);
        if (trashedItems.length > 0) {
          this._recordTrashSession(root.path, trashedItems);
        }
        this._post({ type: 'cleanup-result', result });

        if (result.status === 'applied' || result.status === 'partial') {
          void vscode.window.showInformationMessage(
            `Animoria moved ${result.removedAssetPaths.length} asset(s) to trash.`
          );
          this.publishAnalysis(session.getAnalysis());
        }
        return;
      }

      case 'request-resolution-plan': {
        const multiRootAnalysis = session.getAnalysis();
        const group = multiRootAnalysis.duplicateGroups.find((g) => g.id === message.groupId);
        const canonical = multiRootAnalysis.assets.find(
          (a: Asset) => a.path === message.keepPath || a.id === message.keepPath
        );
        if (!group || !canonical) {
          this._post({
            type: 'error',
            message: 'That duplicate group is gone.',
            recoverable: true,
          });
          return;
        }

        const canonicalRoot = rootForPath(session.roots, canonical.path);
        const daemon = this._requireDaemon();
        if (!canonicalRoot || !daemon) {
          this._post({
            type: 'error',
            message: `Animoria could not attribute ${canonical.name} to a workspace root.`,
            recoverable: true,
          });
          return;
        }

        // The user's choice of which copy to keep becomes the group's
        // canonical asset before Core computes the plan — Core still owns
        // "which assets get deleted", the UI only expresses intent about
        // which one survives.
        const plan = await buildResolutionPlan({
          daemon,
          group: { ...group, canonical_asset_id: canonical.id },
        });
        this._planCounter += 1;
        const planId = `resolution-${group.id}-${this._planCounter}`;
        this._resolutionPlans.set(planId, {
          planId,
          plan,
          rootId: canonicalRoot.id,
          rootName: canonicalRoot.name,
          workspacePath: canonicalRoot.path,
        });
        this._post({
          type: 'resolution-plan',
          planId,
          plan,
          rootId: canonicalRoot.id,
          rootName: canonicalRoot.name,
        });
        return;
      }

      case 'apply-resolution-plan': {
        const stored = this._resolutionPlans.get(message.planId);
        if (!stored) {
          this._post({
            type: 'error',
            message: 'That resolution preview is no longer available. Select a copy again.',
            recoverable: true,
          });
          return;
        }

        const plan = stored.plan;
        const confirmed = await vscode.window.showWarningMessage(
          `Keep selected asset and move ${plan.target_assets_to_delete.length} duplicate(s) to trash?`,
          { modal: true },
          'Resolve'
        );
        if (confirmed !== 'Resolve') {
          this._post({
            type: 'resolution-result',
            status: 'rejected',
            removedAssetPaths: [],
            recoveredBytes: 0,
            trashSessionId: null,
            reason: null,
          });
          return;
        }

        const daemon = this._requireDaemon();
        if (!daemon) {
          this._resolutionPlans.delete(message.planId);
          return;
        }

        const assetsById = new Map(session.getAnalysis().assets.map((a: Asset) => [a.id, a]));
        const { trashedItems, ...result } = await executeResolutionPlan(stored.plan, {
          daemon,
          workspacePath: stored.workspacePath,
          assetsById,
          allowPartial: message.allowPartial,
        });
        this._resolutionPlans.delete(message.planId);
        if (trashedItems.length > 0) {
          this._recordTrashSession(stored.workspacePath, trashedItems);
        }

        this._post({
          type: 'resolution-result',
          status: result.status,
          removedAssetPaths: result.removedAssetPaths,
          recoveredBytes: result.recoveredBytes,
          trashSessionId: result.trashSessionId,
          reason:
            result.error ??
            (result.issues && result.issues.length > 0 ? result.issues[0]?.message : null) ??
            null,
        });

        if (result.status === 'applied') {
          void vscode.window.showInformationMessage(
            `Animoria resolved duplicates and moved ${result.removedAssetPaths.length} original(s) to trash.`
          );
          this.publishAnalysis(session.getAnalysis());
          void this._reviewReferenceRewrites(
            daemon,
            stored.workspacePath,
            plan.proposed_reference_rewrites
          );
        }
        return;
      }

      case 'request-trash-sessions': {
        this._post({ type: 'trash-sessions', sessions: this._trashSessions() });
        return;
      }

      case 'restore-session': {
        const sessions = this._trashSessions();
        const found = sessions.find((s) => s.id === message.sessionId);
        if (!found) {
          this._post({ type: 'error', message: 'Trash session not found.', recoverable: true });
          return;
        }

        const daemon = this._requireDaemon();
        if (!daemon) return;

        const restoredPaths: string[] = [];
        let error: string | null = null;
        for (const item of found.items) {
          try {
            await daemon.restoreAsset(this._workspacePathFor(item.originalPath, session), {
              asset_id: '',
              original_path: item.originalPath,
              trashed_path: item.trashPath,
              trashed_at_ms: found.timestamp,
            });
            restoredPaths.push(item.originalPath);
          } catch (err) {
            error = err instanceof Error ? err.message : String(err);
          }
        }

        if (restoredPaths.length === found.items.length) {
          await this._removeTrashSession(found.id);
        }

        this._post({
          type: 'restore-result',
          result: { restoredPaths, error: restoredPaths.length === 0 ? error : null },
        });
        this.publishAnalysis(session.getAnalysis());
        return;
      }

      case 'save-preferences': {
        const preferences = { ...DEFAULT_PREFERENCES, ...message.preferences };
        await this._memento?.update(PREFERENCES_KEY, preferences);
        this._post({ type: 'preferences', preferences: this._preferences() });
        return;
      }

      case 'request-usage-references': {
        const located = session.indexerForPath(message.assetPath);
        const analysis = session.getAnalysis();
        let refs: UsageReference[] = [];
        if (
          located &&
          'indexer' in located &&
          typeof (located as { indexer?: { usageReferencesFor?: (p: string) => UsageReference[] } })
            .indexer?.usageReferencesFor === 'function'
        ) {
          refs = (
            located as { indexer: { usageReferencesFor: (p: string) => UsageReference[] } }
          ).indexer.usageReferencesFor(message.assetPath);
        } else if (session.indexerForRoot) {
          const rootIndexer = session.indexerForRoot('root');
          if (
            rootIndexer &&
            typeof (
              rootIndexer as unknown as { usageReferencesFor?: (p: string) => UsageReference[] }
            ).usageReferencesFor === 'function'
          ) {
            refs = (
              rootIndexer as unknown as { usageReferencesFor: (p: string) => UsageReference[] }
            ).usageReferencesFor(message.assetPath);
          }
        }
        this._post({
          type: 'usage-references',
          assetPath: message.assetPath,
          references: refs,
          complete: analysis.readiness?.referencesResolved ?? true,
        });
        return;
      }

      case 'dismiss-cleanup-candidate': {
        const dismissed = new Set(this._dismissed());
        if (message.dismissed) dismissed.add(message.assetPath);
        else dismissed.delete(message.assetPath);
        await this._memento?.update(DISMISSED_KEY, [...dismissed]);
        await this._dispatch({ type: 'request-cleanup-proposal' });
        return;
      }

      case 'generate-snippet': {
        const asset = this._assetFor(message.assetPath);
        if (!asset) {
          this._post({
            type: 'error',
            message: 'That asset is not in the current analysis. Refresh and try again.',
            recoverable: true,
          });
          return;
        }

        const workspacePath = session.indexerForPath(asset.path)?.root.path ?? '';
        const context = buildIntegrationContext(asset, workspacePath, undefined);
        const results = generateSnippetsForAsset(asset, context.importPath, workspacePath);

        if (results.length === 0) {
          this._post({
            type: 'error',
            message: `No snippet generator supports ${asset.format} assets.`,
            recoverable: true,
          });
          return;
        }

        this._post({
          type: 'snippets',
          assetPath: asset.path,
          snippets: results.map((result) => ({
            label: result.label,
            language: result.language,
            code: result.code,
            imports: result.imports ?? null,
            installHint: result.installHint ?? null,
          })),
        });
        return;
      }

      default: {
        const unhandled: never = message;
        this._post({
          type: 'error',
          message: `Animoria's VS Code host has no handler for "${(unhandled as HostOutbound).type}".`,
          recoverable: true,
        });
        return;
      }
    }
  }

  private _assetFor(assetPath: string): Asset | null {
    const analysis = this._session?.getAnalysis();
    if (!analysis) return null;
    for (const item of analysis.assets as readonly unknown[]) {
      if (!item || typeof item !== 'object') continue;
      if (
        'path' in item &&
        typeof (item as Asset).path === 'string' &&
        (item as Asset).path === assetPath
      ) {
        return item as Asset;
      }
      if (
        'asset' in item &&
        (item as { asset?: { path?: string } }).asset &&
        (item as { asset: Asset }).asset.path === assetPath
      ) {
        return (item as { asset: Asset }).asset;
      }
    }
    return null;
  }

  private async _dataUri(path: string): Promise<string | null> {
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
      const mime = MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? 'application/octet-stream';
      return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch (error) {
      logWarn('host-bridge', 'VsCodeHostBridge.dataUri', 'Could not read a file for the panel', {
        reason: `reading ${path} failed`,
        error,
        recovery: 'the inspector renders its "no frame" state',
      });
      return null;
    }
  }

  private _dismissed(): ReadonlySet<string> {
    return new Set(this._memento?.get<string[]>(DISMISSED_KEY, []) ?? []);
  }

  private _preferences(): UiPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      ...(this._memento?.get<Partial<UiPreferences>>(PREFERENCES_KEY, {}) ?? {}),
    };
  }

  // The daemon persists no journal of its own; "sessions" (batches restorable as a unit) are host-side state.
  private _trashSessions(): SessionManifest[] {
    return this._memento?.get<SessionManifest[]>(TRASH_SESSIONS_KEY, []) ?? [];
  }

  private _recordTrashSession(_workspacePath: string, items: readonly TrashedItem[]): void {
    if (!this._memento || items.length === 0) return;
    const session: SessionManifest = {
      id: `session-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      timestamp: Date.now(),
      items: items.map(({ item, sizeBytes }) => ({
        originalPath: item.original_path,
        trashPath: item.trashed_path,
        sizeBytes,
      })),
    };
    void this._memento.update(TRASH_SESSIONS_KEY, [...this._trashSessions(), session]);
  }

  // Propose-diff, confirm per file — never applies a rewrite automatically as part of resolving duplicates.
  private async _reviewReferenceRewrites(
    daemon: VsCodeDaemonClient,
    workspacePath: string,
    proposals: readonly ReferenceRewriteProposal[]
  ): Promise<void> {
    if (proposals.length === 0) return;

    for (const proposal of proposals) {
      const fileName = proposal.file_path.split(/[/\\]/).pop() ?? proposal.file_path;
      const choice = await vscode.window.showInformationMessage(
        `${fileName}:${proposal.line_number}\n- ${proposal.original_line.trim()}\n+ ${proposal.proposed_line.trim()}`,
        { modal: true, detail: 'Update this reference to point at the kept asset?' },
        'Apply',
        'Skip'
      );
      if (choice !== 'Apply') continue;

      try {
        await daemon.applyReferenceRewrite(workspacePath, proposal);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(`Could not rewrite ${fileName}: ${message}`);
      }
    }
  }

  private async _removeTrashSession(sessionId: string): Promise<void> {
    if (!this._memento) return;
    await this._memento.update(
      TRASH_SESSIONS_KEY,
      this._trashSessions().filter((s) => s.id !== sessionId)
    );
  }

  /** Best-effort root attribution for a restore call — the root whose path prefixes the asset's original path, falling back to the first root. */
  private _workspacePathFor(originalPath: string, session: WorkspaceSession): string {
    const owning = session.roots.find((r) => originalPath.startsWith(r.path));
    return owning?.path ?? session.roots[0]?.path ?? process.cwd();
  }
}

const PREFERENCES_KEY = 'animoria.preferences';
const DISMISSED_KEY = 'animoria.dismissedCleanupPaths';
const TRASH_SESSIONS_KEY = 'animoria.trashSessions';

function toWireAnalysis(analysis: MultiRootAnalysis): MultiRootAnalysis {
  return analysis;
}

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.apng': 'image/apng',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.json': 'application/json',
  '.lottie': 'application/zip',
  '.riv': 'application/octet-stream',
};

function refusedCleanup(reason: string | null): CleanupExecutionResult {
  return {
    status: 'failed',
    removedAssetPaths: [],
    recoveredBytes: 0,
    trashSessionId: 'sess-refused',
    error: reason,
    reason: reason ?? undefined,
  };
}
