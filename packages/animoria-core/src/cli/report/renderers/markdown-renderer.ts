import { diagnosticCountBySeverity } from '../../../analysis/workspace-analysis.js';
import { describeCoverageStatus } from '../../../types/scan-coverage.js';
import type { GovernanceCheckReport } from '../governance-check-report.js';
import type { ReportRenderer } from './report-renderer.js';

/**
 * Renders a governance check as GitHub-flavoured Markdown for a pull-request comment.
 *
 * One rendering among several (see `./renderer-registry.js`), not the command's
 * native output: Markdown is what most CI bots accept as input, not what a
 * governance result conceptually is. Every value comes from the analysis.
 */
export const markdownRenderer: ReportRenderer = {
  format: 'markdown',

  render(report: GovernanceCheckReport): string {
    const { analysis } = report;
    const counts = diagnosticCountBySeverity(analysis);
    const lines: string[] = [];

    const badge = report.outcome.passed
      ? '✅ Passed'
      : report.outcome.incomplete
        ? '⚠️ Incomplete'
        : '❌ Failed';
    lines.push(`## Animoria Governance Check — ${badge}`, '');
    lines.push('| Metric | Value |');
    lines.push('| :--- | :--- |');
    lines.push(`| Assets | ${analysis.assets.length} |`);
    lines.push(
      `| Health Score | ${
        analysis.health.status === 'computed'
          ? `${analysis.health.report.score}/100`
          : `_not available — ${analysis.health.message}_`
      } |`
    );
    lines.push(`| Rules evaluated | ${analysis.evaluatedRuleIds.length} |`);
    if (analysis.skippedRules.length > 0) {
      lines.push(`| Rules skipped | ${analysis.skippedRules.length} |`);
    }
    lines.push(`| Errors | ${counts.error} |`);
    lines.push(`| Warnings | ${counts.warning} |`);
    lines.push(`| Duration | ${Math.round(report.durationMs)}ms |`);
    lines.push('');

    if (analysis.health.status === 'computed' && analysis.health.report.qualifications.length > 0) {
      lines.push('> **This score is qualified.**', '>');
      for (const qualification of analysis.health.report.qualifications) {
        lines.push(`> - ${qualification.message}`);
      }
      lines.push('');
    }

    if (analysis.configErrors.length > 0) {
      lines.push('### ⚠️ Configuration Problems', '');
      lines.push('| Rule | Problem |');
      lines.push('| :--- | :--- |');
      for (const error of analysis.configErrors) {
        lines.push(`| \`${error.ruleId}\` | ${error.errors.join('; ')} |`);
      }
      lines.push('');
    }

    if (analysis.diagnostics.length > 0) {
      lines.push('### Violations', '');
      lines.push('| Severity | Rule | File | Message | Confidence |');
      lines.push('| :--- | :--- | :--- | :--- | :--- |');
      for (const d of analysis.diagnostics) {
        // Full path, not `asset.name`: a PR comment naming `logo.json` in a monorepo
        // with four of them tells the reader nothing actionable.
        lines.push(
          `| ${d.severity} | [\`${d.ruleId}\`](${d.helpUri}) | \`${d.asset.path}\` | ${d.message} | ${d.confidence} |`
        );
      }
      lines.push('');
      lines.push('<details><summary>Evidence and remediation</summary>', '');
      for (const d of analysis.diagnostics) {
        lines.push(`**\`${d.asset.path}\`** — ${d.ruleId}`, '');
        lines.push(`- Evidence: ${d.evidence.summary}`);
        if (d.coverage) {
          const skipped =
            d.coverage.unscannedExtensions.length > 0
              ? `; not scanned: \`${d.coverage.unscannedExtensions.join('`, `')}\``
              : '';
          lines.push(
            `- Coverage: \`${d.coverage.status}\` — ${d.coverage.filesScanned} file(s) scanned${skipped}`
          );
        }
        lines.push(`- Fix: ${d.remediation.summary}`, '');
      }
      lines.push('</details>', '');
    }

    if (analysis.skippedRules.length > 0) {
      lines.push('### ⚠️ Rules that could not be evaluated', '');
      lines.push('These rules are configured but did not run, so this report does not', '');
      lines.push('establish whether the workspace satisfies them.', '');
      lines.push('| Rule | Severity | Reason |');
      lines.push('| :--- | :--- | :--- |');
      for (const skipped of analysis.skippedRules) {
        lines.push(`| \`${skipped.ruleId}\` | ${skipped.severity} | ${skipped.reason.message} |`);
      }
      lines.push('');
    }

    if (analysis.coverage && analysis.diagnostics.some((d) => d.evidence.kind === 'absence')) {
      lines.push('### Reference scan', '');
      lines.push('| | |');
      lines.push('| :--- | :--- |');
      lines.push(`| Files scanned | ${analysis.coverage.filesScanned} |`);
      lines.push(`| Formats | \`${analysis.coverage.scannedExtensions.join('`, `')}\` |`);
      lines.push(`| References found | ${analysis.coverage.referencesDetected} |`);
      lines.push(
        `| Coverage | \`${analysis.coverage.status}\` — ${describeCoverageStatus(analysis.coverage.status)} |`
      );
      if (analysis.coverage.unscannedExtensions.length > 0) {
        lines.push(
          `| Not scanned | \`${analysis.coverage.unscannedExtensions.join('`, `')}\` — an asset referenced only from one of these is reported as unreferenced |`
        );
      }
      lines.push('');
    }

    if (
      analysis.health.status === 'computed' &&
      analysis.health.report.recommendations.length > 0
    ) {
      lines.push('### Recommendations', '');
      for (const recommendation of analysis.health.report.recommendations) {
        lines.push(`- ${recommendation.message}`);
      }
      lines.push('');
    }

    if (!report.outcome.passed) {
      lines.push('### Why this failed', '');
      for (const reason of report.outcome.failureReasons) {
        lines.push(`- ${reason}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push(`*Generated by Animoria at ${report.generatedAt}*`);

    return lines.join('\n');
  },
};
