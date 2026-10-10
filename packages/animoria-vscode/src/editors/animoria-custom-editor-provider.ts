import * as vscode from 'vscode';
import type { VsCodeDaemonClient } from '../daemon/daemon-client.js';
import { VsCodeHostBridge, type WorkspaceSession } from '../panels/vscode-host-bridge.js';

export interface CustomAssetDocument extends vscode.CustomDocument {
  readonly uri: vscode.Uri;
}

/**
 * Registers Animoria as a native custom visual inspector for images and animations
 * (Lottie, Rive, SVG, WebP, PNG, etc.) in VS Code's editor area.
 */
export class AnimoriaCustomEditorProvider
  implements vscode.CustomReadonlyEditorProvider<CustomAssetDocument>, vscode.Disposable
{
  public static readonly viewType = 'animoria.customAssetViewer';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly session: () => WorkspaceSession | undefined,
    private readonly daemon: () => VsCodeDaemonClient | undefined,
  ) {}

  openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): CustomAssetDocument {
    return {
      uri,
      dispose: () => {},
    };
  }

  async resolveCustomEditor(
    document: CustomAssetDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri,
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    const s = this.session();
    const bridge = s
      ? new VsCodeHostBridge({
          session: () => s,
          daemon: this.daemon,
          post: (message) => {
            void webviewPanel.webview.postMessage(message);
          },
          onReady: () => {
            void webviewPanel.webview.postMessage({
              type: 'focus',
              tab: 'assets',
              assetPath: document.uri.fsPath,
            });
          },
          memento: this.context.workspaceState,
        })
      : null;

    if (bridge) {
      const sub = webviewPanel.webview.onDidReceiveMessage((raw) => {
        void bridge.handle(raw);
      });
      webviewPanel.onDidDispose(() => {
        sub.dispose();
      });
    }

    webviewPanel.webview.html = this.renderHtml(webviewPanel.webview, document.uri);
  }

  private renderHtml(webview: vscode.Webview, assetUri: vscode.Uri): string {
    const nonce = createNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'animoria-ui.global.js'),
    );
    const tokensUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'tokens.css'),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${tokensUri}">
<style nonce="${nonce}">
  html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-editor-background, #1e1e1e); }
  #root { height: 100%; display: flex; flex-direction: column; }
  :root {
    --animoria-font-family: var(--vscode-font-family, system-ui, sans-serif);
    --animoria-font-mono: var(--vscode-editor-font-family, monospace);
    --animoria-font-size-base: var(--vscode-font-size, 13px);
    --animoria-bg-primary: var(--vscode-editor-background, #1e1e1e);
    --animoria-bg-secondary: var(--vscode-sideBar-background, #252526);
    --animoria-bg-raised: var(--vscode-editorWidget-background, #2d2d30);
    --animoria-bg-hover: var(--vscode-list-hoverBackground, rgba(255,255,255,0.06));
    --animoria-bg-selected: var(--vscode-list-activeSelectionBackground, rgba(255,255,255,0.1));
    --animoria-text-primary: var(--vscode-foreground, #cccccc);
    --animoria-text-strong: var(--vscode-editor-foreground, #ffffff);
    --animoria-text-muted: var(--vscode-descriptionForeground, #8b8b8b);
    --animoria-border: var(--vscode-widget-border, #3e3e42);
    --animoria-accent: var(--vscode-button-background, #0e639c);
    --animoria-accent-hover: var(--vscode-button-hoverBackground, #1177bb);
  }
</style>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
<script nonce="${nonce}">
  const { mount, createPostMessageBridge } = window.__animoriaUi || {};
  if (mount && createPostMessageBridge) {
    const vscodeApi = acquireVsCodeApi();
    mount(
      document.getElementById('root'),
      createPostMessageBridge({ post: (message) => vscodeApi.postMessage(message) }),
      'inspector',
      { tab: 'assets', assetPath: ${JSON.stringify(assetUri.fsPath)} }
    );
  }
</script>
</body>
</html>`;
  }

  dispose(): void {}
}

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
