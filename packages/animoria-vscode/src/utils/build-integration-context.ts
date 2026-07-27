import type { AnimoriaAsset, IntegrationContext } from '@animoria/core';
import { computeImportPath, computeWorkspaceRelativePath, toImportSpecifier } from '@animoria/core';
import type { ActiveEditorTracker } from './ActiveEditorTracker.js';

/**
 * Builds an {@link IntegrationContext} for an asset, anchoring the import
 * path to the last known active editor when available. Shared by
 * `AnimoriaPreviewPanel` (Preview Panel's Integrate section) and
 * `animoria.generateSnippet` (tree view context menu) so both entry
 * points to Snippet Generation resolve paths identically.
 */
export function buildIntegrationContext(
  asset: AnimoriaAsset,
  workspacePath: string,
  activeEditorTracker: ActiveEditorTracker | undefined
): IntegrationContext {
  const activeFilePath = activeEditorTracker?.getLastActiveFilePath();

  const workspaceRelativePath = workspacePath
    ? computeWorkspaceRelativePath(workspacePath, asset.path)
    : asset.name;

  const importPath = activeFilePath
    ? computeImportPath(activeFilePath, asset.path)
    : toImportSpecifier(workspaceRelativePath);

  return {
    asset,
    importPath,
    workspaceRelativePath,
    pathResolutionBasis: activeFilePath ? 'active-editor' : 'workspace-root',
    workspacePath,
  };
}
