import type { HealthScoreReport } from '@animoria/contracts';
import * as vscode from 'vscode';

export type HealthState = 'excellent' | 'good' | 'fair' | 'poor';

// Buckets Core's letter grade, not report.score with its own cutoffs — a second scoring boundary can disagree with Core's grade.
export function describeHealthState(grade: string): HealthState {
  switch (grade.toUpperCase()) {
    case 'A':
      return 'excellent';
    case 'B':
      return 'good';
    case 'C':
    case 'D':
      return 'fair';
    default:
      return 'poor';
  }
}

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

export interface PresentedHealthScore {
  readonly label: string;
  readonly description: string;
  readonly tooltip: string;
  readonly icon: vscode.ThemeIcon;
}

export function presentHealthScore(
  report: HealthScoreReport | null | undefined
): PresentedHealthScore {
  if (!report || report.grade === 'N/A') {
    return {
      label: 'Health Score: not available',
      description: 'no assets scored',
      tooltip: 'No visual assets scored in this workspace.',
      icon: new vscode.ThemeIcon('question'),
    };
  }

  const state = describeHealthState(report.grade);
  const stateLabel = HEALTH_STATE_LABELS[state];
  const icon = new vscode.ThemeIcon(HEALTH_STATE_ICONS[state]);

  const label = `Health Score: ${Math.round(report.score)}/100 · ${stateLabel}`;
  const description = `Grade: ${report.grade}`;

  const tooltipLines = [
    label,
    description,
    `Summary: ${report.summary}`,
    ...report.categories.map(
      (cat) => `• ${cat.category}: ${cat.score}% (${cat.violations_count} issues)`
    ),
  ];

  return { label, description, tooltip: tooltipLines.join('\n'), icon };
}
