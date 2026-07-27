import type { GovernanceCheckReport } from '../governance-check-report.js';
import type { ReportRenderer } from './report-renderer.js';

/**
 * Renders a {@link GovernanceCheckReport} as pretty-printed JSON.
 *
 * This is the format for machine consumers that want the full,
 * structured result — a custom dashboard, a script that greps specific
 * fields, a future renderer prototype — without depending on any of
 * Animoria's TypeScript types directly. Serialization is a direct
 * `JSON.stringify` of the report with no reshaping, so this format's
 * schema *is* {@link GovernanceCheckReport}'s own shape — the two can
 * never drift apart because there is no translation step to drift.
 */
export const jsonRenderer: ReportRenderer = {
  format: 'json',

  render(report: GovernanceCheckReport): string {
    return JSON.stringify(report, null, 2);
  },
};
