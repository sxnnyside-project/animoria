import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MultiRootAnalysis, WorkspaceAnalysis, WorkspaceSession } from '@animoria/core';
import type { HostInbound } from '@animoria/ui/bridge';
import { afterEach, describe, expect, it } from 'vitest';
import { VsCodeHostBridge } from '../../src/panels/VsCodeHostBridge.js';
import { resetTestWorkspace } from '../harness.js';

/**
 * The preview a developer actually gets.
 *
 * ## The regression
 * `AnimoriaPreviewPanel` was the product's centre: playback, a frame scrubber, speed,
 * a background you could change to see a white asset. The shared-UI migration replaced
 * it with a still frame and a caption saying playback happens in the editor — the
 * contract's `data: unknown` field was never filled by any host, so there was nothing
 * to play even in principle.
 *
 * ## What these assert
 * That the *host puts a playable document on the wire*. Whether the scrubber moves is
 * the component's business; whether there is anything for it to scrub is this
 * bridge's, and that is where the capability was lost. A test that mocked the payload
 * would have passed throughout the regression.
 */

const roots: string[] = [];

const LOTTIE = JSON.stringify({
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [{ ty: 4, nm: 'shape' }],
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'animoria-preview-'));
  roots.push(root);
  mkdirSync(join(root, 'assets'), { recursive: true });
  return root;
}

function analysisStub(assets: WorkspaceAnalysis['assets']): WorkspaceAnalysis {
  return {
    workspacePath: '/workspace',
    generatedAt: new Date().toISOString(),
    generation: 1,
    durationMs: 1,
    readiness: {
      assetsIndexed: true,
      referencesResolved: true,
      duplicatesResolved: true,
      complete: true,
    },
    assets,
    coverage: null,
    referenceCounts: new Map(),
    referenceIndex: null,
    diagnostics: [],
    evaluatedRuleIds: [],
    skippedRules: [],
    configErrors: [],
    duplicateGroups: [],
    health: { status: 'unavailable', reason: 'no-assets', message: 'No assets.' },
    freshness: 'current',
    failure: null,
  } as WorkspaceAnalysis;
}

function makeBridge(assets: WorkspaceAnalysis['assets']) {
  const posted: HostInbound[] = [];
  const perRoot = analysisStub(assets);
  const root = { id: 'r1', name: 'workspace', path: '/workspace' };
  const analysis = {
    workspace: { id: 'ws1', name: 'workspace', isSingleRoot: true, roots: [root] },
    roots: [{ root, analysis: perRoot }],
    assets: assets.map((asset) => ({ rootId: root.id, rootName: root.name, asset })),
    diagnostics: [],
    duplicateGroups: [],
    readiness: perRoot.readiness,
    lifecycle: { state: 'ready', summary: 'Ready' },
    totalDurationMs: 1,
  } as unknown as MultiRootAnalysis;

  const session = {
    getAnalysis: () => analysis,
    identity: { roots: [root], isSingleRoot: true },
    roots: [root],
    indexerForRoot: () => ({ getAnalysis: () => perRoot, usageReferencesFor: () => [] }),
    indexerForPath: () => ({ root, indexer: { usageReferencesFor: () => [] } }),
    notifyFileChanged: () => {},
  } as unknown as WorkspaceSession;

  const bridge = new VsCodeHostBridge({
    session: () => session,
    post: (message) => posted.push(message),
  });

  return { bridge, posted };
}

afterEach(() => {
  resetTestWorkspace();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('preview — a Lottie arrives playable, not as a picture', () => {
  it('sends the animation document, its frame count and its rate', async () => {
    const root = workspace();
    const path = join(root, 'assets', 'hero.json');
    writeFileSync(path, LOTTIE);

    const { bridge, posted } = makeBridge([
      { path, name: 'hero.json', stem: 'hero', format: 'lottie', sizeBytes: LOTTIE.length },
    ] as unknown as WorkspaceAnalysis['assets']);

    await bridge.handle({ type: 'request-animation-data', assetPath: path });

    const answer = posted.find((message) => message.type === 'animation-data');
    expect(answer, 'a preview request must always be answered').toBeDefined();
    if (answer?.type !== 'animation-data') throw new Error('unreachable');

    // The whole point: a document, not a rendered frame. A still cannot be paused,
    // scrubbed or slowed down, and those were the controls the panel existed for.
    expect(answer.preview?.kind).toBe('lottie');
    if (answer.preview?.kind !== 'lottie') throw new Error('unreachable');

    expect(answer.preview.animation, 'the player needs the document itself').toBeTruthy();
    // 60 out-point minus 0 in-point. The scrubber's range comes from here, so a wrong
    // number is a scrubber that stops early or never reaches the end.
    expect(answer.preview.totalFrames).toBe(60);
    expect(answer.preview.frameRate).toBe(30);
  });

  it('falls back to a still, with a reason, when the document cannot be read', async () => {
    // A malformed file is not an error state — Core still rendered a frame for it, and
    // that frame is a better answer than a failure message. But the developer is told
    // why they cannot scrub it.
    const root = workspace();
    const path = join(root, 'assets', 'broken.json');
    writeFileSync(path, '{ not json');
    const thumbnail = join(root, 'assets', 'broken.webp');
    writeFileSync(thumbnail, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const { bridge, posted } = makeBridge([
      {
        path,
        name: 'broken.json',
        stem: 'broken',
        format: 'lottie',
        sizeBytes: 10,
        thumbnailPath: thumbnail,
      },
    ] as unknown as WorkspaceAnalysis['assets']);

    await bridge.handle({ type: 'request-animation-data', assetPath: path });

    const answer = posted.find((message) => message.type === 'animation-data');
    if (answer?.type !== 'animation-data') throw new Error('unreachable');
    expect(answer.preview?.kind).toBe('still');
    if (answer.preview?.kind !== 'still') throw new Error('unreachable');
    expect(answer.preview.reason.length, 'a fallback must say why').toBeGreaterThan(0);
  });

  it('serves a GIF as bytes the browser animates itself', async () => {
    const root = workspace();
    const path = join(root, 'assets', 'loader.gif');
    writeFileSync(path, Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    const { bridge, posted } = makeBridge([
      { path, name: 'loader.gif', stem: 'loader', format: 'gif', sizeBytes: 6 },
    ] as unknown as WorkspaceAnalysis['assets']);

    await bridge.handle({ type: 'request-animation-data', assetPath: path });

    const answer = posted.find((message) => message.type === 'animation-data');
    if (answer?.type !== 'animation-data') throw new Error('unreachable');
    expect(answer.preview?.kind).toBe('image');
    if (answer.preview?.kind !== 'image') throw new Error('unreachable');
    // A `data:` URI, never a filesystem path — a webview cannot read one, and every
    // host that sent one rendered a broken image.
    expect(answer.preview.source.startsWith('data:image/gif')).toBe(true);
    expect(answer.preview.animates).toBe(true);
  });

  it('says so, rather than failing, when there is nothing to show', async () => {
    const root = workspace();
    const path = join(root, 'assets', 'gone.riv');

    const { bridge, posted } = makeBridge([
      { path, name: 'gone.riv', stem: 'gone', format: 'rive', sizeBytes: 4 },
    ] as unknown as WorkspaceAnalysis['assets']);

    await bridge.handle({ type: 'request-animation-data', assetPath: path });

    const answer = posted.find((message) => message.type === 'animation-data');
    if (answer?.type !== 'animation-data') throw new Error('unreachable');
    expect(answer.preview?.kind).toBe('unsupported');
  });
});
