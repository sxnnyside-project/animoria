import type { AnimatedFormat } from './asset.js';
import type { StaticFormat } from './static-asset.js';

/**
 * The single canonical mapping from {@link AnimatedFormat} to the file
 * extension Animoria expects for it on disk.
 *
 * ## Why this exists
 * "Which file extensions does Animoria support" is domain knowledge, not
 * an implementation detail — it used to be declared independently in
 * `FileScanner`, `cli.ts`, and `WorkspaceIndexer`, and those three copies
 * drifted: two of them said `.rive` while the actual `RiveParser` (and
 * the file extension Rive itself uses) is `.riv`. That meant a full
 * workspace scan and the standalone CLI watcher silently never
 * discovered real `.riv` files, while the incremental indexer quietly
 * worked around it with its own, separately-declared list. Consolidating
 * behind one export makes that class of drift structurally impossible:
 * every consumer reads the same values, so there is nothing left to
 * disagree.
 *
 * Note that `.json` is shared domain knowledge only in the "this is the
 * extension Lottie files carry" sense — a `.json` file is not assumed to
 * be a Lottie asset just because of its extension. Content-based
 * validation (see `LottieParserAdapter.supports`) still decides that.
 * This map exists to answer "which extensions are even worth reading the
 * first chunk of", not "which format a given file definitely is".
 *
 * @remarks
 * Extending Animoria to a new animated format means adding exactly one
 * entry here (and, of course, a real parser for it) — every scanner,
 * watcher, and CLI path that reads from {@link SUPPORTED_ASSET_EXTENSIONS}
 * picks it up with no further changes.
 */
export const ASSET_EXTENSIONS_BY_FORMAT: Readonly<Record<AnimatedFormat, string>> = {
  lottie: '.json',
  dotlottie: '.lottie',
  rive: '.riv',
  gif: '.gif',
  apng: '.apng',
  'animated-svg': '.svg',
};

/**
 * Every file extension Animoria recognizes as a potential animated
 * asset, derived from {@link ASSET_EXTENSIONS_BY_FORMAT}.
 *
 * Consumers that only need "is this extension worth looking at" (as
 * opposed to the format it maps to) should use this rather than
 * re-deriving it from the record themselves.
 */
export const SUPPORTED_ASSET_EXTENSIONS: readonly string[] = Object.values(
  ASSET_EXTENSIONS_BY_FORMAT
);

/**
 * The canonical mapping from {@link StaticFormat} to its file extension(s).
 *
 * `.svg` intentionally also appears in {@link ASSET_EXTENSIONS_BY_FORMAT}:
 * an `.svg` file is discovered as a *candidate* by both the animated and
 * static scanners, and content-based detection (see
 * `SvgAnimatedParser.canParse`) decides which one actually claims it —
 * never both. `jpeg` lists both extensions real-world JPEG files use.
 */
export const STATIC_ASSET_EXTENSIONS_BY_FORMAT: Readonly<Record<StaticFormat, readonly string[]>> =
  {
    svg: ['.svg'],
    png: ['.png'],
    jpeg: ['.jpg', '.jpeg', '.jfif'],
    webp: ['.webp'],
    avif: ['.avif'],
  };

/** Every file extension Animoria recognizes as a potential static asset. */
export const SUPPORTED_STATIC_ASSET_EXTENSIONS: readonly string[] = Object.values(
  STATIC_ASSET_EXTENSIONS_BY_FORMAT
).flat();

/**
 * Resolves the {@link StaticFormat} a given lowercase file extension
 * (including the leading dot, e.g. `.jpg`) belongs to, or `undefined` if
 * it isn't a recognized static extension.
 */
export function staticFormatForExtension(ext: string): StaticFormat | undefined {
  for (const [format, extensions] of Object.entries(STATIC_ASSET_EXTENSIONS_BY_FORMAT)) {
    if (extensions.includes(ext)) return format as StaticFormat;
  }
  return undefined;
}
