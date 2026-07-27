import { relative, sep } from 'node:path';
import type { AnimoriaAsset } from '../types/asset.js';
import type { AssetFolderNode, AssetTreeNode } from './types.js';

/**
 * Projects a flat asset list into a directory-tree structure, mirroring
 * the assets' real folder layout relative to the workspace root.
 *
 * This exists to answer "where does this asset live relative to
 * everything else" in a monorepo with assets scattered across many
 * packages, without attempting to be a general-purpose file browser
 * (see the module's own docs on why this is a *projection*, not a
 * second tree implementation).
 *
 * @param assets - The current, flat asset list — typically
 *   `WorkspaceIndexSnapshot.assets`.
 * @param workspacePath - Absolute path assets are made relative to.
 * @returns Top-level nodes (folders and/or files directly under the
 *   workspace root), each folder's `children` populated recursively.
 *   Ordering is deterministic: folders before files, both groups
 *   alphabetical by name — so re-running this on an unchanged asset
 *   list always yields byte-for-byte the same structure, which is what
 *   lets a presentation layer diff or memoize against it safely.
 */
export function buildAssetTreeProjection(
  assets: readonly AnimoriaAsset[],
  workspacePath: string
): readonly AssetTreeNode[] {
  const root = createFolder('', '');

  for (const asset of assets) {
    const relativeDir = relative(workspacePath, dirnameOf(asset.path));
    const segments = relativeDir === '' || relativeDir === '.' ? [] : relativeDir.split(sep);
    insertAsset(root, segments, asset);
  }

  return sortedChildren(root);
}

function dirnameOf(filePath: string): string {
  const lastSep = filePath.lastIndexOf(sep);
  return lastSep === -1 ? filePath : filePath.slice(0, lastSep);
}

/** A mutable folder-building scratch structure, converted to the immutable public shape only once, at the end. */
interface FolderBuilder {
  name: string;
  relativePath: string;
  subfolders: Map<string, FolderBuilder>;
  files: AnimoriaAsset[];
}

function createFolder(name: string, relativePath: string): FolderBuilder {
  return { name, relativePath, subfolders: new Map(), files: [] };
}

function insertAsset(
  folder: FolderBuilder,
  remainingSegments: string[],
  asset: AnimoriaAsset
): void {
  if (remainingSegments.length === 0) {
    folder.files.push(asset);
    return;
  }

  const [segment, ...rest] = remainingSegments as [string, ...string[]];
  let child = folder.subfolders.get(segment);
  if (!child) {
    const childPath = folder.relativePath ? `${folder.relativePath}/${segment}` : segment;
    child = createFolder(segment, childPath);
    folder.subfolders.set(segment, child);
  }
  insertAsset(child, rest, asset);
}

function sortedChildren(folder: FolderBuilder): readonly AssetTreeNode[] {
  const folderNodes: AssetFolderNode[] = Array.from(folder.subfolders.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((child) => ({
      kind: 'folder',
      name: child.name,
      relativePath: child.relativePath,
      children: sortedChildren(child),
    }));

  const fileNodes: AssetTreeNode[] = folder.files
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((asset) => ({ kind: 'file' as const, asset }));

  return [...folderNodes, ...fileNodes];
}
