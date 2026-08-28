import type { RuleDiagnostic, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';

/**
 * Publishes Animoria's governance findings to VS Code's Problems panel.
 */
export class DiagnosticPublisher implements vscode.Disposable {
  private readonly _collection: vscode.DiagnosticCollection;

  constructor() {
    this._collection = vscode.languages.createDiagnosticCollection('animoria');
  }

  publish(analysis: WorkspaceAnalysis): void {
    this.publishAll([analysis]);
  }

  publishAll(analyses: readonly WorkspaceAnalysis[]): void {
    const byFile = new Map<string, vscode.Diagnostic[]>();

    for (const diagnostic of analyses.flatMap((analysis) => analysis.diagnostics)) {
      const list = byFile.get(diagnostic.target_asset_path) ?? [];
      list.push(this._toVsCodeDiagnostic(diagnostic));
      byFile.set(diagnostic.target_asset_path, list);
    }

    this._collection.clear();
    for (const [path, diagnostics] of byFile) {
      this._collection.set(vscode.Uri.file(path), diagnostics);
    }
  }

  clear(): void {
    this._collection.clear();
  }

  dispose(): void {
    this._collection.dispose();
  }

  private _toVsCodeDiagnostic(diagnostic: RuleDiagnostic): vscode.Diagnostic {
    const range = new vscode.Range(0, 0, 0, 0);

    const message = [
      diagnostic.message,
      '',
      `Rule: ${diagnostic.rule_id}`,
      `Severity: ${diagnostic.severity}`,
    ].join('\n');

    const result = new vscode.Diagnostic(
      range,
      message,
      diagnostic.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning
    );

    result.source = 'Animoria';
    result.code = diagnostic.rule_id;

    return result;
  }
}
