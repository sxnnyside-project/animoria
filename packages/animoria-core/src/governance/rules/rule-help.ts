/**
 * Where each built-in rule is documented.
 *
 * ## Why this is one place and not a string on each rule
 * Every diagnostic carries a `helpUri` so a CLI can print it and an IDE can turn a
 * rule id into a clickable link. If each client built that URL itself, the CLI and
 * the IDE would eventually disagree about where a rule is documented — the same
 * class of drift that produced three different Health Score formulas.
 *
 * Currently every rule points at the built-in rules reference, which exists and is
 * kept current. Per-rule anchors are a documentation-site concern, not a contract
 * one: when they exist, only this function changes.
 */
const RULES_REFERENCE =
  'https://github.com/sxnnyside-project/animoria/blob/main/docs/CONFIGURATION.md#built-in-rules';

export function helpUriForRule(_ruleId: string): string {
  return RULES_REFERENCE;
}
