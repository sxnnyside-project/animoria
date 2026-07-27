import { sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeImportPath,
  computeWorkspaceRelativePath,
  toImportSpecifier,
} from '../../src/integration/path-resolution';

describe('toImportSpecifier', () => {
  it('adds a leading ./ when the path has none — regression for H-1', () => {
    // Prior behavior (the bug): a bare "assets/hero.json" was passed straight
    // through to `import ... from '...'`, which is not a valid relative
    // module specifier (bundlers treat it as a bare package name).
    expect(toImportSpecifier('assets/hero.json')).toBe('./assets/hero.json');
  });

  it('leaves an existing ./ prefix untouched', () => {
    expect(toImportSpecifier('./assets/hero.json')).toBe('./assets/hero.json');
  });

  it('leaves an existing ../ prefix untouched', () => {
    expect(toImportSpecifier('../assets/hero.json')).toBe('../assets/hero.json');
  });

  it('converts OS-native separators to forward slashes', () => {
    const osPath = ['..', 'assets', 'hero.json'].join(sep);
    expect(toImportSpecifier(osPath)).toBe('../assets/hero.json');
  });
});

describe('computeImportPath', () => {
  it('computes a path relative to the pasted-into file, not the workspace root', () => {
    // Regression for H-1: the previous implementation always computed the
    // path relative to the workspace root, even when the actual consuming
    // file's location was known.
    const fromFile = '/workspace/src/components/Hero.tsx';
    const toAsset = '/workspace/assets/hero.json';
    expect(computeImportPath(fromFile, toAsset)).toBe('../../assets/hero.json');
  });

  it('produces a ./-prefixed specifier for a sibling file', () => {
    const fromFile = '/workspace/src/Hero.tsx';
    const toAsset = '/workspace/src/hero.json';
    expect(computeImportPath(fromFile, toAsset)).toBe('./hero.json');
  });
});

describe('computeWorkspaceRelativePath', () => {
  it('never adds a ./ prefix, unlike computeImportPath', () => {
    const result = computeWorkspaceRelativePath('/workspace', '/workspace/assets/hero.json');
    expect(result).toBe('assets/hero.json');
    expect(result.startsWith('./')).toBe(false);
  });

  it('uses forward slashes regardless of OS separator', () => {
    const result = computeWorkspaceRelativePath('/workspace', '/workspace/a/b/c.json');
    expect(result).toBe('a/b/c.json');
  });
});
