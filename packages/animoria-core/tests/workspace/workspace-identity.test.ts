import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildWorkspaceIdentity,
  describePath,
  isWithinWorkspace,
  resolveWithinRoot,
  resolveWithinWorkspace,
  rootForPath,
  sameWorkspace,
} from '../../src/workspace/workspace-identity.js';

/**
 * Workspace and root identity.
 *
 * Each test corresponds to a way the previous "identity" — a display name, a
 * basename, or `workspaceFolders[0]` — produced a wrong answer, not to a branch of
 * the implementation.
 */

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'animoria-ws-'));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function makeDir(...segments: string[]): string {
  const path = join(scratch, ...segments);
  mkdirSync(path, { recursive: true });
  return path;
}

describe('workspace identity', () => {
  it('distinguishes two roots that share a name', () => {
    // The defect this exists for: `~/work/acme/project` and `~/work/globex/project`
    // are the same *string* under any name-based identity, so a map keyed by name
    // silently merges them — and a cleanup plan naming `project/assets/logo.json`
    // becomes ambiguous enough to delete the wrong client's file.
    const acme = makeDir('acme', 'project');
    const globex = makeDir('globex', 'project');

    const workspace = buildWorkspaceIdentity([acme, globex]);

    expect(workspace.roots).toHaveLength(2);
    const [first, second] = workspace.roots;
    expect(first?.id).not.toBe(second?.id);
  });

  it('disambiguates display names only when they collide', () => {
    const acme = makeDir('acme', 'project');
    const globex = makeDir('globex', 'project');
    const assets = makeDir('assets');

    const collided = buildWorkspaceIdentity([acme, globex]);
    expect(collided.roots.map((root) => root.name).sort()).toEqual([
      'acme/project',
      'globex/project',
    ]);

    // The common case must stay uncluttered: a name is only qualified when the bare
    // form is genuinely ambiguous.
    const single = buildWorkspaceIdentity([assets]);
    expect(single.roots[0]?.name).toBe('assets');
  });

  it('is order-independent, so reopening a workspace does not invalidate its plans', () => {
    const a = makeDir('a');
    const b = makeDir('b');

    expect(buildWorkspaceIdentity([a, b]).id).toBe(buildWorkspaceIdentity([b, a]).id);
  });

  it('deduplicates a root listed twice, including with a trailing separator', () => {
    const a = makeDir('a');

    const workspace = buildWorkspaceIdentity([a, `${a}${sep}`, join(a, '.')]);
    expect(workspace.roots).toHaveLength(1);
    expect(workspace.isSingleRoot).toBe(true);
  });

  it('refuses a workspace with no roots', () => {
    expect(() => buildWorkspaceIdentity([])).toThrow();
  });

  it('compares workspaces by id', () => {
    const a = makeDir('a');
    const b = makeDir('b');

    expect(sameWorkspace(buildWorkspaceIdentity([a]), buildWorkspaceIdentity([a]))).toBe(true);
    expect(sameWorkspace(buildWorkspaceIdentity([a]), buildWorkspaceIdentity([b]))).toBe(false);
  });
});

describe('root attribution', () => {
  it('attributes a path to the most specific root that contains it', () => {
    // With a nested root, picking the first match makes attribution depend on
    // iteration order — so the same file lands in different roots on different runs.
    const outer = makeDir('outer');
    const inner = makeDir('outer', 'packages', 'inner');
    const workspace = buildWorkspaceIdentity([outer, inner]);

    const target = join(inner, 'assets', 'a.json');
    expect(rootForPath(workspace, target)?.path).toBe(inner);
  });

  it('returns null for a path outside every root', () => {
    const a = makeDir('a');
    const workspace = buildWorkspaceIdentity([a]);
    expect(rootForPath(workspace, join(scratch, 'elsewhere', 'x.json'))).toBeNull();
  });

  it('does not treat a sibling with a shared prefix as inside', () => {
    // The `startsWith` bug: `/workspace-secrets` reports as inside `/workspace`.
    // Containment must be decided on segment boundaries.
    const workspace = buildWorkspaceIdentity([makeDir('workspace')]);
    expect(isWithinWorkspace(workspace, join(scratch, 'workspace-secrets', 'x.json'))).toBe(false);
    expect(isWithinWorkspace(workspace, join(scratch, 'workspace', 'x.json'))).toBe(true);
  });
});

describe('path resolution', () => {
  it('refuses a traversal out of a root', () => {
    const root = buildWorkspaceIdentity([makeDir('root')]).roots[0]!;

    expect(resolveWithinRoot(root, 'assets/a.json')).not.toBeNull();
    expect(resolveWithinRoot(root, '../outside.json')).toBeNull();
    expect(resolveWithinRoot(root, 'assets/../../outside.json')).toBeNull();
    expect(resolveWithinRoot(root, '/etc/passwd')).toBeNull();
  });

  it('resolves a relative path in a single-root workspace', () => {
    const root = makeDir('only');
    const workspace = buildWorkspaceIdentity([root]);

    const resolved = resolveWithinWorkspace(workspace, 'assets/a.json');
    expect(resolved?.path).toBe(join(root, 'assets', 'a.json'));
  });

  it('refuses a relative path in a multi-root workspace rather than guessing', () => {
    // `assets/logo.json` names a different file under each root. Picking the first
    // match is exactly the ambiguity V2 exists to remove — and the operation it
    // would feed is a deletion.
    const workspace = buildWorkspaceIdentity([makeDir('a'), makeDir('b')]);
    expect(resolveWithinWorkspace(workspace, 'assets/logo.json')).toBeNull();
  });

  it('accepts an absolute path in a multi-root workspace and attributes it', () => {
    const a = makeDir('a');
    const b = makeDir('b');
    const workspace = buildWorkspaceIdentity([a, b]);

    const resolved = resolveWithinWorkspace(workspace, join(b, 'assets', 'logo.json'));
    expect(resolved?.root.path).toBe(b);
  });
});

describe('display', () => {
  it('qualifies a path by root only when the workspace has more than one', () => {
    const single = buildWorkspaceIdentity([makeDir('solo')]);
    expect(describePath(single, join(scratch, 'solo', 'assets', 'a.json'))).toBe(
      join('assets', 'a.json')
    );

    const multi = buildWorkspaceIdentity([makeDir('one'), makeDir('two')]);
    expect(describePath(multi, join(scratch, 'two', 'assets', 'a.json'))).toContain('two');
  });

  it('falls back to the absolute path for something outside the workspace', () => {
    const workspace = buildWorkspaceIdentity([makeDir('a')]);
    const outside = join(scratch, 'elsewhere', 'x.json');
    expect(describePath(workspace, outside)).toBe(outside);
  });
});
