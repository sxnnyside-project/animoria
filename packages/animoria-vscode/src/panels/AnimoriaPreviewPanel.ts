import type { AnimoriaAsset, AnimoriaStaticAsset } from '@animoria/core';
import {
  Animoria,
  DotLottieParser,
  FlutterProvider,
  KotlinProvider,
  ReactProvider,
  SwiftProvider,
  UsageScanner,
  VueProvider,
  integrationRegistry,
  logDebug,
  logWarn,
  t,
} from '@animoria/core';
import * as vscode from 'vscode';
import type { ActiveEditorTracker } from '../utils/ActiveEditorTracker';
import { buildIntegrationContext } from '../utils/build-integration-context';
import { resolveScopePath } from '../utils/resolve-scope-path';
import { validateInboundMessage } from './preview-panel-messages';

type PreviewAsset = AnimoriaAsset | AnimoriaStaticAsset;

/**
 * `AnimoriaAsset` (animated) carries a `status` field that
 * `AnimoriaStaticAsset` deliberately does not (see that type's doc) —
 * a cheap, reliable discriminant between the two without needing a
 * separate "kind" tag threaded through everywhere.
 */
function isAnimatedAsset(asset: PreviewAsset): asset is AnimoriaAsset {
  return 'status' in asset;
}

/**
 * Registers every shipped integration provider once (idempotent —
 * `register()` throws on a duplicate id, so we guard with a try/catch to
 * make re-registration safe across hot-reloads in dev).
 *
 * All six frameworks Animoria v1.0.0 supports snippet generation for are
 * first-class providers here — none are stubbed. See
 * `IntegrationRegistry`'s own doc comment for how a future framework
 * would be added without touching this list's shape (just append to it).
 */
export function ensureProvidersRegistered(): void {
  const providers = [
    new ReactProvider(),
    new VueProvider(),
    new FlutterProvider(),
    new SwiftProvider(),
    new KotlinProvider(),
  ];
  for (const provider of providers) {
    try {
      integrationRegistry.register(provider);
    } catch (err) {
      logDebug(
        'integration-registry',
        'ensureProvidersRegistered',
        'Integration provider already registered',
        {
          reason: 'register() called again for an id already present (dev hot-reload)',
          error: err,
          recovery: 'skipped duplicate registration',
        }
      );
    }
  }
}

export class AnimoriaPreviewPanel {
  static currentPanel: AnimoriaPreviewPanel | undefined;
  static readonly viewType = 'animoria.preview';

  /**
   * Set once during extension activation. Used by `get-integrations` to
   * anchor generated import paths to the file most likely to receive the
   * pasted snippet — see `ActiveEditorTracker`'s doc comment for why this is
   * a heuristic, not a guarantee.
   */
  static activeEditorTracker: ActiveEditorTracker | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext | undefined;
  private _asset: PreviewAsset;
  private _assetPath: string;
  private _thumbnailPath: string | undefined;
  private _workspacePath: string | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _disposed = false;

  /**
   * Identifies the current render request. Every call to `_update()`
   * claims a new generation and every async continuation it spawns
   * (the debounce timer, `getAnimationData`, the usage scan) carries that
   * generation as a value it was handed once, up front — never re-read
   * from `this` at completion time. A continuation whose generation no
   * longer matches `_updateGeneration` belongs to a render the panel has
   * since moved past; it is discarded rather than posted, no matter how
   * far its own async work has already progressed. This is what makes a
   * superseded render's result unreachable rather than merely unlikely to
   * arrive late.
   */
  private _updateGeneration = 0;
  private _pendingUpdateTimer: ReturnType<typeof setTimeout> | undefined;

  static render(
    contextOrUri: vscode.ExtensionContext | vscode.Uri,
    asset: PreviewAsset,
    thumbnailPath?: string,
    workspacePath?: string
  ): void {
    ensureProvidersRegistered();
    const extensionUri = 'extensionUri' in contextOrUri ? contextOrUri.extensionUri : contextOrUri;
    const context = 'workspaceState' in contextOrUri ? contextOrUri : undefined;

    if (AnimoriaPreviewPanel.currentPanel) {
      if (AnimoriaPreviewPanel.currentPanel._assetPath === asset.path) {
        // Same asset re-selected — just reveal, don't reload
        AnimoriaPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
        return;
      }
      // Different asset — update in place
      AnimoriaPreviewPanel.currentPanel._thumbnailPath = thumbnailPath;
      AnimoriaPreviewPanel.currentPanel._workspacePath = workspacePath;
      AnimoriaPreviewPanel.currentPanel.update(asset);
      AnimoriaPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      AnimoriaPreviewPanel.viewType,
      asset.stem,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    AnimoriaPreviewPanel.currentPanel = new AnimoriaPreviewPanel(
      panel,
      extensionUri,
      asset,
      thumbnailPath,
      workspacePath,
      context
    );
  }

  constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    asset: PreviewAsset,
    thumbnailPath?: string,
    workspacePath?: string,
    context?: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;
    this._asset = asset;
    this._assetPath = asset.path;
    this._thumbnailPath = thumbnailPath;
    this._workspacePath = workspacePath;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => this._handleMessage(msg),
      null,
      this._disposables
    );
  }

  /** True while `generation` is still the panel's active render request and the panel has not been disposed. */
  private _isRenderCurrent(generation: number): boolean {
    return !this._disposed && generation === this._updateGeneration;
  }

  /** Posts `message` only if `generation` is still current — the single funnel every render-pipeline postMessage call goes through. */
  private _postIfCurrent(generation: number, message: { type: string; payload?: unknown }): void {
    if (this._isRenderCurrent(generation)) {
      this._panel.webview.postMessage(message);
    }
  }

  private _update(): void {
    if (this._pendingUpdateTimer) {
      clearTimeout(this._pendingUpdateTimer);
      this._pendingUpdateTimer = undefined;
    }
    const generation = ++this._updateGeneration;

    // Snapshotted once, up front — every continuation below reads these
    // locals instead of `this.*`, so a superseded render's asset/workspace
    // can never leak into a later render's work even before the
    // generation check has a chance to run.
    const asset = this._asset;
    const thumbnailPath = this._thumbnailPath;
    const workspacePath = this._workspacePath;

    this._panel.title = asset.stem;
    const rawLanguage = vscode.env.language;
    let locale = 'en';
    if (rawLanguage) {
      const norm = rawLanguage.toLowerCase();
      if (norm.startsWith('es')) locale = 'es';
      else if (norm.startsWith('ja')) locale = 'ja';
      else if (norm.startsWith('fr')) locale = 'fr';
      else if (norm.startsWith('zh')) locale = 'zh-CN';
    }
    this._panel.webview.html = this._getHtmlContent(locale);

    const thumbUri = thumbnailPath
      ? this._panel.webview.asWebviewUri(vscode.Uri.file(thumbnailPath)).toString()
      : null;

    // Static assets (SVG without animation, PNG, JPEG, WebP, AVIF) have no
    // animation data to extract and no Animoria/Lottie pipeline to run —
    // they render as a plain image. This branch is intentionally
    // synchronous and does no I/O beyond building a webview URI, so it
    // cannot hang the way an async parse/read could.
    if (!isAnimatedAsset(asset)) {
      const imageUri = this._panel.webview.asWebviewUri(vscode.Uri.file(asset.path)).toString();
      this._postIfCurrent(generation, {
        type: 'load-static-asset',
        payload: { asset, imageUri },
      });
      void this._loadAndPostUsageRefs(generation, asset, workspacePath, thumbUri);
      return;
    }

    this._pendingUpdateTimer = setTimeout(async () => {
      this._pendingUpdateTimer = undefined;
      try {
        const animoria = new Animoria({ workspacePath: workspacePath ?? '' });
        const animationData = await animoria.getAnimationData(asset);
        if (!this._isRenderCurrent(generation)) return;

        const defaultPrefs = { speed: 1, bg: 'dark', customHex: '#1e1e1e' };
        const preferences = this._context
          ? this._context.workspaceState.get('animoria.previewPreferences', defaultPrefs)
          : defaultPrefs;

        if (!animationData) {
          this._postIfCurrent(generation, {
            type: 'load-error',
            payload: { error: `Could not extract animation data from ${asset.name}` },
          });
        } else {
          this._postIfCurrent(generation, {
            type: 'load-asset',
            payload: { asset, animationData, preferences },
          });
        }
      } catch (err) {
        this._postIfCurrent(generation, {
          type: 'load-error',
          payload: { error: `Failed to load ${asset.name}: ${err}` },
        });
      }

      void this._loadAndPostUsageRefs(generation, asset, workspacePath, thumbUri);
    }, 300);
  }

  private async _loadAndPostUsageRefs(
    generation: number,
    asset: PreviewAsset,
    workspacePath: string | undefined,
    thumbUri: string | null
  ): Promise<void> {
    // Post thumbnail immediately (fast path)
    this._postIfCurrent(generation, {
      type: 'load-thumbnail',
      payload: { thumbUri },
    });

    // A render superseded since the thumbnail post above has no further
    // work worth starting — the usage scan is real I/O whose result would
    // only be discarded anyway.
    if (!this._isRenderCurrent(generation)) return;

    if (!isAnimatedAsset(asset)) {
      // `UsageScanner` is currently typed against `AnimoriaAsset`
      // (animated) only. Rather than force a static asset through a
      // scanner built for a different domain type, this is an honest,
      // explicit "not yet supported" result — not a silent zero that
      // would misleadingly look identical to "scanned, found nothing."
      this._postIfCurrent(generation, {
        type: 'load-usage',
        payload: { references: [], searchedFiles: 0, durationMs: 0, notSupported: true },
      });
      return;
    }

    if (!workspacePath) {
      this._postIfCurrent(generation, {
        type: 'load-usage',
        payload: { references: [], searchedFiles: 0, durationMs: 0 },
      });
      return;
    }

    try {
      const scopePath = resolveScopePath(asset.path, workspacePath);
      const scanner = new UsageScanner({
        workspacePath,
        asset,
        strategy: 'pattern',
        scopePath,
      });
      const result = await scanner.search();
      this._postIfCurrent(generation, {
        type: 'load-usage',
        payload: {
          references: result.references,
          searchedFiles: result.searchedFiles,
          durationMs: Math.round(result.durationMs),
        },
      });
    } catch (err) {
      logDebug(
        'preview-render',
        'AnimoriaPreviewPanel',
        'Usage scan failed while rendering preview panel',
        {
          assetPath: asset.path,
          reason: 'UsageScanner.search() threw',
          error: err,
          recovery: 'posted zero references to the panel',
        }
      );
      this._postIfCurrent(generation, {
        type: 'load-usage',
        payload: { references: [], searchedFiles: 0, durationMs: 0 },
      });
    }
  }

  update(asset: PreviewAsset): void {
    this._asset = asset;
    this._assetPath = asset.path;
    this._update();
  }

  get currentAssetPath(): string {
    return this._asset.path;
  }

  notifyAssetRemoved(): void {
    if (this._disposed) return;
    this._panel.webview.postMessage({ type: 'asset-removed' });
  }

  /**
   * Entry point for every message the webview posts to the extension
   * host. `raw` is untrusted runtime data — see
   * `preview-panel-messages.ts`'s doc comment for why that boundary is
   * validated even though this extension authors both sides — so the
   * first and only thing this method does with it is hand it to
   * {@link validateInboundMessage}. Nothing below this point ever reads
   * `raw` directly; `message` is the validated, narrowed result, and
   * every `case` branch's payload fields are already known-shaped by the
   * time it runs.
   */
  private _handleMessage(raw: unknown): void {
    const result = validateInboundMessage(raw);
    if (!result.ok) {
      logWarn(
        'preview-render',
        'AnimoriaPreviewPanel',
        'Ignored malformed or unrecognized webview message',
        {
          reason: result.reason,
          recovery: 'message ignored',
        }
      );
      return;
    }

    const message = result.message;
    switch (message.type) {
      case 'ready':
        break;

      case 'copy-path':
        vscode.env.clipboard.writeText(this._asset.path);
        vscode.window.setStatusBarMessage('Animoria: Path copied', 2000);
        break;

      case 'copy-stem':
        vscode.env.clipboard.writeText(this._asset.stem);
        vscode.window.setStatusBarMessage('Animoria: Name copied', 2000);
        break;

      case 'reveal-in-explorer':
        vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(this._asset.path));
        break;

      case 'save-preferences': {
        if (this._context) {
          void this._context.workspaceState.update('animoria.previewPreferences', message.payload);
        }
        break;
      }

      // ── Integration provider ───────────────────────────────────────────────

      case 'get-integrations': {
        // Snippet Generation only exists for animated formats (see
        // `IntegrationProvider.supportedFormats` — every current provider
        // is Lottie/dotLottie-specific). The webview only ever sends this
        // message from the animated `load-asset` branch, never from
        // `load-static-asset`, but guard here too rather than rely solely
        // on that.
        if (!isAnimatedAsset(this._asset)) break;

        const context = buildIntegrationContext(
          this._asset,
          this._workspacePath ?? '',
          AnimoriaPreviewPanel.activeEditorTracker
        );

        const results = integrationRegistry.generate(context);
        const stubs = integrationRegistry.getStubs();

        this._panel.webview.postMessage({
          type: 'integrations-ready',
          payload: { results, stubs },
        });
        break;
      }

      case 'copy-integration': {
        const { text, label } = message.payload;
        void vscode.env.clipboard.writeText(text);
        vscode.window.setStatusBarMessage(`Animoria: ${label} copied`, 2500);
        break;
      }

      case 'load-dotlottie-animation': {
        const { animationId } = message.payload;
        const parser = new DotLottieParser();
        parser.extractAnimationData(this._asset.path, animationId).then((data) => {
          if (data) {
            this._panel.webview.postMessage({
              type: 'reload-animation',
              payload: { animationData: data },
            });
          }
        });
        break;
      }

      case 'open-usage-file': {
        const { file, line } = message.payload;
        const uri = vscode.Uri.file(file);
        vscode.window.showTextDocument(uri, {
          selection: new vscode.Range(
            new vscode.Position(line - 1, 0),
            new vscode.Position(line - 1, 0)
          ),
          preview: true,
        });
        break;
      }

      default:
        break;
    }
  }

  dispose(): void {
    this._disposed = true;
    if (this._pendingUpdateTimer) {
      clearTimeout(this._pendingUpdateTimer);
      this._pendingUpdateTimer = undefined;
    }
    AnimoriaPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }

  private _getHtmlContent(locale: string): string {
    const loadingText = t('preview.loading', locale);
    const removedText = t('preview.assetRemoved', locale);
    const livePreviewTitle = t('preview.livePreview', locale);
    const playText = t('preview.play', locale);
    const pauseText = t('preview.pause', locale);
    const restartText = t('preview.restart', locale);
    const loopText = t('preview.loop', locale);
    const metadataTitle = t('preview.metadata', locale);
    const formatLabel = t('preview.format', locale);
    const fpsLabel = t('preview.fps', locale);
    const durationLabel = t('preview.duration', locale);
    const framesLabel = t('preview.totalFrames', locale);
    const dimensionsLabel = t('preview.dimensions', locale);
    const layersLabel = t('preview.layerCount', locale);
    const markersLabel = t('preview.markers', locale);
    const fileSizeLabel = t('preview.size', locale);
    const usageTitle = t('preview.usageReferences', locale);
    const usageLoadingText = t('preview.searchingCodebase', locale);
    const noReferencesText = t('preview.noReferences', locale);
    const quickActionsTitle = t('preview.quickActions', locale);
    const copyPathText = t('preview.copyPath', locale);
    const copyNameText = t('preview.copyName', locale);
    const revealText = t('preview.revealInExplorer', locale);

    const i18nConfig = JSON.stringify({
      notFoundIn: t('preview.notFoundIn', locale),
      foundIn: t('preview.foundIn', locale),
      loadError: t('preview.loadError', locale),
      hasImages: t('preview.hasImages', locale),
      animationsCount: t('preview.animationsCount', locale),
      none: t('preview.none', locale),
    });

    const lottieScriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'lottie.min.js')
    );

    return /* html */ `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'unsafe-inline' ${this._panel.webview.cspSource};
             style-src 'unsafe-inline';
             img-src ${this._panel.webview.cspSource} https: data:;">
  <title>Animoria Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family,
        -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: 13px;
      line-height: 1.5;
      overflow-x: hidden;
    }

    /* ── THUMBNAIL HEADER ── */
    .asset-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--vscode-panel-border,
        var(--vscode-widget-border, #3e3e42));
    }

    .thumb-container {
      width: 72px;
      height: 72px;
      border-radius: 8px;
      background: var(--vscode-input-background);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .thumb-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .thumb-placeholder {
      font-size: 28px;
      opacity: 0.4;
    }

    .asset-info { flex: 1; min-width: 0; }

    .asset-name {
      font-size: 18px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .asset-badges { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .asset-summary {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* ── SECTIONS ── */
    .section {
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-panel-border,
        var(--vscode-widget-border, #3e3e42));
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
    }

    /* ── LIVE PREVIEW & CONTROLS ── */
    .preview-section { text-align: center; }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .preview-header .section-title { margin-bottom: 0; }

    .contrast-bar {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .contrast-swatch {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid var(--vscode-widget-border, #3e3e42);
      cursor: pointer;
      transition: transform 0.12s, border-color 0.12s;
      padding: 0;
      outline: none;
    }
    .contrast-swatch:hover { transform: scale(1.15); }
    .contrast-swatch.active {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 2px var(--vscode-focusBorder, #007acc);
    }
    .contrast-swatch.checker {
      background-image: linear-gradient(45deg, #404040 25%, transparent 25%), linear-gradient(-45deg, #404040 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #404040 75%), linear-gradient(-45deg, transparent 75%, #404040 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      background-color: #1a1a1c;
    }
    .custom-hex-label {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--vscode-widget-border, #3e3e42);
    }
    .custom-hex-label input[type="color"] {
      border: none;
      width: 26px;
      height: 26px;
      margin: -4px;
      padding: 0;
      cursor: pointer;
      background: none;
    }

    #lottie-container {
      width: 240px;
      height: 240px;
      margin: 0 auto 10px;
      background: #1e1e1e;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.1s;
    }

    .scrubber-container {
      width: 240px;
      margin: 0 auto 12px;
    }
    #timeline-scrubber {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      outline: none;
      background: var(--vscode-input-background);
      cursor: pointer;
      accent-color: var(--vscode-button-background, #007acc);
    }
    .scrubber-info {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 3px;
      font-family: var(--vscode-editor-font-family, monospace);
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .controls {
      display: flex;
      gap: 6px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .speed-toolbar {
      display: flex;
      gap: 2px;
      background: var(--vscode-input-background);
      padding: 2px;
      border-radius: 4px;
    }
    .btn-sm {
      padding: 3px 7px;
      font-size: 11px;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      transition: color 0.1s, background 0.1s;
    }
    .btn-sm:hover { color: var(--vscode-editor-foreground); }
    .btn-sm.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font-weight: 600;
    }

    .btn {
      padding: 5px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      background: var(--vscode-button-secondaryBackground,
        var(--vscode-button-background));
      color: var(--vscode-button-secondaryForeground,
        var(--vscode-button-foreground));
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      outline: 1px solid var(--vscode-focusBorder);
    }

    /* ── METADATA GRID ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }

    .meta-item { display: flex; flex-direction: column; gap: 2px; }

    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
    }

    .meta-value { font-size: 13px; font-weight: 500; }

    /* ── USAGE REFERENCES ── */
    .usage-loading {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-style: italic;
    }

    .usage-count {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
    }

    .usage-empty {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-style: italic;
    }

    .usage-list { display: flex; flex-direction: column; gap: 6px; }

    .usage-item {
      padding: 8px 10px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: border-color 0.15s;
    }
    .usage-item:hover {
      border-color: var(--vscode-focusBorder);
    }

    .usage-file {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground,
        var(--vscode-editor-foreground));
      margin-bottom: 2px;
    }

    .usage-content {
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── QUICK ACTIONS ── */
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }

    /* ── REMOVED NOTICE ── */
    #removed-notice {
      display: none;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      text-align: center;
      padding: 24px;
    }

    /* ── LOADING STATE ── */
    #loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--vscode-descriptionForeground);
    }
    #loading.error {
      color: var(--vscode-errorForeground, #f48771);
    }

    #content { display: none; flex-direction: column; }
  </style>
</head>
<body>

<div id="loading">${loadingText}</div>
<div id="removed-notice">${removedText}</div>

<div id="content">

  <!-- THUMBNAIL HEADER -->
  <div class="asset-header">
    <div class="thumb-container" id="thumb-container">
      <span class="thumb-placeholder">▶</span>
    </div>
    <div class="asset-info">
      <div class="asset-name" id="asset-name">—</div>
      <div class="asset-badges">
        <span class="badge" id="format-badge">—</span>
      </div>
      <div class="asset-summary" id="asset-summary">—</div>
    </div>
  </div>

  <!-- LIVE PREVIEW -->
  <div class="section preview-section">
    <div class="preview-header">
      <div class="section-title">${livePreviewTitle}</div>
      <div class="contrast-bar" id="contrast-bar">
        <button class="contrast-swatch active" data-bg="dark" title="Dark (#1e1e1e)" style="background:#1e1e1e;"></button>
        <button class="contrast-swatch" data-bg="light" title="Light (#ffffff)" style="background:#ffffff;"></button>
        <button class="contrast-swatch checker" data-bg="checker" title="Checkerboard"></button>
        <label class="custom-hex-label" title="Custom Hex">
          <input type="color" id="hex-picker" value="#1e1e1e" />
        </label>
      </div>
    </div>

    <div id="lottie-container"></div>

    <!-- TIMELINE SCRUBBER -->
    <div class="scrubber-container" id="scrubber-container">
      <input type="range" id="timeline-scrubber" min="0" max="100" value="0" step="0.1" />
      <div class="scrubber-info">
        <span id="scrubber-time">0.00s / 0.00s</span>
        <span id="scrubber-frame">Frame 0 / 0</span>
      </div>
    </div>

    <!-- CONTROLS & SPEED -->
    <div class="controls-row">
      <div class="controls" id="controls">
        <button class="btn primary" id="btn-play">▶ ${playText}</button>
        <button class="btn" id="btn-pause">⏸ ${pauseText}</button>
        <button class="btn" id="btn-restart">↺ ${restartText}</button>
        <button class="btn active" id="btn-loop">∞ ${loopText}</button>
      </div>

      <div class="speed-toolbar" id="speed-toolbar">
        <button class="btn-sm" data-speed="0.25">0.25x</button>
        <button class="btn-sm" data-speed="0.5">0.5x</button>
        <button class="btn-sm active" data-speed="1">1x</button>
        <button class="btn-sm" data-speed="2">2x</button>
      </div>
    </div>
  </div>

  <!-- METADATA -->
  <div class="section">
    <div class="section-title">${metadataTitle}</div>
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">${formatLabel}</span>
        <span class="meta-value" id="meta-format">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${fpsLabel}</span>
        <span class="meta-value" id="meta-fps">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${durationLabel}</span>
        <span class="meta-value" id="meta-duration">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${framesLabel}</span>
        <span class="meta-value" id="meta-frames">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${dimensionsLabel}</span>
        <span class="meta-value" id="meta-size">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${layersLabel}</span>
        <span class="meta-value" id="meta-layers">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${markersLabel}</span>
        <span class="meta-value" id="meta-markers">—</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${fileSizeLabel}</span>
        <span class="meta-value" id="meta-filesize">—</span>
      </div>
    </div>
  </div>

  <!-- USAGE REFERENCES -->
  <div class="section">
    <div class="section-title">${usageTitle}</div>
    <div id="usage-loading" class="usage-loading">${usageLoadingText}</div>
    <div id="usage-results" style="display:none">
      <div class="usage-count" id="usage-count"></div>
      <div id="usage-empty" class="usage-empty" style="display:none">
        ${noReferencesText}
      </div>
      <div class="usage-list" id="usage-list"></div>
    </div>
  </div>

  <!-- INTEGRATE -->
  <div class="section" id="integrate-section">
    <div class="section-title">Integrate</div>
    <div id="integrate-loading" style="color:var(--vscode-descriptionForeground);font-size:12px;font-style:italic;">Loading integrations…</div>
    <div id="integrate-content" style="display:none;">
      <!-- Provider tabs -->
      <div id="provider-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;"></div>
      <!-- Integration result -->
      <div id="integrate-result">
        <div id="integrate-imports" style="display:none;margin-bottom:10px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);margin-bottom:4px;">Imports</div>
          <pre id="integrate-imports-code" style="background:var(--vscode-input-background);padding:10px 12px;border-radius:6px;font-size:12px;font-family:var(--vscode-editor-font-family,monospace);overflow-x:auto;white-space:pre;"></pre>
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);margin-bottom:4px;">Code</div>
          <pre id="integrate-code" style="background:var(--vscode-input-background);padding:10px 12px;border-radius:6px;font-size:12px;font-family:var(--vscode-editor-font-family,monospace);overflow-x:auto;white-space:pre;"></pre>
        </div>
        <div id="integrate-install" style="display:none;margin-bottom:10px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);margin-bottom:4px;">Install</div>
          <code id="integrate-install-code" style="font-size:12px;font-family:var(--vscode-editor-font-family,monospace);color:var(--vscode-descriptionForeground);"></code>
        </div>
        <div id="integrate-notes" style="display:none;margin-bottom:14px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);margin-bottom:4px;">Notes</div>
          <pre id="integrate-notes-text" style="font-size:11px;font-family:var(--vscode-editor-font-family,monospace);color:var(--vscode-descriptionForeground);white-space:pre-wrap;line-height:1.6;"></pre>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn primary" id="btn-copy-code">Copy Code</button>
          <button class="btn" id="btn-copy-all">Copy All</button>
        </div>
      </div>
      <!-- Stubs -->
      <div id="integrate-stubs" style="display:none;margin-top:10px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);margin-bottom:6px;">Coming soon</div>
        <div id="stubs-list" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <!-- No providers -->
      <div id="integrate-empty" style="display:none;color:var(--vscode-descriptionForeground);font-size:12px;font-style:italic;">No integrations available for this format.</div>
    </div>
  </div>

  <!-- QUICK ACTIONS -->
  <div class="section">
    <div class="section-title">${quickActionsTitle}</div>
    <div class="actions">
      <button class="btn" id="btn-copy-path">${copyPathText}</button>
      <button class="btn" id="btn-copy-stem">${copyNameText}</button>
      <button class="btn" id="btn-reveal">${revealText}</button>
    </div>
  </div>

</div>

<script src="${lottieScriptUri}"></script>
<script>
  const vscode = acquireVsCodeApi();
  let animation = null;
  let loopEnabled = true;
  let currentSpeed = 1;
  let currentBg = 'dark';
  let customHexColor = '#1e1e1e';
  let isScrubbing = false;
  const i18n = ${i18nConfig};

  // ── Loading-state safety net ────────────────────────────────────────────
  // The panel must never be left showing "Loading animation..." forever.
  // Every path that resolves the load (success, error, or a truly
  // unexpected exception) must replace this text — see showLoadFailure.
  let loadResolved = false;

  function showLoadFailure(message) {
    if (loadResolved) return; // A real result already arrived; don't clobber it.
    loadResolved = true;
    const el = document.getElementById('loading');
    if (el) {
      el.classList.add('error');
      el.textContent = message;
    }
  }

  // A hard upper bound on how long the panel waits for the host to post
  // load-asset / load-error / load-static-asset. If nothing arrives in
  // time (message never sent, panel disposed mid-flight, webview
  // reloaded before the host's timer fired), surface that explicitly
  // instead of leaving the spinner running with no explanation.
  const loadWatchdog = setTimeout(() => {
    showLoadFailure('Preview timed out — no response from the extension host. Try reopening the preview.');
  }, 8000);

  // Catches genuinely unexpected exceptions anywhere in this document
  // (a thrown error not caught by a more specific try/catch below, or one
  // raised by a bundled script like lottie.min.js) so the loading state
  // never hangs silently just because something threw.
  window.addEventListener('error', (e) => {
    showLoadFailure('Preview failed to render: ' + (e?.message || 'unknown error'));
  });
  window.addEventListener('unhandledrejection', (e) => {
    showLoadFailure('Preview failed to render: ' + (e?.reason?.message || e?.reason || 'unknown error'));
  });

  function applyBackground(bg, customHex) {
    currentBg = bg || 'dark';
    if (customHex) customHexColor = customHex;

    const container = document.getElementById('lottie-container');
    if (!container) return;

    container.style.backgroundImage = '';
    container.style.backgroundPosition = '';
    container.style.backgroundSize = '';

    if (currentBg === 'dark') {
      container.style.background = '#1e1e1e';
    } else if (currentBg === 'light') {
      container.style.background = '#ffffff';
    } else if (currentBg === 'checker') {
      container.style.background = '#1a1a1c';
      container.style.backgroundImage = 'linear-gradient(45deg, #404040 25%, transparent 25%), linear-gradient(-45deg, #404040 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #404040 75%), linear-gradient(-45deg, transparent 75%, #404040 75%)';
      container.style.backgroundSize = '12px 12px';
      container.style.backgroundPosition = '0 0, 0 6px, 6px -6px, -6px 0px';
    } else if (currentBg === 'custom') {
      container.style.background = customHexColor;
    }

    document.querySelectorAll('.contrast-swatch').forEach(el => {
      el.classList.toggle('active', el.dataset.bg === currentBg);
    });

    savePreferences();
  }

  function applySpeed(speed) {
    currentSpeed = parseFloat(speed) || 1;
    if (animation) {
      animation.setSpeed(currentSpeed);
    }
    document.querySelectorAll('.speed-toolbar .btn-sm').forEach(el => {
      el.classList.toggle('active', parseFloat(el.dataset.speed) === currentSpeed);
    });
    savePreferences();
  }

  function savePreferences() {
    const prefs = { speed: currentSpeed, bg: currentBg, customHex: customHexColor };
    vscode.postMessage({ type: 'save-preferences', payload: prefs });
    try { vscode.setState(prefs); } catch (_) {}
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function basename(path) {
    return path.split('/').pop() || path;
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('message', event => {
    try {
    const { type, payload } = event.data;

    if (type === 'load-asset' || type === 'load-error' || type === 'load-static-asset') {
      loadResolved = true;
      clearTimeout(loadWatchdog);
    }

    // ── load-asset ──
    if (type === 'load-asset') {
      const { asset, animationData } = payload;

      // Header
      document.getElementById('asset-name').textContent = asset.stem;
      document.getElementById('format-badge').textContent =
        asset.format.toUpperCase();

      // Summary line
      if (asset.metadata) {
        const m = asset.metadata;
        let summaryText = '';
        if (asset.format === 'lottie' || asset.format === 'dotlottie') {
          summaryText = m.fps + 'fps · ' + m.durationSeconds.toFixed(2) + 's · ' + m.width + '×' + m.height;
        } else if (asset.format === 'rive') {
          summaryText = 'Rive · ' + (m.artboards ? m.artboards.length : 0) + ' artboards · ' + m.width + '×' + m.height;
        } else if (asset.format === 'gif' || asset.format === 'apng') {
          summaryText = 'Raster · ' + m.frameCount + ' frames · ' + m.width + '×' + m.height;
        } else if (asset.format === 'animated-svg') {
          summaryText = 'SVG · ' + m.animationType + ' · ' + m.width + '×' + m.height;
        }
        document.getElementById('asset-summary').textContent = summaryText;
      }

      // Metadata grid
      if (asset.metadata) {
        const m = asset.metadata;
        document.getElementById('meta-format').textContent =
          asset.format.toUpperCase();
        document.getElementById('meta-duration').textContent =
          m.durationSeconds ? m.durationSeconds.toFixed(2) + 's' : '—';
        document.getElementById('meta-size').textContent =
          m.width + ' × ' + m.height;

        if (asset.format === 'lottie' || asset.format === 'dotlottie') {
          document.getElementById('meta-fps').textContent = m.fps;
          document.getElementById('meta-frames').textContent = m.totalFrames;
          document.getElementById('meta-layers').textContent = m.layerCount;
          document.getElementById('meta-markers').textContent =
            m.markers && m.markers.length ? m.markers.length : i18n.none;
        } else if (asset.format === 'rive') {
          document.getElementById('meta-fps').textContent = '—';
          document.getElementById('meta-frames').textContent = m.animations ? m.animations.length + ' animations' : '—';
          document.getElementById('meta-layers').textContent = m.stateMachines ? m.stateMachines.length : '—';
          document.getElementById('meta-markers').textContent = m.artboards ? m.artboards.length : '—';
        } else if (asset.format === 'gif' || asset.format === 'apng') {
          document.getElementById('meta-fps').textContent = '—';
          document.getElementById('meta-frames').textContent = m.frameCount;
          document.getElementById('meta-layers').textContent = '—';
          document.getElementById('meta-markers').textContent = m.loopCount === 0 ? 'infinite' : m.loopCount;
        } else if (asset.format === 'animated-svg') {
          document.getElementById('meta-fps').textContent = '—';
          document.getElementById('meta-frames').textContent = m.elementCount + ' elements';
          document.getElementById('meta-layers').textContent = '—';
          document.getElementById('meta-markers').textContent = m.animationType;
        }
      }
      document.getElementById('meta-filesize').textContent =
        formatBytes(asset.sizeBytes);

      // dotLottie-specific UI
      if (asset.metadata && asset.metadata.dotLottie) {
        const dl = asset.metadata.dotLottie;

        document.getElementById('format-badge').textContent =
          dl.animations.length > 1
            ? 'DOTLOTTIE · ' + dl.animations.length + ' ' + i18n.animationsCount
            : 'DOTLOTTIE';

        if (dl.hasImages) {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.style.background = 'var(--vscode-charts-orange, #d18616)';
          badge.textContent = i18n.hasImages;
          document.querySelector('.asset-badges').appendChild(badge);
        }

        // Remove any existing selector
        const existing = document.getElementById('anim-selector');
        if (existing) existing.remove();

        if (dl.animations.length > 1) {
          const selector = document.createElement('select');
          selector.id = 'anim-selector';
          selector.style.cssText =
            'margin-top:8px; padding:4px 8px; border-radius:4px; ' +
            'background:var(--vscode-input-background); ' +
            'color:var(--vscode-input-foreground); ' +
            'border:1px solid var(--vscode-input-border); ' +
            'font-size:12px; cursor:pointer; width:100%;';

          dl.animations.forEach(anim => {
            const opt = document.createElement('option');
            opt.value = anim.id;
            opt.textContent = anim.name || anim.id;
            selector.appendChild(opt);
          });

          selector.addEventListener('change', () => {
            vscode.postMessage({
              type: 'load-dotlottie-animation',
              payload: { animationId: selector.value },
            });
          });

          document.getElementById('asset-summary')
            .insertAdjacentElement('afterend', selector);
        }
      }

      // Apply saved preferences if provided
      if (payload.preferences) {
        const p = payload.preferences;
        if (p.speed) applySpeed(p.speed);
        if (p.bg) applyBackground(p.bg, p.customHex);
      }

      // Lottie player
      if (animation) { animation.destroy(); animation = null; }
      animation = lottie.loadAnimation({
        container: document.getElementById('lottie-container'),
        renderer: 'svg',
        loop: loopEnabled,
        autoplay: true,
        animationData,
      });

      if (currentSpeed !== 1) {
        animation.setSpeed(currentSpeed);
      }

      // Attach timeline scrubber sync
      const scrubber = document.getElementById('timeline-scrubber');
      const timeEl = document.getElementById('scrubber-time');
      const frameEl = document.getElementById('scrubber-frame');

      animation.addEventListener('enterFrame', () => {
        if (isScrubbing || !animation) return;
        const totalFrames = animation.totalFrames || 1;
        const curFrame = animation.currentFrame || 0;
        const fps = animation.frameRate || 30;
        const durationSec = totalFrames / fps;
        const currentSec = curFrame / fps;

        if (scrubber) {
          scrubber.value = ((curFrame / totalFrames) * 100).toFixed(1);
        }
        if (timeEl) {
          timeEl.textContent = currentSec.toFixed(2) + 's / ' + durationSec.toFixed(2) + 's';
        }
        if (frameEl) {
          frameEl.textContent = 'Frame ' + Math.round(curFrame) + ' / ' + Math.round(totalFrames);
        }
      });

      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'flex';

      // Request integrations from host
      vscode.postMessage({ type: 'get-integrations' });
    }

    // ── load-static-asset ──
    // Static assets (SVG without animation, PNG, JPEG, WebP, AVIF) have no
    // animation data and no Lottie player — this renders the file
    // directly as an image and hides the animation-only controls
    // (scrubber, playback, speed, Snippet Generation) instead of showing
    // them non-functional.
    if (type === 'load-static-asset') {
      const { asset, imageUri } = payload;

      document.getElementById('asset-name').textContent = asset.stem;
      document.getElementById('format-badge').textContent = asset.format.toUpperCase();
      document.getElementById('asset-summary').textContent = formatBytes(asset.sizeBytes);

      document.getElementById('meta-format').textContent = asset.format.toUpperCase();
      document.getElementById('meta-duration').textContent = '—';
      document.getElementById('meta-size').textContent = '—';
      document.getElementById('meta-fps').textContent = '—';
      document.getElementById('meta-frames').textContent = '—';
      document.getElementById('meta-layers').textContent = '—';
      document.getElementById('meta-markers').textContent = '—';
      document.getElementById('meta-filesize').textContent = formatBytes(asset.sizeBytes);

      const scrubber = document.getElementById('scrubber-container');
      if (scrubber) scrubber.style.display = 'none';
      const controlsRow = document.querySelector('.controls-row');
      if (controlsRow) controlsRow.style.display = 'none';
      const integrateSection = document.getElementById('integrate-section');
      if (integrateSection) integrateSection.style.display = 'none';

      const container = document.getElementById('lottie-container');
      container.innerHTML = '';
      const img = document.createElement('img');
      img.src = imageUri;
      img.alt = asset.stem;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      container.appendChild(img);

      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'flex';
    }

    // ── integrations-ready ──
    if (type === 'integrations-ready') {
      const { results, stubs } = payload;
      document.getElementById('integrate-loading').style.display = 'none';
      document.getElementById('integrate-content').style.display = 'block';

      if (!results || results.length === 0) {
        document.getElementById('integrate-empty').style.display = 'block';
        document.getElementById('integrate-result').style.display = 'none';
      } else {
        document.getElementById('integrate-empty').style.display = 'none';
        document.getElementById('integrate-result').style.display = 'block';

        let activeIndex = 0;
        const tabsContainer = document.getElementById('provider-tabs');
        tabsContainer.innerHTML = '';

        function renderActiveIntegration() {
          const item = results[activeIndex];
          if (!item) return;

          // Update tabs UI
          tabsContainer.querySelectorAll('.btn').forEach((b, idx) => {
            b.classList.toggle('active', idx === activeIndex);
          });

          // Imports
          const importsEl = document.getElementById('integrate-imports');
          if (item.imports) {
            importsEl.style.display = 'block';
            document.getElementById('integrate-imports-code').textContent = item.imports;
          } else {
            importsEl.style.display = 'none';
          }

          // Primary code
          document.getElementById('integrate-code').textContent = item.code;

          // Install hint
          const installEl = document.getElementById('integrate-install');
          if (item.installHint) {
            installEl.style.display = 'block';
            document.getElementById('integrate-install-code').textContent = item.installHint;
          } else {
            installEl.style.display = 'none';
          }

          // Notes
          const notesEl = document.getElementById('integrate-notes');
          if (item.notes) {
            notesEl.style.display = 'block';
            document.getElementById('integrate-notes-text').textContent = item.notes;
          } else {
            notesEl.style.display = 'none';
          }
        }

        results.forEach((res, idx) => {
          const btn = document.createElement('button');
          btn.className = 'btn' + (idx === 0 ? ' active' : '');
          btn.textContent = res.label;
          btn.addEventListener('click', () => {
            activeIndex = idx;
            renderActiveIntegration();
          });
          tabsContainer.appendChild(btn);
        });

        renderActiveIntegration();

        // Wire Copy Code button
        const copyCodeBtn = document.getElementById('btn-copy-code');
        copyCodeBtn.onclick = () => {
          const item = results[activeIndex];
          if (item) {
            vscode.postMessage({
              type: 'copy-integration',
              payload: { text: item.code, label: item.label + ' Code' },
            });
          }
        };

        // Wire Copy All button
        const copyAllBtn = document.getElementById('btn-copy-all');
        copyAllBtn.onclick = () => {
          const item = results[activeIndex];
          if (item) {
            const parts = [];
            if (item.imports) parts.push(item.imports);
            parts.push(item.code);
            if (item.installHint) parts.push('// Install: ' + item.installHint);
            vscode.postMessage({
              type: 'copy-integration',
              payload: { text: parts.join('\\n\\n'), label: item.label + ' Full Integration' },
            });
          }
        };
      }

      // Render stubs
      const stubsContainer = document.getElementById('stubs-list');
      const stubsWrapper = document.getElementById('integrate-stubs');
      if (stubs && stubs.length > 0) {
        stubsWrapper.style.display = 'block';
        stubsContainer.innerHTML = '';
        stubs.forEach(stub => {
          const span = document.createElement('span');
          span.className = 'badge';
          span.style.opacity = '0.5';
          span.title = stub.reason || 'Coming soon';
          span.textContent = stub.label;
          stubsContainer.appendChild(span);
        });
      } else {
        stubsWrapper.style.display = 'none';
      }
    }

    // ── reload-animation ──
    if (type === 'reload-animation') {
      if (animation) { animation.destroy(); animation = null; }
      animation = lottie.loadAnimation({
        container: document.getElementById('lottie-container'),
        renderer: 'svg',
        loop: loopEnabled,
        autoplay: true,
        animationData: payload.animationData,
      });
    }

    // ── load-error ──
    if (type === 'load-error') {
      const loadingEl = document.getElementById('loading');
      loadingEl.classList.add('error');
      loadingEl.textContent = (payload && payload.error) ? payload.error : i18n.loadError;
    }

    // ── load-thumbnail ──
    if (type === 'load-thumbnail') {
      const { thumbUri } = payload;
      if (thumbUri) {
        const container = document.getElementById('thumb-container');
        const img = document.createElement('img');
        img.src = thumbUri;
        img.alt = 'thumbnail';
        container.innerHTML = '';
        container.appendChild(img);
      }
    }

    // ── load-usage ──
    if (type === 'load-usage') {
      const { references, searchedFiles, durationMs, notSupported } = payload;

      document.getElementById('usage-loading').style.display = 'none';
      document.getElementById('usage-results').style.display = 'block';

      if (notSupported) {
        document.getElementById('usage-count').textContent =
          'Usage tracking is not yet available for static assets.';
        document.getElementById('usage-empty').style.display = 'block';
        return;
      }

      const count = references.length;
      document.getElementById('usage-count').textContent =
        count === 0
          ? i18n.notFoundIn.replace('{files}', searchedFiles)
          : i18n.foundIn.replace('{count}', count).replace('{files}', searchedFiles).replace('{ms}', durationMs);

      if (count === 0) {
        document.getElementById('usage-empty').style.display = 'block';
        return;
      }

      const list = document.getElementById('usage-list');
      list.innerHTML = '';

      references.forEach(ref => {
        const item = document.createElement('div');
        item.className = 'usage-item';
        item.innerHTML =
          '<div class="usage-file">' +
            escapeHtml(basename(ref.file)) + ':' + ref.line +
          '</div>' +
          '<div class="usage-content">' +
            escapeHtml(truncate(ref.content, 80)) +
          '</div>';
        item.addEventListener('click', () => {
          vscode.postMessage({
            type: 'open-usage-file',
            payload: { file: ref.file, line: ref.line },
          });
        });
        list.appendChild(item);
      });
    }

    // ── asset-removed ──
    if (type === 'asset-removed') {
      document.getElementById('lottie-container').style.display = 'none';
      document.getElementById('controls').style.display = 'none';
      document.getElementById('removed-notice').style.display = 'flex';
    }
    } catch (err) {
      showLoadFailure('Preview failed to render: ' + (err && err.message ? err.message : String(err)));
    }
  });

  // Playback controls
  document.getElementById('btn-play')
    .addEventListener('click', () => animation && animation.play());
  document.getElementById('btn-pause')
    .addEventListener('click', () => animation && animation.pause());
  document.getElementById('btn-restart')
    .addEventListener('click', () => animation && animation.goToAndPlay(0, true));
  document.getElementById('btn-loop').addEventListener('click', () => {
    loopEnabled = !loopEnabled;
    if (animation) animation.loop = loopEnabled;
    document.getElementById('btn-loop')
      .classList.toggle('active', loopEnabled);
  });

  // Speed toolbar
  document.querySelectorAll('.speed-toolbar .btn-sm').forEach(btn => {
    btn.addEventListener('click', () => applySpeed(btn.dataset.speed));
  });

  // Contrast swatches & Custom Hex
  document.querySelectorAll('.contrast-swatch').forEach(btn => {
    btn.addEventListener('click', () => applyBackground(btn.dataset.bg));
  });
  const hexPicker = document.getElementById('hex-picker');
  if (hexPicker) {
    hexPicker.addEventListener('input', (e) => applyBackground('custom', e.target.value));
  }

  // Scrubber events
  const scrubberInput = document.getElementById('timeline-scrubber');
  if (scrubberInput) {
    scrubberInput.addEventListener('mousedown', () => { isScrubbing = true; });
    scrubberInput.addEventListener('touchstart', () => { isScrubbing = true; });
    scrubberInput.addEventListener('input', () => {
      isScrubbing = true;
      if (animation && animation.totalFrames) {
        animation.pause();
        const pct = parseFloat(scrubberInput.value) / 100;
        const targetFrame = pct * animation.totalFrames;
        animation.goToAndStop(targetFrame, true);

        const fps = animation.frameRate || 30;
        const durationSec = animation.totalFrames / fps;
        const currentSec = targetFrame / fps;

        const timeEl = document.getElementById('scrubber-time');
        const frameEl = document.getElementById('scrubber-frame');
        if (timeEl) timeEl.textContent = currentSec.toFixed(2) + 's / ' + durationSec.toFixed(2) + 's';
        if (frameEl) frameEl.textContent = 'Frame ' + Math.round(targetFrame) + ' / ' + Math.round(animation.totalFrames);
      }
    });
    scrubberInput.addEventListener('mouseup', () => { isScrubbing = false; });
    scrubberInput.addEventListener('touchend', () => { isScrubbing = false; });
    scrubberInput.addEventListener('change', () => { isScrubbing = false; });
  }

  // Quick actions
  document.getElementById('btn-copy-path')
    .addEventListener('click', () =>
      vscode.postMessage({ type: 'copy-path' }));
  document.getElementById('btn-copy-stem')
    .addEventListener('click', () =>
      vscode.postMessage({ type: 'copy-stem' }));
  document.getElementById('btn-reveal')
    .addEventListener('click', () =>
      vscode.postMessage({ type: 'reveal-in-explorer' }));
</script>
</body>
</html>`;
  }
}
