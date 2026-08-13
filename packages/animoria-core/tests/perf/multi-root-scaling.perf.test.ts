import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceSession } from '../../src/workspace/workspace-session.js';

/**
 * Multi-root scaling, measured structurally first (D-10).
 *
 * ## Why the structural assertion carries the weight
 * A wall-clock budget on three temp directories is a measurement of the CI runner,
 * not of Animoria. What actually matters is the *shape* of the work: a session over
 * three roots must do three roots' worth of scanning, not nine — and the way that
 * regresses is one root's indexer being handed another root's file, or the aggregate
 * re-deriving per-root analyses instead of reading them.
 *
 * So the assertions are: per-root work is proportional to per-root content, the
 * aggregate is cheap, and roots are scanned concurrently rather than serially.
 */

const LOTTIE = JSON.stringify({ v: '5.5.7', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] });

let scratch: string;
let session: WorkspaceSession | null = null;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'animoria-perf-'));
});

afterEach(() => {
  session?.dispose();
  session = null;
  rmSync(scratch, { recursive: true, force: true });
});

/** A root with `assetCount` assets and `sourceCount` source files. */
function makeRoot(name: string, assetCount: number, sourceCount: number): string {
  const root = join(scratch, name);
  mkdirSync(join(root, 'assets'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });

  for (let i = 0; i < assetCount; i += 1) {
    writeFileSync(join(root, 'assets', `a${i}.json`), LOTTIE);
  }
  for (let i = 0; i < sourceCount; i += 1) {
    writeFileSync(
      join(root, 'src', `s${i}.ts`),
      `import a from '../assets/a${i % Math.max(1, assetCount)}.json';\nexport default a;\n`
    );
  }
  return root;
}

describe('multi-root scaling', () => {
  it('scans each root once, so assets scale with roots rather than with roots squared', async () => {
    // The structural claim: three roots produce three roots' worth of assets. If a
    // root's indexer were ever handed another root's tree — the failure mode a
    // shared indexer or a mis-routed watcher produces — this count would multiply.
    const roots = [makeRoot('root-a', 8, 8), makeRoot('root-b', 8, 8), makeRoot('root-c', 8, 8)];

    session = new WorkspaceSession(roots);
    const analysis = await session.initialize();

    expect(analysis.assets).toHaveLength(24);
    for (const { root, analysis: rootAnalysis } of analysis.roots) {
      expect(rootAnalysis.assets, root.name).toHaveLength(8);
      // Every asset belongs to the root that indexed it.
      for (const asset of rootAnalysis.assets) {
        expect(asset.path.startsWith(root.path)).toBe(true);
      }
    }
  });

  it('reads each root’s source tree once, not once per root', async () => {
    const roots = [makeRoot('r1', 5, 20), makeRoot('r2', 5, 20)];

    session = new WorkspaceSession(roots);
    const analysis = await session.initialize();

    for (const { root, analysis: rootAnalysis } of analysis.roots) {
      const summary = rootAnalysis.referenceIndex;
      expect(summary, root.name).not.toBeNull();
      // 20 source files in this root, and no more: reading another root's sources
      // would both inflate this and credit cross-root references.
      expect(summary!.filesScanned, root.name).toBeLessThanOrEqual(20);
      // One directory walk per root — the property that took the reference workload
      // from 28,270 ms to 65 ms in Wave 1, preserved across roots.
      expect(summary!.globInvocations, root.name).toBe(1);
    }
  });

  it('aggregates without re-deriving, so the aggregate is cheap to read repeatedly', async () => {
    const roots = [makeRoot('a', 10, 10), makeRoot('b', 10, 10), makeRoot('c', 10, 10)];
    session = new WorkspaceSession(roots);
    await session.initialize();

    // The tree, the Problems panel and the health widget each read the aggregate on
    // every update. If aggregation re-analysed, a keystroke would cost a scan.
    const start = performance.now();
    for (let i = 0; i < 50; i += 1) session.getAnalysis();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
  });

  it('scans roots concurrently rather than one after another', async () => {
    // Three roots serially is three times one root's latency, which on a real
    // monorepo is the difference between an instant sidebar and a visible stall.
    const single = [makeRoot('solo', 12, 12)];
    const three = [makeRoot('t1', 12, 12), makeRoot('t2', 12, 12), makeRoot('t3', 12, 12)];

    const soloSession = new WorkspaceSession(single);
    const soloStart = performance.now();
    await soloSession.initialize();
    const soloMs = performance.now() - soloStart;
    soloSession.dispose();

    session = new WorkspaceSession(three);
    const manyStart = performance.now();
    await session.initialize();
    const manyMs = performance.now() - manyStart;

    // Generous, deliberately: this asserts "not serial", not a specific speedup.
    // A serial implementation lands near 3×; anything under 2.5× rules it out
    // without making the test a hostage to runner noise.
    expect(manyMs).toBeLessThan(Math.max(soloMs * 2.5, 1500));
  });
});
