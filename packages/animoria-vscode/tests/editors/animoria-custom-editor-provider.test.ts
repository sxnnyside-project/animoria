import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { AnimoriaCustomEditorProvider } from '../../src/editors/animoria-custom-editor-provider.js';

describe('AnimoriaCustomEditorProvider', () => {
  const extensionUri = vscode.Uri.file('/extension');
  const fakeContext = {
    extensionUri,
    extensionPath: '/extension',
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;

  const provider = new AnimoriaCustomEditorProvider(
    fakeContext,
    () => undefined,
    () => undefined,
  );

  it('opens a custom document holding the asset Uri', () => {
    const assetUri = vscode.Uri.file('/workspace/assets/logo.svg');
    const doc = provider.openCustomDocument(
      assetUri,
      {} as vscode.CustomDocumentOpenContext,
      {} as vscode.CancellationToken,
    );

    expect(doc).toBeDefined();
    expect(doc.uri.fsPath).toBe(assetUri.fsPath);
  });

  it('resolves the custom editor with secure HTML and script bridge', async () => {
    const assetUri = vscode.Uri.file('/workspace/assets/animation.json');
    const doc = provider.openCustomDocument(
      assetUri,
      {} as vscode.CustomDocumentOpenContext,
      {} as vscode.CancellationToken,
    );

    const panel = vscode.window.createWebviewPanel('animoria.customAssetViewer', 'Animoria');

    await provider.resolveCustomEditor(doc, panel, {} as vscode.CancellationToken);

    expect(panel.webview.html).toContain('<!DOCTYPE html>');
    expect(panel.webview.html).toContain('Content-Security-Policy');
    expect(panel.webview.html).toContain('tokens.css');
    expect(panel.webview.html).toContain(assetUri.fsPath);
  });
});
