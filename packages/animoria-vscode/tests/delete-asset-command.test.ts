import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { mockVscodeState, resetTestWorkspace } from './harness.js';
import { createMockExtensionContext } from './mocks/vscode.js';

const daemon = vi.hoisted(() => ({ trashAsset: vi.fn() }));

// A stand-in for the native daemon: every request resolves to nothing, `trashAsset` is observable.
vi.mock('../src/daemon/daemon-client.js', () => ({
  VsCodeDaemonClient: class {
    trashAsset = daemon.trashAsset;
    onEvent = () => () => {};
    isAlive = () => false;
    shutdown = async () => {};
    scan = async () => {
      throw new Error('no daemon in this test');
    };
  },
}));

const { activate } = await import('../src/extension.js');

const folder = (path: string, index: number) => ({
  uri: vscode.Uri.file(path),
  name: path.split('/').pop() ?? path,
  index,
});

describe('animoria.deleteAsset in a multi-root window', () => {
  beforeEach(async () => {
    resetTestWorkspace();
    daemon.trashAsset.mockReset().mockResolvedValue({});
    mockVscodeState.warningMessageResult = 'Move to Trash';
    mockVscodeState.workspaceFolders = [folder('/w/first', 0), folder('/w/second', 1)];
    await activate(createMockExtensionContext() as unknown as vscode.ExtensionContext);
  });

  it('trashes an asset of the second folder in the second folder', async () => {
    await vscode.commands.executeCommand('animoria.deleteAsset', {
      path: '/w/second/img/logo.png',
      id: 'asset-9',
    });

    expect(daemon.trashAsset).toHaveBeenCalledTimes(1);
    expect(daemon.trashAsset).toHaveBeenCalledWith(
      '/w/second',
      'asset-9',
      '/w/second/img/logo.png',
    );
  });

  it('does not ask the daemon to trash an asset outside every open folder', async () => {
    await vscode.commands.executeCommand('animoria.deleteAsset', {
      path: '/elsewhere/logo.png',
      id: 'asset-9',
    });

    expect(daemon.trashAsset).not.toHaveBeenCalled();
  });

  it('does nothing when the user cancels the confirmation', async () => {
    mockVscodeState.warningMessageResult = undefined;

    await vscode.commands.executeCommand('animoria.deleteAsset', {
      path: '/w/second/img/logo.png',
      id: 'asset-9',
    });

    expect(daemon.trashAsset).not.toHaveBeenCalled();
  });
});
