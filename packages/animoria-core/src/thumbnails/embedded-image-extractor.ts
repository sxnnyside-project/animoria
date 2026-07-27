import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

/**
 * Extracts a raster image referenced by a Lottie/dotLottie document, for
 * use as a thumbnail when the vector tier ({@link
 * "./lottie-vector-renderer.js" | renderLottieVectorFrameSvg}) cannot
 * represent the document.
 *
 * ## Why this tier exists
 * The vector tier only supports simple shape layers — it bails out
 * entirely the moment it encounters a precomp, image, or text layer
 * (`UNSUPPORTED_LAYER_TYPES`), which describes the majority of real-world,
 * professionally-authored Lottie exports (After Effects almost always
 * produces at least one precomp; illustrations frequently embed a raster
 * background or logo). Falling straight through to the generic format
 * badge for all of those files is a real fidelity regression, not a
 * cosmetic one — the previous Chromium-based pipeline rendered an actual
 * screenshot regardless of layer complexity, and the badge conveys no
 * more information than "this is some Lottie file."
 *
 * ## Two ways a Lottie document carries a raster image
 * The Lottie/Bodymovin `assets[]` entry for an image (`e` = embedded flag)
 * is either:
 * - **Embedded** (`e: 1`) — the image is inlined directly as a base64
 *   data URI in `p`. Self-contained; decoded in memory.
 * - **External** (`e: 0`, the default and by far the more common case for
 *   real After Effects exports) — `p` is a filename and `u` is a path
 *   prefix, both relative to the `.json` file's own directory (e.g.
 *   `u: "images/", p: "img_0.png"` → `<dir-of-the-json>/images/img_0.png`
 *   on disk). Earlier versions of this extractor only handled the
 *   embedded case, which meant essentially every professionally-exported
 *   Lottie file — the exact files this tier exists for — still fell
 *   through to the generic badge, because real AE exports almost always
 *   reference external image files rather than inlining base64.
 *
 * The referencing image layer (`ty: 2`) is also frequently nested inside
 * a precomp rather than sitting at the document's top level — this
 * extractor walks into precomp assets (bounded, cycle-safe) to find it,
 * rather than only checking the document's own top-level `layers`.
 *
 * ## What this does not solve
 * A document whose only visual content is vector shapes inside a precomp,
 * or pure text, has no raster image to fall back to — it still reaches
 * the badge tier. Full precomp/text rendering support is tracked
 * separately (see `STATIC_ROADMAP.md`) as a larger rendering-fidelity
 * project, not something this narrow extraction step attempts. External
 * image resolution is also skipped for dotLottie: its internal images
 * live inside the `.lottie` zip archive, not as plain files next to it on
 * disk, so a filesystem read would never find them.
 */

/** A raster image asset, decoded/read enough to write straight to disk. */
export interface EmbeddedImageAsset {
  /** Raw image bytes. */
  readonly bytes: Buffer;
  /** File extension (without the dot) — `png`, `jpg`, `webp`, `gif`, etc. */
  readonly extension: string;
}

const DATA_URI_PATTERN = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/;
const MAX_PRECOMP_DEPTH = 4;

/**
 * Finds and reads the best raster image referenced by a Lottie document:
 * the image asset referenced by the document's first image layer
 * (`ty === 2`), searching into precomps for it, falling back to the first
 * image-like asset declared at all if no image layer is found.
 *
 * @param animationData - The parsed Lottie/dotLottie JSON document.
 * @param baseDir - Absolute directory the document's own external asset
 *   paths (`u` + `p`) are relative to — normally the directory containing
 *   the `.json` file itself. Pass `null` to skip external-file resolution
 *   entirely (e.g. for dotLottie, where this wouldn't resolve to a real
 *   path on disk).
 * @returns The decoded/read image, or `null` if the document has no
 *   image asset this function can resolve.
 */
export async function extractEmbeddedImageAsset(
  animationData: unknown,
  baseDir: string | null = null
): Promise<EmbeddedImageAsset | null> {
  if (animationData === null || typeof animationData !== 'object') return null;
  const doc = animationData as Record<string, unknown>;

  const assets = Array.isArray(doc.assets) ? (doc.assets as Record<string, unknown>[]) : [];
  const assetsById = new Map<string, Record<string, unknown>>();
  for (const asset of assets) {
    const id = asset.id;
    if (typeof id === 'string') assetsById.set(id, asset);
  }

  const imageAssetsById = new Map<string, Record<string, unknown>>();
  for (const [id, asset] of assetsById) {
    if (typeof asset.p === 'string') imageAssetsById.set(id, asset);
  }
  if (imageAssetsById.size === 0) return null;

  const topLayers = Array.isArray(doc.layers) ? (doc.layers as Record<string, unknown>[]) : [];
  const referencedId = findFirstImageLayerRefId(topLayers, assetsById, 0, new Set());

  const candidate =
    (referencedId ? imageAssetsById.get(referencedId) : undefined) ??
    imageAssetsById.values().next().value;

  return candidate ? readImageAsset(candidate, baseDir) : null;
}

/**
 * Depth-first search for the `refId` of the first image layer (`ty === 2`)
 * reachable from `layers`, walking into precomp layers (`ty === 0`) by
 * resolving their `refId` against `assetsById` (a precomp asset carries
 * its own nested `layers` array). Bounded by `MAX_PRECOMP_DEPTH` and a
 * `visited` set so a malformed or cyclic precomp reference can never hang
 * or recurse unboundedly.
 */
function findFirstImageLayerRefId(
  layers: readonly Record<string, unknown>[],
  assetsById: ReadonlyMap<string, Record<string, unknown>>,
  depth: number,
  visited: Set<string>
): string | undefined {
  for (const layer of layers) {
    if (layer.ty === 2 && typeof layer.refId === 'string') {
      return layer.refId;
    }
  }

  if (depth >= MAX_PRECOMP_DEPTH) return undefined;

  for (const layer of layers) {
    if (layer.ty !== 0 || typeof layer.refId !== 'string') continue;
    const compId = layer.refId;
    if (visited.has(compId)) continue;
    visited.add(compId);

    const comp = assetsById.get(compId);
    const nestedLayers = comp && Array.isArray(comp.layers) ? comp.layers : undefined;
    if (!nestedLayers) continue;

    const found = findFirstImageLayerRefId(
      nestedLayers as Record<string, unknown>[],
      assetsById,
      depth + 1,
      visited
    );
    if (found) return found;
  }

  return undefined;
}

async function readImageAsset(
  asset: Record<string, unknown>,
  baseDir: string | null
): Promise<EmbeddedImageAsset | null> {
  const p = asset.p;
  if (typeof p !== 'string') return null;

  const dataUriMatch = DATA_URI_PATTERN.exec(p);
  if (dataUriMatch) {
    const [, mimeSubtype, base64] = dataUriMatch;
    try {
      return {
        bytes: Buffer.from(base64!, 'base64'),
        extension: normalizeImageExtension(mimeSubtype!),
      };
    } catch {
      return null;
    }
  }

  // Not a data URI — an external file reference (`e: 0`, the common
  // real-world case). `u` is a path prefix (often "images/", sometimes
  // absent), `p` is the filename, both relative to the document's own
  // directory.
  if (baseDir === null) return null;
  const u = typeof asset.u === 'string' ? asset.u : '';
  const resolvedPath = join(baseDir, u, p);
  const extension = extname(p).slice(1).toLowerCase();
  if (!extension) return null;

  try {
    return { bytes: await readFile(resolvedPath), extension };
  } catch {
    return null;
  }
}

function normalizeImageExtension(mimeSubtype: string): string {
  const normalized = mimeSubtype.toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpg';
  if (normalized === 'svg+xml') return 'svg';
  return normalized;
}
