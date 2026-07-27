import { describe, parseSeverityWithOptions } from '../shared/rule-option-parsing.js';
import type { GovernanceRule, RuleEvaluationContext, RuleViolation } from '../types.js';

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

  evaluate(context: RuleEvaluationContext<MaxFileSizeOptions>): readonly RuleViolation[] {
    const { limitKb } = context.options;
    const limitBytes = limitKb * 1024;

    return context.assets
      .filter((asset) => asset.sizeBytes > limitBytes)
      .map((asset) => {
        const actualKb = Math.round(asset.sizeBytes / 1024);
        return {
          asset,
          message: `"${asset.name}" is ${actualKb}KB, exceeding the ${limitKb}KB limit.`,
          details: { limitKb, actualKb },
        };
      });
  },
};
