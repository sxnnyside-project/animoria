import type { Asset, UsageReference, WorkspaceAnalysis } from '@animoria/contracts';
import * as vscode from 'vscode';

/**
 * Formats byte size into human-readable metric (e.g. 1.2 KB, 450 B, 3.4 MB).
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extracts candidate asset path/file strings from source lines.
 */
const ASSET_STRING_REGEX =
  /['"`]([a-zA-Z0-9_\-./@\\]+\.(?:svg|png|jpe?g|webp|avif|lottie|riv|gif|apng))['"`]|url\(\s*['"`]?([^'")]+)['"`]?\s*\)/gi;

/**
 * Provides inline metrics and 1-click inspection CodeLenses above asset references in source code.
 */
export class AnimoriaCodeLensProvider implements vscode.CodeLensProvider, vscode.Disposable {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(
    private readonly getAnalysis: () => WorkspaceAnalysis | null,
    private readonly getReferences: () => readonly UsageReference[] = () => [],
  ) {}

  notifyLensesChanged(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const analysis = this.getAnalysis();
    if (!analysis || analysis.assets.length === 0) return [];

    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Build fast lookup by basename and full path
    const assetsByFilename = new Map<string, Asset>();
    const assetsByPath = new Map<string, Asset>();
    for (const asset of analysis.assets) {
      assetsByFilename.set(asset.name.toLowerCase(), asset);
      assetsByPath.set(asset.path.toLowerCase(), asset);
    }

    const allReferences = this.getReferences();
    const refCounts = new Map<string, number>();
    for (const ref of allReferences) {
      if (ref.asset_id) {
        refCounts.set(ref.asset_id, (refCounts.get(ref.asset_id) ?? 0) + 1);
      }
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineText = lines[lineIndex] ?? '';
      if (!lineText) continue;

      ASSET_STRING_REGEX.lastIndex = 0;
      let match = ASSET_STRING_REGEX.exec(lineText);

      while (match !== null) {
        const rawToken = match[1] ?? match[2];
        if (!rawToken) {
          match = ASSET_STRING_REGEX.exec(lineText);
          continue;
        }

        const cleanToken = rawToken.replace(/^[./\\]+/, '').toLowerCase();
        const filename = cleanToken.split(/[/\\]/).pop() ?? '';

        const matchedAsset = assetsByPath.get(cleanToken) ?? assetsByFilename.get(filename);

        if (matchedAsset) {
          const range = new vscode.Range(lineIndex, 0, lineIndex, lineText.length);
          const totalRefs = refCounts.get(matchedAsset.id) ?? refCounts.get(matchedAsset.path) ?? 1;
          const sizeText = formatBytes(matchedAsset.size_bytes);

          const mainLens = new vscode.CodeLens(range, {
            title: `$(symbol-color) Animoria: ${matchedAsset.name} (${sizeText}) · ${totalRefs} ref${totalRefs === 1 ? '' : 's'}`,
            command: 'animoria.openPreview',
            arguments: [matchedAsset],
          });
          lenses.push(mainLens);

          // Check if this asset has duplicate findings
          const hasDuplicate = analysis.diagnostics.some(
            (d) =>
              d.target_asset_path === matchedAsset.path && d.rule_id === 'no-duplicate-content',
          );
          if (hasDuplicate) {
            const dupLens = new vscode.CodeLens(range, {
              title: '$(diff) Resolve Duplicate',
              command: 'animoria.resolveDuplicates',
            });
            lenses.push(dupLens);
          }
          break; // Avoid emitting multiple duplicate lenses on the exact same line
        }

        match = ASSET_STRING_REGEX.exec(lineText);
      }
    }

    return lenses;
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
