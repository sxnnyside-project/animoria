import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the one place TypeScript cannot: values rendered from inline webview HTML.
 *
 * ## Why this gate exists
 * Wave 3 deleted `estimatedHealthScoreDelta`, `estimatedExecutionMs` and
 * `healthScoreAfter` — figures presented to developers as measurements that were
 * really arithmetic on a candidate count, sitting beside genuinely computed
 * numbers in identical styling. Deleting the *fields* was not enough: the panel's
 * webview markup lives inside template literals, so the code reading
 * `p.estimatedHealthScoreDelta` kept compiling, kept running, and rendered the
 * literal string `+undefined` into the UI. It survived a full type-check, a full
 * test run, and a structural search that only looked at Core.
 *
 * The lesson generalises past those three names: any value the extension shows a
 * developer must come from something that measured it. This scans the rendered
 * strings themselves, where the compiler has no reach.
 */
const SRC = resolve(__dirname, '../src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

/** Source with comments removed — every fix here is documented by naming what it replaced. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

describe('no fabricated values reach the developer', () => {
  const files = sourceFiles(SRC).map((path) => ({
    path: path.slice(SRC.length + 1),
    body: stripComments(readFileSync(path, 'utf-8')),
  }));

  it('renders no deleted estimate field anywhere, including inside webview HTML', () => {
    // Each of these was a number nobody measured. They are gone from the types;
    // this asserts they are gone from the markup that reads them too.
    //
    // `healthScoreAfter` is deliberately absent from this list: the duplicate
    // resolver has a field by that name holding a genuinely *observed*
    // post-convergence score (it awaits the next analysis rather than predicting
    // one). Banning the name would flag an honest measurement; the next test
    // bans the dishonest way of producing it instead.
    for (const banned of [
      'estimatedHealthScoreDelta',
      'estimatedExecutionMs',
      'estimatedExecutionTime',
    ]) {
      const offenders = files.filter((f) => f.body.includes(banned)).map((f) => f.path);
      expect(offenders, banned).toEqual([]);
    }
  });

  it('predicts no post-cleanup health score', () => {
    // The shape of the defect, not just its old names: a score arrived at by
    // adding a delta to the current one is a prediction wearing a measurement's
    // clothes. The genuine post-cleanup score comes from the next analysis.
    //
    // A `+` whose right operand is a string literal is concatenation for display
    // ("92 → 95"), not arithmetic, so the operand must be non-quoted to count.
    // The character class excludes whitespace, so `\s*` must consume all of it and
    // the first real operand character is what gets tested — a negative lookahead
    // after a greedy `\s*` would backtrack to zero width and pass on any spacing.
    const arithmetic =
      /(?:currentHealthScore|healthScoreBefore|health\.report\.score)\s*\+\s*[^\s'"`]/;

    const offenders = files.filter((f) => arithmetic.test(f.body)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('asserts no confidence level the extension did not receive from Core', () => {
    // Confidence is evidence-derived and coverage-capped in Core. A literal
    // assigned here would be an assertion with nothing behind it.
    const assigned = /confidence:\s*'(?:certain|high|moderate|low)'/;

    const offenders = files.filter((f) => assigned.test(f.body)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
