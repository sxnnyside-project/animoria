import { helpUriForRule } from '../rule-help.js';
import { describe, parseSeverityWithOptions } from '../shared/rule-option-parsing.js';
import {
  DIRECT_OBSERVATION_CONFIDENCE,
  type GovernanceRule,
  type RuleEvaluationContext,
  type RuleOutcome,
  evaluated,
} from '../types.js';

const RULE_ID = 'max-file-size-kb';

/** Validated options for {@link maxFileSizeRule}. */
export interface MaxFileSizeOptions {
  /** Maximum allowed asset size, in kibibytes. */
  readonly limitKb: number;
}

/**
 * Flags assets whose file size exceeds a configured limit.
 *
 * Oversized animated assets are a common, silent contributor to bundle
 * bloat and slow cold-starts — unlike code, they rarely get a second
 * look once they're in the repository. This rule turns "someone should
 * really check whether that 8 MB Lottie file is necessary" into an
 * enforceable, visible policy.
 *
 * Configuration accepts either a bare number of kibibytes (severity
 * implied `"error"`) or an explicit `[severity, limitKb]` tuple, e.g.
 * `"max-file-size-kb": 1024` or `"max-file-size-kb": ["warning", 1024]`.
 */
export const maxFileSizeRule: GovernanceRule<MaxFileSizeOptions> = {
  id: RULE_ID,
  description: 'Disallows assets larger than a configured size threshold.',
  helpUri: helpUriForRule(RULE_ID),

  parseOptions(raw) {
    return parseSeverityWithOptions<MaxFileSizeOptions>(raw, RULE_ID, (value) => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return {
          valid: false,
          errors: [`expects a positive number of kilobytes, got: ${describe(value)}`],
        };
      }
      return { valid: true, options: { limitKb: value } };
    });
  },

  evaluate(context: RuleEvaluationContext<MaxFileSizeOptions>): RuleOutcome {
    const { limitKb } = context.options;
    const limitBytes = limitKb * 1024;

    // Size is recorded on every indexed asset, so this rule never lacks evidence.
    return evaluated(
      context.assets
        .filter((asset) => asset.sizeBytes > limitBytes)
        .map((asset) => {
          const actualKb = Math.round(asset.sizeBytes / 1024);
          return {
            asset,
            message: `"${asset.name}" is ${actualKb}KB, exceeding the ${limitKb}KB limit.`,
            details: { limitKb, actualKb },
            evidence: {
              // A measured file property compared against a configured threshold.
              kind: 'file-metadata' as const,
              summary: `${actualKb}KB on disk, against a configured limit of ${limitKb}KB.`,
              data: { limitKb, actualKb, sizeBytes: asset.sizeBytes },
            },
            confidence: DIRECT_OBSERVATION_CONFIDENCE,
            remediation: {
              summary: `Compress or replace the asset, or raise "max-file-size-kb" above ${actualKb} in .animoriarc.`,
            },
          };
        })
    );
  },
};
