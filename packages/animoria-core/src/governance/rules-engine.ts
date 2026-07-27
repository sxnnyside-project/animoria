import { performance } from 'node:perf_hooks';
import type { AnimoriaAsset } from '../types/asset.js';
import { createDefaultRuleRegistry } from './rules/builtins/index.js';
import type { RuleRegistry } from './rules/rule-registry.js';
import type { ActiveRuleSeverity, GovernanceSignals } from './rules/types.js';

export type {
  GovernanceRule,
  RuleViolation,
  RuleEvaluationContext,
  RuleOptionsParseResult,
  RuleSeverity,
  ActiveRuleSeverity,
  GovernanceSignals,
} from './rules/types.js';
export { RuleRegistry } from './rules/rule-registry.js';
export { createDefaultRuleRegistry } from './rules/builtins/index.js';

/**
 * A single, fully-resolved rule finding, ready for any presentation
 * surface to consume.
 *
 * Deliberately structured rather than a formatted string: a sidebar
 * badge, a Health Score deduction, a CLI table row, a CI annotation, and
 * a future hover card all need different *renderings* of the same
 * finding, and none of them should have to parse `message` to get at
 * `asset` or `severity`. `message` exists purely as the one
 * human-readable rendering every surface can fall back to.
 */
export interface RuleDiagnostic {
  /** The id of the rule that produced this diagnostic, e.g. `"no-gif"`. */
  readonly ruleId: string;
  /** Resolved severity for this run — never `'off'` (off rules don't evaluate). */
  readonly severity: ActiveRuleSeverity;
  /** The asset this diagnostic concerns. */
  readonly asset: AnimoriaAsset;
  /** Human-readable explanation, safe to display standalone. */
  readonly message: string;
  /** Structured detail specific to the rule, e.g. `{ limitKb, actualKb }`. */
  readonly details?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * A `.animoriarc` entry that could not be turned into a running rule.
 *
 * Kept separate from {@link RuleDiagnostic}: a `RuleDiagnostic` is a
 * statement about an *asset* ("this file is too big"); a
 * `RuleConfigError` is a statement about the *configuration itself*
 * ("this rule's value is malformed" or "no such rule exists"). Merging
 * the two would force every consumer to branch on "is this actually
 * about an asset" before it could render either one.
 */
export interface RuleConfigError {
  /** The rule id as written in `.animoriarc`, even if unrecognized. */
  readonly ruleId: string;
  /** One or more human-readable reasons this entry could not be used. */
  readonly errors: readonly string[];
}

/**
 * The complete, structured result of one {@link RulesEngine.run} call.
 */
export interface RuleEngineReport {
  /** Every violation found, across all active rules. */
  readonly diagnostics: readonly RuleDiagnostic[];
  /** Configuration entries that referenced an unknown rule or failed validation. */
  readonly configErrors: readonly RuleConfigError[];
  /** Ids of rules that actually ran (excludes unknown, invalid, and `'off'` entries). */
  readonly evaluatedRuleIds: readonly string[];
  /** Wall-clock duration of the run, in milliseconds. */
  readonly durationMs: number;
}

/**
 * Configuration for constructing a {@link RulesEngine}.
 */
export interface RulesEngineConfig {
  /** Absolute path to the workspace root being evaluated. */
  readonly workspacePath: string;
  /** Every parsed asset in the workspace to evaluate rules against. */
  readonly assets: readonly AnimoriaAsset[];
  /**
   * The `rules` section of a loaded `.animoriarc` — a plain map from
   * rule id to that rule's raw, not-yet-validated configuration value.
   * Produced by `ConfigLoader` (`./config/config-loader.js`); the engine
   * accepts it as a plain object rather than importing the config
   * loader's own types, keeping "how configuration got here" decoupled
   * from "how configuration is applied".
   */
  readonly rulesConfig: Readonly<Record<string, unknown>>;
  /** Optional cross-cutting data some rules consult — see {@link GovernanceSignals}. */
  readonly signals?: GovernanceSignals;
  /**
   * Which rules are available to run. Defaults to
   * {@link createDefaultRuleRegistry}'s built-in set. Pass a custom
   * registry to add project-local rules or to test a rule in isolation.
   */
  readonly registry?: RuleRegistry;
}

/**
 * Runs a workspace's configured governance rules against its assets and
 * produces a structured report.
 *
 * ## Role in the architecture
 * `RulesEngine` is the orchestration layer between "rules exist"
 * (`rules/`) and "a user asked for specific rules at specific
 * severities" (`.animoriarc`, loaded by `ConfigLoader`). It owns exactly
 * three responsibilities, and no others:
 *
 * 1. Resolve each configured rule id against the registry.
 * 2. Ask the rule to validate its own configuration value.
 * 3. Run the rule (if active) and stamp its violations with the rule id
 *    and resolved severity to produce {@link RuleDiagnostic}s.
 *
 * It does not know how `.animoriarc` is structured, what YAML or JSON
 * look like, or what any individual rule's option shape is — those stay
 * in `config/` and in each rule's own module, respectively. This is the
 * "configuration loading / rule registry / rule execution / diagnostics"
 * separation the governance architecture is built around.
 *
 * ## Determinism
 * For a fixed `assets` array, `rulesConfig`, and `signals`, `run()`
 * always produces the same report. Rules are required to be pure and
 * synchronous (see `GovernanceRule` in `rules/types.js`), so `run()`
 * itself is synchronous — there is no I/O left to do by the time a
 * `RulesEngine` is constructed. This makes it cheap enough to invoke on
 * every file-watcher event (see the reactive `WorkspaceIndexer`) without
 * special debouncing logic in the engine itself.
 *
 * ## Never throws
 * A rule id that doesn't exist, or a rule value that fails validation,
 * is recorded in {@link RuleEngineReport.configErrors} — it never
 * aborts the run or throws. One malformed entry in `.animoriarc` must
 * not prevent every other configured rule from still being enforced.
 */
export class RulesEngine {
  private readonly _config: RulesEngineConfig;
  private readonly _registry: RuleRegistry;

  constructor(config: RulesEngineConfig) {
    this._config = config;
    this._registry = config.registry ?? createDefaultRuleRegistry();
  }

  /**
   * Evaluates every entry in `rulesConfig` and returns the aggregated
   * report. Safe to call multiple times; each call is independent.
   */
  run(): RuleEngineReport {
    const start = performance.now();

    const diagnostics: RuleDiagnostic[] = [];
    const configErrors: RuleConfigError[] = [];
    const evaluatedRuleIds: string[] = [];

    for (const [ruleId, rawValue] of Object.entries(this._config.rulesConfig)) {
      const rule = this._registry.get(ruleId);
      if (!rule) {
        configErrors.push({ ruleId, errors: [`No rule is registered with id "${ruleId}".`] });
        continue;
      }

      const parsed = rule.parseOptions(rawValue);
      if (!parsed.valid) {
        configErrors.push({ ruleId, errors: parsed.errors });
        continue;
      }

      if (parsed.severity === 'off') continue;

      const violations = rule.evaluate({
        workspacePath: this._config.workspacePath,
        assets: this._config.assets,
        options: parsed.options,
        signals: this._config.signals ?? {},
      });

      evaluatedRuleIds.push(ruleId);
      for (const violation of violations) {
        diagnostics.push({
          ruleId,
          severity: parsed.severity,
          asset: violation.asset,
          message: violation.message,
          details: violation.details,
        });
      }
    }

    return {
      diagnostics,
      configErrors,
      evaluatedRuleIds,
      durationMs: performance.now() - start,
    };
  }
}
