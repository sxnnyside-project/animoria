import type { DuplicateGroup, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';

/**
 * Decorates visual asset files in VS Code's File Explorer with governance badges
 * and state colors (e.g. unreferenced, duplicates, governance warnings).
 */
export class AnimoriaFileDecorationProvider
  implements vscode.FileDecorationProvider, vscode.Disposable
{
  private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<
    vscode.Uri | vscode.Uri[] | undefined
  >();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  constructor(
    private readonly getAnalysis: () => WorkspaceAnalysis | null,
    private readonly getDuplicateGroups: () => readonly DuplicateGroup[] = () => [],
  ) {}

  /**
   * Signals VS Code that decorations have changed and should be re-rendered.
   */
  notifyDecorationsChanged(uris?: vscode.Uri[]): void {
    this._onDidChangeFileDecorations.fire(uris);
  }

  provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    const analysis = this.getAnalysis();
    if (!analysis) return undefined;

    const fsPath = uri.fsPath;
    const asset = analysis.assets.find((a) => a.path === fsPath);
    if (!asset) return undefined;

    const diagnostics = analysis.diagnostics.filter((d) => d.target_asset_path === fsPath);
    if (diagnostics.length === 0) return undefined;

    // 1. Unreferenced asset takes precedence: render dimmed with ∅ badge
    const isUnreferenced = diagnostics.some((d) => d.rule_id === 'no-unreferenced-assets');
    if (isUnreferenced) {
      const decoration = new vscode.FileDecoration(
        '∅',
        'Animoria: Unreferenced visual asset (safe to review for cleanup)',
        new vscode.ThemeColor('list.deemphasizedForeground'),
      );
      decoration.propagate = false;
      return decoration;
    }

    // 2. Duplicate content finding
    const isDuplicate = diagnostics.some((d) => d.rule_id === 'no-duplicate-content');
    if (isDuplicate) {
      const duplicateGroups = this.getDuplicateGroups();
      const group = duplicateGroups.find((g) => g.asset_ids.includes(asset.id));
      const count = group ? `${group.asset_ids.length}x` : '2x';

      const decoration = new vscode.FileDecoration(
        count,
        `Animoria: Duplicate content (${group ? group.asset_ids.length : 2} identical copies in workspace)`,
        new vscode.ThemeColor('list.warningForeground'),
      );
      decoration.propagate = false;
      return decoration;
    }

    // 3. General governance rule violation (e.g. oversized, non-whitelisted format)
    const decoration = new vscode.FileDecoration(
      '!',
      `Animoria: Governance issue (${diagnostics[0]?.message ?? 'Rule violation'})`,
      new vscode.ThemeColor('list.warningForeground'),
    );
    decoration.propagate = false;
    return decoration;
  }

  dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}
