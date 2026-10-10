import type { Asset, WorkspaceAnalysis } from '@animoria/contracts';
import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { registerLanguageModelTools } from '../../src/ai/animoria-lm-tools.js';

describe('registerLanguageModelTools', () => {
  const asset: Asset = {
    id: 'asset-1',
    path: '/workspace/assets/logo.svg',
    relative_path: 'assets/logo.svg',
    name: 'logo.svg',
    stem: 'logo',
    kind: 'vector',
    format: 'svg',
    size_bytes: 1024,
    mtime_ms: 0,
    is_valid: true,
  };

  const analysis: WorkspaceAnalysis = {
    root_id: 'root-1',
    root_path: '/workspace',
    state: 'ready',
    assets: [asset],
    diagnostics: [],
    health_score: { score: 100, grade: 'A', issues_count: 0, total_assets: 1 },
    indexed_at_ms: Date.now(),
  };

  it('registers tools when vscode.lm is available', async () => {
    const registeredTools = new Map<
      string,
      { invoke: (opts: unknown, token: unknown) => Promise<{ content: { value: string }[] }> }
    >();

    const spy = vi.spyOn(vscode.lm, 'registerTool').mockImplementation((name, tool) => {
      registeredTools.set(name, tool as never);
      return new vscode.Disposable(() => {});
    });

    const fakeContext = {} as vscode.ExtensionContext;
    const disposable = registerLanguageModelTools(
      fakeContext,
      () => analysis,
      () => [],
    );

    expect(registeredTools.has('animoria_searchAssets')).toBe(true);
    expect(registeredTools.has('animoria_getGovernanceReport')).toBe(true);

    // Test tool invocation: searchAssets
    const searchTool = registeredTools.get('animoria_searchAssets');
    const searchRes = await searchTool?.invoke({ input: { query: 'logo' } }, {});
    expect(searchRes?.content[0]?.value).toContain('logo.svg');

    // Test tool invocation: getGovernanceReport
    const reportTool = registeredTools.get('animoria_getGovernanceReport');
    const reportRes = await reportTool?.invoke({}, {});
    expect(reportRes?.content[0]?.value).toContain('100');
    expect(reportRes?.content[0]?.value).toContain('totalAssets": 1');

    disposable.dispose();
  });
});
