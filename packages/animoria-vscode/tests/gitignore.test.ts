import { promises as fs, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureGitignoreContainsAnimoria } from '../src/workspace-context/gitignore.js';

describe('ensureGitignoreContainsAnimoria', () => {
  it('does nothing if workspace is not a git repository (no .git folder)', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'animoria-no-git-'));
    try {
      const modified = await ensureGitignoreContainsAnimoria(dir);
      expect(modified).toBe(false);
      expect(existsSync(join(dir, '.gitignore'))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('creates .gitignore and adds .animoria/ if .git exists but .gitignore does not', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'animoria-git-'));
    try {
      await fs.mkdir(join(dir, '.git'));
      const modified = await ensureGitignoreContainsAnimoria(dir);
      expect(modified).toBe(true);

      const content = await fs.readFile(join(dir, '.gitignore'), 'utf8');
      expect(content).toContain('.animoria/');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('appends .animoria/ to an existing .gitignore without overwriting existing content', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'animoria-git-'));
    try {
      await fs.mkdir(join(dir, '.git'));
      await fs.writeFile(join(dir, '.gitignore'), 'node_modules/\ndist/\n');

      const modified = await ensureGitignoreContainsAnimoria(dir);
      expect(modified).toBe(true);

      const content = await fs.readFile(join(dir, '.gitignore'), 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.animoria/');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('does not duplicate .animoria if it is already present in .gitignore', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'animoria-git-'));
    try {
      await fs.mkdir(join(dir, '.git'));
      await fs.writeFile(join(dir, '.gitignore'), 'node_modules/\n.animoria/\n');

      const modified = await ensureGitignoreContainsAnimoria(dir);
      expect(modified).toBe(false);

      const content = await fs.readFile(join(dir, '.gitignore'), 'utf8');
      const matches = content.match(/\.animoria/g);
      expect(matches).toHaveLength(1);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
