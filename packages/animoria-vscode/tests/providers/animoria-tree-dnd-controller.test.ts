import type { Asset } from '@animoria/contracts';
import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  ANIMORIA_DND_MIME,
  AnimoriaDocumentDropEditProvider,
  AnimoriaTreeDragAndDropController,
} from '../../src/providers/animoria-tree-dnd-controller.js';
import { AnimoriaTreeItem } from '../../src/providers/animoria-tree-provider.js';

describe('AnimoriaTreeDragAndDropController', () => {
  const asset: Asset = {
    id: 'asset-hero',
    path: '/workspace/assets/hero.svg',
    relative_path: 'assets/hero.svg',
    name: 'hero.svg',
    stem: 'hero',
    kind: 'vector',
    format: 'svg',
    size_bytes: 1024,
    mtime_ms: 0,
    is_valid: true,
  };

  it('populates DataTransfer with uri-list, plain text, and custom MIME', () => {
    const controller = new AnimoriaTreeDragAndDropController();
    const treeItem = new AnimoriaTreeItem(asset, undefined, []);

    const transfer = new vscode.DataTransfer();
    controller.handleDrag([treeItem], transfer, {} as vscode.CancellationToken);

    const uriList = transfer.get('text/uri-list');
    expect(uriList).toBeDefined();
    expect(String(uriList?.value)).toContain(asset.path);

    const plain = transfer.get('text/plain');
    expect(plain).toBeDefined();
    expect(plain?.value).toBe(asset.path);

    const custom = transfer.get(ANIMORIA_DND_MIME);
    expect(custom).toBeDefined();
    expect(String(custom?.value)).toContain(asset.id);
  });
});

describe('AnimoriaDocumentDropEditProvider', () => {
  const dropProvider = new AnimoriaDocumentDropEditProvider();

  it('generates HTML image tag snippet when dropping SVG into Vue document', () => {
    const document = {
      uri: vscode.Uri.file('/workspace/src/components/Header.vue'),
      languageId: 'vue',
    } as unknown as vscode.TextDocument;

    const transfer = new vscode.DataTransfer();
    transfer.set('text/uri-list', new vscode.DataTransferItem('file:///workspace/assets/logo.svg'));

    const edit = dropProvider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      transfer,
      {} as vscode.CancellationToken,
    ) as vscode.DocumentDropEdit;

    expect(edit).toBeDefined();
    expect(edit.insertText.value).toContain('<img src="');
    expect(edit.insertText.value).toContain('logo.svg"');
    expect(edit.insertText.value).toContain('alt="logo"');
  });

  it('generates CSS url() snippet when dropping into CSS document', () => {
    const document = {
      uri: vscode.Uri.file('/workspace/src/styles/main.css'),
      languageId: 'css',
    } as unknown as vscode.TextDocument;

    const transfer = new vscode.DataTransfer();
    transfer.set(
      'text/uri-list',
      new vscode.DataTransferItem('file:///workspace/assets/pattern.png'),
    );

    const edit = dropProvider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      transfer,
      {} as vscode.CancellationToken,
    ) as vscode.DocumentDropEdit;

    expect(edit).toBeDefined();
    expect(edit.insertText.value).toContain('url("');
    expect(edit.insertText.value).toContain('pattern.png")');
  });

  it('generates HTML image tag snippet when dropping into Astro document', () => {
    const document = {
      uri: vscode.Uri.file('/workspace/src/pages/index.astro'),
      fileName: '/workspace/src/pages/index.astro',
      languageId: 'astro',
    } as unknown as vscode.TextDocument;

    const transfer = new vscode.DataTransfer();
    transfer.set(
      'text/uri-list',
      new vscode.DataTransferItem('file:///workspace/public/banner.png'),
    );

    const edit = dropProvider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      transfer,
      {} as vscode.CancellationToken,
    ) as vscode.DocumentDropEdit;

    expect(edit).toBeDefined();
    expect(edit.insertText.value).toContain('<img src="');
    expect(edit.insertText.value).toContain('banner.png"');
    expect(edit.insertText.value).toContain('alt="banner"');
  });

  it('generates image tag for .astro document even when languageId is plaintext', () => {
    const document = {
      uri: vscode.Uri.file('/workspace/src/pages/notion-callback.astro'),
      fileName: '/workspace/src/pages/notion-callback.astro',
      languageId: 'plaintext',
    } as unknown as vscode.TextDocument;

    const transfer = new vscode.DataTransfer();
    transfer.set('text/plain', new vscode.DataTransferItem('public/icons/notion.svg'));

    const edit = dropProvider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      transfer,
      {} as vscode.CancellationToken,
    ) as vscode.DocumentDropEdit;

    expect(edit).toBeDefined();
    expect(edit.insertText.value).toContain('<img src="');
    expect(edit.insertText.value).toContain('notion.svg"');
  });

  it('returns undefined for non-visual dropped files', () => {
    const document = {
      uri: vscode.Uri.file('/workspace/src/App.vue'),
      languageId: 'vue',
    } as unknown as vscode.TextDocument;

    const transfer = new vscode.DataTransfer();
    transfer.set('text/uri-list', new vscode.DataTransferItem('file:///workspace/src/utils.ts'));

    const edit = dropProvider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      transfer,
      {} as vscode.CancellationToken,
    );

    expect(edit).toBeUndefined();
  });
});
