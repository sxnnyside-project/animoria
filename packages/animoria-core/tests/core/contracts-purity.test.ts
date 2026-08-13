import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `@animoria/core/contracts` must stay loadable in a browser.
 *
 * ## What this protects
 * `@animoria/ui` imports this entry point and nothing else from Core. When it
 * imported the main entry instead, the UI bundle was 292 kB and contained
 * `micromatch`, `picomatch` and a directory walker, reached transitively through the
 * asset scanner — plus a set of `node:` builtins the bundler stubbed because a
 * browser cannot provide them. Switching to this entry took the bundle to 94 kB.
 *
 * A size regression is the visible symptom. The real one is that a UI package able
 * to reach `node:fs` has no enforced boundary at all — it is a host that has not
 * noticed yet. So this test walks the actual import graph rather than trusting the
 * entry point's own imports: a `node:` dependency four modules deep is exactly as
 * fatal and considerably easier to add by accident.
 *
 * ## Why type-only imports are excluded
 * `import type` is erased before the bundler sees it, so a type imported from a
 * module that touches the filesystem costs nothing at runtime. The walk follows
 * value imports only — which is precisely the distinction `verbatimModuleSyntax`
 * makes checkable.
 */

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const ENTRY = join(SRC, 'contracts.ts');

/** Node builtins and packages that cannot exist in a browser. */
const FORBIDDEN_SPECIFIER =
  /^(node:|fs$|path$|os$|crypto$|child_process$|perf_hooks$|fast-glob|js-yaml|fflate|@dotlottie)/;

/**
 * Value imports only.
 *
 * `export type { … } from` and `import type { … } from` are erased, so they cannot
 * drag anything into a bundle. Everything else is followed.
 */
function valueImports(source: string): readonly string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const found: string[] = [];

  const pattern = /(?:^|\n)\s*(import|export)\s+([\s\S]*?)from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = pattern.exec(withoutComments);
  while (match !== null) {
    const clause = match[2] ?? '';
    const specifier = match[3];
    // `import type {…}` / `export type {…}` — erased entirely.
    const isTypeOnly = /^\s*type\s/.test(clause);
    if (!isTypeOnly && specifier) found.push(specifier);
    match = pattern.exec(withoutComments);
  }

  // A bare `import 'x'` for side effects carries everything in `x`.
  const bare = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
  let bareMatch: RegExpExecArray | null = bare.exec(withoutComments);
  while (bareMatch !== null) {
    if (bareMatch[1]) found.push(bareMatch[1]);
    bareMatch = bare.exec(withoutComments);
  }

  return found;
}

function resolveRelative(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(from), specifier.replace(/\.js$/, ''));
  for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

interface Violation {
  readonly specifier: string;
  readonly chain: readonly string[];
}

function walkGraph(): readonly Violation[] {
  const violations: Violation[] = [];
  const seen = new Set<string>();

  const visit = (file: string, chain: readonly string[]): void => {
    if (seen.has(file)) return;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    const nextChain = [...chain, relative(SRC, file)];

    for (const specifier of valueImports(source)) {
      if (FORBIDDEN_SPECIFIER.test(specifier)) {
        violations.push({ specifier, chain: nextChain });
        continue;
      }
      const resolved = resolveRelative(file, specifier);
      if (resolved) visit(resolved, nextChain);
    }
  };

  visit(ENTRY, []);
  return violations;
}

describe('@animoria/core/contracts — browser safety', () => {
  it('reaches no Node builtin or Node-only package through any value import', () => {
    const violations = walkGraph();

    const report = violations
      .map((v) => `  "${v.specifier}" reached via:\n    ${v.chain.join('\n    → ')}`)
      .join('\n\n');

    expect(
      violations,
      `@animoria/core/contracts must stay loadable in a browser.\n\n${report}\n`
    ).toEqual([]);
  });

  it('exports the semantic surface the UI actually consumes', () => {
    // A regression guard on the split itself: if one of these stops being exported,
    // the UI silently falls back to importing the main entry and the bundle grows a
    // filesystem scanner again.
    const source = readFileSync(ENTRY, 'utf8');
    const required = [
      'WorkspaceAnalysis',
      'AnalysisLifecycle',
      'deriveAnalysisLifecycle',
      'RuleDiagnostic',
      'DiagnosticEvidence',
      'Confidence',
      'ScanCoverage',
      'DuplicateGroup',
      'ResolutionPlan',
      'CleanupPlan',
      'ReviewableCleanupProposal',
      'HealthScoreOutcome',
      'describeHealthState',
      'CONFIDENCE_LABELS',
      'COVERAGE_LABELS',
    ];

    for (const name of required) {
      expect(source, `contracts.ts must export ${name}`).toContain(name);
    }
  });

  it('exports no function that decides governance', () => {
    // The contracts entry is for shapes and pure interpretation. A decision function
    // exported here would be one the UI could call — and a UI that can call
    // `buildCleanupCandidates` is a UI that can disagree with its host about what is
    // removable.
    const source = readFileSync(ENTRY, 'utf8');
    const forbidden = [
      'buildCleanupCandidates',
      'buildCleanupPlan',
      'executeCleanupPlan',
      'buildResolutionPlan',
      'executeResolutionPlan',
      'HealthScoreEngine',
      'RulesEngine',
      'WorkspaceIndexer',
    ];

    for (const name of forbidden) {
      const exported = new RegExp(`^\\s*(export\\s*\\{[^}]*\\b${name}\\b|\\s+${name},)`, 'm');
      expect(
        exported.test(source.replace(/\/\*[\s\S]*?\*\//g, '')),
        `${name} must not be exported`
      ).toBe(false);
    }
  });
});
