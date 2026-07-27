/**
 * Thrown when the CLI is invoked with an unrecognized flag or an invalid
 * value for a recognized one.
 *
 * A distinct error type (rather than a generic `Error`) so the
 * top-level command handler can catch usage problems specifically and
 * map them to {@link CLI_EXIT_CODES.INVALID_USAGE} without risking a
 * genuine internal failure being mis-reported as "you typed the command
 * wrong" — see `exit-codes.js` for why that distinction matters to an
 * automation caller.
 */
export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}
