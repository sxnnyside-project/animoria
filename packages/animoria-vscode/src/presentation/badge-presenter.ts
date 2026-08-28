import * as vscode from 'vscode';

export type AssetBadgeKind = 'unreferenced' | 'duplicate' | 'rule-finding';

export interface AssetBadge {
  kind: AssetBadgeKind;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

const BADGE_ICONS: Readonly<Record<AssetBadgeKind, string>> = {
  unreferenced: '$(circle-slash)',
  duplicate: '$(copy)',
  'rule-finding': '$(warning)',
};

export interface PresentedBadges {
  readonly prefix: string;
  readonly tooltipLines: readonly string[];
}

export function presentAssetBadges(badges: readonly AssetBadge[]): PresentedBadges {
  if (badges.length === 0) return { prefix: '', tooltipLines: [] };

  return {
    prefix: badges.map((badge) => BADGE_ICONS[badge.kind]).join(''),
    tooltipLines: badges.map((badge) => badge.message),
  };
}

export function presentBadgeIconColor(
  badges: readonly AssetBadge[]
): vscode.ThemeColor | undefined {
  if (badges.some((b) => b.severity === 'error')) {
    return new vscode.ThemeColor('problemsErrorIcon.foreground');
  }
  if (badges.some((b) => b.severity === 'warning')) {
    return new vscode.ThemeColor('problemsWarningIcon.foreground');
  }
  return undefined;
}
