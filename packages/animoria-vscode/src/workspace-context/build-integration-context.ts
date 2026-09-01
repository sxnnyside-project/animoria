import { relative } from 'node:path';
import type { Asset } from '@animoria/contracts';
import type { ActiveEditorTracker } from './active-editor-tracker.js';

export interface IntegrationContext {
  readonly asset: Asset;
  readonly importPath: string;
  readonly workspaceRelativePath: string;
  readonly pathResolutionBasis: 'active-editor' | 'workspace-root';
  readonly workspacePath: string;
}

export function buildIntegrationContext(
  asset: Asset,
  workspacePath: string,
  activeEditorTracker: ActiveEditorTracker | undefined
): IntegrationContext {
  const activeFilePath = activeEditorTracker?.getLastActiveFilePath();

  const workspaceRelativePath = workspacePath
    ? relative(workspacePath, asset.path).replace(/\\/g, '/')
    : asset.name;

  const importPath = activeFilePath
    ? relative(activeFilePath, asset.path).replace(/\\/g, '/')
    : `./${workspaceRelativePath}`;

  return {
    asset,
    importPath,
    workspaceRelativePath,
    pathResolutionBasis: activeFilePath ? 'active-editor' : 'workspace-root',
    workspacePath,
  };
}
