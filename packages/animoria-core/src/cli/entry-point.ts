import { CLI_EXIT_CODES, type CliExitCode } from './exit-codes.js';

/**
 * What the `animoria` binary was asked to do.
 *
 * ## Why dispatch is a value rather than a series of `if` statements in `main`
 * The previous dispatcher was a single check for the literal `'check'`, with
 * *everything else* treated as a workspace path. `animoria --help` therefore started
 * a long-lived daemon against a directory named `--help`, emitted a `scanComplete`
 * describing a healthy empty workspace, and hung reading stdin — as did `--version`,
 * and as did every typo.
 *
 * Modelling the decision as data keeps the same property `runCheckCommand` already
 * has: the interesting logic is a pure function that can be asserted directly, and
 * the only untestable part (writing to stdout, setting `process.exitCode`, spawning
 * the daemon) is a thin wrapper around it.
 */
export type CliEntryPoint =
  | { readonly kind: 'help'; readonly exitCode: CliExitCode }
  | { readonly kind: 'version' }
  | { readonly kind: 'check'; readonly argv: readonly string[] }
  /**
   * The long-running protocol daemon.
   *
   * `workspacePaths` is a list because a workspace may have several roots (V2). A
   * single path stays the common case and reads identically; what changes is that a
   * multi-root host no longer has to pick one root and silently ignore the rest,
   * which is what `workspaceFolders[0]` did in eight places.
   */
  | { readonly kind: 'daemon'; readonly workspacePaths: readonly string[] }
  | { readonly kind: 'usage-error'; readonly message: string };

export const CLI_USAGE = `animoria — Visual Asset Governance

Usage:
  animoria check [workspacePath] [options]   Run governance checks and exit with a status code
  animoria daemon <workspacePath>            Run the long-lived NDJSON daemon an IDE host spawns

Options for "check":
  --ci                        Non-interactive output defaults (Markdown)
  --format <name>             terminal | markdown | json
  --min-health-score <0-100>  Fail when the Health Score is below this threshold

Global options:
  -h, --help                  Show this message
  -V, --version               Show the installed version

Exit codes:
  0  passed
  1  governance violations found
  2  invalid usage
  3  workspace path missing or unreadable
  4  .animoriarc could not be loaded
  5  internal error
  6  a configured rule could not be evaluated (nothing was checked)`;

/**
 * Decides what an invocation means, from the arguments after the executable.
 *
 * @param args - `process.argv.slice(2)`.
 */
export function resolveEntryPoint(args: readonly string[]): CliEntryPoint {
  const [first, ...rest] = args;

  // No arguments at all is a usage problem, not a request for the daemon: printing
  // help and exiting beats silently becoming a background process.
  if (first === undefined) {
    return { kind: 'help', exitCode: CLI_EXIT_CODES.INVALID_USAGE };
  }

  if (first === '--help' || first === '-h') {
    return { kind: 'help', exitCode: CLI_EXIT_CODES.SUCCESS };
  }

  if (first === '--version' || first === '-V') {
    return { kind: 'version' };
  }

  if (first === 'check') {
    return { kind: 'check', argv: rest };
  }

  if (first === 'daemon') {
    // Every remaining argument is a root. Options are rejected rather than skipped:
    // a mistyped flag silently becoming a workspace path is how a daemon ends up
    // indexing a directory named `--watch`.
    const roots = rest.filter((arg) => !arg.startsWith('-'));
    return { kind: 'daemon', workspacePaths: roots };
  }

  if (first.startsWith('-')) {
    return { kind: 'usage-error', message: `Unrecognized option: ${first}` };
  }

  // MIGRATION-COMPAT(L1): a bare workspace path still starts the daemon, because
  // already-published JetBrains plugins spawn the binary that way. Delete once the
  // minimum supported plugin sends the explicit `daemon` subcommand — gate: Wave 7.
  return { kind: 'daemon', workspacePaths: [first, ...rest.filter((a) => !a.startsWith('-'))] };
}
