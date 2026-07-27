import type { GovernanceCheckReport } from '../governance-check-report.js';
import type { ReportRenderer } from './report-renderer.js';

/**
 * Renders a {@link GovernanceCheckReport} as plain, human-readable text
 * for a developer running `animoria check` locally or reading raw CI
 * logs.
 *
 * Deliberately free of ANSI color codes or spinners: CI log viewers vary
 * wildly in terminal emulation support, and a renderer that assumed a
 * TTY would produce garbled escape sequences in the common case of
 * output being piped to a log file. Plain text is also what keeps this
 * renderer's output byte-for-byte deterministic given the same report —
 * a property CI log diffing and snapshot testing both depend on.
 */
export const terminalRenderer: ReportRenderer = {
  format: 'terminal',

  render(report: GovernanceCheckReport): string {
    const lines: string[] = [];

    lines.push(`Animoria Governance Check — ${report.workspacePath}`);
    lines.push(`Assets: ${report.totalAssetCount} · Duration: ${Math.round(report.durationMs)}ms`);

    if (report.healthScore) {
      lines.push(`Health Score: ${report.healthScore.score}/100`);
    }

    lines.push(
      `Diagnostics: ${report.diagnostics.length} ` +
        `(${report.diagnosticCountBySeverity.error} error, ${report.diagnosticCountBySeverity.warning} warning)`
    );
    lines.push('');

    if (report.configErrors.length > 0) {
      lines.push('Configuration problems:');
      for (const error of report.configErrors) {
        lines.push(`  - "${error.ruleId}": ${error.errors.join('; ')}`);
      }
      lines.push('');
    }

    if (report.diagnostics.length > 0) {
      lines.push('Violations:');
      for (const diagnostic of report.diagnostics) {
        lines.push(
          `  [${diagnostic.severity.toUpperCase()}] ${diagnostic.ruleId}: ${diagnostic.message}`
        );
      }
      lines.push('');
    }

    if (report.healthScore && report.healthScore.recommendations.length > 0) {
      lines.push('Recommendations:');
      for (const recommendation of report.healthScore.recommendations) {
        lines.push(`  - ${recommendation.message}`);
      }
      lines.push('');
    }

    lines.push(
      report.outcome.passed
        ? 'Result: PASS'
        : `Result: FAIL\n${report.outcome.failureReasons.map((r) => `  - ${r}`).join('\n')}`
    );

    return lines.join('\n');
  },
};
