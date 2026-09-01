import { isAbsolute, relative, resolve } from 'node:path';

/**
 * Resolves a caller-supplied path and proves it lies inside a workspace root.
 *
 * A `candidate.startsWith(root)` check is not a security boundary: it admits
 * traversal (`"<root>/../../etc/passwd"`), sibling directories that share a
 * textual prefix (`/srv/fixtures-private` vs `/srv/fixtures`), and absolute
 * paths that are never normalized. Containment must be decided on the relative
 * path between the root and the resolved candidate instead.
 *
 * Returns the resolved absolute path when inside `root`, or `null`. Never throws.
 */
export function resolveWithinRoot(root: string, candidate: string): string | null {
  if (typeof candidate !== 'string' || candidate.length === 0) return null;

  // A NUL byte truncates the path at the OS layer, so a value that passes this
  // check could still address a different file by the time it reaches `open`.
  if (candidate.includes('\0')) return null;

  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(resolvedRoot, candidate);

  const rel = relative(resolvedRoot, resolvedCandidate);
  if (rel === '') return resolvedCandidate; // the root directory itself
  if (rel === '..' || rel.startsWith(`..${SEPARATOR}`) || isAbsolute(rel)) return null;

  return resolvedCandidate;
}

// `path.relative` emits platform-native separators.
const SEPARATOR = resolve('/a', 'b').includes('\\') ? '\\' : '/';
