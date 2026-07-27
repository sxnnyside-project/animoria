import type { AnimoriaAsset } from '@animoria/core';
import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { AnimoriaTreeItem } from '../../src/providers/AnimoriaTreeProvider.js';

function baseAsset(overrides: Partial<AnimoriaAsset> = {}): AnimoriaAsset {
  return {
    path: '/workspace/hero.json',
    name: 'hero.json',
    stem: 'hero',
    format: 'lottie',
    sizeBytes: 1024,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'lottie',
      fps: 30,
      totalFrames: 90,
      durationSeconds: 3,
      width: 100,
      height: 100,
      layerCount: 1,
      markers: [],
    },
    ...overrides,
  } as AnimoriaAsset;
}

describe('AnimoriaTreeItem thumbnail state affordance', () => {
  it('shows a spinner while thumbnail generation has not completed', () => {
    const item = new AnimoriaTreeItem(baseAsset(), undefined, [], false);

    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('loading~spin');
  });

  it('shows the generated thumbnail file once one exists, regardless of tier', () => {
    const item = new AnimoriaTreeItem(
      baseAsset(),
      '/workspace/.animoria/thumbnails/hero.svg',
      [],
      false
    );

    expect(item.iconPath).toBeInstanceOf(vscode.Uri);
  });

  it('shows a distinct static icon (not the spinner) when generation genuinely failed', () => {
    const item = new AnimoriaTreeItem(baseAsset(), undefined, [], true);

    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    const icon = item.iconPath as vscode.ThemeIcon;
    expect(icon.id).toBe('circle-slash');
    expect(icon.id).not.toBe('loading~spin');
  });

  it('prefers a present thumbnail file over the unavailable flag', () => {
    // Once a file exists, it is a completed result — the transient
    // "unavailable" flag from an earlier failed attempt (now superseded)
    // must never override an actual, current thumbnail.
    const item = new AnimoriaTreeItem(
      baseAsset(),
      '/workspace/.animoria/thumbnails/hero.svg',
      [],
      true
    );

    expect(item.iconPath).toBeInstanceOf(vscode.Uri);
  });
});
