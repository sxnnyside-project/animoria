import type { Asset, RuleDiagnostic, UsageReference, WorkspaceAnalysis } from '@animoria/contracts';
import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { AnimoriaCodeLensProvider } from '../../src/providers/animoria-code-lens-provider.js';

describe('AnimoriaCodeLensProvider', () => {
  const assetHero: Asset = {
    id: 'asset-hero',
    path: '/workspace/public/hero.svg',
    relative_path: 'public/hero.svg',
    name: 'hero.svg',
    stem: 'hero',
    kind: 'vector',
    format: 'svg',
    size_bytes: 45056, // 44.0 KB
    mtime_ms: 0,
    is_valid: true,
  };

  const assetDup: Asset = {
    id: 'asset-dup',
    path: '/workspace/public/badge.png',
    relative_path: 'public/badge.png',
    name: 'badge.png',
    stem: 'badge',
    kind: 'raster',
    format: 'png',
    size_bytes: 1024,
    mtime_ms: 0,
    is_valid: true,
  };

  const dupDiagnostic: RuleDiagnostic = {
    rule_id: 'no-duplicate-content',
    severity: 'warning',
    message: 'Duplicate content found',
    target_asset_id: assetDup.id,
    target_asset_path: assetDup.path,
  };

  const references: UsageReference[] = [
    {
      asset_id: assetHero.id,
      file_path: '/workspace/src/App.vue',
      line_number: 1,
      column_number: 10,
      matched_token: './hero.svg',
    },
    {
      asset_id: assetHero.id,
      file_path: '/workspace/src/Other.vue',
      line_number: 5,
      column_number: 10,
      matched_token: './hero.svg',
    },
  ];

  const analysis: WorkspaceAnalysis = {
    root_id: 'root-1',
    root_path: '/workspace',
    state: 'ready',
    assets: [assetHero, assetDup],
    diagnostics: [dupDiagnostic],
    health_score: { score: 95, grade: 'A', issues_count: 1, total_assets: 2 },
    indexed_at_ms: Date.now(),
  };

  it('provides CodeLens with size and reference count above asset import', () => {
    const provider = new AnimoriaCodeLensProvider(
      () => analysis,
      () => references,
    );

    const document = {
      uri: vscode.Uri.file('/workspace/src/App.vue'),
      getText: () => `<template>\n  <img src="./hero.svg" />\n</template>`,
    } as unknown as vscode.TextDocument;

    const lenses = provider.provideCodeLenses(
      document,
      {} as vscode.CancellationToken,
    ) as vscode.CodeLens[];
    expect(lenses).toBeDefined();
    expect(lenses.length).toBe(1);

    const lens = lenses[0];
    expect(lens?.command?.title).toContain('hero.svg');
    expect(lens?.command?.title).toContain('44.0 KB');
    expect(lens?.command?.title).toContain('2 refs');
    expect(lens?.command?.command).toBe('animoria.openPreview');
    expect(lens?.command?.arguments?.[0]).toEqual(assetHero);
  });

  it('provides duplicate resolution lens when asset has duplicate findings', () => {
    const provider = new AnimoriaCodeLensProvider(
      () => analysis,
      () => [],
    );

    const document = {
      uri: vscode.Uri.file('/workspace/src/Hero.tsx'),
      getText: () => `import badge from "./badge.png";`,
    } as unknown as vscode.TextDocument;

    const lenses = provider.provideCodeLenses(
      document,
      {} as vscode.CancellationToken,
    ) as vscode.CodeLens[];
    expect(lenses).toBeDefined();
    expect(lenses.length).toBe(2);

    const mainLens = lenses[0];
    expect(mainLens?.command?.title).toContain('badge.png');

    const dupLens = lenses[1];
    expect(dupLens?.command?.title).toContain('Resolve Duplicate');
    expect(dupLens?.command?.command).toBe('animoria.resolveDuplicates');
  });

  it('returns empty array when no assets are referenced in document', () => {
    const provider = new AnimoriaCodeLensProvider(
      () => analysis,
      () => [],
    );

    const document = {
      uri: vscode.Uri.file('/workspace/src/utils.ts'),
      getText: () => 'export const sum = (a: number, b: number) => a + b;',
    } as unknown as vscode.TextDocument;

    const lenses = provider.provideCodeLenses(
      document,
      {} as vscode.CancellationToken,
    ) as vscode.CodeLens[];
    expect(lenses).toEqual([]);
  });
});
