import { describe, expect, it } from 'vitest';
import { parseCheckArgv } from '../../src/cli/argv-parser';
import { CliUsageError } from '../../src/cli/cli-usage-error';

const FORMATS = ['terminal', 'markdown', 'json'];

describe('parseCheckArgv', () => {
  it('returns defaults for an empty argv', () => {
    expect(parseCheckArgv([], FORMATS)).toEqual({
      workspacePath: undefined,
      workspacePaths: [],
      ci: false,
      format: undefined,
      minHealthScore: undefined,
    });
  });

  it('parses a positional workspace path', () => {
    const options = parseCheckArgv(['./my-workspace'], FORMATS);
    expect(options.workspacePath).toBe('./my-workspace');
  });

  it('parses the --ci flag', () => {
    expect(parseCheckArgv(['--ci'], FORMATS).ci).toBe(true);
  });

  it('parses --format with a separate value', () => {
    expect(parseCheckArgv(['--format', 'json'], FORMATS).format).toBe('json');
  });

  it('parses --format=value inline form', () => {
    expect(parseCheckArgv(['--format=markdown'], FORMATS).format).toBe('markdown');
  });

  it('parses --min-health-score with a separate value', () => {
    expect(parseCheckArgv(['--min-health-score', '80'], FORMATS).minHealthScore).toBe(80);
  });

  it('parses --min-health-score=value inline form', () => {
    expect(parseCheckArgv(['--min-health-score=42.5'], FORMATS).minHealthScore).toBe(42.5);
  });

  it('parses a combination of flags and a positional path in any order', () => {
    const options = parseCheckArgv(['--ci', './ws', '--format', 'json'], FORMATS);
    expect(options).toEqual({
      workspacePath: './ws',
      workspacePaths: ['./ws'],
      ci: true,
      format: 'json',
      minHealthScore: undefined,
    });
  });

  it('throws CliUsageError for an unrecognized flag', () => {
    expect(() => parseCheckArgv(['--bogus'], FORMATS)).toThrow(CliUsageError);
  });

  it('throws CliUsageError for an invalid --format value', () => {
    expect(() => parseCheckArgv(['--format', 'yaml'], FORMATS)).toThrow(CliUsageError);
  });

  it('throws CliUsageError when --format is missing its value', () => {
    expect(() => parseCheckArgv(['--format'], FORMATS)).toThrow(CliUsageError);
  });

  it('throws CliUsageError for a non-numeric --min-health-score', () => {
    expect(() => parseCheckArgv(['--min-health-score', 'nope'], FORMATS)).toThrow(CliUsageError);
  });

  it('throws CliUsageError for a --min-health-score outside [0, 100]', () => {
    expect(() => parseCheckArgv(['--min-health-score', '150'], FORMATS)).toThrow(CliUsageError);
    expect(() => parseCheckArgv(['--min-health-score', '-1'], FORMATS)).toThrow(CliUsageError);
  });

  it('accepts several positional paths as several workspace roots', () => {
    // V2. A CI gate that can only check the first root of a multi-root repository
    // silently passes on the rest, which is the worst possible failure for a gate.
    const options = parseCheckArgv(['./a', './b', './c'], FORMATS);
    expect(options.workspacePaths).toEqual(['./a', './b', './c']);
    // The first stays `workspacePath`, so every existing caller and message is
    // unchanged.
    expect(options.workspacePath).toBe('./a');
  });
});
