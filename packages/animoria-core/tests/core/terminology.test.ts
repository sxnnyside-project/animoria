import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TERMINOLOGY_CANON, entryForBannedTerm } from '../../src/terminology/canon.js';

/**
 * The D-14 terminology gate.
 *
 * ## What it enforces, and why only this
 * The canon (`src/terminology/canon.ts`) is the source of truth; this gate makes it
 * mechanical. It scans **user-facing text only**: string and template literals in
 * TypeScript, and rendered text in Kotlin. Comments are deliberately exempt —
 * `DECISIONS.md` requires the codebase to explain *why* `overused` was deleted, and
 * a gate that banned the word everywhere would make it impossible to say so.
 *
 * ## Why scanning strings, not identifiers
 * An internal variable named `orphanPenalty` is not something a developer reads in
 * the product. What they read is `"Orphaned"` rendered into a badge. Banning the
 * identifier would generate noise the team learns to suppress, which is how a gate
 * stops working.
 *
 * ## Allowances
 * Each allowance is a specific, justified occurrence — not a directory-level
 * exemption. Adding one requires stating why the word is correct there.
 */

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..', '..');

const SCAN_ROOTS: readonly string[] = [
  'packages/animoria-core/src',
  'packages/animoria-ui/src',
  'packages/animoria-vscode/src',
  'packages/animoria-jetbrains/src/main/kotlin',
  'apps/animoria-sandbox/src',
];

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.kt', '.css']);

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'bin', '.gradle', 'out']);

/**
 * Files whose *content* is the canon itself, or which quote banned words in order
 * to ban them. Scanning these would make the gate fail on its own definition.
 */
const SELF_REFERENTIAL: readonly string[] = ['packages/animoria-core/src/terminology/canon.ts'];

/**
 * Specific justified occurrences.
 *
 * `ref-unreferenced` / `ref-orphaned`-style CSS class names are *not* here: they
 * were renamed rather than exempted, because a class name is read by anyone
 * inspecting the DOM and drifts into rendered text the moment someone reuses it.
 */
const ALLOWANCES: readonly {
  readonly file: string;
  readonly term: string;
  readonly why: string;
}[] = [
  {
    file: 'packages/animoria-core/src/governance/rules/builtins/no-unreferenced-assets.rule.ts',
    term: 'unused',
    why: 'Quotes the phrase it tells the developer NOT to conclude, inside the remediation text.',
  },
];

// ── Extraction ────────────────────────────────────────────────────────────────

interface Occurrence {
  readonly file: string;
  readonly line: number;
  readonly term: string;
  readonly text: string;
}

/**
 * Strips comments, then returns only the contents of string/template literals.
 *
 * A deliberately simple scanner: it does not parse TypeScript. It does not need to
 * — over-reporting inside a template literal is exactly the behaviour wanted (that
 * is rendered text), and the one thing it must not do is report a comment, which
 * stripping handles.
 */
function userFacingStringsPerLine(source: string): readonly (readonly string[])[] {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

  return withoutBlockComments.split('\n').map((rawLine) => {
    const line = rawLine.replace(/\/\/.*$/, '');
    const found: string[] = [];
    const literal =
      /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
    let match: RegExpExecArray | null = literal.exec(line);
    while (match !== null) {
      found.push(match[1] ?? match[2] ?? match[3] ?? '');
      match = literal.exec(line);
    }
    return found;
  });
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // A scan root that does not exist yet is not a failure.
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (SCANNED_EXTENSIONS.has(extname(full))) {
      out.push(full);
    }
  }
}

function collectOccurrences(): readonly Occurrence[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(join(REPO_ROOT, root), files);

  const occurrences: Occurrence[] = [];

  for (const file of files) {
    const rel = relative(REPO_ROOT, file).split('\\').join('/');
    if (SELF_REFERENTIAL.includes(rel)) continue;

    const source = readFileSync(file, 'utf8');
    const perLine = userFacingStringsPerLine(source);

    perLine.forEach((literals, index) => {
      for (const literal of literals) {
        for (const entry of TERMINOLOGY_CANON) {
          for (const banned of entry.banned) {
            const pattern = new RegExp(`\\b${banned}\\b`, 'i');
            if (!pattern.test(literal)) continue;
            if (ALLOWANCES.some((a) => a.file === rel && a.term === banned)) continue;
            occurrences.push({ file: rel, line: index + 1, term: banned, text: literal.trim() });
          }
        }
      }
    });
  }

  return occurrences;
}

// ── The gate ──────────────────────────────────────────────────────────────────

describe('D-14 terminology canon', () => {
  it('defines a canonical term and a rationale for every concept', () => {
    for (const entry of TERMINOLOGY_CANON) {
      expect(entry.concept.length, `${entry.concept}: concept must be stated`).toBeGreaterThan(0);
      expect(
        entry.rationale.length,
        `${entry.concept}: a banned word without a stated reason is an unarguable rule`
      ).toBeGreaterThan(0);
      expect(entry.banned.length).toBeGreaterThan(0);
    }
  });

  it('never bans a word it also declares canonical', () => {
    const canonical = new Set(
      TERMINOLOGY_CANON.map((e) => e.canonical.toLowerCase()).filter((c) => c.length > 0)
    );
    for (const banned of TERMINOLOGY_CANON.flatMap((e) => e.banned)) {
      expect(canonical.has(banned.toLowerCase()), `"${banned}" is both canonical and banned`).toBe(
        false
      );
    }
  });

  it('resolves a banned term to the entry that explains it', () => {
    const entry = entryForBannedTerm('orphaned');
    expect(entry?.canonical).toBe('unreferenced');
  });

  it('finds no banned terminology in user-facing text', () => {
    const occurrences = collectOccurrences();

    const report = occurrences
      .map((o) => {
        const entry = entryForBannedTerm(o.term);
        return `  ${o.file}:${o.line}\n    "${o.text.slice(0, 100)}"\n    → "${o.term}" is banned; use "${
          entry?.canonical || '(nothing — this concept was deleted)'
        }". ${entry?.rationale ?? ''}`;
      })
      .join('\n\n');

    expect(occurrences, `Banned terminology in user-facing text:\n\n${report}\n`).toEqual([]);
  });
});
