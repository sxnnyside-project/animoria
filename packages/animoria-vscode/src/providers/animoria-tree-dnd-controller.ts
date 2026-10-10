import { relative } from 'node:path';
import type { Asset } from '@animoria/contracts';
import * as vscode from 'vscode';
import { AnimoriaTreeItem } from './animoria-tree-provider.js';

export const ANIMORIA_DND_MIME = 'application/vnd.code.tree.animoriaGallery';

/**
 * Enables dragging assets from the Animoria Gallery tree view directly into
 * editor files or between explorer folders.
 */
export class AnimoriaTreeDragAndDropController
  implements vscode.TreeDragAndDropController<vscode.TreeItem>, vscode.Disposable
{
  readonly dragMimeTypes = ['text/uri-list', 'text/plain', ANIMORIA_DND_MIME];
  readonly dropMimeTypes = ['text/uri-list', 'files'];

  handleDrag(
    source: readonly vscode.TreeItem[],
    treeDataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const assets: Asset[] = [];

    for (const item of source) {
      if (item instanceof AnimoriaTreeItem && item.asset) {
        assets.push(item.asset);
      } else if (item && 'asset' in item && typeof (item as { asset: Asset }).asset === 'object') {
        assets.push((item as { asset: Asset }).asset);
      }
    }

    if (assets.length === 0) return;

    const uriList = assets.map((a) => vscode.Uri.file(a.path).toString()).join('\r\n');
    treeDataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));

    const paths = assets.map((a) => a.path).join('\n');
    treeDataTransfer.set('text/plain', new vscode.DataTransferItem(paths));

    treeDataTransfer.set(
      ANIMORIA_DND_MIME,
      new vscode.DataTransferItem(JSON.stringify(assets.map((a) => a.id))),
    );
  }

  handleDrop(
    _target: vscode.TreeItem | undefined,
    _sources: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    // Drop targeting within the Gallery tree view can trigger workspace refresh or folder reindexing
  }

  dispose(): void {}
}

/**
 * Intercepts dropping visual asset files into text editors, inserting smart
 * framework-aware tags (<img src="..." />, components, or imports).
 */
export class AnimoriaDocumentDropEditProvider implements vscode.DocumentDropEditProvider {
  provideDocumentDropEdits(
    document: vscode.TextDocument,
    _position: vscode.Position,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DocumentDropEdit> {
    let rawStr = '';

    const animoriaItem = dataTransfer.get('application/x-animoria-asset');
    if (animoriaItem) {
      try {
        const parsed = JSON.parse(String(animoriaItem.value ?? ''));
        if (parsed && typeof parsed.path === 'string') {
          rawStr = parsed.path;
        }
      } catch {
        // fallback
      }
    }

    if (!rawStr) {
      const uriListItem = dataTransfer.get('text/uri-list');
      if (uriListItem) {
        rawStr =
          String(uriListItem.value ?? '')
            .split(/\r?\n/)[0]
            ?.trim() ?? '';
      }
    }

    if (!rawStr) {
      const plainItem = dataTransfer.get('text/plain');
      if (plainItem) {
        rawStr =
          String(plainItem.value ?? '')
            .split(/\r?\n/)[0]
            ?.trim() ?? '';
      }
    }

    if (!rawStr) return undefined;

    let fsPath: string;
    if (rawStr.startsWith('file://')) {
      try {
        fsPath = vscode.Uri.parse(rawStr).fsPath;
      } catch {
        return undefined;
      }
    } else if (rawStr.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(rawStr)) {
      fsPath = rawStr;
    } else {
      // Relative path: resolve against workspace folder or document directory
      const wsFolder =
        typeof vscode.workspace.getWorkspaceFolder === 'function'
          ? vscode.workspace.getWorkspaceFolder(document.uri)
          : vscode.workspace.workspaceFolders?.[0];
      const baseDir = wsFolder
        ? wsFolder.uri.fsPath
        : vscode.Uri.joinPath(document.uri, '..').fsPath;
      fsPath = vscode.Uri.joinPath(vscode.Uri.file(baseDir), rawStr).fsPath;
    }

    const ext = fsPath.split('.').pop()?.toLowerCase();
    const visualExtensions = new Set([
      'svg',
      'png',
      'jpg',
      'jpeg',
      'webp',
      'avif',
      'lottie',
      'riv',
      'gif',
      'apng',
    ]);
    if (!ext || !visualExtensions.has(ext)) return undefined;

    const docDir = vscode.Uri.joinPath(document.uri, '..').fsPath;
    let relPath = relative(docDir, fsPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) {
      relPath = `./${relPath}`;
    }

    const filename = fsPath.split(/[/\\]/).pop() ?? 'asset';
    const stem = filename.replace(/\.[^.]+$/, '');
    const lang = document.languageId?.toLowerCase() ?? '';
    const isAstro =
      lang === 'astro' || (document.fileName?.toLowerCase().endsWith('.astro') ?? false);

    let snippet: string;
    if (isAstro || lang === 'html' || lang === 'vue' || lang === 'svelte') {
      snippet = `<img src="${relPath}" alt="${stem}" />`;
    } else if (lang === 'typescriptreact' || lang === 'javascriptreact') {
      snippet = `<img src="${relPath}" alt="${stem}" />`;
    } else if (lang === 'css' || lang === 'scss' || lang === 'less') {
      snippet = `url("${relPath}")`;
    } else {
      snippet = relPath;
    }

    return new vscode.DocumentDropEdit(new vscode.SnippetString(snippet));
  }
}
