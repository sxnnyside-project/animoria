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

/**
 * One asset's reference-matching apparatus, compiled once and reused for every
 * line of every file.
 *
 * ## Why this type exists rather than calling `buildPatternsForAsset` per line
 * {@link lineMatchesAsset} compiles all ten patterns on *every invocation* — and it
 * is invoked once per line per asset. On a 60-asset workspace with 300 source files
 * of 200 lines, that is 36 million `new RegExp()` constructions, and it is the
 * single largest cost in a governance run (measured: 765 ms vs 26 ms for 200,000
 * line tests, a 29× overhead). Compilation belongs at the asset boundary, which is
 * what this type makes structurally true rather than merely intended.
 *
 * `stemLower` supports the cheap pre-filter described on {@link matchesLine}.
 */
export interface AssetMatcher {
  readonly filename: string;
  readonly stem: string;
  /** Lower-cased stem, for the substring gate. Precomputed to keep the hot loop allocation-free. */
  readonly stemLower: string;
  readonly patterns: readonly RegExp[];
  readonly strategy: ReferenceMatchStrategy;
}

/**
 * Compiles the matcher for one asset. Call once per asset per scan — never per
 * line, and never per file.
 */
export function compileAssetMatcher(
  filename: string,
  stem: string,
  strategy: ReferenceMatchStrategy = 'pattern'
): AssetMatcher {
  return {
    filename,
    stem,
    stemLower: stem.toLowerCase(),
    patterns: strategy === 'pattern' ? buildPatternsForAsset(filename, stem) : [],
    strategy,
  };
}

/**
 * Tests one line against a pre-compiled {@link AssetMatcher}.
 *
 * ## The substring gate
 * Every pattern this matcher holds requires the asset's stem (or its full filename,
 * which contains the stem) to appear literally in the line. So a line that does not
 * contain the stem cannot possibly match any of them, and `String.prototype.indexOf`
 * — a native, SIMD-accelerated search — can reject it far more cheaply than ten
 * regular expressions can. In a real workspace the overwhelming majority of lines
 * mention no asset at all, so this gate is what makes the matching pass effectively
 * free: with it, the reference pass over the reference workload drops to ~47 ms.
 *
 * The gate is a strict pre-filter, never a decision: anything it lets through is
 * still judged by exactly the same patterns as before, so results are unchanged.
 */
export function matchesLine(line: string, matcher: AssetMatcher, lineLower?: string): boolean {
  const lower = lineLower ?? line.toLowerCase();
  if (lower.indexOf(matcher.stemLower) === -1) return false;
  if (hasInlineIgnoreDirective(line)) return false;

  switch (matcher.strategy) {
    case 'pattern':
      return matcher.patterns.some((p) => p.test(line));
    case 'filename':
      return line.includes(matcher.filename);
    case 'stem':
      return new RegExp(`\\b${escapeRegex(matcher.stem)}\\b`, 'i').test(line);
    case 'both':
      return (
        line.includes(matcher.filename) ||
        new RegExp(`\\b${escapeRegex(matcher.stem)}\\b`, 'i').test(line)
      );
    default:
      return false;
  }
}

/** Match strategy accepted by {@link lineMatchesAsset}. See `UsageSearchConfig.strategy`. */
export type ReferenceMatchStrategy = 'pattern' | 'filename' | 'stem' | 'both';

/**
 * Tests whether a single line of source code references an asset, under
 * a given match strategy.
 *
 * Extracted as a standalone, exported function (rather than kept private
 * inside `UsageScanner`) so both the full-workspace scan
 * (`usage-scanner.js`, one asset against every source file) and the
 * incremental single-file scan (`reference-file-scanner.js`, one source
 * file against every asset) share exactly one definition of "does this
 * line count as a reference". Divergence between those two would show up
 * as unexplainable inconsistencies between a fresh full scan and the
 * indexer's incremental updates — the two are required to agree, so they
 * are given no opportunity to disagree.
 */
/**
 * Matches a `// animoria-ignore` (or `//animoria-ignore`) comment
 * anywhere on a line, case-insensitively. A line carrying this directive
 * is never counted as a reference, regardless of what
 * {@link lineMatchesAsset} would otherwise conclude — the developer is
 * explicitly saying "this looks like a match but isn't one" (e.g. a
 * comment or test fixture that happens to mention an asset's name).
 *
 * Checked once, here, inside {@link lineMatchesAsset} itself — both the
 * full-workspace scanner and the incremental single-file scanner call
 * that one function, so neither needs its own copy of this check.
 */
const INLINE_IGNORE_DIRECTIVE = /\/\/\s*animoria-ignore\b/i;

/** Whether `line` carries an inline `// animoria-ignore` directive suppressing any match on it. */
export function hasInlineIgnoreDirective(line: string): boolean {
  return INLINE_IGNORE_DIRECTIVE.test(line);
}

export function lineMatchesAsset(
  line: string,
  filename: string,
  stem: string,
  strategy: ReferenceMatchStrategy
): boolean {
  if (hasInlineIgnoreDirective(line)) return false;

  switch (strategy) {
    case 'pattern': {
      const patterns = buildPatternsForAsset(filename, stem);
      return patterns.some((p) => p.test(line));
    }
    case 'filename': {
      return line.includes(filename);
    }
    case 'stem': {
      const stemPattern = new RegExp(`\\b${escapeRegex(stem)}\\b`, 'i');
      return stemPattern.test(line);
    }
    case 'both': {
      const stemPattern = new RegExp(`\\b${escapeRegex(stem)}\\b`, 'i');
      return line.includes(filename) || stemPattern.test(line);
    }
    default:
      return false;
  }
}
