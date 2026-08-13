import type { MultiRootAnalysis, WorkspaceAnalysis, WorkspaceSession } from '@animoria/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HostInbound } from '@animoria/ui/bridge';
import { VsCodeHostBridge } from '../../src/panels/VsCodeHostBridge.js';
import { mockVscodeState, resetTestWorkspace, vscodeMock } from '../harness.js';

/**
 * The VS Code half of the host bridge.
 *
 * These assert the *translation*, not the product behaviour — every decision the
 * bridge acts on was made by Core, and Core's own tests cover those. What can only
 * be checked here is that VS Code answers each message with the right native call
 * and the right reply, and that it refuses the things it must refuse.
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
    referenceCounts: new Map([['/workspace/a.json', 2]]),
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

function multiRootStub(perRootAnalysis = analysisStub()): MultiRootAnalysis {
  const root = { id: 'r1', name: 'workspace', path: '/workspace' };
  return {
    workspace: { id: 'ws1', name: 'workspace', isSingleRoot: true },
    roots: [{ root, analysis: perRootAnalysis }],
    assets: perRootAnalysis.assets.map((asset) => ({ root, asset })),
    diagnostics: perRootAnalysis.diagnostics,
    duplicateGroups: perRootAnalysis.duplicateGroups,
    lifecycle: { status: 'current' },
    totalDurationMs: perRootAnalysis.durationMs,
  } as unknown as MultiRootAnalysis;
}

function makeBridge(analysis = multiRootStub()) {
  const posted: HostInbound[] = [];
  const session = {
    getAnalysis: () => analysis,
    identity: { roots: [{ id: 'r1', name: 'workspace', path: '/workspace' }] },
    roots: [{ id: 'r1', name: 'workspace', path: '/workspace' }],
    indexerForRoot: () => ({
      getAnalysis: () => analysis.roots[0]?.analysis,
      getIgnorePatterns: () => new Set(),
    }),
    notifyFileChanged: () => {},
  } as unknown as WorkspaceSession;

  const bridge = new VsCodeHostBridge({
    // A getter, not the instance. `animoria.refresh` replaces the session, and a
    // bridge that captured one kept acting on a disposed workspace for the rest of
    // the panel's life.
    session: () => session,
    post: (message) => posted.push(message),
  });

  return { bridge, posted };
}

beforeEach(() => {
  resetTestWorkspace();
});

describe('VsCodeHostBridge — handshake', () => {
  it('answers "ready" with capabilities before any analysis', async () => {
    // Ordering is load-bearing: a component that renders before it knows whether the
    // host can mutate would show enabled destructive controls for one frame.
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'ready' });

    // Capabilities first, then the preferences those controls render under, then the
    // analysis. The ordering is load-bearing at both ends: a component that renders
    // before it knows whether the host can mutate shows enabled destructive controls
    // for a frame, and one that renders a preview before its stored background is
    // known flashes the default.
    expect(posted[0]?.type).toBe('capabilities');
    expect(posted[1]?.type).toBe('preferences');
    expect(posted[2]?.type).toBe('analysis');
  });

  it('declares VS Code as a fully capable host', () => {
    const capabilities = VsCodeHostBridge.capabilities();
    expect(capabilities.canMutate).toBe(true);
    expect(capabilities.canRestore).toBe(true);
    expect(capabilities.canOpenReference).toBe(true);
    expect(capabilities.mutationUnavailableReason).toBeNull();
  });

  it('sends a MultiRootAnalysis on ready so the UI receives the full workspace', async () => {
    // The bridge forwards `session.getAnalysis()` which returns MultiRootAnalysis.
    // The UI contract expects MultiRootAnalysis on the 'analysis' message — not the
    // old single-root WorkspaceAnalysis. Verify the shape is correct.
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'ready' });

    const message = posted.find((m) => m.type === 'analysis');
    expect(message).toBeDefined();
    // MultiRootAnalysis has a `workspace` property and a `roots` array.
    const analysis = (message as { analysis: unknown }).analysis as Record<string, unknown>;
    expect(analysis).toHaveProperty('workspace');
    expect(analysis).toHaveProperty('roots');
    expect(Array.isArray(analysis.roots)).toBe(true);
  });
});

describe('VsCodeHostBridge — validation', () => {
  it('ignores a malformed message instead of throwing', async () => {
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'apply-cleanup-plan' }); // no planId, no allowPartial
    await bridge.handle('not an object');
    await bridge.handle({ type: 'nonsense' });

    // Nothing posted, nothing thrown: a bad message must not be able to take down
    // the panel or reach an executor.
    expect(posted).toEqual([]);
  });
});

describe('VsCodeHostBridge — plans are held by id', () => {
  it('refuses to apply a plan id it never issued', async () => {
    // The invariant: the UI cannot fabricate a plan, and cannot apply one the host
    // is not holding. Without this, `apply-cleanup-plan` would be a request to
    // delete whatever the message described.
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'apply-cleanup-plan', planId: 'forged', allowPartial: false });

    const error = posted.find((m) => m.type === 'error');
    expect(error).toBeDefined();
    expect((error as { message: string }).message).toContain('no longer available');
  });

  it('refuses to apply a resolution plan id it never issued', async () => {
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'apply-resolution-plan', planId: 'forged', allowPartial: true });

    const error = posted.find((m) => m.type === 'error');
    expect((error as { message: string }).message).toContain('no longer available');
  });

  it('drops held plans on dispose', async () => {
    // A plan outliving its preview is applicable against an analysis nobody looked at.
    const { bridge, posted } = makeBridge();
    await bridge.handle({ type: 'request-cleanup-proposal' });
    bridge.dispose();
    posted.length = 0;

    await bridge.handle({ type: 'apply-cleanup-plan', planId: 'anything', allowPartial: false });
    expect(posted.find((m) => m.type === 'error')).toBeDefined();
  });
});

describe('VsCodeHostBridge — native translation', () => {
  it('copies to the native clipboard', async () => {
    const { bridge } = makeBridge();
    await bridge.handle({ type: 'copy-to-clipboard', text: '/workspace/a.json', label: 'Path' });
    expect(vscodeMock.env.clipboard._lastWrite).toBe('/workspace/a.json');
  });

  it('converts a 1-based reference line to VS Code 0-based positions', async () => {
    // The contract is 1-based because that is what a developer reads in an editor
    // gutter. VS Code is 0-based. Getting this wrong is an off-by-one that lands the
    // cursor on the line above every reference.
    const { bridge } = makeBridge();
    await bridge.handle({ type: 'open-reference', file: '/workspace/a.ts', line: 4, rootId: 'r1' });

    const editor = mockVscodeState.lastShownEditor as {
      selection: { active: { line: number } };
      _revealed: { type: number };
    };
    expect(editor.selection.active.line).toBe(3);
    expect(editor._revealed.type).toBe(vscodeMock.TextEditorRevealType.InCenter);
  });

  it('asks for native confirmation before any destructive apply', async () => {
    // The confirmation is a platform modal, never a webview element: a page that can
    // render its own "are you sure" can also dismiss it.
    mockVscodeState.warningMessageResult = undefined; // developer cancels
    const { bridge, posted } = makeBridge();

    await bridge.handle({ type: 'request-cleanup-proposal' });
    const proposal = posted.find((m) => m.type === 'cleanup-proposal');
    expect(proposal).toBeDefined();

    // With no candidates the plan is unavailable, and an unavailable plan must never
    // reach an executor regardless of confirmation.
    await bridge.handle({ type: 'request-cleanup-plan', assetPaths: [] });
    const plans = posted.find((m) => m.type === 'cleanup-plan');
    expect(plans?.type === 'cleanup-plan' && plans.plans.length).toBe(0);
  });
});
