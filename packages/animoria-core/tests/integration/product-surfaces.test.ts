import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { integrationRegistry } from '../../src/integration/index';
import { WorkspaceSession } from '../../src/workspace/workspace-session';

/**
 * The capabilities manual testing found missing, asserted where they broke.
 *
 * Each of these had a working Core implementation and reached the user as nothing:
 * duplicates that never arrived because the panel read a *fast* analysis, reference
 * counts that arrived as `{}` because a `Map` does not survive `JSON.stringify`, and
 * five snippet providers that were never registered with the registry that serves
 * them. None of it is exotic — all three are the seam between "Core can do it" and
 * "the developer sees it", which is the seam every previous suite skipped.
 */

const FIXTURES = resolve(process.cwd(), '../../fixtures');

describe('duplicates — the answer reaches the analysis', () => {
  it('finds byte-identical assets in a workspace that has them', async () => {
    const session = new WorkspaceSession([resolve(FIXTURES, 'duplicates')]);
    try {
      const analysis = await session.analyzeComplete();

      expect(analysis.duplicateGroups.length, 'the fixture has duplicates').toBeGreaterThan(0);
      for (const group of analysis.duplicateGroups) {
        expect(
          group.candidates.length,
          'a duplicate group needs at least two members'
        ).toBeGreaterThan(1);
        // The evidence, not just the verdict: a surface that cannot show *why* two
        // files are duplicates is asking the developer to take its word for a
        // deletion.
        expect(group.contentHash, 'the group must carry its hash').toBeTruthy();
      }
    } finally {
      session.dispose();
    }
  });

  it('distinguishes "not compared yet" from "none found"', async () => {
    // The panel opened on a *fast* analysis, whose `duplicateGroups` is empty because
    // hashing runs in the background pass — and rendered that as "No duplicate groups
    // in this workspace". A workspace with two identical files reported zero.
    const session = new WorkspaceSession([resolve(FIXTURES, 'duplicates')]);
    try {
      const fast = await session.initializeFast();
      expect(fast.duplicateGroups).toHaveLength(0);
      expect(
        fast.readiness.duplicatesResolved,
        'the fast analysis must admit it has not compared anything'
      ).toBe(false);

      const complete = await session.analyzeComplete();
      expect(complete.readiness.duplicatesResolved).toBe(true);
      expect(complete.duplicateGroups.length).toBeGreaterThan(0);
    } finally {
      session.dispose();
    }
  });
});

describe('references — the counts survive the wire', () => {
  it('keeps every count through JSON serialization', async () => {
    // `webview.postMessage` serialises as JSON, and `JSON.stringify(new Map())` is
    // `{}`. Every asset in the panel showed "0 references" while the tree beside it
    // showed the real numbers. This asserts the shape a host must put on the wire.
    const session = new WorkspaceSession([resolve(FIXTURES, 'reference-formats')]);
    try {
      const analysis = await session.analyzeComplete();
      const live = analysis.roots[0]!.analysis.referenceCounts;
      expect(live.size, 'the fixture references assets').toBeGreaterThan(0);

      // What a host must send: entries, not the live Map.
      const wire = JSON.parse(
        JSON.stringify({
          ...analysis,
          roots: analysis.roots.map((entry) => ({
            ...entry,
            analysis: {
              ...entry.analysis,
              referenceCounts: Array.from(entry.analysis.referenceCounts.entries()),
            },
          })),
        })
      );

      const rehydrated = new Map<string, number>(wire.roots[0].analysis.referenceCounts);
      expect(rehydrated.size, 'the counts must survive the wire').toBe(live.size);
      for (const [path, count] of live) expect(rehydrated.get(path)).toBe(count);
    } finally {
      session.dispose();
    }
  });

  it('posting the live Map loses every count', async () => {
    // The failing shape, asserted directly so nobody reintroduces it believing
    // structured clone will save them.
    const session = new WorkspaceSession([resolve(FIXTURES, 'reference-formats')]);
    try {
      const analysis = await session.analyzeComplete();
      const naive = JSON.parse(JSON.stringify(analysis));
      expect(naive.roots[0].analysis.referenceCounts).toEqual({});
    } finally {
      session.dispose();
    }
  });
});

describe('snippets — every provider is registered and reachable', () => {
  const asset = {
    path: '/w/assets/hero.json',
    name: 'hero.json',
    stem: 'hero',
    format: 'lottie' as const,
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed' as const,
  };

  const context = {
    asset,
    importPath: '../assets/hero.json',
    workspaceRelativePath: 'assets/hero.json',
    pathResolutionBasis: 'workspace-root' as const,
    workspacePath: '/w',
  };

  it('offers every framework Core implements', () => {
    // `IntegrationRegistry`'s doc said "bootstrap providers during extension
    // activation" and nothing ever did, so `generate()` returned `[]` in every client
    // and "Generate Code Snippet" reported that no generator supported the asset.
    const results = integrationRegistry.generate(context);
    const labels = results.map((result) => result.label).join(' | ');

    expect(results.length, `expected several generators, got: ${labels}`).toBeGreaterThanOrEqual(5);
    for (const framework of ['React', 'Vue', 'SwiftUI', 'Compose', 'Flutter']) {
      expect(labels, `${framework} must be offered`).toContain(framework);
    }
  });

  it('produces real code for each of them', () => {
    for (const result of integrationRegistry.generate(context)) {
      expect(result.code.length, `${result.label} produced no code`).toBeGreaterThan(0);
      // The asset has to appear in its own snippet, or the snippet is a template
      // rather than an integration.
      expect(
        result.code.includes('hero') || (result.imports ?? '').includes('hero'),
        `${result.label} does not reference the asset`
      ).toBe(true);
    }
  });

  it('never collapses the choice to one result', () => {
    // The daemon returned `results[0]` joined into a string, so JetBrains' native
    // picker — built to offer the frameworks — had exactly one item it could not
    // decode. The same action gave a choice in one IDE and a silent failure in the
    // other.
    const results = integrationRegistry.generate(context);
    const ids = new Set(results.map((result) => result.label));
    expect(ids.size).toBe(results.length);
  });
});
