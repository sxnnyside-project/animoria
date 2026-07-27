import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnimoriaAsset } from '@animoria/core';
import { Animoria } from '@animoria/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimoriaPreviewPanel } from '../../src/panels/AnimoriaPreviewPanel.js';
import { resetTestWorkspace, vscodeMock } from '../harness.js';
import { createMockExtensionContext } from '../mocks/vscode.js';

type FakeWebview = ReturnType<(typeof vscodeMock.window)['createWebviewPanel']>['webview'];

/**
 * Regresses the stale-`postMessage` race: rendering a new asset before a
 * prior render's async work (the 300ms debounce timer, `getAnimationData`,
 * the usage scan) has finished must guarantee the prior render can never
 * reach the webview, regardless of how far its async work had already
 * progressed. Every test here observes only `postMessage` traffic — the
 * panel's public API (`update`, `dispose`) is the only surface touched,
 * matching TASK-H1.1/H1.2's "behavior, not implementation" convention.
 *
 * `vi.useFakeTimers()` drives the panel's internal 300ms debounce
 * deterministically; asset content is read from real temp files, since
 * `Animoria.getAnimationData` performs a real `fs.readFile` untouched by
 * the timer mock.
 */
describe('AnimoriaPreviewPanel render race', () => {
  let workspaceDir: string;
  let originalCreateWebviewPanel: typeof vscodeMock.window.createWebviewPanel;

  beforeEach(() => {
    resetTestWorkspace();
    vi.useFakeTimers();
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-preview-'));
    originalCreateWebviewPanel = vscodeMock.window.createWebviewPanel;
    // `currentPanel` is a module-level singleton on the class itself —
    // each test must start with none active, or `render()` will route
    // into its "update the existing panel" branch instead of creating a
    // fresh one, and never call `createWebviewPanel` at all.
    AnimoriaPreviewPanel.currentPanel = undefined;
  });

  afterEach(() => {
    AnimoriaPreviewPanel.currentPanel?.dispose();
    vscodeMock.window.createWebviewPanel = originalCreateWebviewPanel;
    vi.useRealTimers();
    vi.restoreAllMocks();
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  function writeAsset(name: string, content: string): AnimoriaAsset {
    const path = join(workspaceDir, name);
    writeFileSync(path, content);
    return {
      path,
      name,
      stem: name.replace(/\.[^.]+$/, ''),
      format: 'lottie',
      sizeBytes: Buffer.byteLength(content),
      mtime: Date.now(),
      status: 'parsed',
    };
  }

  /**
   * Renders the panel and returns the webview it created, captured purely
   * by observing `vscode.window.createWebviewPanel`'s mock. `render()`
   * creates the panel synchronously, so the webview is assigned before
   * this function returns.
   */
  function renderAndCaptureWebview(
    context: ReturnType<typeof createMockExtensionContext>,
    asset: AnimoriaAsset
  ): FakeWebview {
    let webview: FakeWebview | undefined;
    vscodeMock.window.createWebviewPanel = ((
      ...args: Parameters<typeof originalCreateWebviewPanel>
    ) => {
      const panel = originalCreateWebviewPanel(...args);
      webview = panel.webview;
      return panel;
    }) as typeof originalCreateWebviewPanel;

    AnimoriaPreviewPanel.render(context, asset);
    if (!webview) throw new Error('render() did not create a webview panel');
    return webview;
  }

  function loadAssetMessages(webview: FakeWebview): { type: string; payload?: unknown }[] {
    return (webview.sentMessages as { type: string; payload?: unknown }[]).filter(
      (m) => m.type === 'load-asset' || m.type === 'load-error'
    );
  }

  it('reaches postMessage with only the final asset when three renders happen before the debounce fires', async () => {
    const a = writeAsset('a.json', '{"id":"a"}');
    const b = writeAsset('b.json', '{"id":"b"}');
    const c = writeAsset('c.json', '{"id":"c"}');
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context, a);

    AnimoriaPreviewPanel.currentPanel!.update(b);
    AnimoriaPreviewPanel.currentPanel!.update(c);

    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(loadAssetMessages(webview).length).toBeGreaterThan(0));

    const messages = loadAssetMessages(webview);
    expect(messages).toHaveLength(1);
    expect((messages[0]!.payload as { asset: AnimoriaAsset }).asset.path).toBe(c.path);
  });

  it('discards a superseded render even when its own debounce timer had already fired', async () => {
    const a = writeAsset('a.json', '{"id":"a"}');
    const b = writeAsset('b.json', '{"id":"b"}');
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context, a);

    await vi.advanceTimersByTimeAsync(300); // a's timer fires; getAnimationData(a) is now in flight

    AnimoriaPreviewPanel.currentPanel!.update(b);
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(loadAssetMessages(webview).length).toBeGreaterThan(0));

    const messages = loadAssetMessages(webview);
    expect(messages).toHaveLength(1);
    expect((messages[0]!.payload as { asset: AnimoriaAsset }).asset.path).toBe(b.path);
  });

  it('regression: discards the earlier render even when its async work resolves after the later render (true out-of-order completion)', async () => {
    // This is the exact failure mode the pre-fix implementation had: every
    // async continuation read `this._asset`/called `this._panel.postMessage`
    // directly, with nothing distinguishing "a render this panel has moved
    // on from" from "the current render" — so whichever chain happened to
    // resolve last won, regardless of which request was actually current.
    // Resolving `b` (the later, current request) before `a` (the
    // superseded one) reproduces that exact ordering; the final assertion
    // is the one that fails without the generation guard.
    const a = writeAsset('a.json', '{"id":"a"}');
    const b = writeAsset('b.json', '{"id":"b"}');
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context, a);

    const deferred = new Map<string, { resolve: (v: unknown) => void }>();
    const spy = vi.spyOn(Animoria.prototype, 'getAnimationData').mockImplementation((asset) => {
      return new Promise((resolve) => {
        deferred.set(asset.path, { resolve });
      });
    });

    await vi.advanceTimersByTimeAsync(300); // a's getAnimationData is now pending, controlled by `deferred`

    AnimoriaPreviewPanel.currentPanel!.update(b);
    await vi.advanceTimersByTimeAsync(300); // b's getAnimationData is now also pending

    deferred.get(b.path)!.resolve({ id: 'b' }); // the current request finishes first
    await vi.waitFor(() => expect(loadAssetMessages(webview).length).toBe(1));
    deferred.get(a.path)!.resolve({ id: 'a' }); // the stale request finishes last, "winning" the race timing-wise
    await Promise.resolve();
    await Promise.resolve();

    const messages = loadAssetMessages(webview);
    expect(messages).toHaveLength(1); // pre-fix: this would be 2 — a's late arrival overwrote b's
    expect((messages[0]!.payload as { asset: AnimoriaAsset }).asset.path).toBe(b.path);
    spy.mockRestore();
  });

  it('never posts to a panel disposed while a render is still pending', async () => {
    const a = writeAsset('a.json', '{"id":"a"}');
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context, a);

    AnimoriaPreviewPanel.currentPanel!.dispose();

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    expect(webview.sentMessages).toHaveLength(0);
  });

  it("cancels a superseded render's pending timer outright rather than merely racing it", async () => {
    const a = writeAsset('a.json', '{"id":"a"}');
    const b = writeAsset('b.json', '{"id":"b"}');
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context, a);
    const spy = vi.spyOn(Animoria.prototype, 'getAnimationData');

    AnimoriaPreviewPanel.currentPanel!.update(b); // supersedes a before a's 300ms elapses

    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(loadAssetMessages(webview).length).toBeGreaterThan(0));

    // a's debounce timer was cancelled, not merely raced — getAnimationData
    // was invoked exactly once, for b, never for a.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ path: b.path }));
  });

  it('does not re-render or duplicate postMessage traffic when the same asset is selected again', async () => {
    const a = writeAsset('a.json', '{"id":"a"}');
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context, a);

    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(loadAssetMessages(webview).length).toBe(1));

    AnimoriaPreviewPanel.render(context, a); // same asset, second selection
    await vi.advanceTimersByTimeAsync(300);
    await Promise.resolve();

    expect(loadAssetMessages(webview)).toHaveLength(1);
  });
});
