import type {
  IntegrationContext,
  IntegrationProvider,
  IntegrationResult,
} from '../IntegrationProvider.js';

/**
 * Integration provider for iOS projects using `lottie-ios`, targeting the
 * modern SwiftUI wrapper (`LottieView`) rather than the legacy
 * `LottieAnimationView` UIKit type directly.
 *
 * ## What this generates
 *
 * A complete, paste-ready SwiftUI integration:
 * - The `import Lottie` statement
 * - A `LottieView(animation:)` usage with playback and looping configured
 *   via the modern `.playing()`/`.looping()` view modifiers (lottie-ios 4.x)
 * - Notes covering bundle placement, the UIKit equivalent for
 *   `UIViewController`-based screens, and dotLottie support
 *
 * ## Path convention
 *
 * Unlike React/Vue/Flutter, iOS does not resolve animation assets through a
 * file-system import — the asset is added to the Xcode project (typically
 * an Asset Catalog or a plain bundle resource) and referenced by name only.
 * This provider therefore uses `asset.stem` in the generated code, and
 * surfaces `context.workspaceRelativePath` in `notes` purely as a pointer
 * to where the source file currently lives, for the developer to drag into
 * Xcode — not as something the generated code itself consumes.
 *
 * ## dotLottie
 *
 * `lottie-ios` 4.3+ reads `.lottie` archives directly through the same
 * `LottieView(animation: .named(...))` API used for plain JSON — no
 * separate code path is needed, only a note about the minimum version.
 */
export class SwiftProvider implements IntegrationProvider {
  readonly id = 'swift';
  readonly label = 'SwiftUI (lottie-ios)';
  readonly supportedFormats = ['lottie', 'dotlottie'] as const;

  generate(context: IntegrationContext): IntegrationResult {
    const { asset } = context;
    const name = asset.stem;
    const isDotLottie = asset.format === 'dotlottie';

    const imports = 'import Lottie';

    const code = [
      `LottieView(animation: .named("${name}"))`,
      '    .playing()',
      '    .looping()',
      '    .resizable()',
      '    .aspectRatio(contentMode: .fit)',
    ].join('\n');

    const notes = [
      `Add "${asset.name}" to your Xcode project (drag it into your target's`,
      'bundle or an Asset Catalog) — source file currently at:',
      `  ${context.workspaceRelativePath}`,
      '',
      isDotLottie
        ? 'dotLottie (.lottie) files are supported directly by LottieView since lottie-ios 4.3 — no separate API is needed.'
        : null,
      'UIKit (UIViewController) equivalent:',
      `  let animationView = LottieAnimationView(name: "${name}")`,
      '  animationView.loopMode = .loop',
      '  animationView.play()',
    ]
      .filter((line) => line !== null)
      .join('\n');

    return {
      providerId: this.id,
      label: this.label,
      code,
      imports,
      dependency: 'lottie-ios',
      installHint:
        "Swift Package Manager: https://github.com/airbnb/lottie-spm, or pod 'lottie-ios'",
      notes,
      language: 'swift',
    };
  }
}
