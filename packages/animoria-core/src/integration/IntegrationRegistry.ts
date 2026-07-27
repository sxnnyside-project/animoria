import type { AnimatedFormat } from '../types/asset.js';
import type {
  IntegrationContext,
  IntegrationProvider,
  IntegrationResult,
} from './IntegrationProvider.js';

// ─── IntegrationRegistry ──────────────────────────────────────────────────────

/**
 * Registry of all known {@link IntegrationProvider}s.
 *
 * ## Design intent
 *
 * The registry is the only place in the codebase that knows which providers
 * exist. Everything else (the Preview Panel UI, future CLI commands, future
 * Quick Pick integration) asks the registry — it never imports individual
 * providers directly. This means the set of supported frameworks is an
 * open-ended list, not a closed `switch` statement.
 *
 * ## Adding a provider
 *
 * ```ts
 * // In your bootstrap file (e.g. extension.ts):
 * integrationRegistry.register(new SwiftUIProvider());
 * ```
 *
 * That is the entire API surface for adding framework support.
 * No existing file needs to change.
 *
 * ## Provider ordering
 *
 * Providers are returned in registration order. The first registered provider
 * is the default selection in the UI. Register the most commonly used
 * providers first.
 *
 * ## Stub providers
 *
 * Providers that are not yet fully implemented can be registered with
 * `available: false` via {@link registerStub}. Stubs appear in the UI as
 * "Coming soon" entries — surfacing that a framework is on the roadmap
 * without generating incorrect code. This is deliberately better than
 * either hiding the framework entirely or producing low-confidence output.
 */
export class IntegrationRegistry {
  private readonly _providers: IntegrationProvider[] = [];
  private readonly _stubs: IntegrationStub[] = [];

  // ── Registration ───────────────────────────────────────────────────────────

  /**
   * Registers a fully-implemented integration provider.
   *
   * @param provider The provider to register.
   * @throws If a provider with the same `id` is already registered.
   */
  register(provider: IntegrationProvider): void {
    if (this._providers.some((p) => p.id === provider.id)) {
      throw new Error(`IntegrationRegistry: provider "${provider.id}" is already registered.`);
    }
    this._providers.push(provider);
  }

  /**
   * Registers a stub entry for a framework that is on the roadmap but not
   * yet fully implemented.
   *
   * Stubs are returned by {@link getStubs} and can be shown in the UI as
   * "Coming soon" — they never appear in {@link getProviders} or participate
   * in {@link generate}.
   *
   * @param stub Stub descriptor.
   */
  registerStub(stub: IntegrationStub): void {
    this._stubs.push(stub);
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  /**
   * Returns all fully-implemented providers that support the given format,
   * in registration order.
   *
   * @param format The animated format of the asset to integrate.
   */
  getProviders(format: AnimatedFormat): readonly IntegrationProvider[] {
    return this._providers.filter((p) => p.supportedFormats.includes(format));
  }

  /**
   * Returns all registered stubs.
   * Used by the UI to surface "Coming soon" entries.
   */
  getStubs(): readonly IntegrationStub[] {
    return [...this._stubs];
  }

  /**
   * Returns the provider with the given `id`, or `undefined` if not found.
   *
   * @param id The stable provider identifier.
   */
  getProvider(id: string): IntegrationProvider | undefined {
    return this._providers.find((p) => p.id === id);
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  /**
   * Generates integrations for the given context from all compatible providers.
   *
   * Returns one {@link IntegrationResult} per compatible provider, in
   * registration order. Providers incompatible with `context.asset.format`
   * are silently skipped.
   *
   * @param context The asset and workspace context to generate for.
   * @returns All compatible integration results, ordered by registration.
   */
  generate(context: IntegrationContext): readonly IntegrationResult[] {
    const compatible = this.getProviders(context.asset.format);
    return compatible.map((p) => this._withPathCaveat(p.generate(context), context));
  }

  /**
   * Generates a single integration from a specific provider.
   *
   * @param providerId The stable provider identifier.
   * @param context    The asset and workspace context.
   * @returns The integration result, or `null` if the provider does not exist
   *   or does not support the asset's format.
   */
  generateOne(providerId: string, context: IntegrationContext): IntegrationResult | null {
    const provider = this.getProvider(providerId);
    if (!provider) return null;
    if (!provider.supportedFormats.includes(context.asset.format)) return null;
    return this._withPathCaveat(provider.generate(context), context);
  }

  /**
   * Appends a caveat to `notes` when `context.pathResolutionBasis` is
   * `"workspace-root"` — i.e. no active editor was known, so `importPath`
   * is only correct if the snippet is pasted into a file at the workspace
   * root. Centralised here so every current and future provider inherits
   * this disclosure without duplicating the check itself.
   */
  private _withPathCaveat(
    result: IntegrationResult,
    context: IntegrationContext
  ): IntegrationResult {
    if (context.pathResolutionBasis !== 'workspace-root') return result;
    const caveat =
      'Import path assumed relative to the workspace root — no active file was known when ' +
      'this snippet was generated. Adjust the import path if pasting elsewhere.';
    return {
      ...result,
      notes: result.notes ? `${result.notes}\n\n${caveat}` : caveat,
    };
  }

  // ── Test isolation ─────────────────────────────────────────────────────────

  /**
   * Removes all registered providers and stubs. Intended for test isolation
   * (mirrors `ParserRegistry.clear()`) — the shared singleton export means
   * tests must reset state between runs rather than each constructing their
   * own instance.
   */
  clear(): void {
    this._providers.length = 0;
    this._stubs.length = 0;
  }
}

// ─── Stub descriptor ──────────────────────────────────────────────────────────

/**
 * Describes a framework that is on the roadmap but not yet implemented.
 *
 * Displayed in the UI as a "Coming soon" entry so developers know Animoria
 * is aware of the framework without being misled by low-confidence output.
 */
export interface IntegrationStub {
  /** Stable identifier matching the future provider's `id`. */
  readonly id: string;
  /** Human-readable label. */
  readonly label: string;
  /** Optional reason or ETA to surface in the tooltip. */
  readonly reason?: string;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * The global integration registry instance.
 *
 * Bootstrap providers by calling `integrationRegistry.register(...)` once
 * during extension activation. Query it anywhere via this export.
 */
export const integrationRegistry = new IntegrationRegistry();
