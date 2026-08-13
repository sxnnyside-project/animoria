import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A standing guard against values that look computed but are not.
 *
 * The audit found three of these shipping together: a `confidence: 'high'` literal
 * stamped on every cleanup candidate, an `estimatedHealthScoreDelta` of
 * `candidates.length * 2`, and a post-cleanup score of `before + moved.length * 2` —
 * a prediction of a number produced by an entirely different weighted engine. Each
 * was presented to the user as a result. None was calculated.
 *
 * These assertions read the source because that is where the defect lives: any
 * behavioural test would have to know the fabricated number in advance to notice it
 * was fabricated.
 */

const SRC = resolve(__dirname, '../../src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return extname(full) === '.ts' ? [full] : [];
  });
}

/** Source with comments removed — the fix is *described* in the comments that replaced it. */
function code(file: string): string {
  const raw = readFileSync(file, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
  return raw
    .split('\n')
    .map((line) => line.split('//')[0])
    .join('\n');
}

describe('no fabricated values reach a user', () => {
  const files = sourceFiles(SRC);

  it('never asserts a confidence as a literal at a call site', () => {
    // Confidence must follow from the evidence. Referring to a named derivation —
    // `DIRECT_OBSERVATION_CONFIDENCE`, whose declaration states why a direct file
    // property is certain — is fine. An inline string at a call site is the pattern
    // that shipped a guarantee nobody computed.
    const offenders = files.flatMap((file) => {
      const matches = code(file).match(/confidence:\s*['"](certain|high|moderate|low|medium)['"]/g);
      return matches ? matches.map((m) => `${file}: ${m}`) : [];
    });

    expect(offenders).toEqual([]);
  });

  it('never derives a Health Score from a candidate count', () => {
    // The defect was arithmetic, not a field name: `Math.min(candidates.length * 2, 20)`
    // and `healthScoreBefore + Math.min(moved.length * 2, 20)` were presented as
    // predictions of a weighted score they bore no relationship to. A score
    // *observed* after the index re-converges — as the duplicate-resolution summary
    // reports — is a real measurement and is deliberately not caught here.
    const ARITHMETIC_ESTIMATE =
      /(?:healthScore\w*|estimatedHealthScoreDelta)\s*[:=][^;\n]*\b(?:length|count|size)\b[^;\n]*[*+]/;

    const offenders = files.filter((file) => ARITHMETIC_ESTIMATE.test(code(file)));

    expect(offenders).toEqual([]);
  });

  it('never predicts an execution time from a candidate count', () => {
    const offenders = files.filter((file) => /estimatedExecutionMs\s*:/.test(code(file)));

    expect(offenders).toEqual([]);
  });

  it('carries scan coverage as structured data, never as a rendered sentence', () => {
    // A client must be able to answer "what was searched?" without parsing prose.
    const offenders = files.flatMap((file) => {
      const source = code(file);
      const matches = source.match(/details:\s*[`'"]\s*Scanned\b/g);
      return matches ? matches.map((m) => `${file}: ${m}`) : [];
    });

    expect(offenders).toEqual([]);
  });
});
