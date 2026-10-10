import type { RuleDiagnostic, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';

/**
 * Publishes Animoria's governance findings to VS Code's Problems panel.
 */
export class DiagnosticPublisher implements vscode.Disposable {
  private readonly _collection: vscode.DiagnosticCollection;
  private _publishedPaths = new Set<string>();

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

      // Attach diagnostic directly to the source file where the reference was traced
      if (diagnostic.evidence_file && diagnostic.evidence_file !== diagnostic.target_asset_path) {
        const line = Math.max(0, (diagnostic.evidence_line ?? 1) - 1);
        const sourceRange = new vscode.Range(line, 0, line, 200);
        const sourceList = byFile.get(diagnostic.evidence_file) ?? [];
        sourceList.push(this._toVsCodeDiagnostic(diagnostic, sourceRange));
        byFile.set(diagnostic.evidence_file, sourceList);
      }
    }

    const currentPaths = new Set<string>(byFile.keys());

    // 1. Remove diagnostics for files that are no longer reported (differential delete)
    for (const path of this._publishedPaths) {
      if (!currentPaths.has(path)) {
        this._collection.delete(vscode.Uri.file(path));
      }
    }

    // 2. Set/update diagnostics for reported files without clearing the entire collection
    for (const [path, diagnostics] of byFile) {
      this._collection.set(vscode.Uri.file(path), diagnostics);
    }

    this._publishedPaths = currentPaths;
  }

  clear(): void {
    this._collection.clear();
    this._publishedPaths.clear();
  }

  dispose(): void {
    this._collection.dispose();
    this._publishedPaths.clear();
  }

  private _toVsCodeDiagnostic(
    diagnostic: RuleDiagnostic,
    range: vscode.Range = new vscode.Range(0, 0, 0, 0),
  ): vscode.Diagnostic {
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
        : vscode.DiagnosticSeverity.Warning,
    );

    result.source = 'Animoria';
    result.code = diagnostic.rule_id;

    if (diagnostic.rule_id === 'no-unreferenced-assets') {
      result.tags = [vscode.DiagnosticTag.Unnecessary];
    }

    return result;
  }
}
