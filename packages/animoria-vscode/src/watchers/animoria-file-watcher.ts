import * as vscode from 'vscode';

const WATCHED_EXTENSIONS = [
  'json',
  'dotlottie',
  'riv',
  'gif',
  'apng',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'ts',
  'tsx',
  'js',
  'jsx',
  'vue',
  'svelte',
  'astro',
  'kt',
  'swift',
  'dart',
  'html',
  'css',
  'scss',
  'less',
  'md',
  'mdx',
];

export class AnimoriaFileWatcher implements vscode.Disposable {
  private readonly _watcher: vscode.FileSystemWatcher;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(private readonly _onChange: () => void) {
    const pattern = `**/*.{${WATCHED_EXTENSIONS.join(',')}}`;
    this._watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this._disposables.push(
      this._watcher.onDidCreate(() => this._onChange()),
      this._watcher.onDidChange(() => this._onChange()),
      this._watcher.onDidDelete(() => this._onChange())
    );
  }

  dispose(): void {
    this._watcher.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
  }
}
