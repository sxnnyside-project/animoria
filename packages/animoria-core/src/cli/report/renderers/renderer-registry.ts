import { jsonRenderer } from './json-renderer.js';
import { markdownRenderer } from './markdown-renderer.js';
import type { ReportRenderer } from './report-renderer.js';
import { terminalRenderer } from './terminal-renderer.js';

/**
 * Catalog of {@link ReportRenderer}s available to `animoria check`,
 * keyed by their `--format` name.
 *
 * Mirrors the `RuleRegistry` / `ParserRegistry` pattern used elsewhere
 * in Animoria: a small, explicit map from a stable string key to a
 * pluggable implementation, constructed per use rather than as a
 * process-wide singleton so tests (and, eventually, a project-local
 * custom renderer) can register against an isolated instance without
 * affecting anything else.
 */
export class RendererRegistry {
  private readonly _renderers = new Map<string, ReportRenderer>();

  register(renderer: ReportRenderer): void {
    this._renderers.set(renderer.format, renderer);
  }

  get(format: string): ReportRenderer | undefined {
    return this._renderers.get(format);
  }

  /** Every registered format name, e.g. for a "did you mean?" usage message. */
  formats(): readonly string[] {
    return Array.from(this._renderers.keys());
  }
}

/**
 * Builds a {@link RendererRegistry} pre-populated with every output
 * format Animoria ships out of the box.
 *
 * This is the one place that knows the full list of built-in renderers.
 * Adding a new format (GitHub annotations, SARIF, GitLab's code quality
 * report, ...) means writing one new file implementing
 * {@link ReportRenderer} and adding one line here — never touching
 * `check-command.js`, `build-report.js`, or any existing renderer.
 */
export function createDefaultRendererRegistry(): RendererRegistry {
  const registry = new RendererRegistry();
  registry.register(terminalRenderer);
  registry.register(markdownRenderer);
  registry.register(jsonRenderer);
  return registry;
}
