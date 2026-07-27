import { parseSeverityOnlyOption } from '../shared/rule-option-parsing.js';
import type { GovernanceRule, RuleEvaluationContext, RuleViolation } from '../types.js';

const RULE_ID = 'no-unreferenced-assets';

/**
 * Flags assets with zero detected source-code references.
 *
 * This rule does not scan source code itself — usage scanning requires
 * walking the workspace's source files, which is I/O the rule contract
 * explicitly forbids (see `GovernanceRule` in `../types.js`). Instead it
 * consults `context.signals.referenceCounts`, a map the caller populates
 * ahead of time (typically by running `UsageScanner` per asset, the same
 * way `GovernanceAnalyzer` already does for its own "unused" category).
 *
 * If the caller did not supply `referenceCounts` — e.g. a fast path that
 * only wants file-size or format checks — this rule reports nothing
 * rather than guessing or throwing. A rule that can't do its job safely
 * stays silent; it never fabricates a result.
 *
 * Configuration: a bare severity — `"error" | "warning" | "off"`.
 */
export const noUnreferencedAssetsRule: GovernanceRule<void> = {
  id: RULE_ID,
  description: 'Disallows assets with no detected references in source code.',

  parseOptions(raw) {
    return parseSeverityOnlyOption(raw, RULE_ID);
  },

  evaluate(context: RuleEvaluationContext<void>): readonly RuleViolation[] {
    const { referenceCounts } = context.signals;
    if (!referenceCounts) return [];

    return context.assets
      .filter((asset) => (referenceCounts.get(asset.path) ?? 0) === 0)
      .map((asset) => ({
        asset,
        message: `"${asset.name}" has no detected references in source code.`,
      }));
  },
};
