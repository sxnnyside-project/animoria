import type { AnimoriaAsset } from '../../types/asset.js';
import type { ScanCoverage } from '../../types/scan-coverage.js';
import type { DuplicateGroup } from '../duplicates/types.js';

/**
 * Contracts shared by every governance rule and by the engine that runs them.
 *
 * ## Why this file exists
 * This module defines the *shape* every governance rule — naming
 * conventions, duration limits, required metadata, forbidden folders,
 * ownership, platform-specific policies, and whatever `.animoriarc`
 * declares today or in the future — must conform to, so that adding one
 * is "write a file that implements {@link GovernanceRule}, then register
 * it" rather than a change to a central switch statement.
 *
 * Nothing in this file talks to disk, YAML, or JSON. It is pure contract —
 * the configuration format is the {@link "../config/animoriarc-schema.js"}
 * concern, and turning a violation into a report the concern of
 * `rules-engine.ts`. Keeping them apart is what lets each be tested,
 * changed, and understood independently.
 */

/**
 * How strongly a rule violation should be treated.
 *
 * `'off'` is a first-class value, not merely "rule absent" — a workspace
 * may want to record that a rule was *considered* and deliberately
 * disabled, which is different from never having heard of it.
 */
export type RuleSeverity = 'error' | 'warning' | 'off';

/**
 * The subset of {@link RuleSeverity} that a violation can actually carry.
 * `'off'` never reaches a diagnostic — the engine skips evaluation
 * entirely for rules configured `'off'`.
 */
export type ActiveRuleSeverity = Exclude<RuleSeverity, 'off'>;

/**
 * Read-only signals a rule may consult beyond the asset list itself.
 *
 * Rules must stay synchronous and I/O-free (see {@link GovernanceRule}), so
 * any information that requires disk access, network calls, or another
 * subsystem's own computation (usage scanning, health scoring, ownership
 * lookup) is computed once by the caller and handed in here rather than
 * fetched by the rule.
 *
 * This is the engine's designated extension point for cross-cutting data:
 * a future rule needing a new kind of signal adds an optional field here
 * instead of widening {@link GovernanceRule.evaluate}'s parameter list.
 * A signal being absent must never be treated as an error by a rule that
 * depends on it — the rule should simply report nothing for that run
 * (see {@link RuleEvaluationContext}).
 */
export interface GovernanceSignals {
  /**
   * Number of source-code references found for an asset, keyed by the
   * asset's absolute path. Populated by a usage scan (see
   * `buildReferenceIndex`) — rules must not compute this themselves.
   * Absent when the caller did not run a usage scan.
   */
  readonly referenceCounts?: ReadonlyMap<string, number>;
  /**
   * What the usage scan that produced {@link referenceCounts} actually examined.
   *
   * Present whenever `referenceCounts` is. A rule that reports an *absence*
   * ("nothing references this") must attach this to its violations so the reader
   * can see which file types were never opened — see `../../types/scan-coverage.ts`
   * for why an absence without its coverage is not a finding a developer can act on.
   */
  readonly scanCoverage?: ScanCoverage;
  /**
   * Byte-identical asset groups, computed once per analysis by
   * `detectDuplicateGroups`. Absent when the caller ran no content hashing — in
   * which case `no-duplicate-content` declares itself skipped rather than reporting
   * that there are none.
   */
  readonly duplicateGroups?: readonly DuplicateGroup[];
}

/**
 * Everything a rule's {@link GovernanceRule.evaluate} needs to do its job.
 *
 * @typeParam TOptions - The rule's own options type, already parsed and
 *   validated by {@link GovernanceRule.parseOptions} before evaluation
 *   begins. A rule's `evaluate` never sees raw, unvalidated user input.
 */
export interface RuleEvaluationContext<TOptions> {
  /** Absolute path to the workspace root being evaluated. */
  readonly workspacePath: string;
  /**
   * Every parsed asset in the workspace. Rules that need to reason across
   * assets (duplicate names, forbidden folders) receive the full set
   * rather than being invoked once per asset — this is what lets a rule
   * express "no two assets share a name" as naturally as "this asset is
   * a GIF".
   */
  readonly assets: readonly AnimoriaAsset[];
  /** This rule's own validated options, as produced by `parseOptions`. */
  readonly options: TOptions;
  /** Optional cross-cutting data — see {@link GovernanceSignals}. */
  readonly signals: GovernanceSignals;
}

/**
 * A single instance of a rule being broken by a specific asset.
 *
 * Deliberately does **not** carry `ruleId` or `severity` — those are
 * supplied by the engine when it turns a violation into a
 * `RuleDiagnostic` (see `../rules-engine.js`), because the same violation
 * produced by the same rule can be reported at different severities
 * depending on workspace configuration. A rule reports *what* is wrong;
 * the engine (driven by user configuration) decides *how loudly*.
 */
/**
 * Why a rule declined to run.
 *
 * ## Why "declined" needs to be a first-class outcome
 * A rule that cannot do its job safely must stay silent rather than guess — but the
 * report previously had no way to *say* it had stayed silent. `no-unreferenced-assets`
 * returns nothing when reference evidence is unavailable, and the engine recorded that
 * as a successful evaluation with zero violations. A CI gate consuming that report was
 * told the rule ran and the workspace was clean, when in fact the rule had never
 * looked. Distinguishing "checked, clean" from "never checked" is the entire point of
 * this type.
 */
export interface RuleSkipReason {
  /** Stable machine-readable code, safe to branch on. */
  readonly code: 'missing-signal' | 'unsupported-workspace' | 'no-applicable-assets';
  /** Human-readable explanation, safe to render standalone in a CLI or a tooltip. */
  readonly message: string;
}

/**
 * The result of asking a rule to evaluate a workspace.
 *
 * A discriminated union rather than a bare array, so "found nothing" and "did not
 * look" are structurally different values that no consumer can conflate by accident.
 */
export type RuleOutcome =
  | { readonly status: 'evaluated'; readonly violations: readonly RuleViolation[] }
  | { readonly status: 'skipped'; readonly reason: RuleSkipReason };

/** Convenience constructor for the common "here are my findings" outcome. */
export function evaluated(violations: readonly RuleViolation[]): RuleOutcome {
  return { status: 'evaluated', violations };
}

/** Convenience constructor for "I could not run, and here is why". */
export function skipped(code: RuleSkipReason['code'], message: string): RuleOutcome {
  return { status: 'skipped', reason: { code, message } };
}

/**
 * What kind of observation a finding rests on.
 *
 * Lets a consumer reason about a finding's basis without reading its prose: a
 * `content-hash` finding is a byte-level fact, an `absence` finding is the result of
 * a search that may have been incomplete, and the two deserve very different
 * treatment when proposing an irreversible action.
 */
export type EvidenceKind = 'reference' | 'absence' | 'content-hash' | 'file-metadata' | 'config';

/** A concrete place supporting a finding — a line that references an asset, a sibling duplicate. */
export interface EvidenceLocation {
  readonly file: string;
  /** 1-based, when the evidence is line-level. */
  readonly line?: number;
  /** The matching text, trimmed. */
  readonly excerpt?: string;
}

/**
 * The observation behind a diagnostic, in machine-readable form.
 *
 * ## Why a diagnostic needs this beyond its message
 * "hero-v2.json has no detected references in source code" is a conclusion. A client
 * deciding whether to offer a one-click deletion, and a developer deciding whether
 * to accept it, both need the *basis*: what was searched, what was found, and how
 * far the search reached. Encoding that in the message would force every consumer to
 * parse prose — and would make the answer untranslatable and unstable.
 */
export interface DiagnosticEvidence {
  readonly kind: EvidenceKind;
  /** One-line statement of the observation itself, safe to render standalone. */
  readonly summary: string;
  /** Concrete supporting locations. Empty for an `absence` finding, by definition. */
  readonly locations?: readonly EvidenceLocation[];
  /** Rule-specific specifics, e.g. `{ limitKb, actualKb }` or `{ conflictingPaths }`. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * How strongly the product stands behind a finding.
 *
 * **Must always be derived from evidence, never asserted.** A cleanup flow that
 * offers to delete a file on the strength of a `'certain'` label that was written as
 * a literal is offering a guarantee nobody computed.
 */
export type Confidence = 'certain' | 'high' | 'moderate' | 'low';

/**
 * The confidence implied by an observation that required no search.
 *
 * A file's format, its size on disk, and whether two stems collide are properties
 * Animoria reads directly; no amount of unscanned source could contradict them. Such
 * findings are therefore `'certain'` *because of what the evidence is*, and naming
 * that here keeps it distinguishable from the asserted literal it replaces — a
 * `confidence: 'high'` stamped on absence findings that no search had earned.
 *
 * Findings that rest on a search must never use this. They derive their confidence
 * from the coverage of that search — see `no-unreferenced-assets.rule.ts`.
 */
export const DIRECT_OBSERVATION_CONFIDENCE: Confidence = 'certain';

/**
 * What the developer can do about a finding.
 *
 * Only `summary` for now: machine-actionable quick fixes need a host that can offer
 * them, and no client can until the native diagnostic surfaces land. Adding an
 * `actions` array before anything consumes it would be contract bloat.
 */
export interface Remediation {
  /** Imperative and specific: "Delete it, reference it, or add it to .animoriaignore." */
  readonly summary: string;
}

export interface RuleViolation {
  /** The asset that fails the rule. */
  readonly asset: AnimoriaAsset;
  /**
   * Human-readable explanation, written to stand alone in a CLI line, a
   * sidebar tooltip, or a hover card without further context.
   */
  readonly message: string;
  /**
   * Structured, machine-readable detail about the violation (e.g.
   * `{ limitKb: 1024, actualKb: 2048 }`). Kept separate from `message` so
   * future consumers (IDE quick-fixes, Health Score weighting, CI
   * annotations) can act on the numbers without parsing prose.
   */
  readonly details?: Readonly<Record<string, unknown>>;
  /** The observation this violation rests on — see {@link DiagnosticEvidence}. */
  readonly evidence: DiagnosticEvidence;
  /** How strongly the rule stands behind it. Derived, never asserted. */
  readonly confidence: Confidence;
  /** What the developer can do about it. */
  readonly remediation: Remediation;
  /**
   * The reference scan behind this finding, when it has one.
   *
   * Present on any violation derived from searching source files — most importantly
   * an *absence* finding, where the reach of the search is the whole basis for the
   * claim. Carried as structured data rather than folded into {@link details}, so no
   * consumer has to know which key a particular rule happened to use.
   */
  readonly coverage?: ScanCoverage;
}

/**
 * The result of validating and normalizing a rule's raw `.animoriarc`
 * configuration value.
 *
 * Modeled as a discriminated union rather than a thrown exception because
 * invalid configuration is an expected, everyday occurrence (typos,
 * outdated docs, hand-edited files) — not a programmer error. Every
 * caller is forced by the type system to handle both branches instead of
 * discovering a missing try/catch in production.
 */
export type RuleOptionsParseResult<TOptions> =
  | {
      readonly valid: true;
      /**
       * The requested severity, including `'off'`. Parsing does not
       * decide whether the rule runs — that is the engine's job (it
       * skips `evaluate` for `'off'` and reports every other severity).
       * Keeping `'off'` representable here lets an explicitly-disabled
       * rule be distinguished from one absent from configuration.
       */
      readonly severity: RuleSeverity;
      readonly options: TOptions;
    }
  | {
      readonly valid: false;
      /** One or more human-readable reasons the raw value was rejected. */
      readonly errors: readonly string[];
    };

/**
 * The contract every governance rule — built-in or user-defined — must
 * implement.
 *
 * ## Lifecycle
 * For a single engine run: `parseOptions` is called once per rule with
 * the raw value found under that rule's key in `.animoriarc`. If parsing
 * yields `severity: 'off'` or fails validation, `evaluate` is never
 * called. Otherwise `evaluate` is called exactly once with the full
 * asset list and the parsed options.
 *
 * ## Invariants a rule must uphold
 * - **Synchronous.** No `async`, no promises, no timers. A rule that
 *   needs data requiring I/O must have that data supplied via
 *   {@link GovernanceSignals} by the caller, not fetch it itself.
 * - **Side-effect-free.** `evaluate` must not write files, mutate the
 *   `assets` it was given, or depend on anything other than its
 *   parameters. This is what makes rule order-independent (see below)
 *   and safe to re-run on every keystroke or file-watcher event.
 * - **Order-independent.** Because rules cannot see each other's output
 *   or mutate shared state, the set of diagnostics produced does not
 *   depend on the order rules run in. If a future rule genuinely needs
 *   to run after another (e.g. it consumes another rule's output), that
 *   dependency must be made explicit via a new {@link GovernanceSignals}
 *   field — never via registration order.
 *
 * ## Implementing a new rule
 * 1. Pick a stable, kebab-case `id` (this is the key users write in
 *    `.animoriarc` — treat it as public API once shipped).
 * 2. Implement `parseOptions` to accept whatever shape makes sense for
 *    your rule's configuration value (a bare string, a bare number, an
 *    array, an ESLint-style `[severity, options]` tuple — see
 *    `rules/shared/rule-option-parsing.js` for reusable helpers) and
 *    return either `{ valid: true, severity, options }` or
 *    `{ valid: false, errors }`.
 * 3. Implement `evaluate` to inspect `context.assets` (and, if needed,
 *    `context.signals`) and return one {@link RuleViolation} per asset
 *    that fails the rule.
 * 4. Register an instance in
 *    `rules/builtins/index.ts` (`createDefaultRuleRegistry`), or, for a
 *    project-local rule, register it directly against a `RuleRegistry`
 *    instance before constructing `RulesEngine`.
 *
 * @typeParam TOptions - The shape of this rule's validated configuration.
 *   Use `void` for rules that take no options beyond a severity.
 */
export interface GovernanceRule<TOptions = void> {
  /** Stable identifier and `.animoriarc` key, e.g. `"no-gif"`. */
  readonly id: string;
  /** One-sentence, user-facing description of what the rule enforces. */
  readonly description: string;
  /**
   * Where a developer can read about this rule.
   *
   * Stamped onto every diagnostic the rule produces, so a CLI can print it and an
   * IDE can turn a rule id into a clickable link without maintaining its own
   * rule-to-documentation table — which is how the CLI's and the IDE's idea of what
   * a rule means would drift apart.
   */
  readonly helpUri: string;
  /**
   * Validates and normalizes the raw value found under this rule's key
   * in `.animoriarc`. Must never throw — reject invalid input by
   * returning `{ valid: false, errors }`.
   */
  parseOptions(raw: unknown): RuleOptionsParseResult<TOptions>;
  /**
   * Evaluates this rule against the current workspace. Called only when
   * `parseOptions` succeeded with a severity other than `'off'`.
   *
   * @returns {@link evaluated} with one violation per offending asset (an empty
   *   list meaning "looked, found nothing"), or {@link skipped} when a signal the
   *   rule depends on was not supplied. A rule must never return `evaluated([])`
   *   to mean "could not check" — that is precisely the ambiguity
   *   {@link RuleOutcome} exists to remove.
   */
  evaluate(context: RuleEvaluationContext<TOptions>): RuleOutcome;
}
