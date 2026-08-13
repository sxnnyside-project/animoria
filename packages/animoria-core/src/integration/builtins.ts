import type { IntegrationRegistry } from './IntegrationRegistry.js';
import { FlutterProvider } from './providers/FlutterProvider.js';
import { KotlinProvider } from './providers/KotlinProvider.js';
import { ReactProvider } from './providers/ReactProvider.js';
import { SwiftProvider } from './providers/SwiftProvider.js';
import { VueProvider } from './providers/VueProvider.js';

/**
 * Every framework Animoria can generate an integration snippet for.
 *
 * ## Why this exists
 * `IntegrationRegistry`'s own documentation said "bootstrap providers by calling
 * `integrationRegistry.register(...)` once during extension activation". **Nothing
 * ever called it.** Five providers — React, Vue, Flutter, SwiftUI and Jetpack
 * Compose — sat in the tree fully implemented while `integrationRegistry.generate()`
 * returned an empty array in every client, so "Generate Code Snippet" reported that no
 * generator supported the asset and Snippet Generation was, in effect, deleted.
 *
 * An instruction in a doc comment is not a wiring. Registration belongs in code that
 * runs, in Core, once — not in each host's activation path, where two hosts would
 * inevitably register different sets and the same asset would offer React in one IDE
 * and not the other.
 *
 * ## Why registration is idempotent here rather than throwing
 * `register` refuses a duplicate id, which is right for a caller adding a provider by
 * hand and wrong for a bootstrap a test may run twice, or run against a registry the
 * module-level call already populated. Registering a duplicate is a no-op here.
 */
export function registerBuiltInProviders(registry: IntegrationRegistry): IntegrationRegistry {
  for (const provider of [
    new ReactProvider(),
    new VueProvider(),
    new SwiftProvider(),
    new KotlinProvider(),
    new FlutterProvider(),
  ]) {
    try {
      registry.register(provider);
    } catch {
      // Already registered. The only way `register` throws is a duplicate id, and a
      // bootstrap finding its own work already done is success, not an error.
    }
  }
  return registry;
}
