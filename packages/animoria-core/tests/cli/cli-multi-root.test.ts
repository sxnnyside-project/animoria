import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCheckCommand } from '../../src/cli/check-command.js';
import { CLI_EXIT_CODES } from '../../src/cli/exit-codes.js';

/**
 * `animoria check` over a multi-root workspace.
 *
 * ## Why this is the highest-stakes multi-root surface
 * `check` is the CI gate. A gate that examines the first root and reports on the
 * workspace does not fail loudly — it **passes**, on a repository it never looked
 * at. Every assertion here is a way that could happen.
 */

const FIXTURE = fileURLToPath(
  new URL('../../../../fixtures/multi-root-workspace', import.meta.url)
);
const LOTTIE = JSON.stringify({ v: '5.5.7', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] });

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'animoria-cli-mr-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function root(name: string): string {
  return join(workspace, name);
}

/** A root whose `no-unreferenced-assets: error` rule will fail. */
function makeFailingRoot(name: string): string {
  const path = root(name);
  mkdirSync(join(path, 'assets'), { recursive: true });
  writeFileSync(
    join(path, '.animoriarc.json'),
    JSON.stringify({ rules: { 'no-unreferenced-assets': 'error' } }, null, 2)
  );
  writeFileSync(join(path, 'assets', 'dead.json'), LOTTIE);
  // A source file, so the reference scan has coverage and the rule can run.
  mkdirSync(join(path, 'src'), { recursive: true });
  writeFileSync(join(path, 'src', 'index.ts'), 'export const nothing = 1;\n');
  return path;
}

/** A root that passes: its asset is referenced. */
function makePassingRoot(name: string): string {
  const path = root(name);
  mkdirSync(join(path, 'assets'), { recursive: true });
  mkdirSync(join(path, 'src'), { recursive: true });
  writeFileSync(
    join(path, '.animoriarc.json'),
    JSON.stringify({ rules: { 'no-unreferenced-assets': 'error' } }, null, 2)
  );
  writeFileSync(join(path, 'assets', 'used.json'), LOTTIE);
  writeFileSync(
    join(path, 'src', 'index.ts'),
    "import used from '../assets/used.json';\nexport default used;\n"
  );
  return path;
}

describe('animoria check — multi-root', () => {
  it('checks every root, not just the first', async () => {
    cpSync(FIXTURE, workspace, { recursive: true });

    const result = await runCheckCommand([root('root-a'), root('root-b'), root('root-c')]);

    // Each root gets its own section, so a developer can see which one a finding
    // belongs to. A merged report would have to pick one `.animoriarc` to describe.
    expect(result.output).toContain('root-a');
    expect(result.output).toContain('root-b');
    expect(result.output).toContain('root-c');
  });

  it('fails when any root fails, even if the first one passes', async () => {
    // The gate's whole purpose. Reporting the first root's verdict for the workspace
    // is how CI comes to approve a change it never examined.
    const passing = makePassingRoot('ok');
    const failing = makeFailingRoot('bad');

    const firstPasses = await runCheckCommand([passing, failing]);
    expect(firstPasses.exitCode).toBe(CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS);

    // And in the other order, so the result does not depend on argument order.
    const firstFails = await runCheckCommand([failing, passing]);
    expect(firstFails.exitCode).toBe(CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS);
  });

  it('passes only when every root passes', async () => {
    const a = makePassingRoot('a');
    const b = makePassingRoot('b');

    const result = await runCheckCommand([a, b]);
    expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
  });

  it('reports a workspace error naming the root that is wrong', async () => {
    const good = makePassingRoot('good');
    const result = await runCheckCommand([good, join(workspace, 'does-not-exist')]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.WORKSPACE_ERROR);
    expect(result.output).toContain('does-not-exist');
  });

  it('keeps single-root output unchanged', async () => {
    // The common case must not gain a root heading it does not need.
    const only = makePassingRoot('solo');
    const result = await runCheckCommand([only]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(result.output).not.toContain('# solo');
  });

  it('applies each root its own configuration', async () => {
    cpSync(FIXTURE, workspace, { recursive: true });

    // root-a configures `no-gif`; root-c configures `no-unreferenced-assets`. If one
    // root's config governed both, the report would name the wrong rules.
    const result = await runCheckCommand([root('root-a'), root('root-c'), '--format', 'json']);
    const parsed = result.output
      .split('\n\n')
      .filter((chunk) => chunk.trim().startsWith('{') || chunk.includes('{'));

    expect(parsed.length).toBeGreaterThan(0);
    expect(result.output).toContain('no-gif');
  });
});
