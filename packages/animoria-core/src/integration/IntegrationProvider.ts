import type { AnimatedFormat, AnimoriaAsset } from '../types/asset.js';

// ─── IntegrationContext ───────────────────────────────────────────────────────

/**
 * Everything a provider needs to know about the asset being integrated and
 * the workspace it lives in.
 *
 * ## Why two path fields, not one
 *
 * Different frameworks resolve asset paths against different bases:
 * JS/TS/Vue module imports resolve against the *file the snippet is pasted
 * into*; Flutter's `pubspec.yaml`/`Lottie.asset()` always resolve against the
 * *workspace root*, regardless of which file calls it. A single ambiguous
 * `relativePath` field could not serve both correctly, so the two are
 * computed and named separately by {@link ../path-resolution.js} — providers
 * pick whichever their framework actually needs instead of guessing.
 *
 * ## Why pathResolutionBasis exists
 *
 * Animoria's Snippet Generation flow copies code to the clipboard; it does
 * not know in advance which file the developer will paste into. When a real
 * "last active editor" is known, `importPath` is resolved against it and
 * `pathResolutionBasis` is `"active-editor"`. When none is known (or the
 * editor is not a real file), `importPath` falls back to being resolved
 * against the workspace root and `pathResolutionBasis` is `"workspace-root"`
 * — callers should treat that case as an approximation, not a guarantee, and
 * `IntegrationRegistry` surfaces this honestly via a caveat in `notes`
 * rather than silently presenting a possibly-wrong import as certain.
 */
export interface IntegrationContext {
  /** The asset to integrate. */
  readonly asset: AnimoriaAsset;

  /**
   * A valid ES-module relative import specifier (forward slashes, always
   * `./`- or `../`-prefixed) for the asset, resolved against
   * `pathResolutionBasis`.
   *
   * Examples:
   * - `"../assets/hero.lottie"`
   * - `"./animations/success.json"`
   */
  readonly importPath: string;

  /**
   * Workspace-root-relative path (forward slashes, never `./`-prefixed).
   * This is the convention Flutter and similar root-relative asset systems
   * expect, independent of which file references it.
   *
   * Example: `"assets/animations/loading.lottie"`
   */
  readonly workspaceRelativePath: string;

  /**
   * What `importPath` was actually resolved against.
   * - `"active-editor"` — the last known real, on-disk text editor. Correct
   *   as long as the developer pastes into that same file.
   * - `"workspace-root"` — no active editor was known; `importPath` is the
   *   workspace-relative path with a `./` prefix, which is only valid if the
   *   snippet is pasted into a file at the workspace root.
   */
  readonly pathResolutionBasis: 'active-editor' | 'workspace-root';

  /** Absolute path to the workspace root. */
  readonly workspacePath: string;
}

// ─── IntegrationResult ────────────────────────────────────────────────────────

/**
 * A complete, multi-section integration produced by an {@link IntegrationProvider}.
 *
 * ## Why sections matter
 *
 * A naive snippet generator produces one string: `<Lottie ... />`. But a
 * developer integrating an asset for the first time needs more than that:
 * - Which package to install
 * - Which import to add at the top of the file
 * - What the actual usage looks like
 * - Any caveats (SSR, bundle size, lazy-loading)
 *
 * By separating concerns into named sections, the UI can present each piece
 * in context and give the developer a "Copy Code" (just the usage) vs
 * "Copy All" (complete, paste-ready integration) option — without any
 * UI-specific logic leaking into the provider.
 *
 * ## Extensibility
 *
 * New sections can be added to this interface as needed (e.g. `testFixture`,
 * `storybook`, `i18nNote`) without breaking existing providers — they simply
 * leave the new fields absent.
 */
export interface IntegrationResult {
  /**
   * Stable identifier of the provider that generated this result.
   * Matches {@link IntegrationProvider.id}.
   */
  readonly providerId: string;

  /**
   * Human-readable label for display in tabs and menus, e.g.
   * `"React (lottie-react)"` or `"Flutter (lottie)"`.
   */
  readonly label: string;

  /**
   * The primary usage code — a component, a function call, or a widget.
   * This is what developers typically want to paste into their source file.
   *
   * Examples:
   * - `"<Lottie animationData={heroAnimation} loop={true} />"` (React)
   * - `"Lottie.asset('assets/hero.json')"` (Flutter)
   */
  readonly code: string;

  /**
   * Import statement(s) the developer must add at the top of their file.
   * Absent when no import is required (e.g. asset-only references).
   */
  readonly imports?: string;

  /**
   * Package name that must be installed, for display only.
   * Animoria never runs package managers on the developer's behalf.
   * Example: `"lottie-react"`.
   */
  readonly dependency?: string;

  /**
   * The exact install command for the dependency, shown as a copy-able hint.
   * Example: `"npm install lottie-react"`.
   */
  readonly installHint?: string;

  /**
   * Free-text contextual notes — caveats, configuration tips, or links.
   * Displayed in a muted secondary section, not part of the copied code.
   */
  readonly notes?: string;

  /**
   * Language identifier for syntax highlighting of the `code` section.
   * Examples: `"tsx"`, `"vue"`, `"dart"`, `"swift"`, `"kotlin"`.
   */
  readonly language: string;
}

// ─── IntegrationProvider ──────────────────────────────────────────────────────

/**
 * The contract every framework integration provider must implement.
 *
 * ## Design intent
 *
 * Each provider is a self-contained, independently testable unit that knows
 * everything about one framework's integration pattern and nothing about any
 * other framework. The registry dispatches to providers; providers never know
 * about each other.
 *
 * ## Adding a new provider
 *
 * 1. Create a new file in `providers/` implementing this interface.
 * 2. Call `integrationRegistry.register(new MyProvider())` in the file
 *    where you bootstrap the extension.
 * 3. Done — no existing file needs to change.
 *
 * ## Supported formats
 *
 * Providers declare which animated formats they support. `generate()` is
 * called only for supported formats; the registry enforces this contract so
 * individual providers do not need defensive format-checking internally.
 *
 * If a provider gains support for an additional format in a future release,
 * simply add it to `supportedFormats` — the registry will start dispatching
 * to it automatically.
 */
export interface IntegrationProvider {
  /**
   * Stable, lowercase identifier.
   * Used to associate UI state with specific providers.
   * Examples: `"react"`, `"vue"`, `"flutter"`, `"swift"`.
   */
  readonly id: string;

  /**
   * Human-readable name shown in the UI.
   * Example: `"React (lottie-react)"`.
   */
  readonly label: string;

  /**
   * The animated formats this provider can generate integrations for.
   * The registry will not call `generate()` for unsupported formats.
   */
  readonly supportedFormats: readonly AnimatedFormat[];

  /**
   * Generates a complete integration for the given context.
   *
   * Implementations must be:
   * - **Deterministic** — same context → same result.
   * - **Pure** — no I/O, no side effects.
   * - **Fast** — called synchronously during user interaction.
   *
   * @param context Asset and workspace information.
   * @returns A complete {@link IntegrationResult}.
   */
  generate(context: IntegrationContext): IntegrationResult;
}
