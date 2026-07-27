import type { AssetBadge, AssetBadgeKind } from '@animoria/core';
import * as vscode from 'vscode';

/**
 * Translates IDE-agnostic {@link AssetBadge}s (`@animoria/core`) into VS
 * Code-native presentation: a short text glyph prefixed onto a tree
 * item's label, and full tooltip lines.
 *
 * ## Why this file exists, separately from badge evaluation
 * `evaluateAssetBadges` (`@animoria/core`) decides *which* governance
 * conditions apply to an asset and knows nothing about VS Code. This
 * module is the other half: it decides *how* those conditions look in
 * this specific IDE. A JetBrains integration evaluating the exact same
 * `AssetBadge[]` would write its own presenter here — mapping to a
 * Swing/Compose icon instead of a Unicode glyph — without touching
 * `@animoria/core` at all. See that package's `governance/badges`
 * module for the full rationale.
 *
 * The icons below intentionally match the vocabulary used elsewhere in the
 * sidebar (`circle-slash` for unused/orphaned, `copy` for duplicate,
 * `warning` for rule violations — the same icons `AnimoriaGovernanceSectionItem`
 * and `AnimoriaGovernanceIssueItem` already use for the same categories) —
 * this is where that vocabulary is expressed, and the only place it needs
 * to change if it ever does.
 *
 * `$(name)` is VS Code's built-in codicon syntax: it renders as a real,
 * theme-colored icon glyph in `TreeItem.description` with no font or asset
 * of our own to ship, unlike a Unicode emoji (which renders as a fixed-color
 * pictograph that clashes with both Light and Dark themes).
 */
const BADGE_ICONS: Readonly<Record<AssetBadgeKind, string>> = {
  orphaned: '$(circle-slash)',
  duplicate: '$(copy)',
  'rule-violation': '$(warning)',
};

/** The result of presenting a set of badges for one tree item. */
export interface PresentedBadges {
  /** Codicon string to prepend to a label/description, e.g. `"$(circle-slash)$(warning)"`. Empty when there are no badges. */
  readonly prefix: string;
  /**
   * One tooltip line per badge, in the same order as the source badges.
   * Plain text — `TreeItem.tooltip` is a plain string here, which does not
   * render `$(name)` codicon syntax, so these intentionally carry no icon
   * prefix rather than printing the syntax literally.
   */
  readonly tooltipLines: readonly string[];
}

/**
 * Presents a governance-evaluated badge set for display in the sidebar.
 *
 * @param badges - Output of `evaluateAssetBadges`, already in its fixed,
 *   deterministic evaluation order — this function preserves that order
 *   rather than re-sorting by severity, so a badge's position in the
 *   prefix is always predictable for a given asset state.
 */
export function presentAssetBadges(badges: readonly AssetBadge[]): PresentedBadges {
  if (badges.length === 0) return { prefix: '', tooltipLines: [] };

  return {
    prefix: badges.map((badge) => BADGE_ICONS[badge.kind]).join(''),
    tooltipLines: badges.map((badge) => badge.message),
  };
}

/**
 * The most severe {@link vscode.ThemeIcon} color implied by a badge set,
 * or `undefined` when no badge warrants overriding an asset's normal
 * icon (e.g. its thumbnail or format icon).
 *
 * Kept separate from {@link presentAssetBadges} because not every
 * consumer wants an icon color override — the sidebar's per-asset
 * thumbnail already carries more useful information than a colored
 * circle, so `AnimoriaTreeProvider` uses this only where no thumbnail is
 * available.
 */
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
