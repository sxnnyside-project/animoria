import { posix, relative, sep } from 'node:path';

// ─── Canonical path resolution for Integration Providers ──────────────────────

/**
 * Converts an OS-specific relative path into a valid ES-module relative
 * import specifier: forward slashes, and a leading `./` when the path does
 * not already start with `.` (Node/bundler module resolution treats a bare
 * `foo/bar` specifier as a package name, not a relative path — omitting the
 * prefix silently produces an unresolvable import).
 */
export function toImportSpecifier(relativePath: string): string {
  const posixPath = relativePath.split(sep).join(posix.sep);
  if (posixPath.startsWith('.')) return posixPath;
  return `./${posixPath}`;
}

/**
 * Computes a valid ES-module import specifier from `fromFilePath` (the file
 * the generated snippet will be pasted into) to `toAssetPath` (the asset).
 * Both paths must be absolute.
 */
export function computeImportPath(fromFilePath: string, toAssetPath: string): string {
  const fromDir = fromFilePath.slice(0, fromFilePath.lastIndexOf(sep) + 1) || fromFilePath;
  return toImportSpecifier(relative(fromDir, toAssetPath));
}

/**
 * Computes a workspace-root-relative path, using forward slashes regardless
 * of OS. This is the convention Flutter's `pubspec.yaml` and `Lottie.asset()`
 * expect — never file-system-relative, never `./`-prefixed.
 */
export function computeWorkspaceRelativePath(workspacePath: string, assetPath: string): string {
  return relative(workspacePath, assetPath).split(sep).join(posix.sep);
}
