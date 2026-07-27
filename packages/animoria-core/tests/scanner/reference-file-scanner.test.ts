import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnimoriaAsset } from '../../src/types/asset';
import { scanFileForAssetReferences } from '../../src/usage/reference-file-scanner';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-reffile-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function asset(path: string, name: string, stem: string): AnimoriaAsset {
  return { path, name, stem, format: 'lottie', sizeBytes: 1, mtime: 0, status: 'parsed' };
}

describe('scanFileForAssetReferences', () => {
  it('returns references keyed by asset path for every asset the file references', async () => {
    const workspace = await makeWorkspace();
    const filePath = join(workspace, 'App.ts');
    await writeFile(
      filePath,
      `import hero from '../../hero.json';\nimport other from '../unrelated.ts';\n`
    );

    const hero = asset('/w/hero.json', 'hero.json', 'hero');
    const confetti = asset('/w/confetti.json', 'confetti.json', 'confetti');

    const result = await scanFileForAssetReferences(filePath, [hero, confetti]);

    expect(result.size).toBe(1);
    expect(result.get(hero.path)).toHaveLength(1);
    expect(result.has(confetti.path)).toBe(false);
  });

  it('reports the correct line numbers and trimmed content', async () => {
    const workspace = await makeWorkspace();
    const filePath = join(workspace, 'App.ts');
    await writeFile(filePath, `// intro\nimport hero from '../../hero.json';\n`);

    const hero = asset('/w/hero.json', 'hero.json', 'hero');
    const result = await scanFileForAssetReferences(filePath, [hero]);

    const refs = result.get(hero.path)!;
    expect(refs[0]?.line).toBe(2);
    expect(refs[0]?.content).toContain('hero.json');
  });

  it('returns an empty map when the file references none of the given assets', async () => {
    const workspace = await makeWorkspace();
    const filePath = join(workspace, 'App.ts');
    await writeFile(filePath, `console.log('nothing to see here');\n`);

    const hero = asset('/w/hero.json', 'hero.json', 'hero');
    const result = await scanFileForAssetReferences(filePath, [hero]);

    expect(result.size).toBe(0);
  });

  it('returns an empty map for an unreadable/missing file rather than throwing', async () => {
    const hero = asset('/w/hero.json', 'hero.json', 'hero');
    const result = await scanFileForAssetReferences('/does/not/exist.ts', [hero]);
    expect(result.size).toBe(0);
  });

  it('returns an empty map immediately when given no assets', async () => {
    const workspace = await makeWorkspace();
    const filePath = join(workspace, 'App.ts');
    await writeFile(filePath, `import hero from '../../hero.json';\n`);

    const result = await scanFileForAssetReferences(filePath, []);
    expect(result.size).toBe(0);
  });
});
