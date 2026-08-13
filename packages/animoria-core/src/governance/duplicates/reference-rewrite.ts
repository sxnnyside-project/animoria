import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { AnimoriaAsset } from '../../types/asset.js';
import {
  candidateMatchesAsset,
  extractReferenceTargets,
  syntaxesForExtension,
} from '../../usage/reference-syntax.js';

/**
 * Deciding whether — and exactly how — one line of source code can be safely
 * repointed from a duplicate asset to the canonical one.
 *
 * ## The rewrite this replaces, and why it was unsafe
 * Reference rewriting was previously a blind two-branch string substitution:
 *
 * ```ts
 * if (line.includes(duplicate.name)) return line.split(duplicate.name).join(canonical.name);
 * if (line.includes(duplicate.stem)) return line.split(duplicate.stem).join(canonical.stem);
 * ```
 *
 * That is wrong in three separate ways, each of which silently corrupts source:
 *
 * 1. **It rewrites the filename but leaves the directory.** Resolving
 *    `vendor/spinner-copy.json` against canonical `assets/spinner.json` produced
 *    `./vendor/spinner.json` — a path to a file that does not exist. The import
 *    was left broken by the very operation meant to fix it.
 * 2. **Stem matching is pure string coincidence.** With stem `logo`, the line
 *    `import logo from './logo.json'; const logotype = LOGO_MAP.logo;` had *every*
 *    occurrence replaced, including `logotype` and the unrelated property.
 * 3. **It could not tell a real reference from an incidental mention.** A URL, a
 *    comment, or a same-named file in a different package all matched.
 *
 * ## What this module does instead
 * It reuses the *same* canonical reference machinery the usage scanner uses
 * ({@link extractReferenceTargets} + {@link candidateMatchesAsset}) to find the
 * actual reference target inside the line, then rewrites **that target only**,
 * recomputing the complete path from the referencing file to the canonical asset.
 * Anything it cannot establish unambiguously is refused, not guessed — a refused
 * reference is reported to the developer as work they must do by hand, which is
 * strictly better than a plausible-looking edit that breaks a build.
 */

/** Why a reference that points at a duplicate cannot be mechanically repointed. */
export type RewriteRefusalReason =
  /** The referencing file's format carries no reference syntax Animoria can parse. */
  | 'unsupported-source-format'
  /** No parseable target on the line resolved to the duplicate — the usage scanner matched it heuristically. */
  | 'no-resolvable-target'
  /** The line references the duplicate through more than one distinct target. */
  | 'ambiguous-multiple-targets'
  /** The target resolves through a bundler alias or an unknown web root, so its correct new spelling is unknowable. */
  | 'unresolvable-target-style';

/** A reference that will be repointed, with the exact text change that achieves it. */
export interface ReferenceRewrite {
  readonly file: string;
  readonly line: number;
  /** The exact current line content this update expects to find. */
  readonly oldText: string;
  /** The line content after repointing. */
  readonly newText: string;
  /** The reference target as it appears in the source today. */
  readonly oldTarget: string;
  /** The target that replaces it. */
  readonly newTarget: string;
}

/** A reference that points at a duplicate but which Animoria refuses to rewrite. */
export interface UnrewritableReference {
  readonly file: string;
  readonly line: number;
  /** The line as it stands, so the developer can find it. */
  readonly text: string;
  readonly reason: RewriteRefusalReason;
  /** Plain-language explanation, safe to render standalone in any client. */
  readonly explanation: string;
}

/** Either a concrete rewrite, a refusal, or `null` when the line needs no change at all. */
export type RewriteOutcome =
  | { readonly kind: 'rewrite'; readonly rewrite: ReferenceRewrite }
  | { readonly kind: 'refused'; readonly refusal: UnrewritableReference }
  | { readonly kind: 'already-valid' }
  /**
   * The line contains reference targets, and every one of them positively
   * resolves to some *other* file.
   *
   * This is distinct from a refusal, and the distinction matters. The usage
   * scanner matches code lines with a filename-based heuristic, so in a workspace
   * where three copies of `icon.json` exist it reports all three referencing
   * lines for each copy. Precise resolution then establishes that
   * `'./b/icon.json'` is not a reference to `src/a/icon.json` at all — there is
   * nothing here to rewrite and nothing to warn a developer about. Reporting it
   * as unrewritable would flood a three-copy resolution with warnings about lines
   * that are already correct.
   */
  | { readonly kind: 'not-a-reference' };

const EXPLANATIONS: Readonly<Record<RewriteRefusalReason, string>> = {
  'unsupported-source-format':
    'Animoria cannot parse references in this file format, so it cannot safely rewrite this line.',
  'no-resolvable-target':
    'This line mentions the asset but contains no reference path Animoria can rewrite with certainty.',
  'ambiguous-multiple-targets':
    'This line references the duplicate through more than one path; rewriting it automatically could change the wrong one.',
  'unresolvable-target-style':
    'This reference resolves through a bundler alias or a web root Animoria cannot see, so its correct new value is unknowable.',
};

function refuse(
  file: string,
  line: number,
  text: string,
  reason: RewriteRefusalReason
): RewriteOutcome {
  return {
    kind: 'refused',
    refusal: { file, line, text, reason, explanation: EXPLANATIONS[reason] },
  };
}

/** Quoted string literals — single, double, or backtick — with no interpolation. */
const CODE_STRING_LITERAL = /(?:'([^'\n]*)'|"([^"\n]*)"|`([^`\n$]*)`)/g;

/**
 * Candidate reference targets inside a line of code.
 *
 * ## Why this is separate from `extractReferenceTargets`
 * That function handles markup, style and markdown, where a reference lives in a
 * known syntactic position (`src=`, `url()`, `![]()`). Code has no such position:
 * the reference index matches `.ts`/`.kt`/`.swift` lines with a substring matcher
 * precisely *because* an import path can appear in arbitrarily many forms.
 *
 * That heuristic is right for *finding* references and wrong for *rewriting* them
 * — knowing a line mentions an asset says nothing about which characters to
 * replace. Rewriting needs an exact span, so this narrows to the one construct
 * every real code reference actually uses: a quoted string literal. A line whose
 * mention of the asset is not inside a quoted literal yields nothing here and is
 * refused rather than guessed at.
 *
 * Interpolated template literals are deliberately excluded (the `$` exclusion in
 * the pattern): `` `${dir}/logo.json` `` is a computed path whose real value
 * Animoria does not know.
 */
function extractCodeTargets(line: string): string[] {
  const targets: string[] = [];
  CODE_STRING_LITERAL.lastIndex = 0;
  let match: RegExpExecArray | null = CODE_STRING_LITERAL.exec(line);
  while (match !== null) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value && value.trim().length > 0) targets.push(value);
    match = CODE_STRING_LITERAL.exec(line);
  }
  return targets;
}

/**
 * Recomputes how the canonical asset should be spelled from a given source file,
 * preserving the *style* of the reference being replaced.
 *
 * Style preservation is not cosmetic. A root-absolute `/assets/logo.json` is
 * resolved by a web server or bundler against a root Animoria cannot see; turning
 * it into `../assets/logo.json` would change its meaning entirely. The only safe
 * transformation keeps the same kind of path it found.
 */
function spellCanonicalTarget(
  oldTarget: string,
  sourceFile: string,
  workspacePath: string,
  canonical: AnimoriaAsset
): string | null {
  const posix = (value: string) => value.split(sep).join('/');

  if (oldTarget.startsWith('/')) {
    const fromRoot = relative(workspacePath, canonical.path);
    // A canonical asset outside the workspace has no root-absolute spelling.
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) return null;
    return `/${posix(fromRoot)}`;
  }

  const fromSource = posix(relative(dirname(sourceFile), canonical.path));
  if (fromSource.length === 0) return null;
  // `./` is added for a sibling path so the result stays an explicitly relative
  // specifier — bare `logo.json` means "module named logo.json" to a bundler.
  return fromSource.startsWith('.') ? fromSource : `./${fromSource}`;
}

/**
 * Decides how a single line referencing `duplicate` should be repointed at
 * `canonical`.
 *
 * Performs no I/O and mutates nothing: given the same line it always returns the
 * same outcome, which is what allows a preview to be generated from exactly the
 * data execution will later consume.
 */
export function planLineRewrite(params: {
  readonly line: string;
  readonly lineNumber: number;
  readonly sourceFile: string;
  readonly workspacePath: string;
  readonly duplicate: AnimoriaAsset;
  readonly canonical: AnimoriaAsset;
}): RewriteOutcome {
  const { line, lineNumber, sourceFile, workspacePath, duplicate, canonical } = params;

  const syntaxes = syntaxesForExtension(extname(sourceFile));
  if (syntaxes.length === 0) {
    return refuse(sourceFile, lineNumber, line, 'unsupported-source-format');
  }

  const candidates = [
    ...(syntaxes.includes('code') ? extractCodeTargets(line) : []),
    ...(syntaxes.some((s) => s !== 'code') ? extractReferenceTargets(line, syntaxes) : []),
  ];

  const matching = [...new Set(candidates)]
    .map((target) => ({
      target,
      resolution: candidateMatchesAsset(
        target,
        sourceFile,
        workspacePath,
        duplicate.path,
        duplicate.name
      ),
    }))
    .filter((entry) => entry.resolution.matched);

  if (matching.length === 0) {
    // Targets were found and none named the duplicate: the line demonstrably
    // points elsewhere. No targets at all means the scanner matched something
    // this cannot see into, which is a genuine refusal.
    return candidates.length > 0
      ? { kind: 'not-a-reference' }
      : refuse(sourceFile, lineNumber, line, 'no-resolvable-target');
  }
  if (matching.length > 1) {
    return refuse(sourceFile, lineNumber, line, 'ambiguous-multiple-targets');
  }

  const [only] = matching;
  if (!only) return refuse(sourceFile, lineNumber, line, 'no-resolvable-target');

  if (only.resolution.kind !== 'resolved-path') {
    // Matched by filename alone: the target reaches the file through an alias or a
    // web root, so the path Animoria would write cannot be shown to be the path the
    // toolchain will read. If the canonical asset shares the duplicate's filename
    // the existing text already names it correctly and needs no change at all.
    return duplicate.name.toLowerCase() === canonical.name.toLowerCase()
      ? { kind: 'already-valid' }
      : refuse(sourceFile, lineNumber, line, 'unresolvable-target-style');
  }

  const newTarget = spellCanonicalTarget(only.target, sourceFile, workspacePath, canonical);
  if (newTarget === null) {
    return refuse(sourceFile, lineNumber, line, 'unresolvable-target-style');
  }
  if (newTarget === only.target) return { kind: 'already-valid' };

  // Only the resolved target substring is replaced — never the stem, never a bare
  // filename occurrence elsewhere on the line.
  const newText = line.split(only.target).join(newTarget);
  if (newText === line) {
    return refuse(sourceFile, lineNumber, line, 'no-resolvable-target');
  }

  return {
    kind: 'rewrite',
    rewrite: {
      file: sourceFile,
      line: lineNumber,
      oldText: line,
      newText,
      oldTarget: only.target,
      newTarget,
    },
  };
}

/** Absolute-path helper shared with the plan builder, kept here beside the rules it serves. */
export function resolveFromSource(sourceFile: string, target: string): string {
  return resolve(dirname(sourceFile), target);
}
