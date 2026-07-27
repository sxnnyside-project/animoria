import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileIgnorePatterns, loadAnimoriaIgnore } from '../../src/ignore/animoria-ignore.js';

describe('loadAnimoriaIgnore', () => {
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-ignore-'));
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  it('returns an empty pattern list when no .animoriaignore file exists', async () => {
    const patterns = await loadAnimoriaIgnore(workspaceDir);
    expect(patterns).toEqual([]);
  });

  it('ignores blank lines and comment lines', async () => {
    writeFileSync(
      join(workspaceDir, '.animoriaignore'),
      ['# a comment', '', '   ', 'legacy'].join('\n')
    );

    const patterns = await loadAnimoriaIgnore(workspaceDir);

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some((p) => p.includes('#'))).toBe(false);
  });

  it('expands a bare name into both file and directory patterns', async () => {
    writeFileSync(join(workspaceDir, '.animoriaignore'), 'legacy-assets\n');

    const patterns = await loadAnimoriaIgnore(workspaceDir);

    expect(patterns).toContain('**/legacy-assets');
    expect(patterns).toContain('**/legacy-assets/**');
  });

  it('strips a trailing slash before expanding a bare directory name', async () => {
    writeFileSync(join(workspaceDir, '.animoriaignore'), 'legacy-assets/\n');

    const patterns = await loadAnimoriaIgnore(workspaceDir);

    expect(patterns).toContain('**/legacy-assets');
    expect(patterns).toContain('**/legacy-assets/**');
  });

  it('passes through a pattern that already contains a wildcard unchanged', async () => {
    writeFileSync(join(workspaceDir, '.animoriaignore'), '**/*.draft.json\n');

    const patterns = await loadAnimoriaIgnore(workspaceDir);

    expect(patterns).toEqual(['**/*.draft.json']);
  });
});

describe('compileIgnorePatterns', () => {
  it('matches a bare filename anywhere in the tree', () => {
    const isIgnored = compileIgnorePatterns(['**/old-hero.json', '**/old-hero.json/**']);

    expect(isIgnored('assets/animations/old-hero.json')).toBe(true);
    expect(isIgnored('old-hero.json')).toBe(true);
    expect(isIgnored('assets/animations/new-hero.json')).toBe(false);
  });

  it('matches everything under an ignored directory', () => {
    const isIgnored = compileIgnorePatterns(['**/legacy', '**/legacy/**']);

    expect(isIgnored('legacy/hero.json')).toBe(true);
    expect(isIgnored('assets/legacy/nested/hero.json')).toBe(true);
    expect(isIgnored('assets/current/hero.json')).toBe(false);
  });

  it('matches nothing when no patterns are given', () => {
    const isIgnored = compileIgnorePatterns([]);
    expect(isIgnored('assets/hero.json')).toBe(false);
  });
});
