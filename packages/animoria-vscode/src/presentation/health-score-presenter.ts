import { type HealthScoreOutcome, type HealthState, describeHealthState } from '@animoria/core';
import * as vscode from 'vscode';

/**
 * Translates a {@link HealthScoreReport} into the concise summary text
 * and native icon the sidebar's header widget displays.
 *
 * ## Why this stays presentation-only
 * `HealthScoreReport` and {@link describeHealthState} (`@animoria/core`)
 * already contain every fact this widget needs — the score, its
 * category breakdown, and its ranked recommendations. This module does
 * not recompute or reinterpret any of that; it only chooses *wording*
 * and a *`vscode.ThemeIcon`* for each {@link HealthState}, the one part
 * of the widget that is inherently IDE-specific. A JetBrains status
 * widget would consume the identical `HealthScoreReport` and write its
 * own icon/wording mapping here.
 *
 * ## Why the widget stays terse
 * Every sidebar element should answer either "what is the current
 * governance state" or "what is the next recommended action." This
 * widget answers exactly the first, in one line, with the single
 * highest-priority recommendation (if any) as a second line for "what's
 * next." It deliberately does not enumerate every category or
 * diagnostic; that detail lives one click away in the governance
 * sections already in the tree.
 */
const HEALTH_STATE_ICONS: Readonly<Record<HealthState, string>> = {
  excellent: 'pass-filled',
  good: 'thumbsup',
  fair: 'warning',
  poor: 'error',
};

const HEALTH_STATE_LABELS: Readonly<Record<HealthState, string>> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Needs Attention',
  poor: 'Critical',
};

/** The rendered pieces of the Health Score header widget. */
export interface PresentedHealthScore {
  readonly label: string;
  readonly description: string;
  readonly tooltip: string;
  readonly icon: vscode.ThemeIcon;
}

/**
 * Presents a {@link HealthScoreReport} as a single-line label, a short
 * description, and a richer tooltip — the three levels of detail a VS
 * Code `TreeItem` supports, from "glance" to "hover for more."
 */
export function presentHealthScore(outcome: HealthScoreOutcome): PresentedHealthScore {
  // A workspace Core could not score gets a row that says so. The row used to be
  // hidden entirely when no score existed, which read as "nothing to report" — the
  // same silence a perfectly healthy workspace produces.
  if (outcome.status === 'unavailable') {
    return {
      label: 'Health Score: not available',
      description: outcome.reason.replace(/-/g, ' '),
      tooltip: outcome.message,
      icon: new vscode.ThemeIcon('question'),
    };
  }

  const report = outcome.report;
  const state = describeHealthState(report.score);
  const stateLabel = HEALTH_STATE_LABELS[state];
  const icon = new vscode.ThemeIcon(HEALTH_STATE_ICONS[state]);

  const label = `Health Score: ${Math.round(report.score)}/100 · ${stateLabel}`;
  const findingWord = report.totalDiagnosticCount === 1 ? 'finding' : 'findings';
  const description = `${report.totalDiagnosticCount} governance ${findingWord}`;

  const topRecommendation = report.recommendations[0]?.message;
  const tooltipLines = [
    label,
    `${report.totalAssetCount} asset(s) analyzed`,
    description,
    // Caveats first: a score computed while a configured rule declined to run is a
    // floor on the problems present, not a full accounting of them.
    ...report.qualifications.map((q) => `⚠ ${q.message}`),
    topRecommendation ? `Top priority: ${topRecommendation}` : 'No issues detected.',
  ];

  return { label, description, tooltip: tooltipLines.join('\n'), icon };
}
