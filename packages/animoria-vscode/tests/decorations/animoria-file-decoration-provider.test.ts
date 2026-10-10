import type { Asset, DuplicateGroup, RuleDiagnostic, WorkspaceAnalysis } from '@animoria/contracts';
import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { AnimoriaFileDecorationProvider } from '../../src/decorations/animoria-file-decoration-provider.js';

describe('AnimoriaFileDecorationProvider', () => {
  const assetUnref: Asset = {
    id: 'asset-1',
    path: '/workspace/assets/unused.svg',
    relative_path: 'assets/unused.svg',
    name: 'unused.svg',
    stem: 'unused',
    kind: 'vector',
    format: 'svg',
    size_bytes: 1024,
    mtime_ms: 0,
    is_valid: true,
  };

  const assetDup1: Asset = {
    id: 'asset-2',
    path: '/workspace/assets/logo-copy.png',
    relative_path: 'assets/logo-copy.png',
    name: 'logo-copy.png',
    stem: 'logo-copy',
    kind: 'raster',
    format: 'png',
    size_bytes: 2048,
    mtime_ms: 0,
    is_valid: true,
  };

  const assetClean: Asset = {
    id: 'asset-3',
    path: '/workspace/assets/clean.webp',
    relative_path: 'assets/clean.webp',
    name: 'clean.webp',
    stem: 'clean',
    kind: 'raster',
    format: 'webp',
    size_bytes: 512,
    mtime_ms: 0,
    is_valid: true,
  };

  const diagUnref: RuleDiagnostic = {
    rule_id: 'no-unreferenced-assets',
    severity: 'warning',
    message: 'Asset is not referenced',
    target_asset_id: assetUnref.id,
    target_asset_path: assetUnref.path,
  };

  const diagDup: RuleDiagnostic = {
    rule_id: 'no-duplicate-content',
    severity: 'warning',
    message: 'Duplicate content found',
    target_asset_id: assetDup1.id,
    target_asset_path: assetDup1.path,
  };

  const duplicateGroup: DuplicateGroup = {
    id: 'group-1',
    content_hash: 'hash-abc',
    canonical_asset_id: assetDup1.id,
    asset_ids: [assetDup1.id, 'asset-2b'],
    wasted_bytes: 2048,
  };

  const analysis: WorkspaceAnalysis = {
    root_id: 'root-1',
    root_path: '/workspace',
    state: 'ready',
    assets: [assetUnref, assetDup1, assetClean],
    diagnostics: [diagUnref, diagDup],
    health_score: { score: 90, grade: 'A', issues_count: 2, total_assets: 3 },
    indexed_at_ms: Date.now(),
  };

  it('provides ∅ badge and deemphasized color for unreferenced assets', () => {
    const provider = new AnimoriaFileDecorationProvider(
      () => analysis,
      () => [duplicateGroup],
    );
    const uri = vscode.Uri.file(assetUnref.path);

    const deco = provider.provideFileDecoration(
      uri,
      {} as vscode.CancellationToken,
    ) as vscode.FileDecoration;
    expect(deco).toBeDefined();
    expect(deco.badge).toBe('∅');
    expect(deco.tooltip).toContain('Unreferenced');
    expect(deco.color?.id).toBe('list.deemphasizedForeground');
  });

  it('provides duplicate badge and warning color for duplicate assets', () => {
    const provider = new AnimoriaFileDecorationProvider(
      () => analysis,
      () => [duplicateGroup],
    );
    const uri = vscode.Uri.file(assetDup1.path);

    const deco = provider.provideFileDecoration(
      uri,
      {} as vscode.CancellationToken,
    ) as vscode.FileDecoration;
    expect(deco).toBeDefined();
    expect(deco.badge).toBe('2x');
    expect(deco.tooltip).toContain('Duplicate');
    expect(deco.color?.id).toBe('list.warningForeground');
  });

  it('returns undefined for clean assets without findings', () => {
    const provider = new AnimoriaFileDecorationProvider(
      () => analysis,
      () => [duplicateGroup],
    );
    const uri = vscode.Uri.file(assetClean.path);

    const deco = provider.provideFileDecoration(uri, {} as vscode.CancellationToken);
    expect(deco).toBeUndefined();
  });

  it('returns undefined for non-asset files', () => {
    const provider = new AnimoriaFileDecorationProvider(
      () => analysis,
      () => [duplicateGroup],
    );
    const uri = vscode.Uri.file('/workspace/src/index.ts');

    const deco = provider.provideFileDecoration(uri, {} as vscode.CancellationToken);
    expect(deco).toBeUndefined();
  });
});
