import { beforeEach, describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { mockVscodeState, resetTestWorkspace } from './harness.js';

/**
 * Proves the harness itself — not extension features. Each block exercises
 * one capability the mock module must support before runtime/feature tests
 * (TASK-H1.2 onward) can be written against it. A capability with no
 * smoke test here is not yet trustworthy to build on.
 */
describe('vscode mock harness', () => {
  beforeEach(() => {
    resetTestWorkspace();
  });

  it('registers and executes commands', async () => {
    const disposable = vscode.commands.registerCommand(
      'animoria.testCommand',
      (value: number) => value * 2
    );

    const result = await vscode.commands.executeCommand<number>('animoria.testCommand', 21);

    expect(result).toBe(42);
    disposable.dispose();
    await expect(vscode.commands.executeCommand('animoria.testCommand', 1)).rejects.toThrow();
  });

  it('applies a WorkspaceEdit atomically against the mock filesystem', async () => {
    const target = vscode.Uri.file('/workspace/assets/orphan.json');
    mockVscodeState.fileSystem.set(target.fsPath, Buffer.from('{}'));

    const edit = new vscode.WorkspaceEdit();
    edit.deleteFile(target);

    const applied = await vscode.workspace.applyEdit(edit);

    expect(applied).toBe(true);
    expect(mockVscodeState.fileSystem.has(target.fsPath)).toBe(false);
  });

  it('exposes a fake filesystem for read/write/delete', async () => {
    const uri = vscode.Uri.file('/workspace/report.md');

    await vscode.workspace.fs.writeFile(uri, Buffer.from('# Report'));
    const content = await vscode.workspace.fs.readFile(uri);
    expect(Buffer.from(content).toString('utf-8')).toBe('# Report');

    await vscode.workspace.fs.delete(uri);
    await expect(vscode.workspace.fs.readFile(uri)).rejects.toThrow();
  });

  it('lets a test simulate file watcher events', () => {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.json');
    const seen: string[] = [];
    watcher.onDidCreate((uri) => seen.push(`create:${uri.fsPath}`));
    watcher.onDidChange((uri) => seen.push(`change:${uri.fsPath}`));
    watcher.onDidDelete((uri) => seen.push(`delete:${uri.fsPath}`));

    watcher.simulate('create', vscode.Uri.file('/workspace/new.json'));
    watcher.simulate('change', vscode.Uri.file('/workspace/new.json'));
    watcher.simulate('delete', vscode.Uri.file('/workspace/new.json'));

    expect(seen).toEqual([
      'create:/workspace/new.json',
      'change:/workspace/new.json',
      'delete:/workspace/new.json',
    ]);
    watcher.dispose();
  });

  it('drives QuickPick selection via mock state', async () => {
    mockVscodeState.quickPickResult = { label: 'success.json', detail: '/workspace/success.json' };

    const picked = await vscode.window.showQuickPick([]);

    expect(picked).toEqual({ label: 'success.json', detail: '/workspace/success.json' });
  });

  it('captures OutputChannel writes', () => {
    const channel = vscode.window.createOutputChannel('Animoria');

    channel.appendLine('indexing started');
    channel.appendLine('indexing complete: 6 assets');

    expect(channel.lines).toEqual(['indexing started', 'indexing complete: 6 assets']);
  });

  it('round-trips webview message passing in both directions', () => {
    const panel = vscode.window.createWebviewPanel('animoria.preview', 'Preview');
    const receivedByExtension: unknown[] = [];
    panel.webview.onDidReceiveMessage((message) => receivedByExtension.push(message));

    void panel.webview.postMessage({ type: 'asset-loaded', path: '/workspace/success.json' });
    panel.webview.simulateMessageFromWebview({ type: 'ready' });

    expect(panel.webview.sentMessages).toEqual([
      { type: 'asset-loaded', path: '/workspace/success.json' },
    ]);
    expect(receivedByExtension).toEqual([{ type: 'ready' }]);
  });

  it('fires onDidDispose exactly once when a webview panel is disposed', () => {
    const panel = vscode.window.createWebviewPanel('animoria.preview', 'Preview');
    let disposeCount = 0;
    panel.onDidDispose(() => disposeCount++);

    panel.dispose();
    panel.dispose();

    expect(disposeCount).toBe(1);
    expect(panel.isDisposed).toBe(true);
  });

  it('resets shared mock state between tests', () => {
    expect(mockVscodeState.workspaceFolders).toBeUndefined();
    expect(mockVscodeState.fileSystem.size).toBe(0);
  });
});
