import { RuleRegistry } from '../rule-registry.js';
import { allowedFormatsRule } from './allowed-formats.rule.js';
import { maxFileSizeRule } from './max-file-size.rule.js';
import { noDuplicateNamesRule } from './no-duplicate-names.rule.js';
import { noGifRule } from './no-gif.rule.js';
import { noUnreferencedAssetsRule } from './no-unreferenced-assets.rule.js';

export { maxFileSizeRule } from './max-file-size.rule.js';
export type { MaxFileSizeOptions } from './max-file-size.rule.js';
export { noGifRule } from './no-gif.rule.js';
export { noDuplicateNamesRule } from './no-duplicate-names.rule.js';
export { noUnreferencedAssetsRule } from './no-unreferenced-assets.rule.js';
export { allowedFormatsRule } from './allowed-formats.rule.js';
export type { AllowedFormatsOptions } from './allowed-formats.rule.js';

/**
 * Builds a {@link RuleRegistry} pre-populated with every rule Animoria
 * ships out of the box.
 *
 * This is the one place that knows the full list of built-in rules —
 * everywhere else in the governance system (the engine, the config
 * loader, individual rules) is deliberately ignorant of it, so adding a
 * rule means adding one line here rather than touching evaluation logic.
 *
 * Called once by `RulesEngine`'s default constructor path. Tests and
 * embedding tools that want a clean slate (or want to register a
 * project-local rule alongside the built-ins) should call this and then
 * `.register()` further rules on the result, rather than constructing a
 * bare `RuleRegistry` and re-listing built-ins by hand.
 */
export function createDefaultRuleRegistry(): RuleRegistry {
  const registry = new RuleRegistry();
  registry.register(maxFileSizeRule);
  registry.register(noGifRule);
  registry.register(noDuplicateNamesRule);
  registry.register(noUnreferencedAssetsRule);
  registry.register(allowedFormatsRule);
  return registry;
}
