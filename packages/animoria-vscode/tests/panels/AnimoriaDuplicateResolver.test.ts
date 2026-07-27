import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnimoriaAsset, DuplicateCandidate, DuplicateGroup } from '@animoria/core';
import { hashAssetContent } from '@animoria/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnimoriaDuplicateResolver } from '../../src/panels/AnimoriaDuplicateResolver.js';
import { resetTestWorkspace, vscodeMock } from '../harness.js';
import { buildSnapshot, createFakeWorkspaceIndexer } from '../support/fakes.js';

type FakeWebview = ReturnType<(typeof vscodeMock.window)['createWebviewPanel']>['webview'];

/**
 * Exercises the complete apply workflow — `ready` → automatic canonical
 * selection → plan preview → `confirm` — end to end against real files on
 * disk, because the safety guarantee under test
 * (`validateResolutionPlan`, from `@animoria/core`) itself reads real
 * files and content hashes. Mocking that away would test this module's
 * trust in a validator rather than the validator actually catching drift,
 * which is the behavior these tests exist to prove.
 *
 * Every "stale plan" scenario mutates the filesystem *after* the plan has
 * already been built and previewed (mirroring a plan sitting on a
 * developer's screen while something else changes underneath it), then
 * asserts `vscode.workspace.applyEdit` was never called — proving
 * re-validation happens at confirm time, not plan-build time.
 *
 * Only the panel's public surface — messages sent to and received from
 * the webview via `vscode.window.createWebviewPanel`'s mock — is
 * observed. Nothing here reaches into the resolver's private state.
 */
describe('AnimoriaDuplicateResolver apply workflow', () => {
  let workspaceDir: string;
  let applyEditCalls: unknown[];
  let originalApplyEdit: typeof vscodeMock.workspace.applyEdit;
  let originalCreateWebviewPanel: typeof vscodeMock.window.createWebviewPanel;

  beforeEach(() => {
    resetTestWorkspace();
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-dupresolve-'));
    applyEditCalls = [];
    originalApplyEdit = vscodeMock.workspace.applyEdit;
    vscodeMock.workspace.applyEdit = async (edit) => {
      applyEditCalls.push(edit);
      return originalApplyEdit(edit);
    };
    originalCreateWebviewPanel = vscodeMock.window.createWebviewPanel;
  });

  afterEach(() => {
    vscodeMock.workspace.applyEdit = originalApplyEdit;
    vscodeMock.window.createWebviewPanel = originalCreateWebviewPanel;
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

  async function buildGroup(
    canonical: AnimoriaAsset,
    duplicate: AnimoriaAsset
  ): Promise<DuplicateGroup> {
    const id = await hashAssetContent(canonical);
    const candidates: DuplicateCandidate[] = [
      { asset: canonical, referenceCount: 0 },
      { asset: duplicate, referenceCount: 0 },
    ];
    return {
      id,
      candidates,
      sizeBytes: canonical.sizeBytes,
      potentialSavingsBytes: duplicate.sizeBytes,
    };
  }

  /** Resolves the next time the webview posts a message matching one of `types`. */
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

  /**
   * Renders the panel and returns the webview it created, captured purely
   * by observing `vscode.window.createWebviewPanel`'s mock — no private
   * field on the resolver is touched. `render()` creates the panel
   * synchronously, so `webview` is assigned before this function returns.
   */
  async function openAndAwaitPlan(group: DuplicateGroup): Promise<FakeWebview> {
    let webview: FakeWebview | undefined;
    vscodeMock.window.createWebviewPanel = ((
      ...args: Parameters<typeof originalCreateWebviewPanel>
    ) => {
      const panel = originalCreateWebviewPanel(...args);
      webview = panel.webview;
      return panel;
    }) as typeof originalCreateWebviewPanel;

    const { indexer } = createFakeWorkspaceIndexer(workspaceDir, buildSnapshot());
    AnimoriaDuplicateResolver.render(workspaceDir, group, indexer);
    if (!webview) throw new Error('render() did not create a webview panel');

    const plan = awaitMessage(webview, ['plan-ready', 'plan-error']);
    webview.simulateMessageFromWebview({ type: 'ready' });
    await plan;
    return webview;
  }

  it('applies the resolution exactly once on the happy path: canonical kept, duplicate deleted', async () => {
    const canonical = writeAsset('canonical.json', '{"v":"same"}');
    const duplicate = writeAsset('duplicate.json', '{"v":"same"}');
    const group = await buildGroup(canonical, duplicate);

    const webview = await openAndAwaitPlan(group);
    const outcome = awaitMessage(webview, [
      'resolution-complete',
      'validation-failed',
      'execution-failed',
    ]);
    webview.simulateMessageFromWebview({ type: 'confirm' });

    expect((await outcome).type).toBe('resolution-complete');
    expect(applyEditCalls).toHaveLength(1);
    const edit = applyEditCalls[0] as { fileDeletions: { fsPath: string }[] };
    expect(edit.fileDeletions.map((d) => d.fsPath)).toEqual([duplicate.path]);
  });

  it('rejects a plan whose duplicate asset was deleted after the plan was built, and never calls applyEdit', async () => {
    const canonical = writeAsset('canonical.json', '{"v":"same"}');
    const duplicate = writeAsset('duplicate.json', '{"v":"same"}');
    const group = await buildGroup(canonical, duplicate);

    const webview = await openAndAwaitPlan(group);
    rmSync(duplicate.path); // drift: deleted after the plan preview was already shown

    const outcome = awaitMessage(webview, [
      'resolution-complete',
      'validation-failed',
      'execution-failed',
    ]);
    webview.simulateMessageFromWebview({ type: 'confirm' });

    expect((await outcome).type).toBe('validation-failed');
    expect(applyEditCalls).toHaveLength(0);
  });

  it('rejects a plan whose duplicate asset content changed after the plan was built, and never calls applyEdit', async () => {
    const canonical = writeAsset('canonical.json', '{"v":"same"}');
    const duplicate = writeAsset('duplicate.json', '{"v":"same"}');
    const group = await buildGroup(canonical, duplicate);

    const webview = await openAndAwaitPlan(group);
    writeFileSync(duplicate.path, '{"v":"changed-since-plan"}'); // no longer content-identical

    const outcome = awaitMessage(webview, [
      'resolution-complete',
      'validation-failed',
      'execution-failed',
    ]);
    webview.simulateMessageFromWebview({ type: 'confirm' });

    expect((await outcome).type).toBe('validation-failed');
    expect(applyEditCalls).toHaveLength(0);
  });

  it('rejects a plan whose referencing source line changed after the plan was built, and never calls applyEdit', async () => {
    const canonical = writeAsset('canonical.json', '{"v":"same"}');
    const duplicate = writeAsset('duplicate.json', '{"v":"same"}');
    const srcDir = join(workspaceDir, 'src');
    mkdirSync(srcDir);
    const referencingFile = join(srcDir, 'App.ts');
    writeFileSync(referencingFile, `const anim = './duplicate.json';\n`);

    const group = await buildGroup(canonical, duplicate);
    const webview = await openAndAwaitPlan(group);

    // A reference update was expected to land on this exact line; edit it
    // out from under the already-built plan.
    writeFileSync(referencingFile, `const anim = 'unrelated-changed-line';\n`);

    const outcome = awaitMessage(webview, [
      'resolution-complete',
      'validation-failed',
      'execution-failed',
    ]);
    webview.simulateMessageFromWebview({ type: 'confirm' });

    expect((await outcome).type).toBe('validation-failed');
    expect(applyEditCalls).toHaveLength(0);
  });

  it('applies the most recently selected canonical, not a stale earlier selection', async () => {
    const canonicalA = writeAsset('a.json', '{"v":"same"}');
    const canonicalB = writeAsset('b.json', '{"v":"same"}');
    const group = await buildGroup(canonicalA, canonicalB);

    const webview = await openAndAwaitPlan(group); // auto-selects a suggested canonical

    const secondPlan = awaitMessage(webview, ['plan-ready', 'plan-error']);
    webview.simulateMessageFromWebview({
      type: 'select-canonical',
      payload: { assetPath: canonicalB.path },
    });
    await secondPlan;

    const outcome = awaitMessage(webview, [
      'resolution-complete',
      'validation-failed',
      'execution-failed',
    ]);
    webview.simulateMessageFromWebview({ type: 'confirm' });

    expect((await outcome).type).toBe('resolution-complete');
    expect(applyEditCalls).toHaveLength(1);
    const edit = applyEditCalls[0] as { fileDeletions: { fsPath: string }[] };
    // canonicalB was kept last, so canonicalA (not B) must be the one deleted.
    expect(edit.fileDeletions.map((d) => d.fsPath)).toEqual([canonicalA.path]);
  });
});
