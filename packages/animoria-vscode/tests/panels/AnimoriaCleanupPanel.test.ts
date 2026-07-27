import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnimoriaAsset } from '@animoria/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnimoriaCleanupPanel } from '../../src/panels/AnimoriaCleanupPanel.js';
import { resetTestWorkspace, vscodeMock } from '../harness.js';
import { createMockExtensionContext } from '../mocks/vscode.js';
import { buildSnapshot, createFakeWorkspaceIndexer } from '../support/fakes.js';

type FakeWebview = ReturnType<(typeof vscodeMock.window)['createWebviewPanel']>['webview'];

/**
 * Regresses the stale-state bug reported after a Bulk Cleanup run: the
 * tree view, governance report, and the Cleanup Review panel itself kept
 * showing a just-removed asset until something else (a manual "Run
 * Governance", or waiting out the raw filesystem watcher's debounce)
 * eventually caught up. Root cause: unlike `AnimoriaDuplicateResolver`,
 * `AnimoriaCleanupPanel` never told the reactive indexer a deletion had
 * happened, so nothing downstream re-converged until the indexer noticed
 * on its own. These tests prove the panel now nudges the indexer
 * immediately, through the real message pipeline.
 */
describe('AnimoriaCleanupPanel reactive-index nudge after execute', () => {
  let workspaceDir: string;
  let originalCreateWebviewPanel: typeof vscodeMock.window.createWebviewPanel;

  beforeEach(() => {
    resetTestWorkspace();
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-cleanuppanel-'));
    originalCreateWebviewPanel = vscodeMock.window.createWebviewPanel;
  });

  afterEach(() => {
    AnimoriaCleanupPanel.currentPanel = undefined;
    vscodeMock.window.createWebviewPanel = originalCreateWebviewPanel;
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  function orphanedAsset(name: string): AnimoriaAsset {
    const path = join(workspaceDir, name);
    writeFileSync(path, '{}');
    return {
      path,
      name,
      stem: name.replace(/\.[^.]+$/, ''),
      format: 'lottie',
      sizeBytes: 2,
      mtime: Date.now(),
      status: 'parsed',
    };
  }

  async function renderAndCaptureWebview(): Promise<{
    webview: FakeWebview;
    notified: { path: string; kind: string }[];
  }> {
    const asset = orphanedAsset('orphan.json');
    const snapshot = buildSnapshot({
      assets: [asset],
      referenceCounts: new Map([[asset.path, 0]]),
    });
    const { indexer, notified } = createFakeWorkspaceIndexer(workspaceDir, snapshot);
    const context = createMockExtensionContext();

    let webview: FakeWebview | undefined;
    vscodeMock.window.createWebviewPanel = ((
      ...args: Parameters<typeof originalCreateWebviewPanel>
    ) => {
      const panel = originalCreateWebviewPanel(...args);
      webview = panel.webview;
      return panel;
    }) as typeof originalCreateWebviewPanel;

    await AnimoriaCleanupPanel.render(context, indexer);
    if (!webview) throw new Error('render() did not create a webview panel');
    return { webview, notified };
  }

  function awaitMessage(
    webview: FakeWebview,
    types: string[]
  ): Promise<{ type: string; payload?: unknown }> {
    return new Promise((resolve) => {
      const originalPost = webview.postMessage.bind(webview);
      webview.postMessage = (async (message: { type: string; payload?: unknown }) => {
        const result = await originalPost(message);
        if (types.includes(message.type)) resolve(message);
        return result;
      }) as typeof webview.postMessage;
    });
  }

  it('notifies the indexer of the removed asset immediately after a successful execute', async () => {
    const { webview, notified } = await renderAndCaptureWebview();

    webview.simulateMessageFromWebview({ type: 'select-all' });
    const summary = awaitMessage(webview, ['summary-ready']);
    webview.simulateMessageFromWebview({ type: 'execute' });
    await summary;

    const deletionNotices = notified.filter((n) => n.kind === 'deleted');
    expect(deletionNotices).toHaveLength(1);
  });

  it('does not notify the indexer when execute fails validation', async () => {
    const { webview, notified } = await renderAndCaptureWebview();

    // Never select anything for removal — execute() rejects with
    // "nothing selected", so no path should ever have been reported to
    // the indexer as deleted.
    const failure = awaitMessage(webview, ['execute-error']);
    webview.simulateMessageFromWebview({ type: 'execute' });
    await failure;

    expect(notified.filter((n) => n.kind === 'deleted')).toHaveLength(0);
  });
});
