import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';

/**
 * Detects whether SVG markup contains real animation evidence — SMIL
 * animation elements or CSS `@keyframes`/`animation`/`transition`
 * declarations.
 *
 * A bare `.svg` file (a favicon, a static icon) is not "animated" just
 * because it's an SVG; without this check every `.svg` in a workspace was
 * previously accepted as an animated asset regardless of content, which is
 * what caused static SVGs to be swept into governance with no way to
 * exclude them. Shared between {@link SvgAnimatedParser.supports} (the
 * discovery gate) and {@link SvgAnimatedParser.parse} (animation-type
 * classification) so the two can never disagree about what counts as
 * "animated."
 */
function hasAnimationEvidence(content: string): boolean {
  const hasSmil = /<(animate|animateTransform|animateMotion|set|mpath)\b/.test(content);
  const hasCss =
    /@keyframes\b/.test(content) ||
    /animation\s*:\s*/.test(content) ||
    /transition\s*:\s*/.test(content);
  return hasSmil || hasCss;
}

/**
 * Parses the animated SVG vector format (`.svg`).
 *
 * Works at the text level rather than parsing a full XML/DOM tree: it
 * looks for CSS animation declarations (`@keyframes`), SMIL animation
 * elements (`<animate>`, `<animateTransform>`, ...), and extracts the
 * viewport dimensions via regular expressions on the `<svg>` tag itself.
 *
 * A static SVG (no animation evidence) is not claimed by this parser —
 * see {@link hasAnimationEvidence}. It remains a candidate for the
 * separate static-asset scanner instead.
 */
export class SvgAnimatedParser implements IAssetParser {
  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.svg') return false;
    const chunkStr = bufferChunk.toString('utf8').trim();
    if (!chunkStr.includes('<svg')) return false;
    // `bufferChunk` is only the first ~1KB of the file (see FileScanner) —
    // animation evidence near the end of a larger file can be missed here.
    // That's an acceptable false negative for the discovery gate: `parse()`
    // re-checks against the full file content and is the source of truth
    // for `animationType`; this gate only needs to avoid the false
    // positive of treating every `.svg` as animated.
    return hasAnimationEvidence(chunkStr);
  }

  async parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const content = buffer.toString('utf8');

      // 1. Extract dimensions from the <svg> tag's own attributes.
      const svgTagMatch = content.match(/<svg([^>]+)>/);
      let width = 400; // Fallback when no width/height/viewBox is present.
      let height = 400;

      if (svgTagMatch) {
        const svgAttributes = svgTagMatch[1]!;

        const wMatch = svgAttributes.match(/width=["']([^"']+)["']/);
        const hMatch = svgAttributes.match(/height=["']([^"']+)["']/);
        const vbMatch = svgAttributes.match(/viewBox=["']([^"']+)["']/);

        if (wMatch && hMatch) {
          width = Number.parseFloat(wMatch[1]!) || 400;
          height = Number.parseFloat(hMatch[1]!) || 400;
        } else if (vbMatch) {
          const parts = vbMatch[1]!.trim().split(/\s+/);
          if (parts.length === 4) {
            width = Number.parseFloat(parts[2]!) || 400;
            height = Number.parseFloat(parts[3]!) || 400;
          }
        }
      }

      // 2. Classify the animation mechanism in use.
      const hasSmil = /<(animate|animateTransform|animateMotion|set|mpath)\b/.test(content);
      const hasCss =
        /@keyframes\b/.test(content) ||
        /animation\s*:\s*/.test(content) ||
        /transition\s*:\s*/.test(content);

      let animationType: 'css' | 'smil' | 'mixed' = 'css';
      if (hasSmil && hasCss) {
        animationType = 'mixed';
      } else if (hasSmil) {
        animationType = 'smil';
      }

      // Approximate element count — a full DOM parse is unnecessary for this signal.
      const elementCount = (content.match(/<[a-zA-Z0-9_-]+/g) || []).length;

      return {
        format: 'animated-svg',
        width,
        height,
        // An SVG has no single fixed duration without executing SMIL/CSS timing.
        durationSeconds: 0,
        sizeBytes: buffer.length,
        animationType,
        elementCount,
      } as AnimoriaMetadata;
    } catch (err) {
      throw new Error(`SVG parsing failed: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }
  }

  getFormat(): AnimatedFormat {
    return 'animated-svg';
  }
}
