import type { AnimatedFormat } from '../types/asset.js';

/**
 * Per-format visual identity used by {@link renderFormatBadgeSvg}.
 *
 * Kept as a plain lookup table (rather than encoded into the renderer
 * function) so future formats — or a rebrand of existing ones — are a
 * one-line addition instead of a logic change.
 */
const BADGE_STYLE: Record<
  AnimatedFormat,
  { label: string; background: string; foreground: string }
> = {
  lottie: { label: 'LOTTIE', background: '#0EA5E9', foreground: '#FFFFFF' },
  dotlottie: { label: 'DOTLOTTIE', background: '#0284C7', foreground: '#FFFFFF' },
  rive: { label: 'RIVE', background: '#4B3AFF', foreground: '#FFFFFF' },
  gif: { label: 'GIF', background: '#F59E0B', foreground: '#1A1A1A' },
  apng: { label: 'APNG', background: '#F97316', foreground: '#1A1A1A' },
  'animated-svg': { label: 'SVG', background: '#22C55E', foreground: '#0B1F13' },
};

/**
 * Renders a deterministic, dependency-free SVG "badge" thumbnail for a
 * given {@link AnimatedFormat}.
 *
 * This is the thumbnail engine's fallback tier: it requires no parsing of
 * asset content, cannot throw, and cannot produce a visually broken result.
 * It is used whenever a richer render (e.g. {@link renderLottieVectorFrameSvg})
 * is unavailable, unsupported, or fails — satisfying the project's
 * "always provide a deterministic fallback" rule.
 *
 * The output is a self-contained SVG string (no external fonts, no script,
 * no network references) safe to persist to disk or inline as a data URI.
 *
 * @param format - The animated asset format the badge represents.
 * @param size - Width and height of the square badge, in pixels.
 * @returns A complete `<svg>...</svg>` document string.
 */
export function renderFormatBadgeSvg(format: AnimatedFormat, size: number): string {
  const style = BADGE_STYLE[format];
  const fontSize = Math.max(10, Math.round(size * 0.12));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${style.label} asset"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="${style.background}"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="700" font-size="${fontSize}" fill="${style.foreground}" letter-spacing="1">${style.label}</text></svg>`;
}
