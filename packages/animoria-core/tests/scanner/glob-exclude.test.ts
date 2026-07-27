import { describe, expect, it } from 'vitest';
import { globToRegex } from '../../src/scanner/glob-exclude.js';

/**
 * Regresses a bug in `globToRegex`'s original chained `.replace()` calls:
 * each call re-scanned the entire string, including replacement text an
 * earlier call had just inserted (every substitution contains a literal
 * `*`), so `**\/` patterns could only skip exactly one directory segment
 * instead of any number of them — `**\/node_modules/**` matched
 * `a/node_modules/x` but not `a/b/node_modules/x`.
 */
describe('globToRegex', () => {
  it('matches a **/ prefix across multiple nested directory segments', () => {
    const re = globToRegex('**/node_modules/**');

    expect(re.test('node_modules/pkg')).toBe(true);
    expect(re.test('packages/core/node_modules/pkg')).toBe(true);
    expect(re.test('a/b/c/d/node_modules/pkg')).toBe(true);
  });

  it('matches a bare **/<file> pattern regardless of nesting depth', () => {
    const re = globToRegex('**/old-hero.json');

    expect(re.test('old-hero.json')).toBe(true);
    expect(re.test('assets/old-hero.json')).toBe(true);
    expect(re.test('assets/animations/legacy/old-hero.json')).toBe(true);
    expect(re.test('assets/new-hero.json')).toBe(false);
  });

  it('does not match a path that only shares a suffix, not the full segment', () => {
    const re = globToRegex('**/hero.json');

    expect(re.test('assets/not-hero.json')).toBe(false);
  });

  it('still treats a single * as matching only within one path segment', () => {
    const re = globToRegex('assets/*.json');

    expect(re.test('assets/hero.json')).toBe(true);
    expect(re.test('assets/nested/hero.json')).toBe(false);
  });
});
