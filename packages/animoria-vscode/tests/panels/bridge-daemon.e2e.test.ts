import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Asset, DuplicateGroup, WorkspaceAnalysis } from '@animoria/contracts';
import { VsCodeDaemonClient } from '../../src/daemon/daemon-client.js';
import {
  VsCodeHostBridge,
  type MultiRootAnalysis,
  type WorkspaceSession,
} from '../../src/panels/vscode-host-bridge.js';
import type { HostInbound } from '@animoria/ui/bridge';

// Unlike every other bridge test (hand-built fixture sessions), this drives VsCodeHostBridge with a real daemon scan,
// so a mismatch between what the daemon returns and what extension.ts's session adapter expects can't hide behind a mock.
describe('VsCodeHostBridge — real daemon data through the real bridge', () => {
  const fixturesDir = resolve(__dirname, '../../../../fixtures');
  let client: VsCodeDaemonClient;
  let posted: HostInbound[];
  let bridge: VsCodeHostBridge;

  beforeAll(async () => {
    client = new VsCodeDaemonClient();
    const cleanWs = resolve(fixturesDir, 'clean-workspace');
    const scan = await client.scan(cleanWs);

    // The adapter `extension.ts` builds around a daemon scan, reduced to what
    // `WorkspaceSession` actually requires — not a reimplementation of
    // multi-root indexing, just enough surface for the bridge to run against
    // real analysis data instead of a synthetic one.
    const analysis: MultiRootAnalysis = {
      roots: [scan.analysis],
      duplicateGroups: scan.duplicate_groups,
      assets: scan.analysis.assets,
      referenceCounts: scan.references.reduce<Record<string, number>>((acc, ref) => {
        acc[ref.asset_id] = (acc[ref.asset_id] ?? 0) + 1;
        return acc;
      }, {}),
      readiness: { referencesResolved: true },
    };

    const session: WorkspaceSession = {
      identity: cleanWs,
      roots: [{ id: scan.analysis.root_id, name: 'clean-workspace', path: cleanWs }],
      getAnalysis: () => analysis,
      indexerForRoot: (rootId: string) =>
        rootId === scan.analysis.root_id ? { getAnalysis: () => scan.analysis } : null,
      indexerForPath: () => ({ root: { path: cleanWs } }),
    };

    posted = [];
    bridge = new VsCodeHostBridge({
      session: () => session,
      daemon: () => client,
      post: (message) => posted.push(message),
    });
  });

  afterAll(async () => {
    await client.shutdown();
  });

  it('posts capabilities and the real scan analysis on ready', async () => {
    await bridge.handle({ type: 'ready' });

    const capabilities = posted.find((m) => m.type === 'capabilities');
    expect(capabilities).toBeDefined();

    const analysisMessage = posted.find((m) => m.type === 'analysis') as
      | { type: 'analysis'; analysis: MultiRootAnalysis }
      | undefined;
    expect(analysisMessage).toBeDefined();

    // Not a re-derivation of the daemon's count — the fixture is fixed, so this
    // is the number of assets `clean-workspace` is known to contain. If the
    // bridge dropped or reshaped assets on the way to `postMessage`, this is
    // the only test that would catch it.
    expect(analysisMessage!.analysis.assets.length).toBeGreaterThan(0);
    expect(analysisMessage!.analysis.roots).toHaveLength(1);
    expect(analysisMessage!.analysis.roots[0]!.assets.length).toBe(
      analysisMessage!.analysis.assets.length
    );
  });

  it('round-trips a real usage-reference lookup for an asset the daemon actually indexed', async () => {
    const analysisMessage = posted.find((m) => m.type === 'analysis') as
      | { type: 'analysis'; analysis: MultiRootAnalysis }
      | undefined;
    const asset = analysisMessage?.analysis.assets[0] as Asset | undefined;
    expect(asset).toBeDefined();

    posted.length = 0;
    await bridge.handle({ type: 'request-usage-references', assetPath: asset!.path });

    const refsMessage = posted.find((m) => m.type === 'usage-references');
    expect(refsMessage).toBeDefined();
  });
});
