import type { GovernanceRule } from './types.js';

/**
 * Central catalog of governance rules known to a {@link RulesEngine}
 * instance, keyed by rule id.
 *
 * Mirrors the `ParserRegistry` pattern used for asset parsers
 * (`../../parsers/parser-registry.js`): a small, explicit map from a
 * stable key to a pluggable implementation. Unlike `ParserRegistry`,
 * this is **not** a process-wide singleton — a registry is constructed
 * per {@link RulesEngine} (via `createDefaultRuleRegistry()` or a
 * caller-supplied instance) so that tests, CLI runs, and IDE sessions
 * can each hold an independent set of rules without one contaminating
 * another. Reaching for a singleton here would let a test that
 * registers a fake rule leak into an unrelated test — the opposite of
 * the "rules are independent units" principle this module exists to
 * protect.
 *
 * @remarks
 * Registering a rule under an id that already exists overwrites the
 * previous entry. This is intentional: it lets a workspace or a later
 * initialization step override a built-in rule with a customized
 * implementation without needing a separate "replace" API.
 */
export class RuleRegistry {
  private readonly _rules = new Map<string, GovernanceRule<never>>();

  /**
   * Registers a rule, making it resolvable by {@link get} under its own
   * `id`. Accepts `GovernanceRule<any>` shape erased to `never` at the
   * storage boundary — callers retrieve rules through {@link get}, which
   * hands back a rule whose options type the caller is expected to
   * already know from context (the rule's own module).
   */
  register<TOptions>(rule: GovernanceRule<TOptions>): void {
    this._rules.set(rule.id, rule as unknown as GovernanceRule<never>);
  }

  /** Looks up a rule by id, or `undefined` if none is registered. */
  get(ruleId: string): GovernanceRule<never> | undefined {
    return this._rules.get(ruleId);
  }

  /** Whether a rule with the given id is registered. */
  has(ruleId: string): boolean {
    return this._rules.has(ruleId);
  }

  /** Every currently-registered rule, in registration order. */
  list(): readonly GovernanceRule<never>[] {
    return Array.from(this._rules.values());
  }
}
