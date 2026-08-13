export type {
  IntegrationContext,
  IntegrationResult,
  IntegrationProvider,
} from './IntegrationProvider.js';
export { IntegrationRegistry, integrationRegistry } from './IntegrationRegistry.js';
export { registerBuiltInProviders } from './builtins.js';
import { registerBuiltInProviders } from './builtins.js';
import { integrationRegistry } from './IntegrationRegistry.js';
export type { IntegrationStub } from './IntegrationRegistry.js';
export { ReactProvider } from './providers/ReactProvider.js';
export { VueProvider } from './providers/VueProvider.js';
export { FlutterProvider } from './providers/FlutterProvider.js';
export { SwiftProvider } from './providers/SwiftProvider.js';
export { KotlinProvider } from './providers/KotlinProvider.js';
export {
  toImportSpecifier,
  computeImportPath,
  computeWorkspaceRelativePath,
} from './path-resolution.js';

/*
 * The bootstrap that was documented and never performed.
 *
 * A module-level call, so every consumer of `integrationRegistry` — the VS Code
 * command, the daemon's `generateSnippet`, the CLI — sees the same providers without
 * each having to remember. ES modules evaluate once, so this cannot double-register,
 * and `registerBuiltInProviders` skips anything already present in any case.
 */
registerBuiltInProviders(integrationRegistry);
