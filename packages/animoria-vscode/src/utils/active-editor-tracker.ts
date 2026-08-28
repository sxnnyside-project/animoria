import * as vscode from 'vscode';

// ─── ActiveEditorTracker ───────────────────────────────────────────────────────

/**
 * Tracks the last focused on-disk editor, as a best-guess paste target for
 * Snippet Generation (a webview stealing focus makes `activeTextEditor`
 * unreliable at generation time). Approximate, not authoritative — see
 * `IntegrationContext.pathResolutionBasis`.
 */
export class ActiveEditorTracker implements vscode.Disposable {
  private _lastActiveFilePath: string | undefined;
  private readonly _disposable: vscode.Disposable;

  constructor() {
    const current = vscode.window.activeTextEditor;
    if (current && current.document.uri.scheme === 'file') {
      this._lastActiveFilePath = current.document.uri.fsPath;
    }

    this._disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.uri.scheme === 'file') {
        this._lastActiveFilePath = editor.document.uri.fsPath;
      }
    });
  }

  /**
   * The absolute path of the last real, on-disk text editor known to have
   * had focus, or `undefined` if none has been observed yet.
   */
  getLastActiveFilePath(): string | undefined {
    return this._lastActiveFilePath;
  }

  dispose(): void {
    this._disposable.dispose();
  }
}
