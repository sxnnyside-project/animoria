import type { RuleDiagnostic, WorkspaceAnalysis } from '@animoria/core';
import * as vscode from 'vscode';

/**
 * Publishes Animoria's governance findings to VS Code's Problems panel.
 *
 * ## Why this exists
 * The extension declares itself in the `Linters` category, and a linter's findings
 * belong in Problems: navigable with `F8`, filterable, visible in file decorations,
 * and reachable long after the moment they were produced. Animoria's findings were
 * previously announced with `setStatusBarMessage(..., 5000)` — a message that
 * vanished after five seconds and could not be recovered — plus rows in a sidebar
 * the developer had to already have open.
 *
 * ## Why it computes nothing
 * Every field below is read from a {@link RuleDiagnostic}: severity, message,
 * evidence, remediation, and the rule's documentation link. This class chooses how a
 * finding *appears* in VS Code; it never decides what a finding *is*. That
 * distinction is why Core and the Problems panel cannot disagree.
 */
export class DiagnosticPublisher implements vscode.Disposable {
  private readonly _collection: vscode.DiagnosticCollection;

  constructor() {
    this._collection = vscode.languages.createDiagnosticCollection('animoria');
  }

  /** Replaces every published diagnostic with those in `analysis`. */
  publish(analysis: WorkspaceAnalysis): void {
    this.publishAll([analysis]);
  }

  /**
   * Publishes every root's diagnostics in one pass.
   *
   * ## Why this is not `publish()` in a loop
   * `publish` replaces the whole collection, which is what makes a resolved finding
   * disappear rather than linger. Called once per root, the second call would erase
   * the first root's diagnostics — so a three-root workspace would show findings for
   * whichever root happened to be published last, and a developer would conclude the
   * other two were clean.
   */
  publishAll(analyses: readonly WorkspaceAnalysis[]): void {
    const byFile = new Map<string, vscode.Diagnostic[]>();

    for (const diagnostic of analyses.flatMap((analysis) => analysis.diagnostics)) {
      const list = byFile.get(diagnostic.asset.path) ?? [];
      list.push(this._toVsCodeDiagnostic(diagnostic));
      byFile.set(diagnostic.asset.path, list);
    }

    // Replacing the whole publication (rather than adding to it) is what makes a
    // resolved finding disappear instead of lingering until the window reloads.
    this._collection.clear();
    for (const [path, diagnostics] of byFile) {
      this._collection.set(vscode.Uri.file(path), diagnostics);
    }
  }

  /** Clears every published diagnostic — e.g. when the workspace closes. */
  clear(): void {
    this._collection.clear();
  }

  dispose(): void {
    this._collection.dispose();
  }

  private _toVsCodeDiagnostic(diagnostic: RuleDiagnostic): vscode.Diagnostic {
    // An asset is a binary file with no meaningful line to point at, so the finding
    // anchors to its start. VS Code still renders it in Problems and in the file's
    // explorer decoration.
    const range = new vscode.Range(0, 0, 0, 0);

    const message = [
      diagnostic.message,
      '',
      diagnostic.evidence.summary,
      `Confidence: ${diagnostic.confidence}`,
      ...(diagnostic.coverage
        ? [
            `Reference scan coverage: ${diagnostic.coverage.status} (${diagnostic.coverage.filesScanned} file(s) scanned)`,
          ]
        : []),
      '',
      diagnostic.remediation.summary,
    ].join('\n');

    const result = new vscode.Diagnostic(
      range,
      message,
      diagnostic.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning
    );

    result.source = 'Animoria';
    // `code.target` makes the rule id a clickable link to its documentation, so a
    // developer never has to go looking for what a rule means.
    result.code = { value: diagnostic.ruleId, target: vscode.Uri.parse(diagnostic.helpUri) };

    // Evidence locations become related information: for a duplicate, its siblings;
    // for an absence, nothing — which is itself accurate.
    const locations = diagnostic.evidence.locations ?? [];
    if (locations.length > 0) {
      result.relatedInformation = locations.map(
        (location) =>
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(
              vscode.Uri.file(location.file),
              new vscode.Position(Math.max(0, (location.line ?? 1) - 1), 0)
            ),
            location.excerpt ?? diagnostic.evidence.summary
          )
      );
    }

    return result;
  }
}
