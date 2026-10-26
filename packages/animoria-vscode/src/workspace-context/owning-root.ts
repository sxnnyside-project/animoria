import { realpathSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';

interface Root {
  readonly path: string;
}

/**
 * The workspace root that contains `filePath`: the deepest one, so nested roots resolve to the
 * inner folder. Containment is decided on the relative path, never on a `startsWith` of the
 * strings, which would put `/w/app-extra/x.png` inside `/w/app`.
 */
export function owningRoot<T extends Root>(roots: readonly T[], filePath: string): T | undefined {
  let best: T | undefined;
  for (const root of roots) {
    const rel = relative(root.path, filePath);
    const inside = rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
    if (inside && (!best || root.path.length > best.path.length)) best = root;
  }
  return best;
}

/** `path` with symlinks resolved, as the daemon reports it; unchanged if it cannot be resolved. */
export function resolveSymlinks(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Candidate roots for `owningRoot`, without duplicates. Pass the folders as VS Code reports them
 * together with their `resolveSymlinks` form and the roots the daemon scanned: the daemon
 * resolves symlinks, so an asset's path is only ever inside the canonical form of a folder
 * opened through a symlink.
 */
export function mergeRoots(...pathLists: readonly (readonly string[])[]): { path: string }[] {
  return [...new Set(pathLists.flat())].map((path) => ({ path }));
}

/** `filePath` relative to the root that owns it, with `/` separators; unchanged when none does. */
export function relativeAssetPath(roots: readonly Root[], filePath: string): string {
  const root = owningRoot(roots, filePath);
  return root ? relative(root.path, filePath).replace(/\\/g, '/') : filePath;
}

/**
 * Moves one asset to the trash of the root that owns it. The daemon confines a trash to the
 * workspace path it is given, so passing another folder's root is refused.
 * `beforeTrash` runs once the root is known and before anything moves.
 */
export async function trashInOwningRoot(
  daemon: {
    trashAsset(workspacePath: string, assetId: string, filePath: string): Promise<unknown>;
  },
  roots: readonly Root[],
  assetId: string,
  filePath: string,
  beforeTrash?: (rootPath: string) => void,
): Promise<string> {
  const root = owningRoot(roots, filePath);
  if (!root) throw new Error('the asset is not inside an open workspace folder');
  beforeTrash?.(root.path);
  await daemon.trashAsset(root.path, assetId, filePath);
  return root.path;
}
