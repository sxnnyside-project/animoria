import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ThumbnailEngine } from '../../src/thumbnails/thumbnail-engine';
import type { AnimoriaAsset } from '../../src/types/asset';

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-thumb-'));
  tempDirs.push(dir);
  return dir;
}

function baseAsset(overrides: Partial<AnimoriaAsset>): AnimoriaAsset {
  return {
    path: '',
    name: '',
    stem: '',
    format: 'lottie',
    sizeBytes: 10,
    mtime: Date.now(),
    status: 'parsed',
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ThumbnailEngine', () => {
  it('renders a vector SVG thumbnail for a Lottie asset with supported shapes', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'shape.json');
    const lottieDoc = {
      v: '5.9.0',
      fr: 30,
      ip: 0,
      op: 90,
      w: 100,
      h: 100,
      layers: [
        {
          ty: 4,
          ks: {},
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', p: { a: 0, k: [50, 50] }, s: { a: 0, k: [40, 40] } },
                { ty: 'fl', c: { a: 0, k: [1, 0, 0] } },
              ],
            },
          ],
        },
      ],
    };
    await writeFile(assetPath, JSON.stringify(lottieDoc));

    const asset = baseAsset({
      path: assetPath,
      name: 'shape.json',
      stem: 'shape',
      format: 'lottie',
      metadata: {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 30,
        totalFrames: 90,
        durationSeconds: 3,
        layerCount: 1,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.generated).toBe(1);
    expect(batch.failed).toBe(0);
    const [result] = batch.results;
    expect(result?.kind).toBe('vector');
    expect(result?.thumbnailPath).toMatch(/\.svg$/);

    const content = await readFile(result!.thumbnailPath!, 'utf-8');
    expect(content).toContain('<rect');
  });

  it('falls back to a format badge when the Lottie document has no renderable shapes', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'plain.json');
    await writeFile(
      assetPath,
      JSON.stringify({ v: '5.9.0', fr: 30, ip: 0, op: 90, w: 100, h: 100, layers: [] })
    );

    const asset = baseAsset({
      path: assetPath,
      name: 'plain.json',
      stem: 'plain',
      format: 'lottie',
      metadata: {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 30,
        totalFrames: 90,
        durationSeconds: 3,
        layerCount: 0,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results[0]?.kind).toBe('badge');
    const content = await readFile(batch.results[0]!.thumbnailPath!, 'utf-8');
    expect(content).toContain('LOTTIE');
  });

  it("does not delete a same-stem asset's thumbnail from a different folder when regenerating another", async () => {
    // Real-world workspaces routinely have the same filename stem
    // (icon.json, success.json, ...) recurring across different feature
    // folders. Cleanup must be scoped per-asset, not per-stem, or
    // generating one asset's thumbnail deletes a same-stem asset's
    // current thumbnail out from under it.
    const workspace = await makeWorkspace();
    await mkdir(join(workspace, 'folderA'), { recursive: true });
    await mkdir(join(workspace, 'folderB'), { recursive: true });
    const pathA = join(workspace, 'folderA', 'hero.json');
    const pathB = join(workspace, 'folderB', 'hero.json');
    const emptyDoc = (w: number) =>
      JSON.stringify({ v: '5.9.0', fr: 30, ip: 0, op: 90, w, h: w, layers: [] });
    await writeFile(pathA, emptyDoc(100));
    await writeFile(pathB, emptyDoc(200));

    const metadata = (w: number) => ({
      format: 'lottie' as const,
      width: w,
      height: w,
      fps: 30,
      totalFrames: 90,
      durationSeconds: 3,
      layerCount: 0,
    });
    const assetA = baseAsset({
      path: pathA,
      name: 'hero.json',
      stem: 'hero',
      format: 'lottie',
      metadata: metadata(100),
    });
    const assetB = baseAsset({
      path: pathB,
      name: 'hero.json',
      stem: 'hero',
      format: 'lottie',
      metadata: metadata(200),
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([assetA, assetB]);

    const [resultA, resultB] = batch.results;
    expect(resultA?.thumbnailPath).not.toBeNull();
    expect(resultB?.thumbnailPath).not.toBeNull();
    expect(resultA?.thumbnailPath).not.toEqual(resultB?.thumbnailPath);

    // Both files must still exist on disk after the batch — neither
    // asset's regeneration should have deleted the other's.
    await expect(readFile(resultA!.thumbnailPath!)).resolves.toBeDefined();
    await expect(readFile(resultB!.thumbnailPath!)).resolves.toBeDefined();
  });

  it('reuses the original bytes for GIF assets', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'anim.gif');
    await writeFile(assetPath, Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    const asset = baseAsset({
      path: assetPath,
      name: 'anim.gif',
      stem: 'anim',
      format: 'gif',
      metadata: {
        format: 'gif',
        width: 10,
        height: 10,
        durationSeconds: 1,
        frameCount: 2,
        loopCount: 0,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results[0]?.kind).toBe('source-copy');
    expect(batch.results[0]?.thumbnailPath).toMatch(/\.gif$/);
  });

  it('skips assets that failed parsing', async () => {
    const workspace = await makeWorkspace();
    const asset = baseAsset({
      path: join(workspace, 'broken.json'),
      status: 'error',
      error: 'boom',
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results).toHaveLength(0);
  });

  it('reuses a cached thumbnail on a second call without re-rendering', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'anim.gif');
    await writeFile(assetPath, Buffer.from([0x47, 0x49, 0x46]));
    const asset = baseAsset({
      path: assetPath,
      name: 'anim.gif',
      stem: 'anim',
      format: 'gif',
      metadata: {
        format: 'gif',
        width: 10,
        height: 10,
        durationSeconds: 1,
        frameCount: 1,
        loopCount: 0,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const first = await engine.generateBatch([asset]);
    expect(first.results[0]?.fromCache).toBe(false);

    const second = await engine.generateBatch([asset]);
    expect(second.results[0]?.fromCache).toBe(true);
    expect(second.fromCache).toBe(1);
  });

  it('busts the cache when the asset is modified', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'anim.gif');
    await writeFile(assetPath, Buffer.from([0x01]));
    const asset1 = baseAsset({
      path: assetPath,
      name: 'anim.gif',
      stem: 'anim',
      format: 'gif',
      sizeBytes: 1,
      mtime: 1000,
    });
    const asset2 = baseAsset({
      path: assetPath,
      name: 'anim.gif',
      stem: 'anim',
      format: 'gif',
      sizeBytes: 2,
      mtime: 2000,
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const first = await engine.generateBatch([asset1]);
    const second = await engine.generateBatch([asset2]);

    expect(first.results[0]?.thumbnailPath).not.toEqual(second.results[0]?.thumbnailPath);
  });

  it('throws when generateBatch is called after dispose', async () => {
    const workspace = await makeWorkspace();
    const engine = new ThumbnailEngine({ workspacePath: workspace });
    await engine.dispose();
    await expect(engine.generateBatch([baseAsset({ path: 'x' })])).rejects.toThrow();
  });

  it('creates the thumbnail directory under .animoria/thumbnails', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'badge-me.riv');
    await writeFile(assetPath, Buffer.from([0x00]));
    const asset = baseAsset({
      path: assetPath,
      name: 'badge-me.riv',
      stem: 'badge-me',
      format: 'rive',
      metadata: {
        format: 'rive',
        width: 1,
        height: 1,
        durationSeconds: 0,
        artboards: [],
        stateMachines: [],
        animations: [],
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results[0]?.thumbnailPath).toContain(join('.animoria', 'thumbnails'));
    await mkdir(join(workspace, '.animoria', 'thumbnails'), { recursive: true }); // idempotency guard, no-op if already present
  });

  /**
   * Regresses the specific complaint that prompted this tier: a real-world
   * Lottie document with an image layer previously fell straight through
   * to a generic format badge (the vector tier bails on any image/precomp/
   * text layer), even though the document embeds the exact image that
   * layer displays. This asset must now surface that embedded image as
   * its thumbnail instead.
   */
  it('extracts an embedded image as the thumbnail when the document has an unsupported (image) layer', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'illustration.json');
    const lottieDoc = {
      v: '5.9.0',
      fr: 30,
      ip: 0,
      op: 90,
      w: 100,
      h: 100,
      assets: [{ id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 }],
      layers: [{ ty: 2, refId: 'image_0' }],
    };
    await writeFile(assetPath, JSON.stringify(lottieDoc));

    const asset = baseAsset({
      path: assetPath,
      name: 'illustration.json',
      stem: 'illustration',
      format: 'lottie',
      metadata: {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 30,
        totalFrames: 90,
        durationSeconds: 3,
        layerCount: 1,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results[0]?.kind).toBe('embedded-image');
    expect(batch.results[0]?.thumbnailPath).toMatch(/\.png$/);
    const bytes = await readFile(batch.results[0]!.thumbnailPath!);
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  /**
   * Reproduces the realistic After Effects/Bodymovin export shape: a
   * top-level precomp layer whose actual image layer — referencing an
   * *external* image file (`e: 0`, the default for real exports, not the
   * rare embedded-base64 case) — lives inside the precomp's own nested
   * `layers` array. This is the dominant real-world case the badge/SVG
   * fallback was firing for even after the embedded-base64 fix, since
   * that fix only handled `e: 1` data URIs and never walked into
   * precomps to find the image layer in the first place.
   */
  it('resolves an externally-referenced image nested inside a precomp, matching real AE exports', async () => {
    const workspace = await makeWorkspace();
    await mkdir(join(workspace, 'images'), { recursive: true });
    const pngBytes = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64');
    await writeFile(join(workspace, 'images', 'img_0.png'), pngBytes);

    const assetPath = join(workspace, 'hero.json');
    const lottieDoc = {
      v: '5.9.6',
      fr: 30,
      ip: 0,
      op: 90,
      w: 512,
      h: 512,
      assets: [
        { id: 'image_0', u: 'images/', p: 'img_0.png', e: 0 },
        { id: 'comp_0', layers: [{ ty: 2, refId: 'image_0' }] },
      ],
      layers: [{ ty: 0, refId: 'comp_0' }],
    };
    await writeFile(assetPath, JSON.stringify(lottieDoc));

    const asset = baseAsset({
      path: assetPath,
      name: 'hero.json',
      stem: 'hero',
      format: 'lottie',
      metadata: {
        format: 'lottie',
        width: 512,
        height: 512,
        fps: 30,
        totalFrames: 90,
        durationSeconds: 3,
        layerCount: 1,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results[0]?.kind).toBe('embedded-image');
    expect(batch.results[0]?.thumbnailPath).toMatch(/\.png$/);
    const bytes = await readFile(batch.results[0]!.thumbnailPath!);
    expect(bytes).toEqual(pngBytes);
  });

  it('still falls back to a badge when an unsupported layer is present and no embedded image exists', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'precomp-only.json');
    // A precomp layer with no embedded raster anywhere in the document.
    await writeFile(
      assetPath,
      JSON.stringify({
        v: '5.9.0',
        fr: 30,
        ip: 0,
        op: 90,
        w: 100,
        h: 100,
        assets: [{ id: 'comp_0', layers: [] }],
        layers: [{ ty: 0, refId: 'comp_0' }],
      })
    );

    const asset = baseAsset({
      path: assetPath,
      name: 'precomp-only.json',
      stem: 'precomp-only',
      format: 'lottie',
      metadata: {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 30,
        totalFrames: 90,
        durationSeconds: 3,
        layerCount: 1,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const batch = await engine.generateBatch([asset]);

    expect(batch.results[0]?.kind).toBe('badge');
  });

  it('reuses a cached embedded-image thumbnail on a second call without regenerating', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'illustration.json');
    await writeFile(
      assetPath,
      JSON.stringify({
        v: '5.9.0',
        fr: 30,
        ip: 0,
        op: 90,
        w: 100,
        h: 100,
        assets: [{ id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 }],
        layers: [{ ty: 2, refId: 'image_0' }],
      })
    );
    const asset = baseAsset({
      path: assetPath,
      name: 'illustration.json',
      stem: 'illustration',
      format: 'lottie',
      metadata: {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 30,
        totalFrames: 90,
        durationSeconds: 3,
        layerCount: 1,
      },
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const first = await engine.generateBatch([asset]);
    expect(first.results[0]?.fromCache).toBe(false);

    const second = await engine.generateBatch([asset]);
    expect(second.results[0]?.fromCache).toBe(true);
    expect(second.results[0]?.thumbnailPath).toBe(first.results[0]?.thumbnailPath);
  });

  /**
   * Regresses the "two thumbnail files coexist and it's unclear which one
   * is actually used" complaint directly: when an asset's content changes
   * such that a different tier now wins (vector succeeds, then a later
   * edit makes it fall back to embedded-image), the previous tier's file
   * must not be left behind — exactly one thumbnail file may exist for
   * this asset once generation completes.
   */
  it("deletes the previous tier's cached file when a content change causes a different tier to win", async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'shifting.json');
    const thumbnailDir = join(workspace, '.animoria', 'thumbnails');

    const renderableDoc = {
      v: '5.9.0',
      fr: 30,
      ip: 0,
      op: 90,
      w: 100,
      h: 100,
      layers: [
        {
          ty: 4,
          ks: {},
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', p: { a: 0, k: [50, 50] }, s: { a: 0, k: [40, 40] } },
                { ty: 'fl', c: { a: 0, k: [1, 0, 0] } },
              ],
            },
          ],
        },
      ],
    };
    await writeFile(assetPath, JSON.stringify(renderableDoc));

    const metadata = {
      format: 'lottie' as const,
      width: 100,
      height: 100,
      fps: 30,
      totalFrames: 90,
      durationSeconds: 3,
      layerCount: 1,
    };

    const firstAsset = baseAsset({
      path: assetPath,
      name: 'shifting.json',
      stem: 'shifting',
      format: 'lottie',
      sizeBytes: JSON.stringify(renderableDoc).length,
      mtime: 1000,
      metadata,
    });

    const engine = new ThumbnailEngine({ workspacePath: workspace });
    const first = await engine.generateBatch([firstAsset]);
    expect(first.results[0]?.kind).toBe('vector');
    expect(first.results[0]?.thumbnailPath).toMatch(/\.svg$/);

    // Edit the file so the cache key changes and the vector tier can no
    // longer render it, but an embedded image is now available.
    const embeddedDoc = {
      v: '5.9.0',
      fr: 30,
      ip: 0,
      op: 90,
      w: 100,
      h: 100,
      assets: [{ id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 }],
      layers: [{ ty: 2, refId: 'image_0' }],
    };
    await writeFile(assetPath, JSON.stringify(embeddedDoc));

    const secondAsset = baseAsset({
      path: assetPath,
      name: 'shifting.json',
      stem: 'shifting',
      format: 'lottie',
      sizeBytes: JSON.stringify(embeddedDoc).length,
      mtime: 2000,
      metadata,
    });

    const second = await engine.generateBatch([secondAsset]);
    expect(second.results[0]?.kind).toBe('embedded-image');

    const filesOnDisk = (await readdir(thumbnailDir)).filter((name) =>
      name.startsWith('shifting-')
    );
    expect(filesOnDisk).toHaveLength(1);
    expect(filesOnDisk[0]).toBe(second.results[0]!.thumbnailPath!.slice(thumbnailDir.length + 1));
  });
});
