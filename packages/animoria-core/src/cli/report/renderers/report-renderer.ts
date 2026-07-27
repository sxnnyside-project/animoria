import type { GovernanceCheckReport } from '../governance-check-report.js';

/**
 * The contract every output format for `animoria check` implements.
 *
 * A renderer is a pure function from {@link GovernanceCheckReport} to a
 * string — no side effects, no access to `process`, no knowledge of exit
 * codes. This is what lets `check-command.js` treat "how do I decide
 * pass/fail" (see `../check-outcome.js`) and "how do I print the result"
 * as completely independent concerns, and what lets a new output format
 * (GitHub annotations, SARIF, GitLab's code quality report, ...) be
 * added as one new file implementing this interface plus one line in
 * `./renderer-registry.js` — never a change to how the report itself is
 * computed.
 */
export interface ReportRenderer {
  /** The `--format` value this renderer answers to, e.g. `"markdown"`. */
  readonly format: string;
  /** Renders a complete, standalone report as a string. */
  render(report: GovernanceCheckReport): string;
}
