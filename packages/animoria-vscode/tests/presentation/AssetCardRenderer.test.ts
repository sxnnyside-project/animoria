import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { AssetCardModel } from '../../src/presentation/AssetCardModel.js';
import { AssetCardRenderer } from '../../src/presentation/AssetCardRenderer.js';

function baseCard(overrides: Partial<AssetCardModel> = {}): AssetCardModel {
  return {
    stem: 'my-animation',
    path: '/workspace/my-animation.json',
    format: 'lottie',
    formatLabel: 'Lottie',
    formatDetail: null,
    width: null,
    height: null,
    durationSeconds: null,
    fps: null,
    sizeFormatted: '1.2 KB',
    thumbnailPath: null,
    referenceCount: null,
    hasGovernanceIssue: null,
    ...overrides,
  } as AssetCardModel;
}

describe('AssetCardRenderer thumbnail embedding', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'animoria-thumb-'));

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('embeds an SVG thumbnail with the svg+xml MIME type, not image/png', () => {
    const thumbnailPath = join(tmpDir, 'vector.svg');
    writeFileSync(thumbnailPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    const md = AssetCardRenderer.renderHoverCard(baseCard({ thumbnailPath }));

    expect(md.value).toContain('data:image/svg+xml;base64,');
    expect(md.value).not.toContain('data:image/png;base64,');
  });

  it('embeds a WEBP thumbnail with the webp MIME type, not image/png', () => {
    const thumbnailPath = join(tmpDir, 'embedded.webp');
    writeFileSync(thumbnailPath, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const md = AssetCardRenderer.renderHoverCard(baseCard({ thumbnailPath }));

    expect(md.value).toContain('data:image/webp;base64,');
    expect(md.value).not.toContain('data:image/png;base64,');
  });

  it('embeds a GIF thumbnail with the gif MIME type, not image/png', () => {
    const thumbnailPath = join(tmpDir, 'source-copy.gif');
    writeFileSync(thumbnailPath, Buffer.from('GIF89a'));

    const md = AssetCardRenderer.renderHoverCard(baseCard({ thumbnailPath }));

    expect(md.value).toContain('data:image/gif;base64,');
  });

  it('still embeds a PNG thumbnail with the png MIME type', () => {
    const thumbnailPath = join(tmpDir, 'badge.png');
    writeFileSync(thumbnailPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const md = AssetCardRenderer.renderHoverCard(baseCard({ thumbnailPath }));

    expect(md.value).toContain('data:image/png;base64,');
  });

  it('caps the hover thumbnail width so it does not render oversized', () => {
    const thumbnailPath = join(tmpDir, 'sized.png');
    writeFileSync(thumbnailPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const md = AssetCardRenderer.renderHoverCard(baseCard({ thumbnailPath }));

    expect(md.value).toMatch(/data:image\/png;base64,[^)]+\|width=\d+\)/);
  });
});
