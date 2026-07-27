import { CliUsageError } from './cli-usage-error.js';

/** Parsed, validated options for the `animoria check` subcommand. */
export interface CheckCommandOptions {
  /** Workspace path to check. `undefined` means "use the current working directory". */
  readonly workspacePath: string | undefined;
  /**
   * Whether `--ci` was passed. Signals a non-interactive environment —
   * see `check-command.js` for the (deliberately narrow) way this
   * affects behavior. Never affects pass/fail: exit codes must stay
   * deterministic regardless of where the command runs.
   */
  readonly ci: boolean;
  /** Requested `--format`, validated against the renderer registry. `undefined` means "use the default for this context". */
  readonly format: string | undefined;
  /** Parsed `--min-health-score`, or `undefined` if not passed (the gate stays disabled). */
  readonly minHealthScore: number | undefined;
}

const FLAG_CI = '--ci';
const FLAG_FORMAT = '--format';
const FLAG_MIN_HEALTH_SCORE = '--min-health-score';
const RECOGNIZED_FLAGS = new Set([FLAG_CI, FLAG_FORMAT, FLAG_MIN_HEALTH_SCORE]);

/**
 * Parses argv for `animoria check`, independent of how those arguments
 * were obtained (a real `process.argv` slice, or a literal array in a
 * test).
 *
 * ## Why this doesn't take a dependency on an argv-parsing library
 * `animoria check` has exactly three flags and one optional positional
 * argument. A general-purpose parser would add a dependency and an
 * abstraction layer to save perhaps twenty lines of code, in a place
 * (the CLI's front door) where every dependency is one more thing that
 * can break `npx animoria check --ci` for someone hundreds of times a
 * day. Should the flag surface grow substantially, revisit this
 * decision — but do not add a library preemptively for flags that don't
 * exist yet.
 *
 * Accepts both `--flag value` and `--flag=value` forms for flags that
 * take a value.
 *
 * @param argv - Arguments *after* the `check` subcommand token itself.
 * @param knownFormats - Valid `--format` values, sourced from the
 *   renderer registry (`./report/renderers/renderer-registry.js`) so
 *   this parser never maintains its own, second list of formats that
 *   could drift from what's actually registered.
 * @throws {CliUsageError} If an unrecognized flag, a `--format` value
 *   not in `knownFormats`, or a non-numeric `--min-health-score` value
 *   is encountered.
 */
export function parseCheckArgv(
  argv: readonly string[],
  knownFormats: readonly string[]
): CheckCommandOptions {
  let workspacePath: string | undefined;
  let ci = false;
  let format: string | undefined;
  let minHealthScore: number | undefined;

  let i = 0;
  while (i < argv.length) {
    const token = argv[i]!;
    const flagName = token.split('=')[0]!;

    if (token === FLAG_CI) {
      ci = true;
      i++;
      continue;
    }

    if (flagName === FLAG_FORMAT) {
      const { value, nextIndex } = takeFlagValue(argv, i, FLAG_FORMAT);
      if (!value || !knownFormats.includes(value)) {
        throw new CliUsageError(
          `Invalid --format value: ${describe(value)}. Expected one of: ${knownFormats.join(', ')}.`
        );
      }
      format = value;
      i = nextIndex;
      continue;
    }

    if (flagName === FLAG_MIN_HEALTH_SCORE) {
      const { value, nextIndex } = takeFlagValue(argv, i, FLAG_MIN_HEALTH_SCORE);
      const parsed = value === undefined ? Number.NaN : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw new CliUsageError(
          `Invalid --min-health-score value: ${describe(value)}. Expected a number between 0 and 100.`
        );
      }
      minHealthScore = parsed;
      i = nextIndex;
      continue;
    }

    if (token.startsWith('--')) {
      if (!RECOGNIZED_FLAGS.has(flagName)) {
        throw new CliUsageError(`Unrecognized flag: ${token}`);
      }
      // Recognized but not handled above shouldn't happen; guard anyway.
      i++;
      continue;
    }

    if (workspacePath === undefined) {
      workspacePath = token;
    } else {
      throw new CliUsageError(`Unexpected extra argument: "${token}"`);
    }
    i++;
  }

  return { workspacePath, ci, format, minHealthScore };
}

/**
 * Reads a flag's value, accepting either `--flag=value` (self-contained,
 * advances one token) or `--flag value` (consumes the following token).
 *
 * @returns The value (`undefined` if neither form supplied one — the
 *   caller decides whether that's an error) and the index to resume
 *   parsing from.
 */
function takeFlagValue(
  argv: readonly string[],
  index: number,
  flagName: string
): { value: string | undefined; nextIndex: number } {
  const token = argv[index]!;
  if (token.startsWith(`${flagName}=`)) {
    return { value: token.slice(flagName.length + 1), nextIndex: index + 1 };
  }
  return { value: argv[index + 1], nextIndex: index + 2 };
}

function describe(value: string | undefined): string {
  return value === undefined ? '(missing)' : `"${value}"`;
}
