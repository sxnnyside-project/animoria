import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { CONFIG_FILE_PSEUDO_RULE_ID } from '../indexer/workspace-indexer.js';
import { WorkspaceSession } from '../workspace/workspace-session.js';
import { logDebug } from '../logging/logger.js';
import { parseCheckArgv } from './argv-parser.js';
import { CliUsageError } from './cli-usage-error.js';
import { CLI_EXIT_CODES, type CliExitCode } from './exit-codes.js';
import { buildGovernanceCheckReport } from './report/build-report.js';
import { createDefaultRendererRegistry } from './report/renderers/renderer-registry.js';

const DEFAULT_FORMAT_INTERACTIVE = 'terminal';
const DEFAULT_FORMAT_CI = 'markdown';

/** The outcome of {@link runCheckCommand}: what to print, and how the process should exit. */
export interface CheckCommandResult {
  readonly exitCode: CliExitCode;
  /** Fully-rendered output, ready to write to stdout as-is. */
  readonly output: string;
}

/**
 * Runs `animoria check` end-to-end and returns a result — it never
 * touches `process.exit` or writes to `stdout` itself.
 *
 * ## Why this function is pure I/O-in, string-out
 * Keeping process-level side effects (`process.exit`, `console.log`)
 * entirely out of this function is what makes `animoria check` testable
 * without spawning a real subprocess per test case — a test can call
 * `runCheckCommand` directly, inspect `{ exitCode, output }`, and assert
 * on both without any of the flakiness or slowness of shelling out to
 * `node dist/cli.js check`. The one caller that *does* need real process
 * effects — `cli.ts`'s entry point — is a two-line wrapper around this
 * function for exactly that reason: all the logic lives here, where it
 * can be tested; only "translate the result into OS-level effects" lives
 * there, where it can't be meaningfully unit tested anyway.
 *
 * ## Orchestration, not analysis
 * Every governance decision this function's result depends on was
 * already made before this function saw it:
 * - Whether an asset violates a rule: decided by `RulesEngine`.
 * - What a violation costs: decided by `HealthScoreEngine`.
 * - Whether *this run* should be considered a pass or a fail: decided by
 *   `determineCheckOutcome` (`./check-outcome.js`), the one piece of
 *   automation-specific policy this command layer is allowed to own.
 *
 * This function's own job is strictly: parse arguments, resolve and
 * validate the workspace path, run exactly one
 * `WorkspaceIndexer.initialize()` pass (see that class's docs — a
 * one-shot CI invocation needs the cold scan, never the continuous
 * watch mode), assemble a report from its result, and pick a renderer.
 *
 * ## Error differentiation
 * Every failure mode maps to a distinct, documented
 * {@link CLI_EXIT_CODES} entry — see that module for the full
 * rationale. This function never lets an unexpected exception escape as
 * an unhandled rejection; anything not already anticipated is caught
 * and reported as {@link CLI_EXIT_CODES.INTERNAL_ERROR} with its real
 * message, rather than silently becoming "0 violations found."
 *
 * @param argv - Arguments after the `check` subcommand token (i.e.
 *   `process.argv.slice(3)` when invoked as `animoria check ...`).
 */
export async function runCheckCommand(argv: readonly string[]): Promise<CheckCommandResult> {
  const renderers = createDefaultRendererRegistry();

  let options: ReturnType<typeof parseCheckArgv>;
  try {
    options = parseCheckArgv(argv, renderers.formats());
  } catch (err) {
    if (err instanceof CliUsageError) {
      return { exitCode: CLI_EXIT_CODES.INVALID_USAGE, output: formatUsageError(err) };
    }
    throw err;
  }

  // `process.cwd()` is the correct default for a CLI — it is what the user typed
  // `animoria check` *in* — and is deliberately the only place Animoria reads it.
  const rootPaths = (
    options.workspacePaths.length > 0 ? options.workspacePaths : [process.cwd()]
  ).map((path) => resolve(path));

  for (const rootPath of rootPaths) {
    const workspaceError = await validateWorkspaceDirectory(rootPath);
    if (workspaceError) {
      return { exitCode: CLI_EXIT_CODES.WORKSPACE_ERROR, output: workspaceError };
    }
  }

  const start = performance.now();
  const session = new WorkspaceSession(rootPaths);

  try {
    // The *complete* path, not the fast one. `initializeFast` returns before
    // reference evidence exists, which made every reference-dependent rule decline
    // to run — and this command reported the resulting empty diagnostic list as a
    // pass. A one-shot consumer that renders a verdict and exits must wait for the
    // evidence its rules depend on.
    const aggregate = await session.initialize();

    // One report per root, then the worst outcome decides the exit code. Merging
    // the roots into one report would have to pick one root's `.animoriarc` to
    // describe, and the roots may govern themselves differently.
    const durationMs = performance.now() - start;
    const perRoot = aggregate.roots.map(({ root, analysis }) => ({
      root,
      report: buildGovernanceCheckReport(analysis, durationMs, {
        minHealthScore: options.minHealthScore,
      }),
      analysis,
    }));

    // A gate passes only when every root passes. Reporting the first root's verdict
    // for the workspace is how a CI gate comes to approve a change it never examined.
    const report = perRoot[0]!.report;

    const formatName =
      options.format ?? (options.ci ? DEFAULT_FORMAT_CI : DEFAULT_FORMAT_INTERACTIVE);
    const renderer = renderers.get(formatName);
    if (!renderer) {
      // Unreachable in practice: parseCheckArgv already validates
      // --format against this same registry. Guarded defensively rather
      // than asserted away, per this command's "never let an
      // unanticipated state masquerade as success" policy.
      throw new Error(`No renderer registered for format "${formatName}".`);
    }

    const output =
      perRoot.length === 1
        ? renderer.render(perRoot[0]!.report)
        : perRoot
            .map((entry) => `# ${entry.root.name}\n\n${renderer.render(entry.report)}`)
            .join('\n\n');

    // A `.animoriarc` that would not load is neither a pass nor a governance
    // violation: the rules the team configured never ran, so the run says nothing
    // about the assets. The analysis reports it; this only maps it to an exit code.
    const hasConfigFileProblem = perRoot.some((entry) =>
      entry.analysis.configErrors.some((e) => e.ruleId === CONFIG_FILE_PSEUDO_RULE_ID)
    );
    // Every root must pass, and any root's incompleteness makes the run incomplete.
    const allPassed = perRoot.every((entry) => entry.report.outcome.passed);
    const anyIncomplete = perRoot.some((entry) => entry.report.outcome.incomplete);
    const exitCode = hasConfigFileProblem
      ? CLI_EXIT_CODES.CONFIGURATION_ERROR
      : allPassed
        ? CLI_EXIT_CODES.SUCCESS
        : // A run that failed only because a configured gate could not be evaluated
          // is not a governance violation — nothing was found to be wrong. It gets
          // its own code so a pipeline can tell "your assets need attention" from
          // "Animoria could not check them".
          anyIncomplete
          ? CLI_EXIT_CODES.INCOMPLETE_ANALYSIS
          : CLI_EXIT_CODES.GOVERNANCE_VIOLATIONS;

    return { exitCode, output };
  } catch (err) {
    return {
      exitCode: CLI_EXIT_CODES.INTERNAL_ERROR,
      output: `Animoria check failed unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    session.dispose();
  }
}

async function validateWorkspaceDirectory(workspacePath: string): Promise<string | null> {
  try {
    const stats = await stat(workspacePath);
    if (!stats.isDirectory()) {
      return `"${workspacePath}" exists but is not a directory.`;
    }
    return null;
  } catch (err) {
    logDebug(
      'cli-check',
      'validateWorkspaceDirectory',
      'Could not stat the requested workspace path',
      {
        assetPath: workspacePath,
        reason: 'path does not exist or is not accessible',
        error: err,
        recovery: 'reported as an invalid workspace path to the CLI caller',
      }
    );
    return `Workspace path "${workspacePath}" does not exist or is not accessible.`;
  }
}

function formatUsageError(error: CliUsageError): string {
  return `${error.message}\n\nUsage: animoria check [workspacePath] [--ci] [--format terminal|markdown|json] [--min-health-score <0-100>]`;
}
