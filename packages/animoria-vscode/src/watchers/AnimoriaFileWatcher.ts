import * as vscode from 'vscode';
import * as fs from 'fs';
import { basename } from 'path';
import type { AnimoriaAsset } from '@animoria/core';
import { LottieParser } from '@animoria/core';

export interface AnimoriaFileWatcherOptions {
  onAssetAdded: (asset: AnimoriaAsset) => void;
  onAssetChanged: (asset: AnimoriaAsset) => void;
  onAssetRemoved: (path: string) => void;
}

export class AnimoriaFileWatcher {
  private _watcher: vscode.FileSystemWatcher | undefined;
  private _parser: LottieParser;
  private _options: AnimoriaFileWatcherOptions;
  private _debounceMap: Map<string, NodeJS.Timeout> = new Map();
  private static readonly DEBOUNCE_MS = 300;

  constructor(options: AnimoriaFileWatcherOptions) {
    this._options = options;
    this._parser = new LottieParser();
  }

  start(workspacePath: string): void {
    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspacePath, '**/*.json')
    );

    this._watcher.onDidCreate((uri) => this._handleCreate(uri));
    this._watcher.onDidChange((uri) => this._handleChange(uri));
    this._watcher.onDidDelete((uri) => this._handleDelete(uri));
  }

  dispose(): void {
    this._watcher?.dispose();
    this._debounceMap.forEach((timer) => clearTimeout(timer));
    this._debounceMap.clear();
  }

  private _debounce(key: string, fn: () => void): void {
    const existing = this._debounceMap.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      fn();
      this._debounceMap.delete(key);
    }, AnimoriaFileWatcher.DEBOUNCE_MS);

    this._debounceMap.set(key, timer);
  }

  private _handleCreate(uri: vscode.Uri): void {
    this._debounce(uri.fsPath, async () => {
      const asset = await this._buildAsset(uri);
      if (asset) this._options.onAssetAdded(asset);
    });
  }

  private _handleChange(uri: vscode.Uri): void {
    this._debounce(uri.fsPath, async () => {
      const asset = await this._buildAsset(uri);
      if (asset) this._options.onAssetChanged(asset);
    });
  }

  private _handleDelete(uri: vscode.Uri): void {
    this._options.onAssetRemoved(uri.fsPath);
  }

  private async _buildAsset(uri: vscode.Uri): Promise<AnimoriaAsset | undefined> {
    try {
      const stats = await fs.promises.stat(uri.fsPath);
      const content = await fs.promises.readFile(uri.fsPath, 'utf-8');

      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch {
        return undefined;
      }

      if (!this._parser.validate(data)) return undefined;

      const parseResult = this._parser.parse(data);
      const name = basename(uri.fsPath);
      const stem = basename(uri.fsPath, '.json');

      return {
        path: uri.fsPath,
        name,
        stem,
        format: 'lottie',
        sizeBytes: stats.size,
        mtime: stats.mtimeMs,
        status: parseResult.success ? 'parsed' : 'error',
        metadata: parseResult.metadata,
        error: parseResult.error,
      };
    } catch {
      return undefined;
    }
  }
}
