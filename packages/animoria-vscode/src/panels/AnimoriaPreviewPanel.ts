import * as vscode from 'vscode';
import type { AnimoriaAsset } from '@animoria/core';
import { Animoria, DotLottieParser, UsageScanner, t } from '@animoria/core';
import { resolveScopePath } from '../utils/resolve-scope-path';

export class AnimoriaPreviewPanel {
  static currentPanel: AnimoriaPreviewPanel | undefined;
  static readonly viewType = 'animoria.preview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _asset: AnimoriaAsset;
  private _assetPath: string;
  private _thumbnailPath: string | undefined;
  private _workspacePath: string | undefined;
  private _disposables: vscode.Disposable[] = [];

  static render(
    extensionUri: vscode.Uri,
    asset: AnimoriaAsset,
    thumbnailPath?: string,
    workspacePath?: string
  ): void {
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
      workspacePath
    );
  }

  constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    asset: AnimoriaAsset,
    thumbnailPath?: string,
    workspacePath?: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
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

  private _update(): void {
    this._panel.title = this._asset.stem;
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

    const thumbUri = this._thumbnailPath
      ? this._panel.webview.asWebviewUri(vscode.Uri.file(this._thumbnailPath)).toString()
      : null;

    setTimeout(async () => {
      try {
        const animoria = new Animoria({ workspacePath: this._workspacePath ?? '' });
        const animationData = await animoria.getAnimationData(this._asset);
        if (!animationData) {
          this._panel.webview.postMessage({
            type: 'load-error',
            payload: { error: `Could not extract animation data from ${this._asset.name}` },
          });
        } else {
          this._panel.webview.postMessage({
            type: 'load-asset',
            payload: { asset: this._asset, animationData },
          });
        }
      } catch (err) {
        this._panel.webview.postMessage({
          type: 'load-error',
          payload: { error: `Failed to load ${this._asset.name}: ${err}` },
        });
      }

      this._loadAndPostUsageRefs(thumbUri);
    }, 300);
  }

  private async _loadAndPostUsageRefs(thumbUri: string | null): Promise<void> {
    // Post thumbnail immediately (fast path)
    this._panel.webview.postMessage({
      type: 'load-thumbnail',
      payload: { thumbUri },
    });

    if (!this._workspacePath) {
      this._panel.webview.postMessage({
        type: 'load-usage',
        payload: { references: [], searchedFiles: 0, durationMs: 0 },
      });
      return;
    }

    try {
      const scopePath = resolveScopePath(this._asset.path, this._workspacePath);
      const scanner = new UsageScanner({
        workspacePath: this._workspacePath,
        asset: this._asset,
        strategy: 'pattern',
        scopePath,
      });
      const result = await scanner.search();
      this._panel.webview.postMessage({
        type: 'load-usage',
        payload: {
          references: result.references,
          searchedFiles: result.searchedFiles,
          durationMs: Math.round(result.durationMs),
        },
      });
    } catch {
      this._panel.webview.postMessage({
        type: 'load-usage',
        payload: { references: [], searchedFiles: 0, durationMs: 0 },
      });
    }
  }

  update(asset: AnimoriaAsset): void {
    this._asset = asset;
    this._assetPath = asset.path;
    this._update();
  }

  get currentAssetPath(): string {
    return this._asset.path;
  }

  notifyAssetRemoved(): void {
    this._panel.webview.postMessage({ type: 'asset-removed' });
  }

  private _handleMessage(message: { type: string; payload?: unknown }): void {
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

      case 'load-dotlottie-animation': {
        const { animationId } = message.payload as { animationId: string };
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
        const { file, line } = message.payload as { file: string; line: number };
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
    AnimoriaPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }

  private _getHtmlContent(locale: string): string {
    const loadingText = t('vscode.loading', locale);
    const removedText = t('vscode.assetRemoved', locale);
    const livePreviewTitle = t('vscode.livePreview', locale);
    const playText = t('vscode.play', locale);
    const pauseText = t('vscode.pause', locale);
    const restartText = t('vscode.restart', locale);
    const loopText = t('vscode.loop', locale);
    const metadataTitle = t('vscode.metadata', locale);
    const formatLabel = t('preview.format', locale);
    const fpsLabel = t('preview.fps', locale);
    const durationLabel = t('preview.duration', locale);
    const framesLabel = t('vscode.frames', locale);
    const dimensionsLabel = t('preview.dimensions', locale);
    const layersLabel = t('vscode.layers', locale);
    const markersLabel = t('preview.markers', locale);
    const fileSizeLabel = t('vscode.fileSize', locale);
    const usageTitle = t('vscode.usageReferences', locale);
    const usageLoadingText = t('vscode.searchingCodebase', locale);
    const noReferencesText = t('vscode.noReferences', locale);
    const quickActionsTitle = t('vscode.quickActions', locale);
    const copyPathText = t('vscode.copyPath', locale);
    const copyNameText = t('vscode.copyName', locale);
    const revealText = t('vscode.revealInExplorer', locale);

    const i18nConfig = JSON.stringify({
      notFoundIn: t('vscode.notFoundIn', locale),
      foundIn: t('vscode.foundIn', locale),
      loadError: t('vscode.loadError', locale),
      hasImages: t('vscode.hasImages', locale),
      animationsCount: t('vscode.animationsCount', locale),
      none: t('vscode.none', locale),
    });

    return /* html */ `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'unsafe-inline' https://cdnjs.cloudflare.com;
             style-src 'unsafe-inline';
             img-src vscode-resource: https: data:;">
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

    /* ── LIVE PREVIEW ── */
    .preview-section { text-align: center; }

    #lottie-container {
      width: 240px;
      height: 240px;
      margin: 0 auto 12px;
      background: var(--vscode-input-background);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .controls {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
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
    <div class="section-title">${livePreviewTitle}</div>
    <div id="lottie-container"></div>
    <div class="controls" id="controls">
      <button class="btn primary" id="btn-play">▶ ${playText}</button>
      <button class="btn" id="btn-pause">⏸ ${pauseText}</button>
      <button class="btn" id="btn-restart">↺ ${restartText}</button>
      <button class="btn active" id="btn-loop">∞ ${loopText}</button>
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

  <!-- QUICK ACTIONS -->
  <div class="section">
    <div class="section-title">${quickActionsTitle}</div>
    <div class="actions">
      <button class="btn" id="btn-copy-path">${copyPathText}</button>
      <button class="btn" id="btn-copy-name" style="display:none;">Copy Name</button> <!-- Hidden legacy button to prevent layout shift -->
      <button class="btn" id="btn-copy-stem">${copyNameText}</button>
      <button class="btn" id="btn-reveal">${revealText}</button>
    </div>
  </div>

</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
<script>
  const vscode = acquireVsCodeApi();
  let animation = null;
  let loopEnabled = true;
  const i18n = ${i18nConfig};

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
    const { type, payload } = event.data;

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

      // Lottie player
      if (animation) { animation.destroy(); animation = null; }
      animation = lottie.loadAnimation({
        container: document.getElementById('lottie-container'),
        renderer: 'svg',
        loop: loopEnabled,
        autoplay: true,
        animationData,
      });

      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'flex';
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
      document.getElementById('loading').textContent =
        '⚠ ' + ((payload && payload.error) ? payload.error : i18n.loadError);
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
      const { references, searchedFiles, durationMs } = payload;

      document.getElementById('usage-loading').style.display = 'none';
      document.getElementById('usage-results').style.display = 'block';

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
