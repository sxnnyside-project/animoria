import { describe, expect, it } from 'vitest';
import { CLI_USAGE, resolveEntryPoint } from '../../src/cli/entry-point';
import { CLI_EXIT_CODES } from '../../src/cli/exit-codes';

/**
 * The binary's front door.
 *
 * Every case below previously resolved to "start a long-lived daemon against a
 * directory with this name": `--help`, `--version`, and any mistyped flag all
 * produced an NDJSON `scanComplete` for a nonexistent path — describing a healthy,
 * empty workspace — and then hung waiting on stdin.
 */
describe('resolveEntryPoint', () => {
  it('treats --help and -h as help, exiting successfully', () => {
    for (const flag of ['--help', '-h']) {
      expect(resolveEntryPoint([flag])).toEqual({
        kind: 'help',
        exitCode: CLI_EXIT_CODES.SUCCESS,
      });
    }
  });

  it('treats --version and -V as a version request', () => {
    for (const flag of ['--version', '-V']) {
      expect(resolveEntryPoint([flag])).toEqual({ kind: 'version' });
    }
  });

  it('shows help and reports invalid usage when invoked with no arguments', () => {
    // Rather than silently becoming a background process, which is what a bare
    // invocation used to do.
    expect(resolveEntryPoint([])).toEqual({
      kind: 'help',
      exitCode: CLI_EXIT_CODES.INVALID_USAGE,
    });
  });

  it('rejects an unrecognized option instead of treating it as a path', () => {
    const entry = resolveEntryPoint(['--bogus']);

    expect(entry.kind).toBe('usage-error');
    if (entry.kind !== 'usage-error') throw new Error('unreachable');
    expect(entry.message).toContain('--bogus');
  });

  it('routes check and forwards its remaining arguments verbatim', () => {
    expect(resolveEntryPoint(['check', '/w', '--format', 'json'])).toEqual({
      kind: 'check',
      argv: ['/w', '--format', 'json'],
    });
  });

  it('routes the explicit daemon subcommand', () => {
    expect(resolveEntryPoint(['daemon', '/w'])).toEqual({
      kind: 'daemon',
      workspacePaths: ['/w'],
    });
  });

  it('accepts several roots, because a workspace may have several', () => {
    // V2. A host with three folders open used to have to pick one and silently
    // ignore the rest, which is what `workspaceFolders[0]` did in eight places.
    expect(resolveEntryPoint(['daemon', '/a', '/b', '/c'])).toEqual({
      kind: 'daemon',
      workspacePaths: ['/a', '/b', '/c'],
    });
  });

  it('reports no roots rather than defaulting to one', () => {
    // The daemon answers this with a `fatal` naming the problem — never by indexing
    // an implied path and reporting a clean workspace.
    expect(resolveEntryPoint(['daemon'])).toEqual({ kind: 'daemon', workspacePaths: [] });
  });

  it('never treats a flag after `daemon` as a root', () => {
    // A mistyped flag silently becoming a workspace path is how a daemon ends up
    // indexing a directory named `--watch`.
    expect(resolveEntryPoint(['daemon', '/w', '--verbose'])).toEqual({
      kind: 'daemon',
      workspacePaths: ['/w'],
    });
  });

  it('still accepts a bare workspace path as the daemon, for already-published IDE plugins', () => {
    // MIGRATION-COMPAT(L1): removed once the minimum supported JetBrains plugin
    // sends the explicit `daemon` subcommand.
    expect(resolveEntryPoint(['/some/workspace'])).toEqual({
      kind: 'daemon',
      workspacePaths: ['/some/workspace'],
    });
  });

  it('never resolves a flag-shaped argument to a daemon workspace path', () => {
    for (const arg of ['--help', '-h', '--version', '-V', '--bogus', '--format']) {
      const entry = resolveEntryPoint([arg]);
      expect(entry.kind).not.toBe('daemon');
    }
  });
});

describe('CLI_USAGE', () => {
  it('documents every subcommand the dispatcher accepts', () => {
    expect(CLI_USAGE).toContain('animoria check');
    expect(CLI_USAGE).toContain('animoria daemon');
  });

  it('documents every exit code the command can return', () => {
    // The exit-code table is the CLI's actual contract with a CI pipeline, and it
    // previously existed only as a source comment no user could ever see.
    for (const code of Object.values(CLI_EXIT_CODES)) {
      expect(CLI_USAGE).toMatch(new RegExp(`^\\s*${code}\\s+\\S`, 'm'));
    }
  });
});
