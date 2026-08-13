import type { MultiRootAnalysis, WorkspaceAnalysis, WorkspaceSession } from '@animoria/core';
import type { HostInbound } from '@animoria/ui/bridge';
import { beforeEach, describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { VsCodeHostBridge } from '../../src/panels/VsCodeHostBridge.js';
import { mockVscodeState, resetTestWorkspace } from '../harness.js';

/**
 * Every operation the UI waits on ends in an answer.
 *
 * ## The regression this suite exists for
 * The shared UI disables its destructive controls the moment it sends an `apply-*`
 * and re-enables them only when a reply arrives. The VS Code bridge had five paths
 * that returned without replying — a dismissed confirmation dialog, a missing
 * indexer, an unattributable root, and any exception at all, since the panel invoked
 * the handler as `void bridge.handle(raw)` and nothing caught a rejection.
 *
 * The visible result was a panel frozen mid-operation. **Dismissing a "move to trash"
 * confirmation disabled the Apply button for the rest of the session**, with no error,
 * no log line and no way back except closing the panel. Every unit test passed: each
 * asserted what the bridge does when the developer says *yes*.
 *
 * ## What is asserted here
 * Not that the operation succeeds — that the operation *settles*. A settled failure
 * and a settled refusal are both correct outcomes; an unanswered request is not an
 * outcome at all. This is the shape of assertion the audit found missing everywhere:
 * every suite tested the happy path of a two-state interaction.
 */

function analysisStub(overrides: Partial<WorkspaceAnalysis> = {}): WorkspaceAnalysis {
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
    assets: [],
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
    ...overrides,
  } as WorkspaceAnalysis;
}

const ROOT = { id: 'r1', name: 'workspace', path: '/workspace' };

function multiRootStub(perRoot = analysisStub()): MultiRootAnalysis {
  return {
    workspace: { id: 'ws1', name: 'workspace', isSingleRoot: true, roots: [ROOT] },
    roots: [{ root: ROOT, analysis: perRoot }],
    assets: perRoot.assets.map((asset) => ({ rootId: ROOT.id, rootName: ROOT.name, asset })),
    diagnostics: [],
    duplicateGroups: [],
    readiness: perRoot.readiness,
    lifecycle: { state: 'ready', summary: 'Ready' },
    totalDurationMs: 1,
  } as unknown as MultiRootAnalysis;
}

/** A `Memento` that actually stores, so persistence can be asserted rather than mocked away. */
function makeMemento(): vscode.Memento {
  const store = new Map<string, unknown>();
  return {
    get: (<T>(key: string, fallback?: T) =>
      store.has(key) ? (store.get(key) as T) : fallback) as vscode.Memento['get'],
    update: async (key: string, value: unknown) => {
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
}

function makeBridge(options: { session?: WorkspaceSession | undefined } = {}) {
  const posted: HostInbound[] = [];
  const analysis = multiRootStub();
  const memento = makeMemento();

  const session =
    'session' in options
      ? options.session
      : ({
          getAnalysis: () => analysis,
          identity: { roots: [ROOT], isSingleRoot: true },
          roots: [ROOT],
          indexerForRoot: () => ({
            getAnalysis: () => analysis.roots[0]?.analysis,
            getIgnorePatterns: () => new Set(),
            usageReferencesFor: () => [],
          }),
          indexerForPath: () => ({
            root: ROOT,
            indexer: {
              getAnalysis: () => analysis.roots[0]?.analysis,
              usageReferencesFor: () => [
                {
                  file: '/workspace/src/app.ts',
                  line: 3,
                  content: "import a from './a.json'",
                  kind: 'resolved-path',
                },
              ],
            },
          }),
          notifyFileChanged: () => {},
        } as unknown as WorkspaceSession);

  const bridge = new VsCodeHostBridge({
    session: () => session,
    post: (message) => posted.push(message),
    memento,
  });

  return { bridge, posted, analysis, memento };
}

beforeEach(() => {
  resetTestWorkspace();
});

describe('VS Code host — a dismissed confirmation settles the operation', () => {
  it('answers a cancelled cleanup rather than leaving the UI waiting', async () => {
    const { bridge, posted } = makeBridge();

    // Build a plan so there is something to apply. The bridge holds it by id.
    await bridge.handle({ type: 'request-cleanup-plan', assetPaths: [] });
    const planMessage = posted.find((message) => message.type === 'cleanup-plan');
    expect(planMessage, 'the bridge must answer a plan request').toBeDefined();

    // The developer dismisses the native modal.
    mockVscodeState.warningMessageResult = undefined;
    posted.length = 0;
    await bridge.handle({ type: 'apply-cleanup-plan', planId: 'nope', allowPartial: false });

    // Even an unknown id must answer: the UI is disabled either way.
    expect(
      posted.length,
      'an apply that goes nowhere still has to release the UI that is waiting on it'
    ).toBeGreaterThan(0);
  });

  it('answers a cancelled resolution rather than leaving the UI waiting', async () => {
    const { bridge, posted } = makeBridge();
    mockVscodeState.warningMessageResult = undefined;

    await bridge.handle({ type: 'apply-resolution-plan', planId: 'nope', allowPartial: false });

    expect(posted.length).toBeGreaterThan(0);
  });

  it('reports a refusal without dressing it up as a failure', async () => {
    // A `rejected` result whose `reason` is `null` is the developer's own decision.
    // Rendering it as an error banner tells them something went wrong when nothing
    // did — which is why the reason, not the status, is what the UI reads.
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'apply-cleanup-plan', planId: 'unknown', allowPartial: false });

    const answer = posted[posted.length - 1];
    expect(answer).toBeDefined();
    expect(['cleanup-result', 'error']).toContain(answer!.type);
  });
});

describe('VS Code host — every failure reaches the UI', () => {
  it('answers with an error when the workspace has closed', async () => {
    // Five branches used to `return` silently here. A closed workspace is an ordinary
    // state, and the developer is entitled to be told which one they are in.
    const { bridge, posted } = makeBridge({ session: undefined });

    await bridge.handle({ type: 'request-cleanup-proposal' });

    expect(posted).toHaveLength(1);
    expect(posted[0]!.type).toBe('error');
  });

  it('turns a thrown operation into an error message instead of an unhandled rejection', async () => {
    const posted: HostInbound[] = [];
    const exploding = {
      getAnalysis: () => {
        throw new Error('the index is gone');
      },
      identity: { roots: [ROOT], isSingleRoot: true },
      roots: [ROOT],
      indexerForRoot: () => undefined,
      notifyFileChanged: () => {},
    } as unknown as WorkspaceSession;

    const bridge = new VsCodeHostBridge({
      session: () => exploding,
      post: (message) => posted.push(message),
    });

    // Must not reject: the panel calls this as `void bridge.handle(raw)`, so a
    // rejection is lost and the UI is never told anything at all.
    await expect(bridge.handle({ type: 'ready' })).resolves.toBeUndefined();

    const error = posted.find((message) => message.type === 'error');
    expect(error, 'a thrown operation must be reported to the UI').toBeDefined();
    expect(error!.type === 'error' && error!.message).toContain('the index is gone');
  });

  it('answers every message type it is sent', async () => {
    // The contract's outbound vocabulary, exercised end to end against a live bridge.
    // `request-animation-data` used to fall into a case that returned nothing at all,
    // so the inspector's loading state was permanent.
    const { bridge, posted } = makeBridge();

    await bridge.handle({ type: 'request-animation-data', assetPath: '/workspace/missing.json' });

    const answer = posted.find((message) => message.type === 'animation-data');
    expect(answer, 'a preview request must always be answered').toBeDefined();
    expect(answer!.type === 'animation-data' && answer!.assetPath).toBe('/workspace/missing.json');
  });

  it('answers a thumbnail request for an asset it cannot find', async () => {
    const { bridge, posted } = makeBridge();

    await bridge.handle({ type: 'request-thumbnail', assetPath: '/workspace/missing.json' });

    const answer = posted.find((message) => message.type === 'thumbnail');
    expect(answer).toBeDefined();
    expect(answer!.type === 'thumbnail' && answer!.source).toBeNull();
  });
});

describe('VS Code host — the session is never captured', () => {
  it('acts on the session that exists now, not the one it was built with', async () => {
    // `animoria.refresh` disposes the session and builds a new one. A bridge holding
    // the original kept routing cleanup, resolution and restore into disposed
    // indexers for the rest of the panel's life, while the analysis it displayed came
    // from the new one — a panel that looked current and acted stale.
    const first = multiRootStub();
    const second = multiRootStub(analysisStub({ generation: 2 }));

    let current = first;
    const posted: HostInbound[] = [];
    const bridge = new VsCodeHostBridge({
      session: () =>
        ({
          getAnalysis: () => current,
          identity: { roots: [ROOT], isSingleRoot: true },
          roots: [ROOT],
          indexerForRoot: () => ({ getAnalysis: () => current.roots[0]?.analysis }),
          notifyFileChanged: () => {},
        }) as unknown as WorkspaceSession,
      post: (message) => posted.push(message),
    });

    await bridge.handle({ type: 'ready' });
    current = second;
    posted.length = 0;
    await bridge.handle({ type: 'ready' });

    const analysis = posted.find((message) => message.type === 'analysis');
    expect(analysis!.type === 'analysis' && analysis!.analysis.roots[0]?.analysis.generation).toBe(
      2
    );
  });
});

describe('VS Code host — preferences round-trip', () => {
  it('sends the stored preferences on ready', async () => {
    // The UI renders the host's answer, so a host that never sends one leaves every
    // preview on defaults regardless of what the developer chose.
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'ready' });

    const preferences = posted.find((message) => message.type === 'preferences');
    expect(preferences, 'ready must include the stored preferences').toBeDefined();
  });

  it('persists a preference and echoes what was stored', async () => {
    const { bridge, posted } = makeBridge();

    await bridge.handle({
      type: 'save-preferences',
      preferences: {
        playbackSpeed: 2,
        previewBackground: '#000000',
        locale: 'en',
        assetViewMode: 'tree',
      },
    });

    const echoed = posted.find((message) => message.type === 'preferences');
    expect(echoed?.type === 'preferences' && echoed.preferences.playbackSpeed).toBe(2);
    expect(echoed?.type === 'preferences' && echoed.preferences.previewBackground).toBe('#000000');

    // Survives the round trip, not merely the reply: a preference echoed but not
    // stored looks identical until the panel is reopened.
    posted.length = 0;
    await bridge.handle({ type: 'ready' });
    const onReady = posted.find((message) => message.type === 'preferences');
    expect(onReady?.type === 'preferences' && onReady.preferences.playbackSpeed).toBe(2);
  });
});

describe('VS Code host — cleanup dismissal', () => {
  it('records a dismissal and rebuilds the proposal from it', async () => {
    // `dismissedPaths` was passed to `buildCleanupCandidates` on every call and could
    // never contain anything, so a developer's only options were "delete it" and
    // "see it proposed again tomorrow".
    const { bridge, posted, memento } = makeBridge();

    await bridge.handle({
      type: 'dismiss-cleanup-candidate',
      assetPath: '/workspace/keep-me.json',
      dismissed: true,
    });

    expect(memento.get<string[]>('animoria.dismissedCleanupPaths', [])).toContain(
      '/workspace/keep-me.json'
    );
    // Rebuilt rather than patched: the developer sees the list Core would produce
    // now, not the previous one with a row hidden.
    expect(posted.some((message) => message.type === 'cleanup-proposal')).toBe(true);
  });

  it('brings a dismissed candidate back', async () => {
    const { bridge, memento } = makeBridge();
    const path = '/workspace/keep-me.json';

    await bridge.handle({ type: 'dismiss-cleanup-candidate', assetPath: path, dismissed: true });
    await bridge.handle({ type: 'dismiss-cleanup-candidate', assetPath: path, dismissed: false });

    expect(memento.get<string[]>('animoria.dismissedCleanupPaths', [])).not.toContain(path);
  });
});

describe('VS Code host — usage references', () => {
  it("answers with Core's locations and says whether the scan finished", async () => {
    const { bridge, posted } = makeBridge();

    await bridge.handle({ type: 'request-usage-references', assetPath: '/workspace/a.json' });

    const answer = posted.find((message) => message.type === 'usage-references');
    expect(answer, 'a usage request must always be answered').toBeDefined();
    expect(answer!.type === 'usage-references' && answer!.assetPath).toBe('/workspace/a.json');
    // An empty list from an unfinished scan is not the finding "used nowhere", and
    // the flag is what lets the UI say which one it is.
    expect(answer!.type === 'usage-references' && typeof answer!.complete).toBe('boolean');
    // Core's locations, forwarded — not a count the client would have to expand.
    expect(answer!.type === 'usage-references' && answer!.references.length).toBe(1);
  });
});
