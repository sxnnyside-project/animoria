import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigLoader } from '../../src/governance/config-loader';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-config-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ConfigLoader', () => {
  it('returns "not-found" when no candidate file exists', async () => {
    const workspace = await makeWorkspace();
    const result = await new ConfigLoader(workspace).load();
    expect(result).toEqual({ status: 'not-found' });
  });

  it('loads a well-formed .animoriarc.json', async () => {
    const workspace = await makeWorkspace();
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-gif': 'error' } })
    );

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.config.rules).toEqual({ 'no-gif': 'error' });
      expect(result.filePath).toBe(join(workspace, '.animoriarc.json'));
    }
  });

  it('loads a well-formed .animoriarc.yaml', async () => {
    const workspace = await makeWorkspace();
    await writeFile(
      join(workspace, '.animoriarc.yaml'),
      'rules:\n  max-file-size-kb: 1024\n  no-gif: warning\n'
    );

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.config.rules).toEqual({ 'max-file-size-kb': 1024, 'no-gif': 'warning' });
    }
  });

  it('sniffs a bare .animoriarc as JSON when it parses as JSON', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc'), JSON.stringify({ rules: { 'no-gif': 'off' } }));

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.config.rules).toEqual({ 'no-gif': 'off' });
    }
  });

  it('sniffs a bare .animoriarc as YAML when it is not valid JSON', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc'), 'rules:\n  no-gif: error\n');

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.config.rules).toEqual({ 'no-gif': 'error' });
    }
  });

  it('returns "invalid" with a diagnostic for malformed JSON', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.json'), '{ not: valid json');

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]?.message).toMatch(/JSON/);
    }
  });

  it('returns "invalid" with a diagnostic for malformed YAML', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.yaml'), 'rules: [this is not\n  a map');

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics[0]?.message).toMatch(/YAML/);
    }
  });

  it('returns "invalid" when the document root is not an object', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.json'), '[1, 2, 3]');

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics[0]?.path).toBe('');
    }
  });

  it('returns "invalid" when "rules" is not an object', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.json'), JSON.stringify({ rules: 'nope' }));

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics[0]?.path).toBe('rules');
    }
  });

  it('treats a config with no "rules" key as an empty, valid rule set', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.json'), JSON.stringify({ somethingElse: true }));

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.config.rules).toEqual({});
    }
  });

  it('prefers .animoriarc.json over other candidates when multiple exist', async () => {
    const workspace = await makeWorkspace();
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-gif': 'error' } })
    );
    await writeFile(join(workspace, '.animoriarc.yaml'), 'rules:\n  no-gif: warning\n');

    const result = await new ConfigLoader(workspace).load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.filePath).toBe(join(workspace, '.animoriarc.json'));
      expect(result.config.rules).toEqual({ 'no-gif': 'error' });
    }
  });
});
