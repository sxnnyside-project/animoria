import * as vscode from 'vscode';

const WATCHED_EXTENSIONS = [
  // Motion & Vector
  'json',
  'dotlottie',
  'riv',
  'gif',
  'apng',
  'svg',
  // Static Raster & Graphics
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'bmp',
  'eps',
  'icns',
  'ico',
  'odd',
  'ps',
  'psd',
  'tiff',
  'tif',
  // Frontend Web & Frameworks
  'ts',
  'tsx',
  'js',
  'jsx',
  'vue',
  'svelte',
  'astro',
  'html',
  'htm',
  'htmx',
  // Stylesheets & Markup
  'css',
  'scss',
  'sass',
  'less',
  'md',
  'mdx',
  // Templating & Server Web
  'php',
  'blade',
  'twig',
  'liquid',
  'erb',
  'njk',
  'ejs',
  'hbs',
  'mustache',
  'jinja',
  'jinja2',
  'j2',
  'heex',
  'eex',
  'gohtml',
  'razor',
  'cshtml',
  // Mobile & Cross-platform
  'kt',
  'swift',
  'dart',
  // Backend & Systems
  'py',
  'rb',
  'rs',
  'go',
  'java',
  'cs',
  'cpp',
  'c',
  'h',
  'hpp',
];

export class AnimoriaFileWatcher implements vscode.Disposable {
  private readonly _watcher: vscode.FileSystemWatcher;
  private readonly _disposables: vscode.Disposable[] = [];
  private _debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly _onChange: () => void,
    private readonly _debounceMs: number = 400,
  ) {
    const pattern = `**/*.{${WATCHED_EXTENSIONS.join(',')}}`;
    this._watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this._disposables.push(
      this._watcher.onDidCreate(() => this._scheduleChange()),
      this._watcher.onDidChange(() => this._scheduleChange()),
      this._watcher.onDidDelete(() => this._scheduleChange()),
    );
  }

  private _scheduleChange(): void {
    if (this._debounceMs <= 0) {
      this._onChange();
      return;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = undefined;
      this._onChange();
    }, this._debounceMs);
  }

  dispose(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
    this._watcher.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
  }
}
