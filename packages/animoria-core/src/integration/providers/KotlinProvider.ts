import type {
  IntegrationContext,
  IntegrationProvider,
  IntegrationResult,
} from '../IntegrationProvider.js';

/**
 * Integration provider for Android projects using `lottie-compose`,
 * targeting Jetpack Compose — the modern, recommended UI toolkit — rather
 * than the legacy XML/`LottieAnimationView` API.
 *
 * ## What this generates
 *
 * A complete, paste-ready Compose integration built on
 * `rememberLottieComposition` + `LottieAnimation`, the standard pairing for
 * driving playback state in Compose.
 *
 * ## Path convention — two different Android resource systems
 *
 * Lottie JSON and dotLottie archives are packaged differently on Android,
 * so this provider branches on `asset.format`:
 * - **Lottie JSON** goes in `res/raw/`, referenced via a generated `R.raw.*`
 *   identifier. Android raw-resource names must be lowercase and may only
 *   contain letters, digits, and underscores — {@link toAndroidResourceName}
 *   sanitizes `asset.stem` into a valid identifier and the generated notes
 *   tell the developer the exact filename to save it as.
 * - **dotLottie** archives go in `assets/`, referenced by filename via
 *   `LottieCompositionSpec.Asset(...)` — asset filenames have no naming
 *   restriction beyond the filesystem's, so the original file name is used
 *   as-is, unlike the raw-resource case.
 */
export class KotlinProvider implements IntegrationProvider {
  readonly id = 'kotlin';
  readonly label = 'Jetpack Compose (lottie-compose)';
  readonly supportedFormats = ['lottie', 'dotlottie'] as const;

  generate(context: IntegrationContext): IntegrationResult {
    const { asset } = context;
    const isDotLottie = asset.format === 'dotlottie';
    const resourceName = toAndroidResourceName(asset.stem);

    const spec = isDotLottie
      ? `LottieCompositionSpec.Asset("${asset.name}")`
      : `LottieCompositionSpec.RawRes(R.raw.${resourceName})`;

    const imports = [
      'import com.airbnb.lottie.compose.LottieAnimation',
      'import com.airbnb.lottie.compose.LottieCompositionSpec',
      'import com.airbnb.lottie.compose.rememberLottieComposition',
      'import com.airbnb.lottie.compose.rememberLottieAnimatable',
      'import com.airbnb.lottie.compose.LottieConstants',
    ].join('\n');

    const code = [
      `val composition by rememberLottieComposition(${spec})`,
      'val animatable = rememberLottieAnimatable()',
      '',
      'LaunchedEffect(composition) {',
      '    animatable.animate(',
      '        composition,',
      '        iterations = LottieConstants.IterateForever,',
      '    )',
      '}',
      '',
      'LottieAnimation(',
      '    composition = composition,',
      '    progress = { animatable.value },',
      ')',
    ].join('\n');

    const notes = isDotLottie
      ? [
          `Place "${asset.name}" in your module's assets/ folder — source file currently at:`,
          `  ${context.workspaceRelativePath}`,
        ].join('\n')
      : [
          `Save "${asset.name}" in res/raw/ as: ${resourceName}.json`,
          '(Android raw-resource names must be lowercase letters, digits, and',
          `underscores only — "${asset.stem}" was sanitized to "${resourceName}".)`,
          'Source file currently at:',
          `  ${context.workspaceRelativePath}`,
        ].join('\n');

    return {
      providerId: this.id,
      label: this.label,
      code,
      imports,
      dependency: 'com.airbnb.android:lottie-compose',
      installHint: 'implementation("com.airbnb.android:lottie-compose:6.4.0")',
      notes,
      language: 'kotlin',
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a file stem into a valid Android raw-resource identifier:
 * lowercase, `[a-z0-9_]` only, and guaranteed to start with a letter (a
 * resource name may not begin with a digit).
 */
function toAndroidResourceName(stem: string): string {
  const sanitized = stem
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const name = sanitized.length > 0 ? sanitized : 'animation';
  return /^[a-z]/.test(name) ? name : `a_${name}`;
}
