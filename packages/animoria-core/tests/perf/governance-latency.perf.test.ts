import { mkdirSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';
import { buildReferenceIndex } from '../../src/usage/reference-index';

/**
 * Wall-clock budget for a full governance pass.
 *
 * ## Where these numbers come from
 * They are measured, not chosen. On the audit's reference workload — 60 assets,
 * 300 source files of 200 lines — the previous implementation took **28,270 ms**
 * and the current one takes **~65 ms**. The soft budget sits roughly 7× above the
 * measured figure to absorb CI-runner variance, cold page cache, and larger
 * real-world assets, while still failing an order-of-magnitude regression.
 *
 * These are the *secondary* guard. The primary one is
 * `../usage/reference-index-structure.test.ts`, which asserts the execution model
 * itself; a timing threshold alone would go green on a fast machine even if the
 * quadratic shape came back.
 */
const SOFT_BUDGET_MS = 500;
const HARD_BUDGET_MS = 1_000;

const ASSET_COUNT = 60;
const SOURCE_FILE_COUNT = 300;
const LINES_PER_FILE = 200;

let workspace: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'animoria-perf-'));
  mkdirSync(join(workspace, 'assets'), { recursive: true });
  mkdirSync(join(workspace, 'src'), { recursive: true });

  await Promise.all(
    Array.from({ length: ASSET_COUNT }, (_, i) =>
      writeFile(
        join(workspace, 'assets', `anim${i}.json`),
        JSON.stringify({
          v: '5.7.4',
          fr: 30,
          ip: 0,
          op: 60,
          w: 64,
          h: 64,
          nm: `anim${i}`,
          layers: [{ ind: 1, ty: 4, nm: `anim${i}`, ks: {}, shapes: [] }],
        })
      )
    )
  );

  await Promise.all(
    Array.from({ length: SOURCE_FILE_COUNT }, (_, f) => {
      const lines = Array.from(
        { length: LINES_PER_FILE },
        (_unused, l) => `const value${l} = compute("token-${l}");`
      );
      lines.push(`import a from '../assets/anim${f % ASSET_COUNT}.json';`);
      return writeFile(join(workspace, 'src', `mod${f}.ts`), lines.join('\n'));
    })
  );
}, 60_000);

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('governance latency on the reference workload', () => {
  it(`resolves a complete analysis within ${SOFT_BUDGET_MS}ms`, async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: workspace });

    const started = performance.now();
    const snapshot = await indexer.initializeComplete();
    const elapsed = performance.now() - started;

    indexer.dispose();

    expect(snapshot.readiness.complete).toBe(true);
    expect(snapshot.assets).toHaveLength(ASSET_COUNT);

    // Reported on failure so a regression shows its magnitude, not just "too slow".
    expect(
      elapsed,
      `complete analysis took ${Math.round(elapsed)}ms (budget ${SOFT_BUDGET_MS}ms, hard ${HARD_BUDGET_MS}ms)`
    ).toBeLessThan(HARD_BUDGET_MS);
    expect(elapsed).toBeLessThan(SOFT_BUDGET_MS);
  }, 60_000);

  it('scales with the source tree, not with assets × source tree', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: workspace });
    const snapshot = await indexer.initializeComplete();
    indexer.dispose();

    const index = await buildReferenceIndex({
      workspacePath: workspace,
      assets: snapshot.assets,
    });

    // The quadratic implementation performed ASSET_COUNT × SOURCE_FILE_COUNT reads
    // (18,000 here). Asserting the linear count is what makes the complexity claim
    // testable rather than merely documented.
    expect(index.summary.filesRead).toBe(SOURCE_FILE_COUNT);
    expect(index.summary.globInvocations).toBe(1);
    expect(index.summary.matchersCompiled).toBe(ASSET_COUNT);
  }, 60_000);
});
