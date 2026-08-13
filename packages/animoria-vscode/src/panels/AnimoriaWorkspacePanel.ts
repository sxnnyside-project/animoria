import type { MultiRootAnalysis, WorkspaceSession } from '@animoria/core';
import * as vscode from 'vscode';
import { VsCodeHostBridge } from './VsCodeHostBridge.js';

/**
 * Where an entry point wants the developer to land, and about what.
 *
 * Carried as identity, never as a rendered conclusion: "the duplicates tab, for
 * group G" rather than "the duplicates tab, showing this plan". The panel forwards
 * it; the shared UI selects.
 */
export interface PanelFocus {
  readonly tab: 'assets' | 'findings' | 'duplicates' | 'cleanup';
  readonly assetPath?: string;
  readonly groupId?: string;
  readonly rootId?: string;
}

/**
 * One product capability, one panel.
 *
 * ## Why not one panel with tabs
 * The migration put assets, findings, duplicates, cleanup and trash behind a tab bar
 * in a single webview. Each surface then competed for the same width, an asset
 * preview sat one click from a cleanup review, and every contextual command landed a
 * developer in a workspace browser rather than on the thing they clicked. Before
 * Wave 1 each capability had its own focused surface and it was better.
 *
 * Separate `viewType`s mean VS Code treats them as separate editors: they can sit
 * side by side, be moved to different groups, and be closed independently — which is
 * what makes them *surfaces* rather than tabs inside a tab.
 */
export type PanelSurface = 'inspector' | 'findings' | 'duplicates' | 'cleanup';

interface SurfaceDefinition {
  readonly viewType: string;
  readonly title: string;
  /** Where this surface belongs relative to the developer's editor. */
  readonly column: (active: vscode.ViewColumn | undefined) => vscode.ViewColumn;
}

const SURFACES: Readonly<Record<PanelSurface, SurfaceDefinition>> = {
  // The inspector opens *beside* the code, which is where the pre-Wave-1 preview
  // panel lived and why it was usable while reading the file that referenced it.
  inspector: {
    viewType: 'animoria.inspector',
    title: 'Animoria — Asset',
    column: (active) =>
      active === vscode.ViewColumn.One ? vscode.ViewColumn.Two : (active ?? vscode.ViewColumn.Two),
  },
  findings: {
    viewType: 'animoria.findings',
    title: 'Animoria — Findings',
    column: (active) => active ?? vscode.ViewColumn.One,
  },
  duplicates: {
    viewType: 'animoria.duplicates',
    title: 'Animoria — Duplicates',
    column: (active) => active ?? vscode.ViewColumn.One,
  },
  cleanup: {
    viewType: 'animoria.cleanup',
    title: 'Animoria — Cleanup',
    column: (active) => active ?? vscode.ViewColumn.One,
  },
};

/**
 * The one Animoria webview in VS Code.
 *
 * ## What this replaces
 * Three panels holding **2,182 lines of HTML, CSS and JavaScript inside TypeScript
 * template literals** — `AnimoriaPreviewPanel` (1,135), `AnimoriaCleanupPanel` (794)
 * and `AnimoriaDuplicateResolver` (253). None of it was type-checked, none of it was
 * linted, and none of it was shared: the same four screens existed again in Kotlin
 * and a third time in the sandbox.
 *
 * The consequence was not only duplication. Wave 3 deleted `estimatedHealthScoreDelta`
 * from the types and the markup reading it kept compiling — because it was inside a
 * template literal — and shipped `+undefined` to developers for a whole wave. Markup
 * the compiler cannot see is markup that goes stale silently.
 *
 * ## What this file does instead
 * It serves one script tag and one stylesheet under a nonce CSP, and forwards
 * `postMessage` in both directions. There is no markup here beyond the document
 * skeleton, and the skeleton contains no product content.
 *
 * ## Why one panel and not three
 * The shared UI is one component with tabs. Three panels would mean three webviews,
 * three bundle loads and three copies of the analysis in memory — and the split was
 * never a product decision anyway: it was an artefact of each screen having been
 * written separately.
 */
export class AnimoriaWorkspacePanel {
  /** One live panel per surface, so they coexist rather than replace each other. */
  private static readonly _open = new Map<PanelSurface, AnimoriaWorkspacePanel>();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _bridge: VsCodeHostBridge;
  private readonly _disposables: vscode.Disposable[] = [];
  /**
   * Held until the UI says it can receive.
   *
   * A `focus` posted into a webview that has not finished mounting is delivered to
   * nobody: the shared UI subscribes in `connectedCallback` and announces itself with
   * `ready`. The first render therefore *queues* its focus and the bridge flushes it
   * on `ready`, which is why "Resolve Duplicates" now lands on the group whether or
   * not the panel was already open.
   */
  private _pendingFocus: PanelFocus | null = null;

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    session: () => WorkspaceSession | undefined,
    private readonly _surface: PanelSurface,
    focus?: PanelFocus
  ) {
    this._panel = panel;
    this._pendingFocus = focus ?? null;

    this._bridge = new VsCodeHostBridge({
      session,
      post: (message) => {
        void this._panel.webview.postMessage(message);
      },
      onReady: () => this._flushFocus(),
      // Workspace-scoped, because preferences and dismissals both describe *this*
      // workspace. Passing it here is what turns two declared capabilities —
      // `save-preferences` and `dismissedPaths` — into stored state.
      memento: context.workspaceState,
    });

    this._panel.webview.html = this._html(context, _surface);

    this._disposables.push(
      this._panel.webview.onDidReceiveMessage((raw) => {
        void this._bridge.handle(raw);
      })
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /** Opens (or reveals) one surface, focused on what the command was about. */
  static show(
    context: vscode.ExtensionContext,
    session: () => WorkspaceSession | undefined,
    surface: PanelSurface,
    focus?: PanelFocus
  ): AnimoriaWorkspacePanel {
    const definition = SURFACES[surface];
    const column = definition.column(vscode.window.activeTextEditor?.viewColumn);

    const existing = AnimoriaWorkspacePanel._open.get(surface);
    if (existing) {
      existing._panel.reveal(column, surface === 'inspector');
      if (focus) {
        existing._pendingFocus = focus;
        existing._flushFocus();
      }
      return existing;
    }

    const panel = vscode.window.createWebviewPanel(
      definition.viewType,
      definition.title,
      // The inspector opens beside the editor without stealing focus: a developer
      // clicking an asset while reading code wants to keep reading code.
      { viewColumn: column, preserveFocus: surface === 'inspector' },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    const created = new AnimoriaWorkspacePanel(panel, context, session, surface, focus);
    AnimoriaWorkspacePanel._open.set(surface, created);
    return created;
  }

  /** Sends the queued focus, if any, in the shape the contract names. */
  private _flushFocus(): void {
    const focus = this._pendingFocus;
    if (!focus) return;
    this._pendingFocus = null;
    void this._panel.webview.postMessage({
      type: 'focus',
      tab: focus.tab,
      assetPath: focus.assetPath ?? null,
      groupId: focus.groupId ?? null,
      rootId: focus.rootId ?? '',
    });
  }

  /** Pushes one analysis into every open surface. */
  static broadcast(analysis: MultiRootAnalysis): void {
    for (const panel of AnimoriaWorkspacePanel._open.values()) {
      // Roots first: a filter naming a root that has gone must be reset before the
      // analysis that no longer contains it is rendered against it.
      panel._bridge.publishRoots(analysis);
      panel._bridge.publishAnalysis(analysis);
    }
  }

  /** Forwards scan progress while an analysis is under way. */
  static broadcastProgress(analysis: MultiRootAnalysis, message: string): void {
    for (const panel of AnimoriaWorkspacePanel._open.values()) {
      panel._bridge.publishProgress(analysis.readiness, message);
    }
  }

  dispose(): void {
    AnimoriaWorkspacePanel._open.delete(this._surface);
    this._bridge.dispose();
    for (const disposable of this._disposables.splice(0)) disposable.dispose();
    this._panel.dispose();
  }

  /**
   * The document skeleton.
   *
   * ## The theme adapter
   * This is where VS Code's variables become Animoria's. The shared UI reads only
   * `--animoria-*`; the mapping below is the **only** place in the repository where
   * a `--vscode-*` name meets a shared token, and it lives in the VS Code package
   * because that is whose vocabulary it is.
   *
   * The old arrangement had this backwards: the shared token file was written in
   * `--vscode-*` names, so the JetBrains plugin emitted VS Code variables from
   * JBColor values to satisfy it.
   */
  private _html(context: vscode.ExtensionContext, surface: PanelSurface): string {
    const webview = this._panel.webview;
    const nonce = createNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'animoria-ui.global.js')
    );
    const tokensUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'tokens.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${tokensUri}">
<style nonce="${nonce}">
  html, body { height: 100%; margin: 0; padding: 0; }
  #root { height: 100%; display: flex; flex-direction: column; }

  /* VS Code theme → Animoria tokens. The one adapter, in the one host that owns
     these names. Every value has a fallback because a theme is not obliged to
     define every variable, and a missing one must degrade rather than blank out. */
  :root {
    --animoria-font-family: var(--vscode-font-family, system-ui, sans-serif);
    --animoria-font-mono: var(--vscode-editor-font-family, monospace);
    /* The editor's own size drives the whole scale, so the panel's secondary
       text sits where VS Code's does rather than two points below it. */
    --animoria-font-size-base: var(--vscode-font-size, 13px);

    --animoria-bg-primary: var(--vscode-sideBar-background, #1e1e1e);
    --animoria-bg-secondary: var(--vscode-editor-background, #252526);
    --animoria-bg-raised: var(--vscode-editorWidget-background, #2d2d30);
    --animoria-bg-hover: var(--vscode-list-hoverBackground, rgba(255,255,255,0.06));
    --animoria-bg-selected: var(--vscode-list-activeSelectionBackground, rgba(255,255,255,0.1));

    --animoria-text-primary: var(--vscode-foreground, #cccccc);
    --animoria-text-strong: var(--vscode-editor-foreground, #ffffff);
    --animoria-text-muted: var(--vscode-descriptionForeground, #8b8b8b);
    --animoria-text-on-accent: var(--vscode-button-foreground, #ffffff);

    --animoria-border: var(--vscode-widget-border, #3e3e42);
    --animoria-border-strong: var(--vscode-contrastBorder, #565659);
    --animoria-focus-ring: var(--vscode-focusBorder, #0e7fd4);

    --animoria-accent: var(--vscode-button-background, #0e639c);
    --animoria-accent-hover: var(--vscode-button-hoverBackground, #1177bb);

    --animoria-success: var(--vscode-charts-green, #4ec26b);
    --animoria-warning: var(--vscode-charts-yellow, #d8a012);
    --animoria-danger: var(--vscode-errorForeground, #e05252);
    --animoria-info: var(--vscode-charts-blue, #4a9edb);

    --animoria-scroll-thumb: var(--vscode-scrollbarSlider-background, #424242);
    --animoria-scroll-thumb-hover: var(--vscode-scrollbarSlider-activeBackground, #4f4f4f);
  }
</style>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
<script nonce="${nonce}">
  const { mount, createPostMessageBridge } = window.__animoriaUi;
  const vscodeApi = acquireVsCodeApi();
  mount(
    document.getElementById('root'),
    createPostMessageBridge({ post: (message) => vscodeApi.postMessage(message) }),
    ${JSON.stringify(surface)}
  );
</script>
</body>
</html>`;
  }
}

/**
 * A per-load nonce, so the CSP can allow exactly this page's scripts.
 *
 * `crypto.getRandomValues` rather than `Math.random`: a predictable nonce is not a
 * nonce, and the extension host provides Web Crypto.
 */
function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
