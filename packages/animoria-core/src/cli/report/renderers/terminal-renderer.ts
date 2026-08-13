import { diagnosticCountBySeverity } from '../../../analysis/workspace-analysis.js';
import { type ScanCoverage, describeCoverageStatus } from '../../../types/scan-coverage.js';
import type { GovernanceCheckReport } from '../governance-check-report.js';
import type { ReportRenderer } from './report-renderer.js';

/**
 * Renders a governance check as plain text for a developer at a terminal or reading
 * raw CI logs.
 *
 * Deliberately free of ANSI colour or spinners: CI log viewers vary wildly in
 * terminal emulation, and plain text keeps the output byte-for-byte deterministic
 * for the same analysis — a property log diffing and snapshot testing both depend on.
 *
 * Every value below is read from the analysis. The renderer decides layout and
 * wording; it derives no governance meaning of its own.
 */
export const terminalRenderer: ReportRenderer = {
  format: 'terminal',

  render(report: GovernanceCheckReport): string {
    const { analysis } = report;
    const counts = diagnosticCountBySeverity(analysis);
    const lines: string[] = [];

    const ruleSummary = `${analysis.evaluatedRuleIds.length} rule(s) evaluated${
      analysis.skippedRules.length > 0 ? `, ${analysis.skippedRules.length} skipped` : ''
    }`;

    lines.push(`Animoria Governance Check — ${analysis.workspacePath}`);
    lines.push(
      `Assets: ${analysis.assets.length} · ${ruleSummary} · Duration: ${Math.round(report.durationMs)}ms`
    );

    // A score is printed only when Core produced one. The three states in which it
    // refuses to — no assets, no rules, unfinished analysis — each once rendered as
    // a confident 100/100.
    if (analysis.health.status === 'computed') {
      lines.push(`Health Score: ${analysis.health.report.score}/100`);
      for (const qualification of analysis.health.report.qualifications) {
        lines.push(`  caveat: ${qualification.message}`);
      }
    } else {
      lines.push(`Health Score: not available — ${analysis.health.message}`);
    }

    lines.push(
      `Diagnostics: ${analysis.diagnostics.length} (${counts.error} error, ${counts.warning} warning)`
    );
    lines.push('');

    if (analysis.configErrors.length > 0) {
      lines.push('Configuration problems:');
      for (const error of analysis.configErrors) {
        lines.push(`  - "${error.ruleId}": ${error.errors.join('; ')}`);
      }
      lines.push('');
    }

    if (analysis.diagnostics.length > 0) {
      lines.push('Violations:');
      for (const diagnostic of analysis.diagnostics) {
        // The asset's path, not just its name: a monorepo can hold four files called
        // `logo.json`, and a bare name leaves the reader to go and find out which.
        lines.push(`  ${diagnostic.asset.path}`);
        lines.push(
          `    ${diagnostic.severity.toLowerCase()}  ${diagnostic.ruleId}  ${diagnostic.message}`
        );
        lines.push(`      evidence    ${diagnostic.evidence.summary}`);
        if (diagnostic.coverage) {
          lines.push(`      coverage    ${describeCoverageLine(diagnostic.coverage)}`);
        }
        lines.push(`      confidence  ${diagnostic.confidence}`);
        lines.push(`      → ${diagnostic.remediation.summary}`);
        lines.push(`      ${diagnostic.helpUri}`);
      }
      lines.push('');
    }

    if (analysis.coverage && reportsAbsence(report)) {
      lines.push('Reference scan:');
      lines.push(
        `  scanned:  ${analysis.coverage.filesScanned} file(s) — ${analysis.coverage.scannedExtensions.join(' ')}`
      );
      lines.push(`  found:    ${analysis.coverage.referencesDetected} reference(s)`);
      lines.push(
        `  coverage: ${analysis.coverage.status} — ${describeCoverageStatus(analysis.coverage.status)}`
      );
      if (analysis.coverage.unscannedExtensions.length > 0) {
        lines.push(`  skipped:  ${analysis.coverage.unscannedExtensions.join(' ')}`);
      }
      lines.push('');
    }

    if (analysis.skippedRules.length > 0) {
      lines.push('Skipped rules (configured, but not evaluated):');
      for (const skipped of analysis.skippedRules) {
        lines.push(`  - ${skipped.ruleId} [${skipped.severity}]: ${skipped.reason.message}`);
      }
      lines.push('');
    }

    if (
      analysis.health.status === 'computed' &&
      analysis.health.report.recommendations.length > 0
    ) {
      lines.push('Recommendations:');
      for (const recommendation of analysis.health.report.recommendations) {
        lines.push(`  - ${recommendation.message}`);
      }
      lines.push('');
    }

    lines.push(
      report.outcome.passed
        ? `Result: PASS (${ruleSummary})`
        : `Result: ${report.outcome.incomplete ? 'INCOMPLETE' : 'FAIL'}\n${report.outcome.failureReasons
            .map((r) => `  - ${r}`)
            .join('\n')}`
    );

    return lines.join('\n');
  },
};

/** Compact per-finding coverage line: the verdict, then the numbers behind it. */
function describeCoverageLine(coverage: ScanCoverage): string {
  const skipped =
    coverage.unscannedExtensions.length > 0
      ? `; not scanned: ${coverage.unscannedExtensions.join(' ')}`
      : '';
  return `${coverage.status} — ${coverage.filesScanned} file(s) scanned${skipped}`;
}

/** Whether this report contains at least one finding that asserts an absence. */
function reportsAbsence(report: GovernanceCheckReport): boolean {
  return report.analysis.diagnostics.some((d) => d.evidence.kind === 'absence');
}
