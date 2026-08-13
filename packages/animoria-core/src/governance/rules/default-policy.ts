/**
 * What Animoria checks when nobody has told it what to check.
 *
 * ## Why this exists
 * The rules engine evaluated exactly `Object.entries(config.rulesConfig)`, and
 * `rulesConfig` came straight from `.animoriarc`. A workspace without one therefore
 * ran **zero rules**: no findings, no diagnostics, and a Health Score reported as
 * `unavailable` with the message "Add a `.animoriarc` to define a policy."
 *
 * That inverted the product. Configuration is an override layer — a way to raise a
 * severity, relax a threshold, or switch a rule off for a project that has decided
 * differently. It was never meant to be the thing that makes Animoria do anything at
 * all. A developer installing the extension on an existing repository got a working
 * index, a working scan, and a governance surface that said it had nothing to say.
 *
 * ## The merge rule
 * `DEFAULT_POLICY` is the floor. A loaded `.animoriarc` is applied *over* it, key by
 * key, so:
 *
 * - a config that mentions nothing keeps every default;
 * - a config that mentions one rule changes that rule and leaves the rest alone;
 * - `"rule": "off"` is how a rule is disabled, explicitly and visibly.
 *
 * Replacement was never expressible as an intention — "I configured one rule" and "I
 * disabled every rule I did not name" are very different statements, and the old
 * behaviour could not tell them apart because it only ever saw the second.
 *
 * ## Why these severities
 * They are the severities the built-in rules already describe themselves with, chosen
 * so a first run is *informative rather than alarming*: the two rules that assert
 * something is wrong with a file are warnings, and the two that report policy
 * decisions a project may legitimately have made differently are warnings too.
 * `no-duplicate-content` is an error because byte-identical assets are not a matter of
 * taste — one of them is waste, whichever the project keeps.
 */

/** A rule id mapped to the severity or option object it runs under by default. */
export type RulePolicy = Readonly<Record<string, unknown>>;

/**
 * The zero-configuration policy: every built-in rule, on.
 *
 * Keyed by the same ids `createDefaultRuleRegistry` registers, and validated against
 * that registry by `default-policy.test.ts` — a default naming a rule that does not
 * exist would surface as a config error on a workspace whose author wrote no config.
 */
export const DEFAULT_POLICY: RulePolicy = Object.freeze({
  /** Byte-identical assets. One of them is waste regardless of which is kept. */
  'no-duplicate-content': 'error',
  /** Assets nothing references. A warning: the scan is evidence, not proof. */
  'no-unreferenced-assets': 'warning',
  /** Two assets that differ only by directory — a naming hazard, not a defect. */
  'no-duplicate-names': 'warning',
  /**
   * Oversized assets, at 512 KB.
   *
   * A threshold has to be *some* number for the rule to run at all. 512 KB is large
   * enough that an ordinary Lottie never trips it and small enough to catch the
   * exported-at-the-wrong-settings case this rule exists for. A project with heavier
   * assets raises it in one line; the alternative — no default — is the rule never
   * running for anyone who has not already thought about it.
   */
  'max-file-size-kb': ['warning', 512],
  /**
   * GIF, off by default.
   *
   * "Prefer Lottie over GIF" is a real position and a project-specific one. Turning it
   * on for every workspace would greet a team that deliberately ships GIFs with a
   * screen full of findings about a decision they already made.
   */
  'no-gif': 'off',
  // `allowed-formats` is deliberately absent rather than listed as `'off'`.
  //
  // It has no meaningful default: the set of permitted formats *is* the policy, and
  // inventing one would either allow everything (pointless) or reject formats
  // Animoria itself supports (wrong). It also takes a required payload, so there is no
  // severity-only spelling of "off" for it — writing one produces a config error on a
  // workspace whose author wrote no config, which is the opposite of zero-config.
  //
  // Absence is the honest encoding: a rule with no default is not in the default
  // policy. `default-policy.test.ts` holds this to the registry so the omission stays
  // deliberate rather than becoming a gap nobody notices.
});

/**
 * The effective policy for a workspace: the defaults, with the loaded config over it.
 *
 * Shallow by design. A rule's options are that rule's own vocabulary, and merging
 * *inside* them would mean this function deciding that a partially-specified
 * `max-file-size` should inherit half of the default — a judgement belonging to the
 * rule's `parseOptions`, not to a merge helper.
 */
export function resolveRulePolicy(loaded: RulePolicy | undefined): RulePolicy {
  if (!loaded || Object.keys(loaded).length === 0) return { ...DEFAULT_POLICY };
  return { ...DEFAULT_POLICY, ...loaded };
}

/** Whether a policy came from defaults alone — what a host renders as "zero-config". */
export function isDefaultPolicy(loaded: RulePolicy | undefined): boolean {
  return !loaded || Object.keys(loaded).length === 0;
}
