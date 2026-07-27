/**
 * Directory-exclusion glob patterns shared by every workspace scanner
 * (animated and static). Centralised here so the animated `FileScanner`
 * and the static `StaticAssetScanner` can never disagree about which
 * directories are off-limits.
 */
export const DEFAULT_SCAN_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.turbo/**',
];

/** Directory names short-circuited before ever descending into them. */
export const DEFAULT_SCAN_EXCLUDE_DIRNAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.turbo',
  '.animoria',
]);

/**
 * Converts a simple glob pattern (`**`, `*`) to a RegExp.
 *
 * The glob tokens (`**\/`, `**`, `*`) are substituted in a single
 * `.replace()` pass, not a chain of separate ones — a chained
 * `.replace()` per token re-scans the *entire* string on each call,
 * including replacement text a previous call already inserted (every
 * substitution here contains at least one literal `*`), so a later step
 * would reinterpret its own output as more glob syntax and corrupt it.
 * Concretely, that previously turned `**\/some/nested/path` into a regex
 * that could only skip *one* directory segment instead of any number of
 * them. A single pass with a match-order-sensitive alternation applies
 * each substitution exactly once, against the original text only.
 */
export function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const converted = escaped.replace(/\*\*\/|\*\*|\*/g, (token) => {
    if (token === '**/') return '(?:.*/)?'; // **/ matches any number of subdirectories, including none
    if (token === '**') return '.*'; // ** matches anything
    return '[^/]*'; // * matches non-slash characters
  });
  return new RegExp(`^${converted}$`);
}
