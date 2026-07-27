import type {
  IntegrationContext,
  IntegrationProvider,
  IntegrationResult,
} from '../IntegrationProvider.js';

/**
 * Integration provider for Flutter projects using the `lottie` Dart package.
 *
 * ## What this generates
 *
 * A complete Flutter integration:
 * - The `Lottie.asset()` widget call with the correct asset path
 * - The Dart import statement
 * - The `pubspec.yaml` dependency declaration
 * - The `pubspec.yaml` flutter assets entry
 * - Notes on the assets section and AnimationController for controlled playback
 *
 * ## Path convention for Flutter
 *
 * Flutter asset paths in `pubspec.yaml` and `Lottie.asset()` are workspace-
 * relative, not file-system-relative. This provider uses
 * `context.workspaceRelativePath` directly — already root-relative with no
 * `../` segments to strip — rather than deriving it from a file-relative
 * path.
 *
 * ## Why only Lottie JSON
 *
 * The `lottie` Dart package supports Lottie JSON only. dotLottie is not
 * supported (see: https://pub.dev/packages/lottie). A separate provider
 * would be needed for dotLottie-on-Flutter if that ever becomes viable.
 *
 * ## pubspec.yaml sections
 *
 * The generated `notes` include both the `dependencies` addition and the
 * `flutter.assets` entry — two distinct locations in pubspec.yaml that
 * developers often forget one of.
 */
export class FlutterProvider implements IntegrationProvider {
  readonly id = 'flutter';
  readonly label = 'Flutter (lottie)';
  readonly supportedFormats = ['lottie'] as const; // dotlottie not supported by lottie Dart pkg

  generate(context: IntegrationContext): IntegrationResult {
    const flutterPath = context.workspaceRelativePath;

    const code = [
      'Lottie.asset(',
      `  '${flutterPath}',`,
      '  repeat: true,',
      '  animate: true,',
      ')',
    ].join('\n');

    const imports = `import 'package:lottie/lottie.dart';`;

    const notes = [
      'pubspec.yaml — dependencies:',
      '  dependencies:',
      '    lottie: ^3.0.0',
      '',
      'pubspec.yaml — flutter assets:',
      '  flutter:',
      '    assets:',
      `      - ${flutterPath}`,
      '',
      'For controlled playback, pass an AnimationController:',
      `  Lottie.asset('${flutterPath}', controller: _controller)`,
    ].join('\n');

    return {
      providerId: this.id,
      label: this.label,
      code,
      imports,
      dependency: 'lottie: ^3.0.0',
      installHint: 'flutter pub add lottie',
      notes,
      language: 'dart',
    };
  }
}
