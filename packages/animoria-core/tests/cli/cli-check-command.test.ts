import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCheckCommand } from '../../src/cli/check-command';
import { CLI_EXIT_CODES } from '../../src/cli/exit-codes';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-cli-check-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runCheckCommand', () => {
  it('exits SUCCESS for a workspace with no configured rules', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'a.gif'), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    const result = await runCheckCommand([workspace]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(result.output).toContain('Result: PASS');
  });

  it('exits GOVERNANCE_VIOLATIONS when a configured rule is violated', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'a.gif'), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-gif': 'error' } })
    );

    const result = await runCheckCommand([workspace]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS);
    expect(result.output).toContain('no-gif');
  });

  it('exits SUCCESS when the only violations are warning-severity', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'a.gif'), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-gif': 'warning' } })
    );

    const result = await runCheckCommand([workspace]);
    expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
  });

  it('exits CONFIGURATION_ERROR for a malformed .animoriarc, without evaluating governance as clean', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.json'), '{ not valid json');

    const result = await runCheckCommand([workspace]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.CONFIGURATION_ERROR);
    expect(result.output).toMatch(/JSON/);
  });

  it('exits WORKSPACE_ERROR for a nonexistent path', async () => {
    const result = await runCheckCommand(['/definitely/does/not/exist/anywhere']);
    expect(result.exitCode).toBe(CLI_EXIT_CODES.WORKSPACE_ERROR);
    expect(result.output).toMatch(/does not exist/);
  });

  it('exits WORKSPACE_ERROR when the path is a file, not a directory', async () => {
    const workspace = await makeWorkspace();
    const filePath = join(workspace, 'notadir.txt');
    await writeFile(filePath, 'hello');

    const result = await runCheckCommand([filePath]);
    expect(result.exitCode).toBe(CLI_EXIT_CODES.WORKSPACE_ERROR);
  });

  it('exits INVALID_USAGE for an unrecognized flag, before touching the filesystem', async () => {
    const result = await runCheckCommand(['--not-a-real-flag']);
    expect(result.exitCode).toBe(CLI_EXIT_CODES.INVALID_USAGE);
    expect(result.output).toMatch(/Usage: animoria check/);
  });

  it('defaults to the workspace-path-less form using process.cwd()', async () => {
    const workspace = await makeWorkspace();
    const originalCwd = process.cwd();
    process.chdir(workspace);
    try {
      const result = await runCheckCommand([]);
      expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('renders markdown by default when --ci is passed without an explicit --format', async () => {
    const workspace = await makeWorkspace();
    const result = await runCheckCommand([workspace, '--ci']);
    expect(result.output).toContain('## Animoria Governance Check');
  });

  it('respects an explicit --format even when --ci is passed', async () => {
    const workspace = await makeWorkspace();
    const result = await runCheckCommand([workspace, '--ci', '--format', 'json']);
    expect(() => JSON.parse(result.output)).not.toThrow();
  });

  it('renders JSON that round-trips to a structured report', async () => {
    const workspace = await makeWorkspace();
    await writeFile(
      join(workspace, 'hero.json'),
      JSON.stringify({ v: '5.9.0', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] })
    );

    const result = await runCheckCommand([workspace, '--format', 'json']);
    const parsed = JSON.parse(result.output);

    expect(parsed.totalAssetCount).toBe(1);
    expect(parsed.outcome.passed).toBe(true);
  });

  it('produces the same exit code and output on repeated runs (deterministic)', async () => {
    const workspace = await makeWorkspace();
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-gif': 'error' } })
    );
    await writeFile(join(workspace, 'a.gif'), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    const first = await runCheckCommand([workspace, '--format', 'json']);
    const second = await runCheckCommand([workspace, '--format', 'json']);

    expect(second.exitCode).toBe(first.exitCode);
    const [a, b] = [JSON.parse(first.output), JSON.parse(second.output)];
    a.generatedAt = undefined;
    b.generatedAt = undefined;
    a.durationMs = undefined;
    b.durationMs = undefined;
    delete a.healthScore?.generatedAt;
    delete b.healthScore?.generatedAt;
    delete a.healthScore?.durationMs;
    delete b.healthScore?.durationMs;
    expect(a).toEqual(b);
  });

  it('gates on --min-health-score when configured', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'a.gif'), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-gif': 'warning' } })
    );

    const withoutGate = await runCheckCommand([workspace]);
    expect(withoutGate.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);

    const withGate = await runCheckCommand([workspace, '--min-health-score', '100']);
    expect(withGate.exitCode).toBe(CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS);
  });
});
