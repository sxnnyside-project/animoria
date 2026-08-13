import type { RuleDiagnostic } from '../rules-engine.js';

/**
 * Contracts for the asset badge system — the governance-state
 * indicators shown next to individual assets in any navigation
 * projection (tree, flat, or a future one).
 *
 * ## Why evaluation and presentation are two separate modules
 * *Which* badges apply to an asset is a governance question — "is this
 * unreferenced," "is this a known duplicate," "did a rule flag this" —
 * and the answer must be identical no matter which IDE is asking. *How*
 * a badge is drawn — a themed dot, a decoration, a gutter icon, a
 * colored label — is entirely a presentation concern specific to one
 * IDE's UI toolkit. Folding both into one module (as "compute the badge
 * and also decide it's a `vscode.ThemeIcon('warning')`") would mean a
 * JetBrains integration could not reuse the evaluation half without
 * carrying VS Code types along for the ride. This module — and
 * `evaluate-asset-badges.js`, its only implementation — contains zero
 * IDE-specific types; every consumer (see `animoria-vscode`'s
 * `badge-presenter.ts`) supplies its own mapping from {@link AssetBadge}
 * to platform-native visuals.
 */

/**
 * The governance conditions a badge can represent.
 *
 * Extending this list (e.g. a future `'forbidden-folder'` or
 * `'ownership-missing'` indicator) requires no change to
 * {@link evaluateAssetBadges}'s structure — see that function's own
 * docs for how a new condition is added.
 */
export type AssetBadgeKind = 'unreferenced' | 'duplicate' | 'rule-finding';

/** How urgently a badge should draw the developer's attention. */
export type AssetBadgeSeverity = 'info' | 'warning' | 'error';

/**
 * One governance condition that applies to a specific asset.
 *
 * Deliberately carries no IDE-specific visual information (no color, no
 * icon name) — see the module docs for why. `message` is plain,
 * IDE-neutral text suitable as a tooltip line in any presentation.
 */
export interface AssetBadge {
  readonly kind: AssetBadgeKind;
  readonly severity: AssetBadgeSeverity;
  readonly message: string;
}

/**
 * Everything {@link evaluateAssetBadges} needs to evaluate one asset,
 * assembled once per tree rebuild — never per asset — so evaluating
 * badges for an entire workspace stays a handful of `Map`/`Set` lookups
 * rather than re-scanning anything.
 *
 * Every field is optional and, when absent, that badge kind simply never
 * applies — a caller that hasn't computed reference counts yet (e.g.
 * mid-initial-scan) gets a partial-but-honest badge set, never a
 * fabricated one.
 */
export interface AssetBadgeContext {
  /**
   * Reference counts keyed by asset path — e.g.
   * `WorkspaceIndexSnapshot.referenceCounts`. Powers the `'unreferenced'`
   * badge. An asset absent from this map is treated as having an
   * unknown (not zero) reference count and is not flagged.
   */
  readonly referenceCounts?: ReadonlyMap<string, number>;
  /**
   * Paths known to belong to some duplicate-content group — e.g.
   * derived from a `GovernanceReport.duplicates` run. Powers the
   * `'duplicate'` badge.
   */
  readonly duplicateAssetPaths?: ReadonlySet<string>;
  /**
   * Rule Engine diagnostics keyed by the asset path they concern — e.g.
   * grouped from `RuleEngineReport.diagnostics`. Powers the
   * `'rule-finding'` badge, which covers every rule outcome
   * (oversized assets, `.animoriarc` violations, disallowed formats,
   * ...) uniformly, since from this module's perspective they are all
   * "the Rule Engine flagged this asset" — the specific rule is carried
   * in each diagnostic's own `message`, not re-classified here.
   */
  readonly diagnosticsByAssetPath?: ReadonlyMap<string, readonly RuleDiagnostic[]>;
}
