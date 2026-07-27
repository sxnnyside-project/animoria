import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logDebug } from '../logging/logger.js';
import { globToRegex } from '../scanner/glob-exclude.js';

/**
 * `.animoriaignore` — the single place asset-level visibility is
 * decided.
 *
 * ## Scope
 * `.animoriaignore` excludes **assets** (animated and static) from
 * discovery entirely — they are never scanned, indexed, governed,
 * previewed, or listed anywhere. It is a workspace-root file, one glob
 * pattern per line, in the same spirit as `.gitignore`: blank lines and
 * lines starting with `#` are ignored; a bare name (no `*`) matches that
 * name as a file anywhere in the tree *and* as a directory (everything
 * under it); a pattern containing `*`/`**` is used as-is.
 *
 * This is distinct from the inline `// animoria-ignore` comment
 * (`reference-patterns.ts`), which suppresses one specific *usage
 * match* in source code — a false-positive fix for the reference
 * scanner, not an asset-visibility decision. The two mechanisms answer
 * different questions and are implemented independently.
 *
 * ## Why this is the single source of truth
 * `loadAnimoriaIgnore` returns plain glob patterns compatible with the
 * `exclude` option every scanner (`FileScanner`, `StaticAssetScanner`,
 * `Animoria`) already accepts and merges with `DEFAULT_SCAN_EXCLUDE`.
 * `WorkspaceIndexer` loads this once (and reloads it when
 * `.animoriaignore` itself changes, mirroring how it already reloads
 * `.animoriarc`) and is the only place that decides which assets exist
 * at all — every other component (governance, cleanup, duplicate
 * detection, health score, the tree view, previews) only ever sees
 * assets the indexer chose to keep, so there is nothing else in the
 * product that needs its own ignore-matching logic.
 */

const IGNORE_FILENAME = '.animoriaignore';

/** Reads and normalizes `.animoriaignore` into glob patterns ready for `ScannerConfig.exclude`. Never throws — a missing or unreadable file simply means no additional exclusions. */
export async function loadAnimoriaIgnore(workspacePath: string): Promise<string[]> {
  const filePath = join(workspacePath, IGNORE_FILENAME);

  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    logDebug('config-load', 'loadAnimoriaIgnore', 'No .animoriaignore file found', {
      assetPath: filePath,
      reason: 'file does not exist or is not accessible',
      error: err,
      recovery: 'no additional exclusions applied',
    });
    return [];
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .flatMap(normalizeIgnoreLine);
}

/**
 * Expands one `.animoriaignore` line into the glob pattern(s) that
 * express it. A pattern already containing a wildcard is trusted as-is;
 * a bare name (the common case — `legacy-assets`, `old-hero.json`) is
 * expanded to match that name both as a directory anywhere in the tree
 * and as a file anywhere in the tree, since a `.animoriaignore` author
 * should not need to know or care which one it is.
 */
function normalizeIgnoreLine(line: string): string[] {
  const trimmed = line.replace(/\/+$/, ''); // trailing slash is a directory hint, not part of the match
  if (trimmed.includes('*')) return [trimmed];
  return [`**/${trimmed}`, `**/${trimmed}/**`];
}

/** Compiles loaded patterns into a single predicate against a workspace-relative path. */
export function compileIgnorePatterns(
  patterns: readonly string[]
): (relativePath: string) => boolean {
  const regexes = patterns.map(globToRegex);
  return (relativePath: string) => regexes.some((re) => re.test(relativePath));
}
