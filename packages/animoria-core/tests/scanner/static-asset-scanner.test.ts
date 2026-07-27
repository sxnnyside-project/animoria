import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { StaticAssetScanner } from '../../src/scanner/static-asset-scanner';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-static-scan-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('StaticAssetScanner', () => {
  it('discovers PNG, JPEG, WebP, AVIF, and SVG files as static assets', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(join(workspace, 'photo.jpg'), Buffer.from([0xff, 0xd8, 0xff]));
    await writeFile(join(workspace, 'banner.webp'), Buffer.from('RIFF....WEBP'));
    await writeFile(join(workspace, 'hero.avif'), Buffer.from('avif-stub'));
    await writeFile(
      join(workspace, 'favicon.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'
    );

    const scanner = new StaticAssetScanner({ workspacePath: workspace });
    const result = await scanner.scan();

    const formats = result.assets.map((a) => a.format).sort();
    expect(formats).toEqual(['avif', 'jpeg', 'png', 'svg', 'webp']);
  });

  it('recognizes .jpeg and .jfif as the jpeg format', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'a.jpeg'), Buffer.from([0xff, 0xd8]));
    await writeFile(join(workspace, 'b.jfif'), Buffer.from([0xff, 0xd8]));

    const scanner = new StaticAssetScanner({ workspacePath: workspace });
    const result = await scanner.scan();

    expect(result.assets.every((a) => a.format === 'jpeg')).toBe(true);
    expect(result.assets).toHaveLength(2);
  });

  it('ignores animated-only extensions (.json, .riv, .gif, .apng)', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'hero.json'), '{}');
    await writeFile(join(workspace, 'hero.riv'), 'stub');
    await writeFile(join(workspace, 'hero.gif'), 'stub');
    await writeFile(join(workspace, 'hero.apng'), 'stub');

    const scanner = new StaticAssetScanner({ workspacePath: workspace });
    const result = await scanner.scan();

    expect(result.assets).toHaveLength(0);
  });

  it('excludes node_modules and other default-ignored directories', async () => {
    const workspace = await makeWorkspace();
    await mkdir(join(workspace, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(workspace, 'node_modules', 'pkg', 'logo.png'), Buffer.from([0x89]));
    await writeFile(join(workspace, 'real-icon.png'), Buffer.from([0x89]));

    const scanner = new StaticAssetScanner({ workspacePath: workspace });
    const result = await scanner.scan();

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]?.name).toBe('real-icon.png');
  });
});
