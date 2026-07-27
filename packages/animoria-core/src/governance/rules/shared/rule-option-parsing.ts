import { logDebug } from '../../../logging/logger.js';
import type { RuleOptionsParseResult, RuleSeverity } from '../types.js';

/**
 * Reusable parsing helpers for `.animoriarc` rule values.
 *
 * ## Why this exists
 * Every built-in rule accepts its configuration in one of two
 * ESLint-style shapes:
 *
 * - a bare severity string — `"error"`, `"warning"`, `"off"` — for rules
 *   that need no further options, or
 * - a `[severity, options]` tuple — `["error", 1024]` — for rules that
 *   do, with a bare-value shorthand (`1024`) that implies `"error"`.
 *
 * Without this module, every rule would re-implement "is this a valid
 * severity string" and "did the user provide a tuple or a bare value"
 * from scratch — five near-identical, easily-diverging copies of the
 * same ten lines. Centralizing it here means a new rule gets this
 * parsing for free and any future third shape (should one ever be
 * needed) only has to be taught to the rules that use it.
 */

const VALID_SEVERITIES: ReadonlySet<string> = new Set<RuleSeverity>(['error', 'warning', 'off']);

/**
 * Parses a bare severity string with no accompanying options — the
 * shape used by rules like `no-gif` that are either on or off.
 *
 * @param raw - The raw value found under the rule's key in `.animoriarc`.
 * @param ruleId - The rule's id, used only to produce a readable error.
 */
export function parseSeverityOnlyOption(
  raw: unknown,
  ruleId: string
): RuleOptionsParseResult<void> {
  if (!isSeverity(raw)) {
    return {
      valid: false,
      errors: [
        `"${ruleId}" expects a severity of "error", "warning", or "off", got: ${describe(raw)}`,
      ],
    };
  }
  return { valid: true, severity: raw, options: undefined };
}

/**
 * Parses a value that may be a bare option value (severity implied to be
 * `"error"`) or an explicit `[severity, options]` tuple — the shape used
 * by rules like `max-file-size-kb` and `allowed-formats`.
 *
 * A 2-element array is only treated as a `[severity, options]` tuple
 * when its first element is itself a valid severity string; otherwise
 * it is passed through to `parseValue` as a bare option value. This
 * disambiguates `allowed-formats: ["lottie", "rive"]` (a bare two-format
 * array) from `max-file-size-kb: ["warning", 1024]` (a genuine tuple)
 * without either rule needing to know about the other's shape.
 *
 * @param raw - The raw value found under the rule's key in `.animoriarc`.
 * @param ruleId - The rule's id, used only to produce readable errors.
 * @param parseValue - Validates and normalizes the option payload itself
 *   (the number, the array, ...), independent of the severity wrapper.
 */
export function parseSeverityWithOptions<TOptions>(
  raw: unknown,
  ruleId: string,
  parseValue: (
    value: unknown
  ) => { valid: true; options: TOptions } | { valid: false; errors: string[] }
): RuleOptionsParseResult<TOptions> {
  // A raw array value is ambiguous: it could be the bare option payload
  // itself (e.g. a list of allowed formats) or a `[severity, options]`
  // tuple. Only treat it as a tuple when the first element is actually a
  // severity string — otherwise a bare array option (whose own payload
  // happens to have exactly two entries) would be misread as a tuple.
  const looksLikeTuple = Array.isArray(raw) && raw.length === 2 && isSeverity(raw[0]);

  const severityCandidate: unknown = looksLikeTuple ? raw[0] : 'error';
  const valueCandidate: unknown = looksLikeTuple ? raw[1] : raw;

  if (!isSeverity(severityCandidate)) {
    return {
      valid: false,
      errors: [
        `"${ruleId}" expects a severity of "error", "warning", or "off" as the first tuple element, got: ${describe(severityCandidate)}`,
      ],
    };
  }

  const parsed = parseValue(valueCandidate);
  if (!parsed.valid) {
    return { valid: false, errors: parsed.errors.map((e) => `"${ruleId}": ${e}`) };
  }

  return { valid: true, severity: severityCandidate, options: parsed.options };
}

function isSeverity(value: unknown): value is RuleSeverity {
  return typeof value === 'string' && VALID_SEVERITIES.has(value);
}

/** Renders an arbitrary value for inclusion in a validation error message. */
export function describe(value: unknown): string {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch (err) {
    logDebug(
      'rule-option-parse',
      'describe',
      'Could not JSON-stringify a rule option value for an error message',
      {
        reason: 'value contains a circular reference or a BigInt',
        error: err,
        recovery: 'fell back to String() coercion',
      }
    );
    return String(value);
  }
}
