/**
 * A static visual format Animoria governs alongside animated formats.
 *
 * Kept as its own union — never merged into {@link ../types/asset.js}'s
 * `AnimatedFormat` — because static assets carry none of the animated
 * pipeline's concerns (no duration, no frame rate, no playback). `'svg'`
 * here is deliberately distinct from `AnimatedFormat`'s `'animated-svg'`:
 * an `.svg` file is one or the other depending on whether it actually
 * contains animation, never both.
 */
export type StaticFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif';

/**
 * A static visual asset discovered in the workspace.
 *
 * Deliberately smaller than `AnimoriaAsset`: no `status`/`metadata`/`error`
 * fields, because static assets are never parsed for animation metadata —
 * there is no duration, frame rate, or layer count to extract. Governance
 * over static assets (usage, duplication) reuses the same domain concepts
 * as animated assets, but the asset record itself stays intentionally
 * lightweight, matching the simpler experience static assets get in the
 * IDE (see `AnimoriaTreeProvider`'s separate Static Assets section).
 */
export interface AnimoriaStaticAsset {
  /** Absolute path to the file */
  path: string;
  /** File name with extension */
  name: string;
  /** File name without extension */
  stem: string;
  /** Detected static format */
  format: StaticFormat;
  /** Size in bytes */
  sizeBytes: number;
  /** Last modified timestamp (ms) */
  mtime: number;
}
