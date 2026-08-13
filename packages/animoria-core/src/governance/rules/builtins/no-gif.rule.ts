import { helpUriForRule } from '../rule-help.js';
import { parseSeverityOnlyOption } from '../shared/rule-option-parsing.js';
import {
  DIRECT_OBSERVATION_CONFIDENCE,
  type GovernanceRule,
  type RuleEvaluationContext,
  type RuleOutcome,
  evaluated,
} from '../types.js';

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
  helpUri: helpUriForRule(RULE_ID),

  parseOptions(raw) {
    return parseSeverityOnlyOption(raw, RULE_ID);
  },

  evaluate(context: RuleEvaluationContext<void>): RuleOutcome {
    // Format is a direct property of every indexed asset, so this rule can always
    // run — it depends on no external signal and therefore never skips.
    return evaluated(
      context.assets
        .filter((asset) => asset.format === 'gif')
        .map((asset) => ({
          asset,
          message: `"${asset.name}" is a GIF. Consider migrating it to Lottie or Rive for smaller file size and better fidelity.`,
          evidence: {
            // The asset's own parsed format — no search, no inference.
            kind: 'file-metadata' as const,
            summary: `Format is "${asset.format}".`,
            data: { format: asset.format },
          },
          confidence: DIRECT_OBSERVATION_CONFIDENCE,
          remediation: {
            summary:
              'Convert the asset to Lottie or Rive, or set "no-gif": "off" in .animoriarc if GIF is intentional here.',
          },
        }))
    );
  },
};
