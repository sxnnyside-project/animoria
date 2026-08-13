import { isAbsolute, relative, resolve } from 'node:path';

/**
 * Resolves a caller-supplied path and proves it lies inside a workspace root,
 * or rejects it.
 *
 * ## Why a prefix check is not a containment check
 * The obvious implementation — `candidate.startsWith(root)` — is not a security
 * boundary, and was the one this bridge previously used. It admits at least three
 * classes of escape:
 *
 * - **Traversal.** `"<root>/../../etc/passwd"` starts with `<root>` as a *string*
 *   while resolving to a path far outside it.
 * - **Sibling prefix.** With `root = "/srv/fixtures"`, the unrelated directory
 *   `/srv/fixtures-private/secrets` also starts with `/srv/fixtures`.
 * - **Absolute substitution.** Any absolute path that happens to share the root's
 *   textual prefix is accepted without ever being normalized.
 *
 * Containment must therefore be decided *after* normalization, on the relative
 * path between the root and the resolved candidate: a candidate is inside the root
 * if and only if that relative path neither escapes upward (`..`) nor is itself
 * absolute (which is what `path.relative` returns when the two paths share no base
 * — a different Windows drive, for instance).
 *
 * @param root - The workspace root. Resolved before comparison, so a relative root
 *   is interpreted against the current working directory exactly once.
 * @param candidate - The untrusted path. May be absolute or relative to `root`.
 * @returns The resolved absolute path when it is inside `root` (the root itself
 *   counts as inside), or `null` when it is not. Never throws.
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

/**
 * `path.relative` emits platform-native separators, so the "escapes upward" test
 * has to match the platform it is running on rather than assuming POSIX.
 */
const SEPARATOR = resolve('/a', 'b').includes('\\') ? '\\' : '/';
