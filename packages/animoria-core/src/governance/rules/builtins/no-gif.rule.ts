import { parseSeverityOnlyOption } from '../shared/rule-option-parsing.js';
import type { GovernanceRule, RuleEvaluationContext, RuleViolation } from '../types.js';

const RULE_ID = 'no-gif';

/**
 * Flags every GIF asset in the workspace.
 *
 * GIF is the least efficient of Animoria's supported animated formats
 * (no alpha compression benefits of Lottie/Rive, large file sizes for
 * comparable quality) and teams commonly want to phase it out in favor
 * of Lottie or Rive. This rule gives them a way to say so declaratively
 * instead of policing it in code review.
 *
 * Configuration: a bare severity — `"error" | "warning" | "off"`. Takes
 * no further options, since the condition itself ("is this a GIF") has
 * nothing to parameterize.
 */
export const noGifRule: GovernanceRule<void> = {
  id: RULE_ID,
  description: 'Disallows GIF assets in favor of more efficient animated formats.',

  parseOptions(raw) {
    return parseSeverityOnlyOption(raw, RULE_ID);
  },

  evaluate(context: RuleEvaluationContext<void>): readonly RuleViolation[] {
    return context.assets
      .filter((asset) => asset.format === 'gif')
      .map((asset) => ({
        asset,
        message: `"${asset.name}" is a GIF. Consider migrating it to Lottie or Rive for smaller file size and better fidelity.`,
      }));
  },
};
