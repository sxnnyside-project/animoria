import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnimoriaStaticAsset } from '@animoria/core';
import { getLogger, setLogger } from '@animoria/core';
import type { LogContext, LogLevel, Logger } from '@animoria/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnimoriaPreviewPanel } from '../../src/panels/AnimoriaPreviewPanel.js';
import { resetTestWorkspace, vscodeMock } from '../harness.js';
import { createMockExtensionContext } from '../mocks/vscode.js';

type FakeWebview = ReturnType<(typeof vscodeMock.window)['createWebviewPanel']>['webview'];

class RecordingLogger implements Logger {
  readonly entries: { level: LogLevel; context: LogContext }[] = [];
  log(level: LogLevel, context: LogContext): void {
    this.entries.push({ level, context });
  }
}

/**
 * Exercises `AnimoriaPreviewPanel`'s real inbound message pipeline —
 * `webview.onDidReceiveMessage` → `_handleMessage` →
 * `validateInboundMessage` — end to end, observing only what a real
 * webview message would produce: clipboard writes, status-bar messages,
 * outbound `postMessage` calls, and diagnostic log entries. Nothing here
 * calls `validateInboundMessage` directly (see
 * `preview-panel-messages.test.ts` for the contract's own unit tests) —
 * this file proves the panel is actually wired through it.
 */
describe('AnimoriaPreviewPanel inbound message validation', () => {
  let workspaceDir: string;
  let originalCreateWebviewPanel: typeof vscodeMock.window.createWebviewPanel;
  let originalLogger: Logger;
  let recorder: RecordingLogger;

  beforeEach(() => {
    resetTestWorkspace();
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-preview-messages-'));
    originalCreateWebviewPanel = vscodeMock.window.createWebviewPanel;
    AnimoriaPreviewPanel.currentPanel = undefined;
    originalLogger = getLogger();
    recorder = new RecordingLogger();
    setLogger(recorder);
  });

  afterEach(() => {
    AnimoriaPreviewPanel.currentPanel?.dispose();
    vscodeMock.window.createWebviewPanel = originalCreateWebviewPanel;
    setLogger(originalLogger);
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  function staticAsset(): AnimoriaStaticAsset {
    const name = 'icon.png';
    const path = join(workspaceDir, name);
    writeFileSync(path, 'fake-png-bytes');
    return { path, name, stem: 'icon', format: 'png', sizeBytes: 14, mtime: Date.now() };
  }

  function renderAndCaptureWebview(
    context: ReturnType<typeof createMockExtensionContext>
  ): FakeWebview {
    let webview: FakeWebview | undefined;
    vscodeMock.window.createWebviewPanel = ((
      ...args: Parameters<typeof originalCreateWebviewPanel>
    ) => {
      const panel = originalCreateWebviewPanel(...args);
      webview = panel.webview;
      return panel;
    }) as typeof originalCreateWebviewPanel;

    AnimoriaPreviewPanel.render(context, staticAsset());
    if (!webview) throw new Error('render() did not create a webview panel');
    return webview;
  }

  it('accepts a valid copy-path message and copies the asset path, exactly as before validation was added', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);

    webview.simulateMessageFromWebview({ type: 'copy-path' });

    expect(vscodeMock.env.clipboard._lastWrite).toContain('icon.png');
  });

  it('accepts a valid get-integrations message and posts integrations-ready for an animated asset', () => {
    const context = createMockExtensionContext();
    let webview: FakeWebview | undefined;
    vscodeMock.window.createWebviewPanel = ((
      ...args: Parameters<typeof originalCreateWebviewPanel>
    ) => {
      const panel = originalCreateWebviewPanel(...args);
      webview = panel.webview;
      return panel;
    }) as typeof originalCreateWebviewPanel;
    const animatedPath = join(workspaceDir, 'anim.json');
    writeFileSync(animatedPath, '{"v":1,"layers":[]}');
    AnimoriaPreviewPanel.render(context, {
      path: animatedPath,
      name: 'anim.json',
      stem: 'anim',
      format: 'lottie',
      sizeBytes: 20,
      mtime: Date.now(),
      status: 'parsed',
    });
    if (!webview) throw new Error('render() did not create a webview panel');

    webview.simulateMessageFromWebview({ type: 'get-integrations' });

    const posted = (webview.sentMessages as { type: string }[]).filter(
      (m) => m.type === 'integrations-ready'
    );
    expect(posted).toHaveLength(1);
  });

  it('includes Swift and Kotlin as first-class results, not "Coming soon" stubs, for a lottie asset', () => {
    const context = createMockExtensionContext();
    let webview: FakeWebview | undefined;
    vscodeMock.window.createWebviewPanel = ((
      ...args: Parameters<typeof originalCreateWebviewPanel>
    ) => {
      const panel = originalCreateWebviewPanel(...args);
      webview = panel.webview;
      return panel;
    }) as typeof originalCreateWebviewPanel;
    const animatedPath = join(workspaceDir, 'anim.json');
    writeFileSync(animatedPath, '{"v":1,"layers":[]}');
    AnimoriaPreviewPanel.render(context, {
      path: animatedPath,
      name: 'anim.json',
      stem: 'anim',
      format: 'lottie',
      sizeBytes: 20,
      mtime: Date.now(),
      status: 'parsed',
    });
    if (!webview) throw new Error('render() did not create a webview panel');

    webview.simulateMessageFromWebview({ type: 'get-integrations' });

    const posted = (
      webview.sentMessages as {
        type: string;
        payload?: { results: { providerId: string }[]; stubs: { id: string }[] };
      }[]
    ).find((m) => m.type === 'integrations-ready');

    const resultIds = posted?.payload?.results.map((r) => r.providerId) ?? [];
    expect(resultIds).toContain('swift');
    expect(resultIds).toContain('kotlin');
    expect(posted?.payload?.stubs.map((s) => s.id) ?? []).not.toContain('swift');
    expect(posted?.payload?.stubs.map((s) => s.id) ?? []).not.toContain('kotlin');
  });

  it('ignores an unknown message type, never throws, and logs a diagnostic', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);

    expect(() => webview.simulateMessageFromWebview({ type: 'delete-everything' })).not.toThrow();

    const warning = recorder.entries.find(
      (e) => e.level === 'warn' && e.context.operation === 'preview-render'
    );
    expect(warning).toBeDefined();
    expect(warning?.context.reason).toContain('unrecognized message type');
  });

  it('ignores a non-object message and logs a diagnostic instead of throwing', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);

    expect(() => webview.simulateMessageFromWebview('just a plain string')).not.toThrow();
    expect(() => webview.simulateMessageFromWebview(null)).not.toThrow();

    const warnings = recorder.entries.filter((e) => e.level === 'warn');
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects save-preferences with a missing required field and never persists it to workspaceState', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);
    let updateCalled = false;
    const originalUpdate = context.workspaceState.update;
    context.workspaceState.update = async (key, value) => {
      updateCalled = true;
      return originalUpdate(key, value);
    };

    webview.simulateMessageFromWebview({
      type: 'save-preferences',
      payload: { bg: 'dark' }, // missing required `speed`
    });

    expect(updateCalled).toBe(false);
    const warning = recorder.entries.find((e) => e.context.reason?.includes('save-preferences'));
    expect(warning).toBeDefined();
  });

  it('rejects save-preferences with a wrong-typed field and never persists it', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);
    let updateCalled = false;
    const originalUpdate = context.workspaceState.update;
    context.workspaceState.update = async (key, value) => {
      updateCalled = true;
      return originalUpdate(key, value);
    };

    webview.simulateMessageFromWebview({
      type: 'save-preferences',
      payload: { speed: 'fast', bg: 'dark' }, // speed must be a number
    });

    expect(updateCalled).toBe(false);
  });

  it('accepts a valid save-preferences message and persists it, exactly as before validation was added', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);

    webview.simulateMessageFromWebview({
      type: 'save-preferences',
      payload: { speed: 2, bg: 'light', customHex: '#ffffff' },
    });

    expect(context.workspaceState.get('animoria.previewPreferences')).toEqual({
      speed: 2,
      bg: 'light',
      customHex: '#ffffff',
    });
  });

  it('rejects open-usage-file with an invalid line number and never opens a document', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);
    let showTextDocumentCalled = false;
    const originalShow = vscodeMock.window.showTextDocument;
    vscodeMock.window.showTextDocument = (async (...args: unknown[]) => {
      showTextDocumentCalled = true;
      return (originalShow as (...a: unknown[]) => unknown)(...args);
    }) as typeof vscodeMock.window.showTextDocument;

    webview.simulateMessageFromWebview({
      type: 'open-usage-file',
      payload: { file: '/workspace/src/App.tsx', line: 'twelve' },
    });

    expect(showTextDocumentCalled).toBe(false);
    vscodeMock.window.showTextDocument = originalShow;
  });

  it('rejects a payload-carrying message sent with no payload at all', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);

    expect(() => webview.simulateMessageFromWebview({ type: 'copy-integration' })).not.toThrow();
    expect(vscodeMock.env.clipboard._lastWrite).not.toBe('should never be set');

    const warning = recorder.entries.find((e) => e.context.reason?.includes('copy-integration'));
    expect(warning).toBeDefined();
  });

  it('does not emit a diagnostic for a valid message', () => {
    const context = createMockExtensionContext();
    const webview = renderAndCaptureWebview(context);

    webview.simulateMessageFromWebview({ type: 'copy-stem' });

    const relevantWarnings = recorder.entries.filter(
      (e) => e.context.operation === 'preview-render'
    );
    expect(relevantWarnings).toHaveLength(0);
  });
});
