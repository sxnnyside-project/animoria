import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KNOWN_UNSCANNED_REFERENCE_EXTENSIONS } from '../../src/types/scan-coverage';
import {
  REFERENCE_FORMAT_SUPPORT,
  SUPPORTED_REFERENCE_EXTENSIONS,
  candidateMatchesAsset,
  extractReferenceTargets,
  syntaxesForExtension,
} from '../../src/usage/reference-syntax';

/**
 * Format-level reference semantics.
 *
 * Every supported format gets both a *true reference* and a *false-positive
 * candidate*, because broadening coverage is only an improvement if it does not
 * also broaden what gets wrongly deleted. A test suite that only proved detection
 * would happily accept a matcher that flagged every mention of a filename anywhere.
 */

const WS = resolve('/ws');
const SOURCE = resolve('/ws/src/page.html');
const ASSET = resolve('/ws/assets/logo.json');

/** Whether any target on the line resolves to the asset. */
function refers(line: string, syntaxes: Parameters<typeof extractReferenceTargets>[1]): boolean {
  return extractReferenceTargets(line, syntaxes).some(
    (t) => candidateMatchesAsset(t, SOURCE, WS, ASSET, 'logo.json').matched
  );
}

describe('format support table', () => {
  it('exposes exactly the extensions that have a handler', () => {
    expect(SUPPORTED_REFERENCE_EXTENSIONS).toEqual(
      REFERENCE_FORMAT_SUPPORT.map((f) => f.extension)
    );
  });

  it('never claims to scan an extension it also declares unscannable', () => {
    // The disclosure and the scanner read from two lists; this is what stops them
    // from ever contradicting each other.
    for (const ext of KNOWN_UNSCANNED_REFERENCE_EXTENSIONS) {
      expect(SUPPORTED_REFERENCE_EXTENSIONS).not.toContain(ext);
    }
  });

  it('maps hybrid formats to every syntax they can carry', () => {
    expect(syntaxesForExtension('.vue')).toEqual(
      expect.arrayContaining(['code', 'markup', 'style'])
    );
    expect(syntaxesForExtension('.mdx')).toEqual(
      expect.arrayContaining(['markdown', 'markup', 'code'])
    );
    expect(syntaxesForExtension('.css')).toEqual(['style']);
  });

  it('returns no syntaxes for an unsupported extension', () => {
    expect(syntaxesForExtension('.json')).toEqual([]);
    expect(syntaxesForExtension('.txt')).toEqual([]);
  });
});

describe('markup', () => {
  const markup = ['markup'] as const;

  it.each([
    ['src attribute', '<img src="../assets/logo.json">'],
    ['href attribute', '<link href="../assets/logo.json">'],
    ['single-quoted value', "<img src='../assets/logo.json'>"],
    ['poster attribute', '<video poster="../assets/logo.json"></video>'],
    ['srcset candidate list', '<img srcset="../assets/logo.json 1x, ../other.json 2x">'],
    ['Vue binding', '<img :src="\'../assets/logo.json\'">'],
    ['Svelte binding', '<img bind:src="../assets/logo.json">'],
    ['JSX-style brace value', '<img src={"../assets/logo.json"} />'],
  ])('detects a reference in a %s', (_label, line) => {
    expect(refers(line, markup)).toBe(true);
  });

  it.each([
    ['prose naming the file', '<p>The file logo.json is described here.</p>'],
    ['a non-resource attribute', '<p title="logo.json">text</p>'],
    ['alt text', '<img src="../other.json" alt="logo.json">'],
    ['an external host', '<img src="https://cdn.example.com/assets/logo.json">'],
    ['a protocol-relative URL', '<img src="//cdn.example.com/assets/logo.json">'],
    [
      'a data URI whose payload contains a comma',
      '<img src="data:application/json;base64,logo.json">',
    ],
    ['a different extension', '<img src="../assets/logo.png">'],
    ['a path outside the workspace', '<img src="../../elsewhere/logo.json">'],
  ])('rejects %s', (_label, line) => {
    expect(refers(line, markup)).toBe(false);
  });
});

describe('style', () => {
  const style = ['style'] as const;

  it.each([
    ['double-quoted url()', '.a { background: url("../assets/logo.json"); }'],
    ['single-quoted url()', ".a { background: url('../assets/logo.json'); }"],
    ['unquoted url()', '.a { background: url(../assets/logo.json); }'],
    ['@import', '@import "../assets/logo.json";'],
    ['@use', '@use "../assets/logo.json";'],
    ['a query suffix', '.a { background: url("../assets/logo.json?v=2"); }'],
    ['a fragment suffix', '.a { background: url("../assets/logo.json#icon"); }'],
  ])('detects a reference in %s', (_label, line) => {
    expect(refers(line, style)).toBe(true);
  });

  it.each([
    ['a comment', '/* logo.json is discussed here */'],
    ['an external URL', '.a { background: url("https://cdn.example.com/logo.json"); }'],
    ['a path outside the workspace', '.a { background: url("../../elsewhere/logo.json"); }'],
    ['a class name resembling the stem', '.logo-json { color: red; }'],
  ])('rejects %s', (_label, line) => {
    expect(refers(line, style)).toBe(false);
  });
});

describe('markdown', () => {
  const markdown = ['markdown'] as const;

  it.each([
    ['image syntax', '![alt](../assets/logo.json)'],
    ['link syntax', '[text](../assets/logo.json)'],
    ['a title after the target', '![alt](../assets/logo.json "A title")'],
    ['an angle-bracketed target', '[text](<../assets/logo.json>)'],
    ['a reference definition', '[id]: ../assets/logo.json'],
  ])('detects a reference in %s', (_label, line) => {
    expect(refers(line, markdown)).toBe(true);
  });

  it.each([
    ['plain prose', 'The asset logo.json is described in this paragraph.'],
    ['inline code', 'Load `../assets/logo.json` at startup.'],
    ['an external link', '[text](https://cdn.example.com/logo.json)'],
    ['link text alone', '[logo.json](../other/thing.md)'],
  ])('rejects %s', (_label, line) => {
    expect(refers(line, markdown)).toBe(false);
  });
});

describe('target resolution rules', () => {
  it('strips a query string and a fragment before comparing', () => {
    for (const target of ['../assets/logo.json?v=2', '../assets/logo.json#icon']) {
      expect(candidateMatchesAsset(target, SOURCE, WS, ASSET, 'logo.json').matched).toBe(true);
    }
  });

  it('resolves an explicitly relative target exactly, and rejects it when it points elsewhere', () => {
    // The case a filename-only comparison would get wrong: a real path to a
    // different file that happens to share a basename.
    expect(candidateMatchesAsset('../assets/logo.json', SOURCE, WS, ASSET, 'logo.json')).toEqual({
      matched: true,
      kind: 'resolved-path',
    });
    expect(
      candidateMatchesAsset('../../elsewhere/logo.json', SOURCE, WS, ASSET, 'logo.json').matched
    ).toBe(false);
  });

  it('accepts a bundler alias on filename evidence, since its root is unknowable', () => {
    const result = candidateMatchesAsset('@/assets/logo.json', SOURCE, WS, ASSET, 'logo.json');
    expect(result).toEqual({ matched: true, kind: 'filename' });
  });

  it('resolves a web-root-absolute target against the workspace, then falls back to the filename', () => {
    expect(candidateMatchesAsset('/assets/logo.json', SOURCE, WS, ASSET, 'logo.json')).toEqual({
      matched: true,
      kind: 'resolved-path',
    });
    // A different web root (public/, static/) is unknowable, so the filename stands.
    expect(
      candidateMatchesAsset('/public/assets/logo.json', SOURCE, WS, ASSET, 'logo.json').kind
    ).toBe('filename');
  });

  it('compares case-insensitively, matching macOS and Windows filesystem defaults', () => {
    expect(
      candidateMatchesAsset('../assets/LOGO.JSON', SOURCE, WS, ASSET, 'logo.json').matched
    ).toBe(true);
  });

  it('rejects every external scheme', () => {
    for (const target of [
      'https://cdn.example.com/logo.json',
      'http://cdn.example.com/logo.json',
      '//cdn.example.com/logo.json',
      'data:application/json;base64,logo.json',
      'mailto:someone@example.com/logo.json',
    ]) {
      expect(candidateMatchesAsset(target, SOURCE, WS, ASSET, 'logo.json').matched).toBe(false);
    }
  });

  it('rejects an empty target and never throws on malformed input', () => {
    for (const target of ['', '%%%', '../%E0%A4%A', 'C:\\Windows\\logo.json']) {
      expect(() => candidateMatchesAsset(target, SOURCE, WS, ASSET, 'logo.json')).not.toThrow();
    }
    expect(candidateMatchesAsset('', SOURCE, WS, ASSET, 'logo.json').matched).toBe(false);
  });
});
