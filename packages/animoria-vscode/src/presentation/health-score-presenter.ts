import type { HealthScoreReport } from '@animoria/contracts';
import * as vscode from 'vscode';

export type HealthState = 'excellent' | 'good' | 'fair' | 'poor';

export function describeHealthState(score: number): HealthState {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
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

  const state = describeHealthState(report.score);
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
