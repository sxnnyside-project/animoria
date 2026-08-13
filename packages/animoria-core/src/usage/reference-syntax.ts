import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

/**
 * How a file expresses a reference to an asset.
 *
 * ## Why this is not "one more list of extensions"
 * Adding `.css` to the set of scanned extensions and then matching it with the
 * *code* patterns would find almost nothing — a stylesheet contains no `import`
 * statement, no `setAnimation(...)`, no `R.raw.*`. It would produce the appearance
 * of support while leaving the same assets reported as unreferenced, which is worse
 * than the honest disclosure it replaced.
 *
 * Each syntax below therefore describes a genuinely different way a reference is
 * written, and each has its own extractor. A file's extension maps to one or more
 * syntaxes (`.astro` is markup *and* code; `.mdx` is markdown *and* code), so hybrid
 * formats are handled by composition rather than by a bespoke parser per format.
 */
export type ReferenceSyntax = 'code' | 'markup' | 'style' | 'markdown';

/** Which syntaxes a given file extension can carry. */
export interface FormatSupport {
  readonly extension: string;
  readonly syntaxes: readonly ReferenceSyntax[];
  /** Why this format is supported the way it is — surfaced in documentation, not at runtime. */
  readonly rationale: string;
}

/**
 * Every file format Animoria can extract asset references from.
 *
 * ## Formats deliberately absent
 * - **`.json`, `.yaml`, `.yml`, `.xml`** — a string in a data file that happens to
 *   equal an asset's filename is not evidence of use: it may be a fixture, a
 *   changelog entry, a lockfile, or a translation key. There is no syntax that marks
 *   a JSON string as *a reference* rather than *a value*, so supporting it would mean
 *   guessing. `.json` is additionally the Lottie asset extension itself, so scanning
 *   it would mean treating assets as sources for one another. These stay in
 *   {@link KNOWN_UNSCANNED_REFERENCE_EXTENSIONS}, disclosed rather than guessed at.
 */
export const REFERENCE_FORMAT_SUPPORT: readonly FormatSupport[] = [
  // ── Code ─────────────────────────────────────────────────────────────────────
  {
    extension: '.ts',
    syntaxes: ['code'],
    rationale: 'ESM/CJS imports and framework loader calls.',
  },
  {
    extension: '.tsx',
    syntaxes: ['code'],
    rationale:
      'As .ts, plus JSX attribute values are quoted strings the code patterns already match.',
  },
  {
    extension: '.js',
    syntaxes: ['code'],
    rationale: 'ESM/CJS imports and framework loader calls.',
  },
  { extension: '.jsx', syntaxes: ['code'], rationale: 'As .js.' },
  { extension: '.mjs', syntaxes: ['code'], rationale: 'ESM imports.' },
  { extension: '.cjs', syntaxes: ['code'], rationale: 'CJS requires.' },
  {
    extension: '.swift',
    syntaxes: ['code'],
    rationale: 'Lottie iOS `AnimationView(name:)` and asset-path literals.',
  },
  {
    extension: '.kt',
    syntaxes: ['code'],
    rationale: 'Android `R.raw.*` and Compose asset literals.',
  },
  { extension: '.java', syntaxes: ['code'], rationale: 'Android `R.raw.*`.' },
  { extension: '.dart', syntaxes: ['code'], rationale: 'Flutter `Lottie.asset(...)`.' },
  { extension: '.py', syntaxes: ['code'], rationale: 'Asset path literals.' },
  { extension: '.cs', syntaxes: ['code'], rationale: 'Asset path literals.' },

  // ── Markup ───────────────────────────────────────────────────────────────────
  {
    extension: '.html',
    syntaxes: ['markup'],
    rationale: '`src`/`href`/`srcset` attributes on media and link elements.',
  },
  { extension: '.htm', syntaxes: ['markup'], rationale: 'As .html.' },

  // ── Style ────────────────────────────────────────────────────────────────────
  { extension: '.css', syntaxes: ['style'], rationale: '`url()` values and `@import` targets.' },
  { extension: '.scss', syntaxes: ['style'], rationale: 'As .css, plus `@use` / `@forward`.' },
  { extension: '.sass', syntaxes: ['style'], rationale: 'As .scss.' },
  { extension: '.less', syntaxes: ['style'], rationale: 'As .css.' },

  // ── Markdown ─────────────────────────────────────────────────────────────────
  {
    extension: '.md',
    syntaxes: ['markdown', 'markup'],
    rationale: 'Image/link syntax, plus raw HTML blocks, which Markdown permits.',
  },
  {
    extension: '.mdx',
    syntaxes: ['markdown', 'markup', 'code'],
    rationale: 'As .md, plus ESM imports and JSX.',
  },

  // ── Hybrid component formats ─────────────────────────────────────────────────
  {
    extension: '.vue',
    syntaxes: ['code', 'markup', 'style'],
    rationale:
      'SFC: `<script>` imports, `<template>` attributes (incl. `:src` bindings), `<style>` `url()`.',
  },
  { extension: '.svelte', syntaxes: ['code', 'markup', 'style'], rationale: 'As .vue.' },
  {
    extension: '.astro',
    syntaxes: ['code', 'markup', 'style'],
    rationale: 'Frontmatter imports, HTML-like template attributes, scoped styles.',
  },
];

/** Every extension {@link buildReferenceIndex} knows how to read. */
export const SUPPORTED_REFERENCE_EXTENSIONS: readonly string[] = REFERENCE_FORMAT_SUPPORT.map(
  (f) => f.extension
);

const SYNTAXES_BY_EXTENSION: ReadonlyMap<string, readonly ReferenceSyntax[]> = new Map(
  REFERENCE_FORMAT_SUPPORT.map((f) => [f.extension, f.syntaxes])
);

/** Syntaxes carried by a file extension, or an empty list when the format is unsupported. */
export function syntaxesForExtension(extension: string): readonly ReferenceSyntax[] {
  return SYNTAXES_BY_EXTENSION.get(extension.toLowerCase()) ?? [];
}

// ── Target extraction ──────────────────────────────────────────────────────────

/**
 * Attributes whose value is a resource location.
 *
 * An allow-list, not a pattern: matching *any* `name="value"` pair would turn every
 * `alt`, `title`, and `aria-label` into a reference candidate, which is precisely the
 * prose-matching false positive this design exists to avoid. Vue/Astro/Svelte
 * bindings (`:src`, `v-bind:src`, `bind:src`) are accepted as spellings of the same
 * attributes.
 */
// Ordered longest-first: regex alternation is first-match, so `data` listed before
// `data-srcset` would match the prefix and leave `-srcset=` unparsed.
const RESOURCE_ATTRIBUTES = [
  'data-srcset',
  'data-src',
  'xlink:href',
  'srcset',
  'poster',
  'href',
  'data',
  'src',
];

/** Attributes whose value is a comma-separated candidate list rather than a single URL. */
const COMMA_SEPARATED_ATTRIBUTES = new Set(['srcset', 'data-srcset']);

const ATTRIBUTE_PATTERN = new RegExp(
  `(?:^|[\\s{])(?::|v-bind:|bind:)?(${RESOURCE_ATTRIBUTES.join('|')})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*['"]([^'"]*)['"]\\s*\\})`,
  'gi'
);

/** `url(...)`, with or without quotes. Covers `image-set()` and `src()` by containment. */
const CSS_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)/gi;

/** `@import`, `@use`, `@forward` — Sass and CSS module resolution. */
const CSS_AT_RULE_PATTERN = /@(?:import|use|forward)\s+(?:"([^"]*)"|'([^']*)')/gi;

/** `![alt](target "title")` and `[text](target)`; the leading `!` is optional. */
const MARKDOWN_INLINE_PATTERN = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

/** Reference-style definitions: `[id]: ./path/to/asset.json`. */
const MARKDOWN_DEFINITION_PATTERN = /^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?/;

/**
 * Extracts every candidate reference target from one line, for the given syntaxes.
 *
 * Returns raw target strings exactly as written — resolution, URL rejection, and
 * matching against the asset inventory all happen in {@link candidateMatchesAsset},
 * so extraction stays a pure, format-shaped concern with no knowledge of the
 * workspace.
 */
export function extractReferenceTargets(
  line: string,
  syntaxes: readonly ReferenceSyntax[]
): readonly string[] {
  const targets: string[] = [];

  if (syntaxes.includes('markup')) {
    collectAttributes(line, targets);
  }

  if (syntaxes.includes('style')) {
    collect(CSS_URL_PATTERN, line, targets);
    collect(CSS_AT_RULE_PATTERN, line, targets);
  }

  if (syntaxes.includes('markdown')) {
    collect(MARKDOWN_INLINE_PATTERN, line, targets);
    const definition = MARKDOWN_DEFINITION_PATTERN.exec(line);
    if (definition?.[1]) targets.push(definition[1]);
  }

  return targets;
}

/** Runs a global pattern, pushing the first non-empty capture of each match. */
function collect(pattern: RegExp, line: string, out: string[]): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(line);
  while (match !== null) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value && value.trim().length > 0) out.push(value);
    match = pattern.exec(line);
  }
}

/**
 * Extracts resource-attribute values, splitting on commas only for the attributes
 * that genuinely hold a candidate *list*.
 *
 * Splitting every attribute would be wrong in a way that manufactures references: a
 * `data:` URI contains a comma before its payload, so
 * `src="data:application/json;base64,logo.json"` would yield `logo.json` as a bare
 * filename and credit a real asset for an inline blob that has nothing to do with it.
 */
function collectAttributes(line: string, out: string[]): void {
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = ATTRIBUTE_PATTERN.exec(line);
  while (match !== null) {
    const attribute = (match[1] ?? '').toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    if (value && value.trim().length > 0) {
      if (COMMA_SEPARATED_ATTRIBUTES.has(attribute)) {
        // Each entry is a URL optionally followed by a width or density descriptor.
        for (const candidate of value.split(',')) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) out.push(url);
        }
      } else {
        out.push(unwrapBoundLiteral(value));
      }
    }
    match = ATTRIBUTE_PATTERN.exec(line);
  }
}

/**
 * Unwraps a quoted string literal inside a bound attribute value.
 *
 * A framework binding holds an *expression*, not a URL: `:src="'./logo.json'"` and
 * `bind:src={"./logo.json"}` both carry a quoted literal within the attribute. The
 * simple case — a value that is entirely one string literal — is the one worth
 * handling; anything more (concatenation, a variable, a ternary) is a computed value
 * this extractor deliberately does not guess at.
 */
function unwrapBoundLiteral(value: string): string {
  const trimmed = value.trim();
  const first = trimmed[0];
  if ((first === "'" || first === '"' || first === '`') && trimmed.endsWith(first)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// ── Target resolution ──────────────────────────────────────────────────────────

/** Schemes that address something outside this workspace, so can never be a local asset. */
const EXTERNAL_TARGET = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** How confidently a candidate target was tied to an asset. */
export type TargetMatchKind = 'resolved-path' | 'filename';

export interface TargetResolution {
  readonly matched: boolean;
  readonly kind?: TargetMatchKind;
}

/**
 * Decides whether a candidate target refers to a specific asset.
 *
 * ## The rules, and the false positives each one prevents
 * - **External targets are rejected outright.** `https://cdn.example.com/logo.json`,
 *   `//cdn/logo.json`, and `data:` URIs name something that is not this workspace's
 *   file, however similar the basename.
 * - **Query strings and fragments are stripped.** `logo.json?v=2` and `logo.json#frag`
 *   are the same file; `sprite.svg#icon` is a fragment *of* the asset, so it counts.
 * - **Explicitly relative targets must resolve exactly.** A target beginning `./` or
 *   `../` states a filesystem location, so it is honoured literally: `../../other-repo/logo.json`
 *   names a different file that happens to share a basename, and does not match.
 * - **Root-absolute targets resolve against the workspace, then fall back to the
 *   filename.** `/assets/logo.json` in HTML is a *web* root, which Animoria cannot
 *   know (it may be `public/`, `static/`, `dist/`). Exact resolution is attempted
 *   first; the filename fallback keeps a correct reference from being missed.
 * - **Bare and aliased targets match on filename.** `@/assets/logo.json` and
 *   `~assets/logo.json` depend on bundler configuration Animoria does not read, so
 *   the filename is the strongest available evidence.
 *
 * Comparison is case-insensitive, matching the case-insensitive default of macOS and
 * Windows filesystems — the platforms where a case difference is a spelling variant
 * rather than a different file.
 */
export function candidateMatchesAsset(
  target: string,
  sourceFile: string,
  workspacePath: string,
  assetPath: string,
  assetName: string
): TargetResolution {
  if (EXTERNAL_TARGET.test(target)) return { matched: false };

  const cleaned = stripQueryAndFragment(target);
  if (cleaned.length === 0) return { matched: false };

  const decoded = decodeTarget(cleaned);
  const targetName = basename(decoded);
  if (targetName.toLowerCase() !== assetName.toLowerCase()) return { matched: false };

  const isExplicitlyRelative = decoded.startsWith('./') || decoded.startsWith('../');
  const isRootAbsolute = decoded.startsWith('/');

  if (isExplicitlyRelative) {
    // A filesystem-relative path is unambiguous, so it is held to exact resolution.
    // Falling back to the filename here is what would let a path pointing outside the
    // workspace be credited to an asset inside it.
    const resolved = resolve(dirname(sourceFile), decoded);
    return samePath(resolved, assetPath)
      ? { matched: true, kind: 'resolved-path' }
      : { matched: false };
  }

  if (isRootAbsolute) {
    const resolved = join(workspacePath, decoded);
    if (samePath(resolved, assetPath)) return { matched: true, kind: 'resolved-path' };
    // The web root is unknowable; the filename remains real evidence.
    return { matched: true, kind: 'filename' };
  }

  if (!isAbsolute(decoded) && decoded.includes('/')) {
    // A bare relative path such as `assets/logo.json` — try the source directory,
    // then the workspace root, before settling for the filename.
    for (const base of [dirname(sourceFile), workspacePath]) {
      if (samePath(resolve(base, decoded), assetPath)) {
        return { matched: true, kind: 'resolved-path' };
      }
    }
  }

  return { matched: true, kind: 'filename' };
}

function stripQueryAndFragment(target: string): string {
  const queryIndex = target.search(/[?#]/);
  return queryIndex === -1 ? target : target.slice(0, queryIndex);
}

function decodeTarget(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    // A malformed escape sequence is not a reason to discard the target; compare it
    // as written.
    return target;
  }
}

function samePath(a: string, b: string): boolean {
  return resolve(a).toLowerCase() === resolve(b).toLowerCase();
}
