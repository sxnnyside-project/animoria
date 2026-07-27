import type {
  IntegrationContext,
  IntegrationProvider,
  IntegrationResult,
} from '../IntegrationProvider.js';

/**
 * Integration provider for React projects using `lottie-react`.
 *
 * ## What this generates
 *
 * A complete, paste-ready React integration for Lottie and dotLottie assets:
 * - A named import of the animation JSON (handled by bundlers natively)
 * - The `lottie-react` package import
 * - A minimal, production-ready `<Lottie>` component usage
 * - Notes covering Next.js dynamic import (SSR safety) and dotLottie caveats
 *
 * ## Why only Lottie/dotLottie
 *
 * `lottie-react` wraps `lottie-web` which only supports Lottie JSON and
 * dotLottie archives. Rive has its own React package (`@rive-app/react-canvas`)
 * — a separate `RiveReactProvider` should be registered for that.
 *
 * ## Path convention
 *
 * The generated import uses `context.importPath` — a canonical, always
 * `./`/`../`-prefixed ES-module specifier computed by the caller (see
 * {@link ../path-resolution.js}). When `context.pathResolutionBasis` is
 * `"workspace-root"` (no active editor was known when the snippet was
 * generated), `IntegrationRegistry` appends a caveat to `notes` — this
 * provider does not need to duplicate that check.
 */
export class ReactProvider implements IntegrationProvider {
  readonly id = 'react';
  readonly label = 'React (lottie-react)';
  readonly supportedFormats = ['lottie', 'dotlottie'] as const;

  generate(context: IntegrationContext): IntegrationResult {
    const { asset, importPath } = context;
    const varName = toCamelCase(asset.stem);
    const isDotLottie = asset.format === 'dotlottie';

    const imports = [
      `import Lottie from 'lottie-react';`,
      `import ${varName} from '${importPath}';`,
    ].join('\n');

    const code = [
      '<Lottie',
      `  animationData={${varName}}`,
      '  loop={true}',
      '  autoplay={true}',
      '/>',
    ].join('\n');

    const notes = [
      'Next.js: use dynamic import to avoid SSR issues:',
      `  const Lottie = dynamic(() => import('lottie-react'), { ssr: false });`,
      isDotLottie
        ? 'dotLottie: lottie-react reads the first animation in the archive by default.'
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      providerId: this.id,
      label: this.label,
      code,
      imports,
      dependency: 'lottie-react',
      installHint: 'npm install lottie-react',
      notes,
      language: 'tsx',
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts a file stem to a lowerCamelCase JS identifier safe for import names. */
function toCamelCase(stem: string): string {
  return stem
    .replace(/[-_.\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/[^a-zA-Z0-9$_]/g, '');
}
