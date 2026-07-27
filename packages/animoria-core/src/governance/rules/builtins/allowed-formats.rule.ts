import type { AnimatedFormat } from '../../../types/asset.js';
import { ASSET_EXTENSIONS_BY_FORMAT } from '../../../types/formats.js';
import { describe, parseSeverityWithOptions } from '../shared/rule-option-parsing.js';
import type { GovernanceRule, RuleEvaluationContext, RuleViolation } from '../types.js';

const RULE_ID = 'allowed-formats';

// Derived from the canonical format list (`types/formats.ts`) rather
// than re-enumerated here, so a future format needs no update to this
// rule's validation to be recognized as legitimate.
const KNOWN_FORMATS: ReadonlySet<AnimatedFormat> = new Set(
  Object.keys(ASSET_EXTENSIONS_BY_FORMAT) as AnimatedFormat[]
);

/** Validated options for {@link allowedFormatsRule}. */
export interface AllowedFormatsOptions {
  /** The exact set of formats this workspace permits. */
  readonly formats: ReadonlySet<AnimatedFormat>;
}

/**
 * Flags assets whose format is not in a configured allow-list.
 *
 * Complements `no-gif`: `no-gif` is a convenient shorthand for
 * the single most common ban, while `allowed-formats` lets a workspace
 * state its full policy explicitly (e.g. "only Lottie and Rive — no
 * GIF, no APNG, no raw animated SVG") in one place instead of one
 * exclusion rule per unwanted format.
 *
 * Configuration accepts an array of format identifiers (severity implied
 * `"error"`) or an explicit `[severity, formats]` tuple, e.g.
 * `"allowed-formats": ["lottie", "dotlottie", "rive"]`.
 */
export const allowedFormatsRule: GovernanceRule<AllowedFormatsOptions> = {
  id: RULE_ID,
  description: 'Restricts which animated asset formats are permitted in the workspace.',

  parseOptions(raw) {
    return parseSeverityWithOptions<AllowedFormatsOptions>(raw, RULE_ID, (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return {
          valid: false,
          errors: [`expects a non-empty array of format names, got: ${describe(value)}`],
        };
      }

      const invalid = value.filter((entry) => !KNOWN_FORMATS.has(entry as AnimatedFormat));
      if (invalid.length > 0) {
        return {
          valid: false,
          errors: [
            `contains unrecognized format(s): ${invalid.map(describe).join(', ')}. ` +
              `Known formats: ${Array.from(KNOWN_FORMATS).join(', ')}.`,
          ],
        };
      }

      return { valid: true, options: { formats: new Set(value as AnimatedFormat[]) } };
    });
  },

  evaluate(context: RuleEvaluationContext<AllowedFormatsOptions>): readonly RuleViolation[] {
    const { formats } = context.options;

    return context.assets
      .filter((asset) => !formats.has(asset.format))
      .map((asset) => ({
        asset,
        message: `"${asset.name}" has format "${asset.format}", which is not in the allowed list: ${Array.from(formats).join(', ')}.`,
        details: { format: asset.format, allowedFormats: Array.from(formats) },
      }));
  },
};
