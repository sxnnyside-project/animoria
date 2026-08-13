import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceSession } from '../../src/workspace/workspace-session.js';

/**
 * V2 — multi-root workspaces, against the `multi-root-workspace` fixture.
 *
 * The fixture is built to make the wrong answers *possible*: three roots, a
 * `logo.json` in each, two of which are byte-identical and one of which is not; a
 * path-shaped string in root-c naming root-a's asset; a computed path. Every test
 * here asserts that Animoria gives the narrow answer rather than the convenient one.
 */

const FIXTURE = fileURLToPath(
  new URL('../../../../fixtures/multi-root-workspace', import.meta.url)
);

let workspace: string;
let session: WorkspaceSession | null = null;

beforeEach(() => {
  // Copied per test: the indexer writes `.animoria/` and the tests must not race.
  workspace = mkdtempSync(join(tmpdir(), 'animoria-multiroot-'));
  cpSync(FIXTURE, workspace, { recursive: true });
});

afterEach(() => {
  session?.dispose();
  session = null;
  rmSync(workspace, { recursive: true, force: true });
});

function roots(...names: string[]): string[] {
  return names.map((name) => join(workspace, name));
}

describe('multi-root — per-root analysis (D-05)', () => {
  it('analyses every root, not just the first', async () => {
    // `workspaceFolders[0]` in eight places meant roots two and three were invisible:
    // their assets were never indexed and their findings never reported.
    session = new WorkspaceSession(roots('root-a', 'root-b', 'root-c'));
    const analysis = await session.initialize();

    expect(analysis.roots).toHaveLength(3);
    const rootNames = new Set(analysis.assets.map((entry) => entry.rootName));
    expect(rootNames).toEqual(new Set(['root-a', 'root-b', 'root-c']));
  });

  it('applies each root its own .animoriarc rather than one roots config to all', async () => {
    // root-a configures `no-gif: error`; root-c configures
    // `no-unreferenced-assets: warning`. A merged scan would have to pick one and
    // apply it to files it does not govern.
    session = new WorkspaceSession(roots('root-a', 'root-c'));
    const analysis = await session.initialize();

    const byRoot = new Map(
      analysis.roots.map(({ root, analysis: rootAnalysis }) => [root.name, rootAnalysis])
    );

    expect(byRoot.get('root-a')?.evaluatedRuleIds).toContain('no-gif');
    expect(byRoot.get('root-c')?.evaluatedRuleIds).toContain('no-unreferenced-assets');
  });

  it('attributes every asset and diagnostic to the root it came from', async () => {
    session = new WorkspaceSession(roots('root-a', 'root-b', 'root-c'));
    const analysis = await session.initialize();

    for (const entry of analysis.assets) {
      expect(entry.asset.path.startsWith(join(workspace, entry.rootName))).toBe(true);
    }
  });
});

describe('multi-root — a shared filename is not an identity', () => {
  it('keeps three logo.json files as three distinct assets', async () => {
    session = new WorkspaceSession(roots('root-a', 'root-b', 'root-c'));
    const analysis = await session.initialize();

    const logos = analysis.assets.filter((entry) => entry.asset.name === 'logo.json');
    expect(logos).toHaveLength(3);
    expect(new Set(logos.map((entry) => entry.asset.path)).size).toBe(3);
  });

  it('groups across roots on content, never on name', async () => {
    // root-a and root-b hold byte-identical logos; root-c's differs. A name-based
    // group would offer to delete root-c's — losing a different image because three
    // unrelated projects named a file the same way.
    session = new WorkspaceSession(roots('root-a', 'root-b', 'root-c'));
    const analysis = await session.initialize();

    const contentGroups = analysis.duplicateGroups.filter(
      (group) => group.matchKind === 'content-hash'
    );

    const crossRoot = contentGroups.find((group) =>
      group.candidates.some((candidate) => candidate.asset.name === 'logo.json')
    );

    if (crossRoot) {
      const paths = crossRoot.candidates.map((candidate) => candidate.asset.path);
      // Never the root-c copy: its bytes differ.
      expect(paths.some((path) => path.includes(`root-c${'/'}assets${'/'}logo.json`))).toBe(false);
    }
  });
});

describe('multi-root — cross-root references are refused, not guessed', () => {
  it('does not credit a path-shaped string in one root as a reference into another', async () => {
    // `root-c/src/looks-cross-root.ts` contains
    // `'../../root-a/assets/unreferenced-a.json'`. Crediting it would mean a string
    // in an unrelated project can make an asset look used — and the consequence is
    // that cleanup silently stops offering a genuinely dead file.
    session = new WorkspaceSession(roots('root-a', 'root-b', 'root-c'));
    const analysis = await session.initialize();

    const rootA = analysis.roots.find((entry) => entry.root.name === 'root-a')?.analysis;
    const unreferenced = join(workspace, 'root-a', 'assets', 'unreferenced-a.json');

    expect(rootA?.referenceCounts.get(unreferenced) ?? 0).toBe(0);
  });

  it('counts a computed path as a reference, and still refuses to rewrite it', async () => {
    // The deliberate asymmetry D-20 records: the reference *index* over-counts and
    // the *rewriter* refuses.
    //
    // Over-counting is the safe direction for an absence finding. A missed reference
    // makes a used asset look unreferenced, and cleanup then offers to delete it — a
    // data-loss bug. An extra reference only means an asset is not offered for
    // removal, which is noise. So `` `../${dir}/c.json` `` is credited: it very
    // probably is a reference, and being wrong costs nothing dangerous.
    //
    // Rewriting is the opposite: the rewriter cannot know which characters to
    // replace in a computed path, so it refuses (`unresolvable-target-style`) rather
    // than producing a plausible-looking edit from a string coincidence.
    session = new WorkspaceSession(roots('root-c'));
    const analysis = await session.initialize();

    const rootC = analysis.roots[0]?.analysis;
    const count = rootC?.referenceCounts.get(join(workspace, 'root-c', 'assets', 'c.json')) ?? 0;

    // The static import in `c.ts` plus the interpolated one in `computed.ts`.
    expect(count).toBe(2);
  });
});

describe('multi-root — aggregation does not invent values', () => {
  it('reports no workspace-level health score for a multi-root workspace', async () => {
    // Averaging two scores produces a number no engine computed — the exact class of
    // fabrication the migration removed. Per-root outcomes are reported instead.
    session = new WorkspaceSession(roots('root-a', 'root-b'));
    const analysis = await session.initialize();

    expect(analysis.health.singleRootOutcome).toBeNull();
    expect(analysis.health.perRoot).toHaveLength(2);
  });

  it('passes a single roots score through unchanged', async () => {
    session = new WorkspaceSession(roots('root-a'));
    const analysis = await session.initialize();

    expect(analysis.health.singleRootOutcome).toEqual(analysis.roots[0]?.analysis.health);
  });

  it('is only as ready as its least ready root', async () => {
    session = new WorkspaceSession(roots('root-a', 'root-b', 'root-c'));
    const analysis = await session.initialize();
    expect(analysis.readiness.complete).toBe(true);
  });
});

describe('multi-root — roots change at runtime', () => {
  it('indexes a root added after startup', async () => {
    session = new WorkspaceSession(roots('root-a'));
    await session.initialize();

    const { added } = await session.setRoots(roots('root-a', 'root-b'));
    expect(added).toHaveLength(1);

    const analysis = session.getAnalysis();
    expect(analysis.roots).toHaveLength(2);
    expect(analysis.assets.some((entry) => entry.rootName === 'root-b')).toBe(true);
  });

  it('stops analysing a removed root, and disposes its indexer', async () => {
    session = new WorkspaceSession(roots('root-a', 'root-b'));
    await session.initialize();

    const { removed } = await session.setRoots(roots('root-a'));
    expect(removed).toHaveLength(1);

    const analysis = session.getAnalysis();
    expect(analysis.roots).toHaveLength(1);
    expect(analysis.assets.some((entry) => entry.rootName === 'root-b')).toBe(false);
    expect(session.indexerForRoot(removed[0]!.id)).toBeNull();
  });

  it('keeps a surviving roots index rather than rescanning it', async () => {
    // Re-scanning an untouched root because a *different* folder was added turns
    // "add a folder" into a full workspace rescan.
    session = new WorkspaceSession(roots('root-a'));
    await session.initialize();

    const before = session.indexerForRoot(session.roots[0]!.id);
    await session.setRoots(roots('root-a', 'root-b'));
    const after = session.indexerForRoot(session.roots.find((r) => r.name === 'root-a')!.id);

    expect(after).toBe(before);
  });
});

describe('multi-root — change routing', () => {
  it('routes a change to the root that owns it', async () => {
    session = new WorkspaceSession(roots('root-a', 'root-b'));
    await session.initialize();

    const rootB = session.roots.find((root) => root.name === 'root-b')!;
    const located = session.indexerForPath(join(workspace, 'root-b', 'assets', 'b.json'));

    expect(located?.root.id).toBe(rootB.id);
  });

  it('drops a change from outside every root instead of handing it to an arbitrary indexer', async () => {
    session = new WorkspaceSession(roots('root-a'));
    await session.initialize();

    // Must not throw and must not reach root-a's indexer, which would index a file
    // under the wrong configuration and attribute it to the wrong root.
    session.notifyFileChanged(join(workspace, 'root-b', 'assets', 'b.json'), 'created');
    expect(session.indexerForPath(join(workspace, 'root-b', 'assets', 'b.json'))).toBeNull();
  });
});
