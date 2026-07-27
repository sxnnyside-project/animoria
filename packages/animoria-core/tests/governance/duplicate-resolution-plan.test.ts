import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectDuplicateGroups } from '../../src/governance/duplicates/duplicate-group-detector';
import { buildResolutionPlan } from '../../src/governance/duplicates/resolution-plan';
import { validateResolutionPlan } from '../../src/governance/duplicates/resolution-plan-validator';
import { buildResolutionSummary } from '../../src/governance/duplicates/resolution-summary';
import type { AnimoriaAsset } from '../../src/types/asset';
import type { DuplicateGroup } from '../../src/governance/duplicates/types';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-resplan-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function asset(path: string): AnimoriaAsset {
  const name = path.split('/').pop()!;
  return {
    path,
    name,
    stem: name.replace(/\.\w+$/, ''),
    format: 'lottie',
    sizeBytes: 12,
    mtime: 0,
    status: 'parsed',
  };
}

async function setupDuplicateWorkspace(): Promise<{
  workspace: string;
  canonical: AnimoriaAsset;
  duplicate: AnimoriaAsset;
  sourceFile: string;
}> {
  const workspace = await makeWorkspace();
  const canonicalPath = join(workspace, 'hero.json');
  const duplicatePath = join(workspace, 'hero-copy.json');
  await writeFile(canonicalPath, 'identical content');
  await writeFile(duplicatePath, 'identical content');

  await mkdir(join(workspace, 'src'), { recursive: true });
  const sourceFile = join(workspace, 'src', 'App.ts');
  await writeFile(sourceFile, `import heroCopy from '../hero-copy.json';\n`);

  return {
    workspace,
    canonical: asset(canonicalPath),
    duplicate: asset(duplicatePath),
    sourceFile,
  };
}

describe('buildResolutionPlan', () => {
  it('lists every non-canonical candidate as an asset to delete', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    expect(plan.assetsToDelete.map((a) => a.path)).toEqual([duplicate.path]);
    expect(plan.canonicalAsset.path).toBe(canonical.path);
  });

  it('generates a reference update rewriting the duplicate name to the canonical name', async () => {
    const { workspace, canonical, duplicate, sourceFile } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    expect(plan.referenceUpdates).toHaveLength(1);
    const update = plan.referenceUpdates[0]!;
    expect(update.file).toBe(sourceFile);
    expect(update.oldText).toContain('hero-copy.json');
    expect(update.newText).toContain('hero.json');
    expect(update.newText).not.toContain('hero-copy.json');
  });

  it('computes estimatedSavingsBytes as the sum of deleted assets sizes', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());

    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    expect(plan.estimatedSavingsBytes).toBe(duplicate.sizeBytes);
  });

  it('handles a group larger than two candidates, deleting every non-canonical one', async () => {
    const workspace = await makeWorkspace();
    const paths = ['a.json', 'b.json', 'c.json', 'd.json'].map((n) => join(workspace, n));
    await Promise.all(paths.map((p) => writeFile(p, 'shared content')));
    const assets = paths.map((p) => asset(p));

    const [group] = await detectDuplicateGroups(assets, new Map());
    const canonical = assets[0]!;
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    expect(plan.assetsToDelete).toHaveLength(3);
    expect(plan.assetsToDelete.map((a) => a.path)).not.toContain(canonical.path);
  });

  it('does not touch the filesystem — building a plan is read-only', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    // Both files must still exist untouched.
    const { stat } = await import('node:fs/promises');
    await expect(stat(duplicate.path)).resolves.toBeDefined();
    await expect(stat(canonical.path)).resolves.toBeDefined();
  });
});

describe('validateResolutionPlan', () => {
  it('reports valid: true for a plan whose assumptions still hold', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    expect(await validateResolutionPlan(plan)).toEqual({ valid: true });
  });

  it('reports asset-missing when a duplicate was deleted after the plan was built', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    const { unlink } = await import('node:fs/promises');
    await unlink(duplicate.path);

    const result = await validateResolutionPlan(plan);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]!.kind).toBe('asset-missing');
    }
  });

  it('reports asset-changed when a duplicate content diverges after the plan was built', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    await writeFile(duplicate.path, 'now this file is different');

    const result = await validateResolutionPlan(plan);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]!.kind).toBe('asset-changed');
    }
  });

  it('reports reference-changed when a referencing line was edited after the plan was built', async () => {
    const { workspace, canonical, duplicate, sourceFile } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    await writeFile(sourceFile, `import heroCopy from '../something-else.json';\n`);

    const result = await validateResolutionPlan(plan);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]!.kind).toBe('reference-changed');
    }
  });

  it('reports reference-missing when the referencing file was deleted after the plan was built', async () => {
    const { workspace, canonical, duplicate, sourceFile } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    const { unlink } = await import('node:fs/promises');
    await unlink(sourceFile);

    const result = await validateResolutionPlan(plan);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((i) => i.kind === 'reference-missing')).toBe(true);
    }
  });

  it('reports every problem found, not just the first', async () => {
    const { workspace, canonical, duplicate, sourceFile } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    const { unlink } = await import('node:fs/promises');
    await unlink(duplicate.path);
    await unlink(sourceFile);

    const result = await validateResolutionPlan(plan);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('buildResolutionSummary', () => {
  it('reports counts and recovered bytes from the plan', async () => {
    const { workspace, canonical, duplicate } = await setupDuplicateWorkspace();
    const [group] = await detectDuplicateGroups([canonical, duplicate], new Map());
    const plan = await buildResolutionPlan({
      workspacePath: workspace,
      group: group!,
      canonicalAsset: canonical,
    });

    const summary = buildResolutionSummary(plan, { before: 80, after: 92 }, 0);

    expect(summary.removedAssetCount).toBe(1);
    expect(summary.updatedReferenceCount).toBe(1);
    expect(summary.recoveredBytes).toBe(duplicate.sizeBytes);
    expect(summary.remainingDiagnosticCount).toBe(0);
  });

  it('computes healthScoreDelta when both scores are available', () => {
    const summary = buildResolutionSummary(
      {
        group: {} as DuplicateGroup,
        canonicalAsset: {} as AnimoriaAsset,
        assetsToDelete: [],
        referenceUpdates: [],
        estimatedSavingsBytes: 0,
      },
      { before: 86, after: 93 },
      0
    );
    expect(summary.healthScoreDelta).toBe(7);
  });

  it('leaves healthScoreDelta null when either score is unavailable', () => {
    const summary = buildResolutionSummary(
      {
        group: {} as DuplicateGroup,
        canonicalAsset: {} as AnimoriaAsset,
        assetsToDelete: [],
        referenceUpdates: [],
        estimatedSavingsBytes: 0,
      },
      { before: null, after: 93 },
      0
    );
    expect(summary.healthScoreDelta).toBeNull();
  });
});
