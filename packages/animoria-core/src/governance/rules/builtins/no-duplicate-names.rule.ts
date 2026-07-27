import type { AnimoriaAsset } from '../../../types/asset.js';
import { parseSeverityOnlyOption } from '../shared/rule-option-parsing.js';
import type { GovernanceRule, RuleEvaluationContext, RuleViolation } from '../types.js';

const RULE_ID = 'no-duplicate-names';

/**
 * Flags assets that share a name (ignoring extension and case) with
 * another asset elsewhere in the workspace.
 *
 * This is a *naming* check, not a *content* check — two files named
 * `success.json` in different folders are flagged here even if their
 * contents differ completely. That distinguishes it from the
 * content-hash duplicate detection already performed by
 * `GovernanceAnalyzer` (`../governance-analyzer.js`): that flow answers
 * "are these the same file copy-pasted?", this rule answers "will a
 * developer searching for '`success`' get confused about which one they
 * mean?" Both are useful; neither replaces the other.
 *
 * Comparison is on the file stem (name without extension), case-folded,
 * so `Success.json` and `success.lottie` are treated as a collision —
 * the two most common ways a duplicate name actually causes confusion
 * (different casing, different format for "the same" animation).
 *
 * Configuration: a bare severity — `"error" | "warning" | "off"`.
 */
export const noDuplicateNamesRule: GovernanceRule<void> = {
  id: RULE_ID,
  description: 'Disallows two assets sharing the same name (case-insensitive, extension ignored).',

  parseOptions(raw) {
    return parseSeverityOnlyOption(raw, RULE_ID);
  },

  evaluate(context: RuleEvaluationContext<void>): readonly RuleViolation[] {
    const groups = new Map<string, AnimoriaAsset[]>();

    for (const asset of context.assets) {
      const key = asset.stem.toLowerCase();
      const group = groups.get(key);
      if (group) group.push(asset);
      else groups.set(key, [asset]);
    }

    const violations: RuleViolation[] = [];
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const asset of group) {
        const others = group.filter((a) => a.path !== asset.path).map((a) => a.path);
        violations.push({
          asset,
          message: `"${asset.name}" shares its name with ${others.length} other asset(s): ${others.join(', ')}.`,
          details: { conflictingPaths: others },
        });
      }
    }
    return violations;
  },
};
