import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveWithinRoot } from '../src/bridge/path-containment.js';

/**
 * The dev bridge's only remaining file-reading endpoint is guarded by
 * `resolveWithinRoot`. Its predecessor was `filePath.startsWith(workspaceRoot)`,
 * which each case below defeats — so every case is written to fail against that
 * implementation and pass against this one.
 */
describe('resolveWithinRoot', () => {
  const root = resolve('/srv/fixtures');

  describe('accepts paths inside the root', () => {
    it('accepts a relative path', () => {
      expect(resolveWithinRoot(root, 'assets/logo.json')).toBe(join(root, 'assets/logo.json'));
    });

    it('accepts an absolute path inside the root', () => {
      const inside = join(root, 'assets/logo.json');
      expect(resolveWithinRoot(root, inside)).toBe(inside);
    });

    it('accepts the root itself', () => {
      expect(resolveWithinRoot(root, root)).toBe(root);
    });

    it('accepts a traversal that stays inside the root', () => {
      expect(resolveWithinRoot(root, 'assets/../assets/logo.json')).toBe(
        join(root, 'assets/logo.json')
      );
    });
  });

  describe('rejects paths outside the root', () => {
    it('rejects relative ".." traversal', () => {
      expect(resolveWithinRoot(root, '../../etc/passwd')).toBeNull();
    });

    it('rejects traversal embedded in an absolute path that has the root as a prefix', () => {
      // The case `startsWith` cannot catch: the string begins with the root but
      // resolves outside it.
      expect(resolveWithinRoot(root, `${root}/../../etc/passwd`)).toBeNull();
    });

    it('rejects a sibling directory sharing the root as a textual prefix', () => {
      // `/srv/fixtures-private` starts with `/srv/fixtures` as a string but is a
      // different directory.
      expect(resolveWithinRoot(root, resolve('/srv/fixtures-private/secrets.env'))).toBeNull();
    });

    it('rejects an unrelated absolute path', () => {
      expect(resolveWithinRoot(root, resolve('/etc/passwd'))).toBeNull();
    });

    it('rejects a normalized traversal that lands exactly on the parent', () => {
      expect(resolveWithinRoot(root, '..')).toBeNull();
    });

    it('rejects deeply nested traversal', () => {
      expect(resolveWithinRoot(root, 'a/b/c/../../../../../../etc/shadow')).toBeNull();
    });
  });

  describe('rejects malformed input', () => {
    it('rejects an empty path', () => {
      expect(resolveWithinRoot(root, '')).toBeNull();
    });

    it('rejects a path containing a NUL byte', () => {
      expect(resolveWithinRoot(root, 'assets/logo.json\0.png')).toBeNull();
    });

    it('never throws for arbitrary input', () => {
      for (const candidate of ['...', './/.//..', '~/secrets', 'C:\\Windows\\system32']) {
        expect(() => resolveWithinRoot(root, candidate)).not.toThrow();
      }
    });
  });

  it('does not confuse a root whose name is a prefix of another root', () => {
    // Guards the inverse direction of the sibling-prefix case.
    const shortRoot = resolve('/srv/fix');
    expect(resolveWithinRoot(shortRoot, resolve('/srv/fixtures/logo.json'))).toBeNull();
  });
});
