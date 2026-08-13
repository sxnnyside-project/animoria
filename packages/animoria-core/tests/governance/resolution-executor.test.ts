import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { restoreTrashSession } from '../../src/cleanup/trash';
import { hashAssetContent } from '../../src/governance/duplicates/content-hash';
import { executeResolutionPlan } from '../../src/governance/duplicates/resolution-executor';
import { buildResolutionPlan } from '../../src/governance/duplicates/resolution-plan';
import type { DuplicateGroup } from '../../src/governance/duplicates/types';
import type { AnimoriaAsset } from '../../src/types/asset';

/**
 * Duplicate resolution end to end, against a real workspace on disk.
 *
 * ## Why this is filesystem-backed rather than mocked
 * The property under test is that a developer's source files still compile after
 * a resolution — an import points at a file that exists. A mocked filesystem can
 * confirm the strings changed; only a real one can confirm the path they changed
 * *to* actually resolves to a file. That distinction is the entire defect this
 * node fixes: the previous implementation rewrote `vendor/copy.json` to
 * `vendor/canonical.json`, a plausible string naming a nonexistent file.
 */
const LOTTIE = JSON.stringify({ v: '5.7.4', fr: 30, ip: 0, op: 60, w: 1, h: 1, layers: [] });

describe('executeResolutionPlan', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'animoria-resolve-'));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  function write(relativePath: string, content: string): string {
    const full = join(workspace, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    return full;
  }

  function asset(path: string): AnimoriaAsset {
    const name = path.split('/').pop() ?? path;
    return {
      path,
      name,
      stem: name.replace(/\.[^.]+$/, ''),
      format: 'lottie',
      sizeBytes: Buffer.byteLength(LOTTIE),
      mtime: Date.now(),
      status: 'parsed',
    };
  }

  async function groupOf(...assets: AnimoriaAsset[]): Promise<DuplicateGroup> {
    const hash = await hashAssetContent(assets[0]!);
    return {
      id: hash,
      matchKind: 'content-hash',
      contentHash: hash,
      candidates: assets.map((a) => ({ asset: a, referenceCount: 0 })),
      sizeBytes: assets[0]!.sizeBytes,
      potentialSavingsBytes: (assets.length - 1) * assets[0]!.sizeBytes,
    };
  }

  it('rewrites the reference to a path that actually resolves, then trashes the duplicate', async () => {
    const canonical = asset(write('assets/spinner.json', LOTTIE));
    const duplicate = asset(write('src/vendor/spinner-copy.json', LOTTIE));
    const source = write('src/app.ts', `import s from './vendor/spinner-copy.json';\n`);

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: await groupOf(canonical, duplicate),
      canonicalAsset: canonical,
    });
    expect(plan.safety).toBe('complete');

    const result = await executeResolutionPlan(plan, { workspacePath: workspace });

    expect(result.status).toBe('applied');
    expect(result.updatedReferenceCount).toBe(1);

    // The rewritten import must name a file that exists — the whole point.
    const rewritten = readFileSync(source, 'utf-8');
    expect(rewritten).toContain(`'../assets/spinner.json'`);
    const target = join(dirname(source), '../assets/spinner.json');
    expect(existsSync(target)).toBe(true);

    // The duplicate moved to trash, not deleted.
    expect(existsSync(duplicate.path)).toBe(false);
    expect(result.trashLocation).toContain(join('.animoria', 'trash'));
  });

  it('is undoable: restoring the trash session brings the duplicate back', async () => {
    const canonical = asset(write('assets/spinner.json', LOTTIE));
    const duplicate = asset(write('src/vendor/spinner-copy.json', LOTTIE));
    write('src/app.ts', `import s from './vendor/spinner-copy.json';\n`);

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: await groupOf(canonical, duplicate),
      canonicalAsset: canonical,
    });
    const result = await executeResolutionPlan(plan, { workspacePath: workspace });
    expect(result.trashSessionId).not.toBeNull();

    const restored = await restoreTrashSession(workspace, result.trashSessionId!);

    expect(restored.restoredPaths).toEqual([duplicate.path]);
    expect(existsSync(duplicate.path)).toBe(true);
  });

  it('refuses a partial plan unless the caller explicitly opts in', async () => {
    const canonical = asset(write('assets/logo.json', LOTTIE));
    const duplicate = asset(write('brand/logo-old.json', LOTTIE));
    // An aliased import: matched by filename, but its real path is bundler-resolved.
    write('src/app.ts', `import l from '@/brand/logo-old.json';\n`);

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: await groupOf(canonical, duplicate),
      canonicalAsset: canonical,
    });

    expect(plan.safety).toBe('partial');
    expect(plan.unrewritableReferences.length).toBeGreaterThan(0);

    const refused = await executeResolutionPlan(plan, { workspacePath: workspace });

    expect(refused.status).toBe('rejected');
    // Nothing moved: a partial resolution has to be an informed choice.
    expect(existsSync(duplicate.path)).toBe(true);
    expect(refused.issues.length).toBeGreaterThan(0);

    const allowed = await executeResolutionPlan(plan, {
      workspacePath: workspace,
      allowPartial: true,
    });
    expect(allowed.status).toBe('applied');
    expect(existsSync(duplicate.path)).toBe(false);
  });

  it('rejects a plan whose duplicate changed since it was built, touching nothing', async () => {
    const canonical = asset(write('assets/spinner.json', LOTTIE));
    const duplicate = asset(write('src/vendor/spinner-copy.json', LOTTIE));
    const source = write('src/app.ts', `import s from './vendor/spinner-copy.json';\n`);

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: await groupOf(canonical, duplicate),
      canonicalAsset: canonical,
    });

    // Someone edits the "duplicate" — it is no longer identical, so deleting it
    // would destroy content that is not a copy of anything.
    writeFileSync(duplicate.path, `${LOTTIE}\n// edited`);

    const result = await executeResolutionPlan(plan, { workspacePath: workspace });

    expect(result.status).toBe('rejected');
    expect(result.issues.some((i) => i.kind === 'asset-changed')).toBe(true);
    expect(existsSync(duplicate.path)).toBe(true);
    // The source file is untouched too — rejection is total, not partial.
    expect(readFileSync(source, 'utf-8')).toContain(`'./vendor/spinner-copy.json'`);
  });

  it('rewrites every reference across several files and several duplicates', async () => {
    const canonical = asset(write('assets/icon.json', LOTTIE));
    const dupA = asset(write('src/a/icon.json', LOTTIE));
    const dupB = asset(write('src/b/icon.json', LOTTIE));
    const usesA = write('src/uses-a.ts', `import i from './a/icon.json';\n`);
    const usesB = write('src/uses-b.ts', `import i from './b/icon.json';\n`);

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: await groupOf(canonical, dupA, dupB),
      canonicalAsset: canonical,
    });

    const result = await executeResolutionPlan(plan, { workspacePath: workspace });

    expect(result.status).toBe('applied');
    expect(result.updatedReferenceCount).toBe(2);
    expect(result.removedAssetPaths.sort()).toEqual([dupA.path, dupB.path].sort());
    expect(readFileSync(usesA, 'utf-8')).toContain(`'../assets/icon.json'`);
    expect(readFileSync(usesB, 'utf-8')).toContain(`'../assets/icon.json'`);
  });

  it('rewrites several references in one file with a single write', async () => {
    const canonical = asset(write('assets/icon.json', LOTTIE));
    const duplicate = asset(write('src/old/icon.json', LOTTIE));
    const source = write(
      'src/app.ts',
      [
        `import a from './old/icon.json';`,
        `const keep = 'unrelated';`,
        `import b from './old/icon.json';`,
        '',
      ].join('\n')
    );

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: await groupOf(canonical, duplicate),
      canonicalAsset: canonical,
    });
    const result = await executeResolutionPlan(plan, { workspacePath: workspace });

    expect(result.updatedReferenceCount).toBe(2);
    const lines = readFileSync(source, 'utf-8').split('\n');
    expect(lines[0]).toBe(`import a from '../assets/icon.json';`);
    // The untouched line survives byte-for-byte — rewriting is per-reference,
    // never a whole-file transform.
    expect(lines[1]).toBe(`const keep = 'unrelated';`);
    expect(lines[2]).toBe(`import b from '../assets/icon.json';`);
  });
});
