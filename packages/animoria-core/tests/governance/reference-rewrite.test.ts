import { describe, expect, it } from 'vitest';
import { planLineRewrite } from '../../src/governance/duplicates/reference-rewrite';
import type { AnimoriaAsset } from '../../src/types/asset';

/**
 * Deciding whether one line of source can be safely repointed.
 *
 * ## The three ways the previous implementation corrupted source
 * Rewriting used to be `line.split(duplicate.name).join(canonical.name)`, with a
 * stem fallback. Each test below names a real, reachable case that produced
 * broken or wrong code, and asserts the current behaviour instead. These are not
 * hypothetical: the first one — replacing the filename while leaving the
 * directory — fires on the repository's own `fixtures/duplicates` workspace.
 */
const WORKSPACE = '/w';

function asset(path: string): AnimoriaAsset {
  const name = path.split('/').pop() ?? path;
  return {
    path,
    name,
    stem: name.replace(/\.[^.]+$/, ''),
    format: 'lottie',
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed',
  };
}

function rewrite(line: string, sourceFile: string, duplicatePath: string, canonicalPath: string) {
  return planLineRewrite({
    line,
    lineNumber: 1,
    sourceFile,
    workspacePath: WORKSPACE,
    duplicate: asset(duplicatePath),
    canonical: asset(canonicalPath),
  });
}

describe('planLineRewrite — repointing a reference', () => {
  it('rewrites the whole path, not just the filename', () => {
    // The defect this replaces: substituting only the filename yielded
    // './vendor/spinner.json' — a path to a file that does not exist. The
    // directory has to change too, which means recomputing the path.
    const outcome = rewrite(
      `import s from './vendor/spinner-copy.json';`,
      '/w/src/app.ts',
      '/w/src/vendor/spinner-copy.json',
      '/w/assets/spinner.json'
    );

    expect(outcome.kind).toBe('rewrite');
    expect(outcome.kind === 'rewrite' && outcome.rewrite.newText).toBe(
      `import s from '../assets/spinner.json';`
    );
    expect(outcome.kind === 'rewrite' && outcome.rewrite.newTarget).toBe('../assets/spinner.json');
  });

  it('preserves indentation and everything else on the line', () => {
    const outcome = rewrite(
      `        const icon = require("./old/icon.json"); // keep me`,
      '/w/src/app.ts',
      '/w/src/old/icon.json',
      '/w/src/new/icon.json'
    );

    expect(outcome.kind === 'rewrite' && outcome.rewrite.newText).toBe(
      `        const icon = require("./new/icon.json"); // keep me`
    );
  });

  it('keeps a root-absolute reference root-absolute', () => {
    // Turning `/assets/x.json` into `../assets/x.json` would change what the
    // path means: a web server resolves the first against a root Animoria
    // cannot see.
    const outcome = rewrite(
      `<img src="/vendor/logo.json">`,
      '/w/public/index.html',
      '/w/vendor/logo.json',
      '/w/assets/logo.json'
    );

    expect(outcome.kind === 'rewrite' && outcome.rewrite.newTarget).toBe('/assets/logo.json');
  });

  it('reports a line that needs no change as already valid', () => {
    const outcome = rewrite(
      `import s from './spinner.json';`,
      '/w/assets/app.ts',
      '/w/assets/spinner.json',
      '/w/assets/spinner.json'
    );

    expect(outcome.kind).toBe('already-valid');
  });
});

describe('planLineRewrite — refusals', () => {
  it('refuses a stem-only mention rather than replacing every occurrence', () => {
    // The old stem fallback rewrote `logotype` and the property access too. A
    // line that merely contains the word is not a reference this can repoint.
    const outcome = rewrite(
      'const logotype = LOGO_MAP.logo;',
      '/w/src/app.ts',
      '/w/assets/logo.json',
      '/w/brand/logo.json'
    );

    expect(outcome.kind).toBe('refused');
    expect(outcome.kind === 'refused' && outcome.refusal.reason).toBe('no-resolvable-target');
  });

  it('refuses when the line references the duplicate through two different paths', () => {
    const outcome = rewrite(
      `copy('./a/dup.json', '../src/a/dup.json');`,
      '/w/src/app.ts',
      '/w/src/a/dup.json',
      '/w/src/canonical/dup.json'
    );

    expect(outcome.kind).toBe('refused');
    expect(outcome.kind === 'refused' && outcome.refusal.reason).toBe('ambiguous-multiple-targets');
  });

  it('refuses an aliased target whose real path Animoria cannot know', () => {
    // `@/assets/dup.json` resolves through bundler configuration Animoria does
    // not read, so no rewritten spelling can be shown to be correct.
    const outcome = rewrite(
      `import d from '@/assets/dup.json';`,
      '/w/src/app.ts',
      '/w/assets/dup.json',
      '/w/brand/canonical.json'
    );

    expect(outcome.kind).toBe('refused');
    expect(outcome.kind === 'refused' && outcome.refusal.reason).toBe('unresolvable-target-style');
  });

  it('leaves an aliased target alone when the canonical asset shares its filename', () => {
    // The alias already names a file called `logo.json`; the canonical copy is
    // also `logo.json`, so the existing text still resolves correctly and there
    // is nothing to change or warn about.
    const outcome = rewrite(
      `import d from '@/assets/logo.json';`,
      '/w/src/app.ts',
      '/w/assets/logo.json',
      '/w/brand/logo.json'
    );

    expect(outcome.kind).toBe('already-valid');
  });

  it('refuses a file format whose references it cannot parse', () => {
    const outcome = rewrite(
      'spinner-copy.json',
      '/w/notes.txt',
      '/w/vendor/spinner-copy.json',
      '/w/assets/spinner.json'
    );

    expect(outcome.kind).toBe('refused');
    expect(outcome.kind === 'refused' && outcome.refusal.reason).toBe('unsupported-source-format');
  });

  it('treats an explicitly-relative path resolving elsewhere as not a reference at all', () => {
    // `../../other-repo/spinner-copy.json` shares a basename but names something
    // else. The usage scanner matched it on filename; precise resolution shows it
    // points at a different file, so there is nothing to rewrite *and* nothing to
    // warn about — the line is already correct.
    const outcome = rewrite(
      `import s from '../../other-repo/spinner-copy.json';`,
      '/w/src/app.ts',
      '/w/src/vendor/spinner-copy.json',
      '/w/assets/spinner.json'
    );

    expect(outcome.kind).toBe('not-a-reference');
  });

  it('separates "points somewhere else" from "cannot be parsed at all"', () => {
    // Both lines mention the asset and neither gets rewritten, but only the
    // second is a warning: the first positively resolves elsewhere, while the
    // second is a mention the parser cannot see into.
    const elsewhere = rewrite(
      `import s from './other/logo.json';`,
      '/w/src/app.ts',
      '/w/assets/logo.json',
      '/w/brand/logo.json'
    );
    const opaque = rewrite(
      'registerAsset(LOGO_KEY);  // logo.json',
      '/w/src/app.ts',
      '/w/assets/logo.json',
      '/w/brand/logo.json'
    );

    expect(elsewhere.kind).toBe('not-a-reference');
    expect(opaque.kind).toBe('refused');
  });

  it('gives every refusal an explanation a client can render as-is', () => {
    const outcome = rewrite(
      'const logotype = 1;',
      '/w/src/app.ts',
      '/w/assets/logo.json',
      '/w/brand/logo.json'
    );

    expect(outcome.kind === 'refused' && outcome.refusal.explanation.length).toBeGreaterThan(20);
    expect(outcome.kind === 'refused' && outcome.refusal.text).toBe('const logotype = 1;');
  });
});
