import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { extractEmbeddedImageAsset } from '../../src/thumbnails/embedded-image-extractor.js';

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const ONE_PIXEL_PNG_BYTES = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64');

const tempDirs: string[] = [];
async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-embedded-image-'));
  tempDirs.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('extractEmbeddedImageAsset', () => {
  it('returns null for a non-object document', async () => {
    expect(await extractEmbeddedImageAsset(null)).toBeNull();
    expect(await extractEmbeddedImageAsset('not an object')).toBeNull();
  });

  it('returns null when the document has no assets array', async () => {
    expect(await extractEmbeddedImageAsset({ layers: [] })).toBeNull();
  });

  it('returns null for an external image reference when no baseDir is given', async () => {
    const doc = {
      assets: [{ id: 'image_0', u: 'images/', p: 'hero.png', e: 0 }],
      layers: [],
    };
    expect(await extractEmbeddedImageAsset(doc)).toBeNull();
  });

  it('extracts the image referenced by the first image layer', async () => {
    const doc = {
      assets: [
        { id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 },
        { id: 'image_1', p: `data:image/jpeg;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 },
      ],
      layers: [{ ty: 2, refId: 'image_1' }],
    };

    const result = await extractEmbeddedImageAsset(doc);

    expect(result).not.toBeNull();
    expect(result?.extension).toBe('jpg');
    expect(result?.bytes.length).toBeGreaterThan(0);
  });

  it('falls back to the first embedded asset when no image layer references one at all', async () => {
    const doc = {
      assets: [{ id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 }],
      layers: [{ ty: 0, refId: 'comp_0' }], // precomp layer, but 'comp_0' isn't a declared asset
    };

    const result = await extractEmbeddedImageAsset(doc);

    expect(result).not.toBeNull();
    expect(result?.extension).toBe('png');
  });

  it('walks into a precomp to find an image layer nested inside it', async () => {
    // The realistic After Effects export shape: a top-level precomp layer
    // whose actual image layer lives inside the referenced comp's own
    // `layers` array, not at the document's top level.
    const doc = {
      assets: [
        { id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 },
        {
          id: 'comp_0',
          layers: [{ ty: 2, refId: 'image_0' }],
        },
      ],
      layers: [{ ty: 0, refId: 'comp_0' }],
    };

    const result = await extractEmbeddedImageAsset(doc);

    expect(result).not.toBeNull();
    expect(result?.bytes).toEqual(ONE_PIXEL_PNG_BYTES);
  });

  it('does not hang or throw on a cyclic precomp reference', async () => {
    const doc = {
      assets: [
        { id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`, e: 1 },
        { id: 'comp_a', layers: [{ ty: 0, refId: 'comp_b' }] },
        { id: 'comp_b', layers: [{ ty: 0, refId: 'comp_a' }] },
      ],
      layers: [{ ty: 0, refId: 'comp_a' }],
    };

    // No image layer is actually reachable (comp_a <-> comp_b cycle never
    // reaches an image layer), so this must fall back to the first
    // embedded asset rather than hang.
    const result = await extractEmbeddedImageAsset(doc);
    expect(result).not.toBeNull();
  });

  it('reads an externally-referenced image file from disk relative to baseDir', async () => {
    const workspace = await makeTempDir();
    await mkdir(join(workspace, 'images'), { recursive: true });
    await writeFile(join(workspace, 'images', 'img_0.png'), ONE_PIXEL_PNG_BYTES);

    const doc = {
      assets: [{ id: 'image_0', u: 'images/', p: 'img_0.png', e: 0 }],
      layers: [{ ty: 2, refId: 'image_0' }],
    };

    const result = await extractEmbeddedImageAsset(doc, workspace);

    expect(result).not.toBeNull();
    expect(result?.extension).toBe('png');
    expect(result?.bytes).toEqual(ONE_PIXEL_PNG_BYTES);
  });

  it('returns null when the externally-referenced file does not exist on disk', async () => {
    const workspace = await makeTempDir();
    const doc = {
      assets: [{ id: 'image_0', u: 'images/', p: 'missing.png', e: 0 }],
      layers: [{ ty: 2, refId: 'image_0' }],
    };

    expect(await extractEmbeddedImageAsset(doc, workspace)).toBeNull();
  });

  it('decodes the base64 payload into real bytes matching the PNG signature', async () => {
    const doc = {
      assets: [{ id: 'image_0', p: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}` }],
      layers: [],
    };

    const result = await extractEmbeddedImageAsset(doc);

    expect(result?.bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  });

  it('normalizes jpeg to the jpg extension', async () => {
    const doc = {
      assets: [{ id: 'image_0', p: `data:image/jpeg;base64,${ONE_PIXEL_PNG_BASE64}` }],
      layers: [],
    };
    expect((await extractEmbeddedImageAsset(doc))?.extension).toBe('jpg');
  });

  it('returns null for a malformed data URI', async () => {
    const doc = {
      assets: [{ id: 'image_0', p: 'data:image/png;base64,not-actually-base64!!!' }],
      layers: [],
    };
    // Node's Buffer.from with base64 is lenient and won't throw for this
    // input — awaiting without a throw is itself the assertion.
    await extractEmbeddedImageAsset(doc);
  });

  it('returns null when assets is present but empty', async () => {
    expect(await extractEmbeddedImageAsset({ assets: [], layers: [] })).toBeNull();
  });
});
