import * as vscode from 'vscode';

/**
 * Provides IDE Lightbulb Quick-Fixes (`CodeActionProvider`) for Animoria's governance diagnostics.
 */
export class AnimoriaCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'Animoria') continue;

      const ruleId = String(diagnostic.code ?? '');

      if (ruleId === 'no-duplicate-content') {
        const resolveAction = new vscode.CodeAction(
          'Animoria: Resolve Duplicates...',
          vscode.CodeActionKind.QuickFix,
        );
        resolveAction.command = {
          command: 'animoria.resolveDuplicates',
          title: 'Resolve Duplicates',
        };
        resolveAction.diagnostics = [diagnostic];
        resolveAction.isPreferred = true;
        actions.push(resolveAction);
      } else if (ruleId === 'no-unreferenced-assets') {
        const reviewAction = new vscode.CodeAction(
          'Animoria: Review Cleanup Opportunities...',
          vscode.CodeActionKind.QuickFix,
        );
        reviewAction.command = {
          command: 'animoria.startCleanupReview',
          title: 'Review Cleanup Opportunities',
        };
        reviewAction.diagnostics = [diagnostic];
        reviewAction.isPreferred = true;
        actions.push(reviewAction);

        const trashAction = new vscode.CodeAction(
          'Animoria: Move Asset to Trash...',
          vscode.CodeActionKind.QuickFix,
        );
        trashAction.command = {
          command: 'animoria.deleteAsset',
          title: 'Move Asset to Trash',
          arguments: [{ path: document.uri.fsPath }],
        };
        trashAction.diagnostics = [diagnostic];
        actions.push(trashAction);
      } else {
        const findingsAction = new vscode.CodeAction(
          'Animoria: Inspect Governance Findings...',
          vscode.CodeActionKind.QuickFix,
        );
        findingsAction.command = {
          command: 'animoria.viewFindings',
          title: 'Inspect Governance Findings',
        };
        findingsAction.diagnostics = [diagnostic];
        actions.push(findingsAction);
      }

      const refreshAction = new vscode.CodeAction(
        'Animoria: Run Governance Analysis',
        vscode.CodeActionKind.QuickFix,
      );
      refreshAction.command = {
        command: 'animoria.runGovernance',
        title: 'Run Governance Analysis',
      };
      refreshAction.diagnostics = [diagnostic];
      actions.push(refreshAction);
    }

    return actions;
  }
}
