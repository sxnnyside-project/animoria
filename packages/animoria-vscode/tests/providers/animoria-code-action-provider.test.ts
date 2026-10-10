import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { AnimoriaCodeActionProvider } from '../../src/providers/animoria-code-action-provider.js';

describe('AnimoriaCodeActionProvider', () => {
  const provider = new AnimoriaCodeActionProvider();

  const fakeDocument = {
    uri: vscode.Uri.file('/workspace/src/assets/logo.svg'),
    languageId: 'typescript',
    getText: () => '',
  } as unknown as vscode.TextDocument;

  const range = new vscode.Range(0, 0, 0, 0);

  it('provides duplicate resolution quick fix for no-duplicate-content', () => {
    const diag = new vscode.Diagnostic(range, 'Duplicate content found');
    diag.source = 'Animoria';
    diag.code = 'no-duplicate-content';

    const context: vscode.CodeActionContext = {
      diagnostics: [diag],
      triggerKind: 1 as vscode.CodeActionTriggerKind,
      only: undefined,
    };

    const actions = provider.provideCodeActions(
      fakeDocument,
      range,
      context,
      {} as vscode.CancellationToken,
    );
    expect(actions.length).toBeGreaterThanOrEqual(2);

    const resolveAction = actions.find((a) => a.title.includes('Resolve Duplicates'));
    expect(resolveAction).toBeDefined();
    expect(resolveAction?.isPreferred).toBe(true);
    expect(resolveAction?.command?.command).toBe('animoria.resolveDuplicates');
  });

  it('provides cleanup review and trash quick fixes for no-unreferenced-assets', () => {
    const diag = new vscode.Diagnostic(range, 'Asset is never referenced');
    diag.source = 'Animoria';
    diag.code = 'no-unreferenced-assets';

    const context: vscode.CodeActionContext = {
      diagnostics: [diag],
      triggerKind: 1 as vscode.CodeActionTriggerKind,
      only: undefined,
    };

    const actions = provider.provideCodeActions(
      fakeDocument,
      range,
      context,
      {} as vscode.CancellationToken,
    );
    const reviewAction = actions.find((a) => a.title.includes('Review Cleanup'));
    expect(reviewAction).toBeDefined();
    expect(reviewAction?.isPreferred).toBe(true);
    expect(reviewAction?.command?.command).toBe('animoria.startCleanupReview');

    const trashAction = actions.find((a) => a.title.includes('Move Asset to Trash'));
    expect(trashAction).toBeDefined();
    expect(trashAction?.command?.command).toBe('animoria.deleteAsset');
    expect(trashAction?.command?.arguments).toEqual([{ path: '/workspace/src/assets/logo.svg' }]);
  });

  it('provides inspect findings quick fix for general governance rules', () => {
    const diag = new vscode.Diagnostic(range, 'Invalid naming convention');
    diag.source = 'Animoria';
    diag.code = 'naming-kebab-case';

    const context: vscode.CodeActionContext = {
      diagnostics: [diag],
      triggerKind: 1 as vscode.CodeActionTriggerKind,
      only: undefined,
    };

    const actions = provider.provideCodeActions(
      fakeDocument,
      range,
      context,
      {} as vscode.CancellationToken,
    );
    const findingsAction = actions.find((a) => a.title.includes('Inspect Governance Findings'));
    expect(findingsAction).toBeDefined();
    expect(findingsAction?.command?.command).toBe('animoria.viewFindings');
  });
});
