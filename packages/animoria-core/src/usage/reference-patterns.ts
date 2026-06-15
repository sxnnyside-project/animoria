export const REFERENCE_PATTERNS: RegExp[] = [
  // JS/TS imports and requires with the filename
  // import anim from './animations/success.json'
  // const x = require('../assets/success.json')
  /['"`][^'"`]*\bFILENAME\b[^'"`]*['"`]/,

  // setAnimation("success.json") / setAnimation("success")
  /\bsetAnimation\s*\(\s*['"`][^'"`]*\bSTEM\b[^'"`]*['"`]/,

  // source={{ uri: 'success.json' }} / source={require('./success.json')}
  /\bsource\s*=\s*[{(]?\s*(?:require\s*\()?['"`][^'"`]*\bSTEM\b/,

  // Android / Kotlin / Java
  // LottieCompositionSpec.RawRes(R.raw.success)
  /R\.raw\.\bSTEM\b/,

  // setAnimation("success") / setAnimation("success.json")
  /\bsetAnimation\s*\(\s*['"`]\bSTEM\b(?:\.json)?['"`]/,

  // Flutter / Dart
  // LottieBuilder.asset('assets/success.json')
  // Lottie.asset('animations/success')
  /Lottie\.\w+\s*\(\s*['"`][^'"`]*\bSTEM\b/,

  // SwiftUI / iOS
  // LottieAnimationView(name: "success")
  // AnimationView(name: "success")
  /(?:LottieAnimationView|AnimationView)\s*\(\s*name\s*:\s*['"`]\bSTEM\b['"`]/,
  /\.animation\s*=\s*LottieAnimation\.named\s*\(\s*['"`]\bSTEM\b['"`]/,

  // Generic asset path patterns
  // 'animations/success.json' / "assets/success.json"
  /['"`][^'"`]*\/\bSTEM\b\.(?:json|riv|gif)['"`]/,
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildPatternsForAsset(filename: string, stem: string): RegExp[] {
  return REFERENCE_PATTERNS.map((pattern) => {
    const source = pattern.source
      .replace(/FILENAME/g, escapeRegex(filename))
      .replace(/STEM/g, escapeRegex(stem));
    return new RegExp(source, 'i');
  });
}
