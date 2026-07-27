import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { logDebug, logWarn } from '../logging/logger.js';
import { DotLottieParser } from '../parsers/dotlottie-parser.js';
import type {
  AnimoriaAsset,
  ThumbnailBatchResult,
  ThumbnailEngineConfig,
  ThumbnailResult,
} from '../types/asset.js';
import { extractEmbeddedImageAsset } from './embedded-image-extractor.js';
import { renderFormatBadgeSvg } from './format-badge-renderer.js';
import { renderLottieVectorFrameSvg } from './lottie-vector-renderer.js';
import { computeThumbnailCacheKey, computeThumbnailPathHash } from './thumbnail-cache-key.js';

const DEFAULT_SIZE = 256;

/**
 * Generates static thumbnail previews for animated assets without ever
 * spawning an external process.
 *
 * ## Zero external processes
 * Rendering never launches a browser or any other external process — it
 * runs entirely inside the Node.js/Electron runtime the IDE already
 * provides. A thumbnail pipeline that depended on a system Chrome/Chromium
 * install would fail activation on any machine without one; this design
 * makes that failure mode structurally impossible.
 *
 * ## Rendering strategy (falls through in order)
 * 1. **Vector** — for Lottie/dotLottie, parse the JSON directly and render
 *    supported shape layers to SVG ({@link renderLottieVectorFrameSvg}).
 *    Bails out the moment the document uses a layer type this tier cannot
 *    faithfully represent (precomp, image, text) — which describes most
 *    non-trivial, professionally-authored Lottie exports.
 * 2. **Embedded image** — for a document the vector tier could not
 *    represent, extract a raster image the document embeds directly as
 *    base64 ({@link extractEmbeddedImageAsset}). A real, recognizable
 *    preview of *something in the file*, not a full-fidelity render, but
 *    materially better than a generic badge for the common case of an
 *    illustration or icon with an embedded raster layer.
 * 3. **Source copy** — for formats that are already a displayable static
 *    file (GIF, APNG, plain SVG), the original bytes are reused verbatim.
 * 4. **Badge** — a deterministic, content-free SVG badge, used only when
 *    none of the above apply. This tier can never fail, guaranteeing
 *    every parsed asset gets *some* thumbnail.
 *
 * ## Cache identity and stale-file cleanup
 * A thumbnail's filename is `${stem}-${pathHash}-${cacheKey}.${extension}`
 * — `pathHash` (see {@link computeThumbnailPathHash}) is included
 * specifically so two different assets that happen to share a filename
 * stem (e.g. `icon.json` recurring once per feature folder — an entirely
 * ordinary real-world layout) can never collide or clean up each other's
 * current file; only `stem` alone was used previously, and one asset
 * regenerating would delete a same-stem asset's thumbnail out from under
 * it, deterministically reproducing on every single generation pass for
 * any workspace with a stem collision — "delete the cache and regenerate"
 * could never fix it, since the very next pass reproduced it identically.
 * — critically — **which tier produced a given asset's thumbnail is not
 * knowable in advance for Lottie/dotLottie**, since it depends on the
 * document's content (vector succeeds, or embedded-image is available, or
 * neither). The extension therefore varies asset-to-asset and can change
 * for the *same* asset across runs if its content changes. Every
 * generation pass removes any other cached file for the same asset
 * (matched by stem *and* path hash) before/after writing the new one, so
 * exactly one thumbnail file ever exists per asset — a prior
 * implementation left every previous tier's output (and, across the
 * migration off the old Chromium-based pipeline, every stale `.png` it
 * had written) sitting alongside the current file indefinitely, which is
 * exactly the "which one does it actually use"
 * confusion this cleanup exists to make structurally impossible.
 *
 * ## Lifecycle
 * Construct one instance per scan/batch (it holds no long-lived resources
 * beyond a disposed flag), call {@link generateBatch} once, and optionally
 * {@link dispose} it early via an `AbortSignal` to stop mid-batch — e.g. when
 * the extension deactivates or a new scan supersedes this one.
 *
 * ## Extension points
 * Future formats (Rive, richer Lottie features) should add a new private
 * `_render*` tier ahead of the badge fallback, following the same
 * "return null/throws ⇒ fall through" contract used by the existing tiers.
 */
export class ThumbnailEngine {
  private readonly _config: ThumbnailEngineConfig;
  private readonly _thumbnailDir: string;
  private _isDisposed = false;

  constructor(config: ThumbnailEngineConfig) {
    this._config = config;
    this._thumbnailDir = join(config.workspacePath, '.animoria', 'thumbnails');
  }

  /**
   * Generates (or reuses cached) thumbnails for every successfully parsed
   * asset in `assets`. Assets that failed parsing are skipped — a thumbnail
   * cannot be trusted to represent content that couldn't be validated.
   *
   * Non-blocking by construction: each asset is handled by an `async`
   * function using only non-blocking `fs/promises` calls, so no single
   * asset can stall the IDE's main thread.
   *
   * @param assets - Assets to generate thumbnails for.
   * @param signal - Optional abort signal; when triggered, in-flight work
   *   for already-started assets completes but no new asset is started.
   */
  async generateBatch(
    assets: AnimoriaAsset[],
    signal?: AbortSignal
  ): Promise<ThumbnailBatchResult> {
    const start = performance.now();

    if (this._isDisposed) {
      throw new Error('ThumbnailEngine has already been disposed.');
    }
    if (signal?.aborted) {
      throw new Error('Thumbnail generation aborted before starting.');
    }

    const parsed = assets.filter((a) => a.status === 'parsed');
    if (parsed.length === 0) {
      return {
        results: [],
        generated: 0,
        fromCache: 0,
        failed: 0,
        durationMs: performance.now() - start,
      };
    }

    await mkdir(this._thumbnailDir, { recursive: true });
    const existingFiles = new Set(await readdir(this._thumbnailDir).catch(() => []));

    const results: ThumbnailResult[] = [];
    for (const asset of parsed) {
      if (signal?.aborted || this._isDisposed) break;
      results.push(await this._generateOne(asset, existingFiles));
    }

    const generated = results.filter((r) => r.thumbnailPath !== null && !r.fromCache).length;
    const fromCache = results.filter((r) => r.fromCache).length;
    const failed = results.filter((r) => r.thumbnailPath === null).length;

    return { results, generated, fromCache, failed, durationMs: performance.now() - start };
  }

  private _thumbnailFilename(
    asset: AnimoriaAsset,
    pathHash: string,
    key: string,
    extension: string
  ): string {
    return `${asset.stem}-${pathHash}-${key}.${extension}`;
  }

  private async _generateOne(
    asset: AnimoriaAsset,
    existingFiles: Set<string>
  ): Promise<ThumbnailResult> {
    const key = computeThumbnailCacheKey(asset);
    const pathHash = computeThumbnailPathHash(asset);

    // Formats whose output extension is fixed regardless of content —
    // the cache-hit filename is fully known up front.
    if (asset.format === 'gif' || asset.format === 'apng' || asset.format === 'animated-svg') {
      const extension = asset.format === 'gif' ? 'gif' : asset.format === 'apng' ? 'png' : 'svg';
      const filename = this._thumbnailFilename(asset, pathHash, key, extension);
      const targetPath = join(this._thumbnailDir, filename);

      if (existingFiles.has(filename)) {
        return { asset, thumbnailPath: targetPath, fromCache: true, kind: 'source-copy' };
      }

      try {
        await this._writeSourceCopy(asset, targetPath);
        await this._cleanStaleThumbnails(asset, pathHash, filename, existingFiles);
        return { asset, thumbnailPath: targetPath, fromCache: false, kind: 'source-copy' };
      } catch (err) {
        return { asset, thumbnailPath: null, fromCache: false, error: describeError(err) };
      }
    }

    // Lottie/dotLottie — the winning tier (and therefore the extension)
    // depends on document content, so a cache hit is any file already on
    // disk for this exact asset+key, whatever tier produced it.
    const cachedFilename = [...existingFiles].find((name) =>
      name.startsWith(`${asset.stem}-${pathHash}-${key}.`)
    );
    if (cachedFilename) {
      return {
        asset,
        thumbnailPath: join(this._thumbnailDir, cachedFilename),
        fromCache: true,
        kind: cachedFilename.endsWith('.svg') ? 'vector' : 'embedded-image',
      };
    }

    try {
      const animationData = await this._loadAnimationData(asset);

      const vectorSvg = animationData !== null ? this._tryRenderVector(asset, animationData) : null;
      if (vectorSvg !== null) {
        const filename = this._thumbnailFilename(asset, pathHash, key, 'svg');
        const targetPath = join(this._thumbnailDir, filename);
        await writeFile(targetPath, vectorSvg, 'utf-8');
        await this._cleanStaleThumbnails(asset, pathHash, filename, existingFiles);
        return { asset, thumbnailPath: targetPath, fromCache: false, kind: 'vector' };
      }

      const embeddedImage =
        animationData !== null
          ? await extractEmbeddedImageAsset(
              animationData,
              asset.format === 'lottie' ? dirname(asset.path) : null
            )
          : null;
      if (embeddedImage !== null) {
        const filename = this._thumbnailFilename(asset, pathHash, key, embeddedImage.extension);
        const targetPath = join(this._thumbnailDir, filename);
        await writeFile(targetPath, embeddedImage.bytes);
        await this._cleanStaleThumbnails(asset, pathHash, filename, existingFiles);
        return { asset, thumbnailPath: targetPath, fromCache: false, kind: 'embedded-image' };
      }

      const badgeSvg = renderFormatBadgeSvg(asset.format, this._config.size ?? DEFAULT_SIZE);
      const filename = this._thumbnailFilename(asset, pathHash, key, 'svg');
      const targetPath = join(this._thumbnailDir, filename);
      await writeFile(targetPath, badgeSvg, 'utf-8');
      await this._cleanStaleThumbnails(asset, pathHash, filename, existingFiles);
      return { asset, thumbnailPath: targetPath, fromCache: false, kind: 'badge' };
    } catch (err) {
      return { asset, thumbnailPath: null, fromCache: false, error: describeError(err) };
    }
  }

  private async _writeSourceCopy(asset: AnimoriaAsset, targetPath: string): Promise<void> {
    const content = await readFile(asset.path);
    await writeFile(targetPath, content);
  }

  /** Parses an asset's raw animation document once, shared by the vector and embedded-image tiers so neither re-reads or re-parses the file. */
  private async _loadAnimationData(asset: AnimoriaAsset): Promise<unknown | null> {
    if (asset.format !== 'lottie' && asset.format !== 'dotlottie') return null;

    try {
      return asset.format === 'dotlottie'
        ? await new DotLottieParser().extractAnimationData(asset.path)
        : JSON.parse(await readFile(asset.path, 'utf-8'));
    } catch (err) {
      logDebug(
        'thumbnail-generation',
        'ThumbnailEngine',
        'Could not read or parse animation data for thumbnail',
        {
          assetPath: asset.path,
          reason: 'file unreadable or invalid JSON',
          error: err,
          recovery: 'fell through to remaining thumbnail tiers',
        }
      );
      return null;
    }
  }

  /**
   * Attempts the vector rendering tier. Returns `null` (never throws) when
   * the tier isn't applicable or the document uses an unsupported feature,
   * signaling the caller to fall through to the embedded-image tier.
   */
  private _tryRenderVector(asset: AnimoriaAsset, animationData: unknown): string | null {
    if (
      !asset.metadata ||
      (asset.metadata.format !== 'lottie' && asset.metadata.format !== 'dotlottie')
    ) {
      return null;
    }

    const size = this._config.size ?? DEFAULT_SIZE;

    try {
      return renderLottieVectorFrameSvg(animationData, {
        width: size,
        height: size,
        sourceWidth: asset.metadata.width,
        sourceHeight: asset.metadata.height,
      });
    } catch (err) {
      logDebug(
        'thumbnail-generation',
        'ThumbnailEngine',
        'Could not render vector frame for thumbnail',
        {
          assetPath: asset.path,
          reason: 'malformed animation content or unexpected shape data',
          error: err,
          recovery: 'fell through to the embedded-image tier',
        }
      );
      return null;
    }
  }

  /**
   * Removes every other cached thumbnail file for `asset` — any filename
   * starting with `${asset.stem}-${pathHash}-` other than `keepFilename` —
   * so exactly one thumbnail ever exists per asset on disk. Runs after
   * every fresh generation (never on a cache hit, since nothing changed)
   * and is best-effort: a failed delete is logged and otherwise ignored,
   * since a leftover file is a cosmetic inconvenience, never a
   * correctness problem for the thumbnail this call just produced.
   *
   * Scoped by `pathHash` (see {@link computeThumbnailPathHash}), not just
   * `asset.stem` — two different assets commonly share a filename stem
   * (`icon.json` in ten different feature folders), and matching on stem
   * alone would delete a *different* asset's current thumbnail the moment
   * this one regenerates, leaving that other asset pointing at a file
   * that no longer exists.
   */
  private async _cleanStaleThumbnails(
    asset: AnimoriaAsset,
    pathHash: string,
    keepFilename: string,
    existingFiles: Set<string>
  ): Promise<void> {
    const prefix = `${asset.stem}-${pathHash}-`;
    const stale = [...existingFiles].filter(
      (name) => name.startsWith(prefix) && name !== keepFilename
    );

    for (const filename of stale) {
      const staleObserved = existingFiles.delete(filename);
      if (!staleObserved) continue; // already handled by a concurrent pass in this batch
      try {
        await unlink(join(this._thumbnailDir, filename));
      } catch (err) {
        logWarn(
          'thumbnail-generation',
          'ThumbnailEngine',
          'Could not remove a stale cached thumbnail',
          {
            assetPath: join(this._thumbnailDir, filename),
            reason: 'unlink failed',
            error: err,
            recovery: 'stale file left in place; a future generation pass will retry',
          }
        );
      }
    }
    existingFiles.add(keepFilename);
  }

  /**
   * Marks this engine as disposed, preventing further batches from
   * starting. Safe to call multiple times. Unlike the previous
   * Chromium-backed implementation, there is no external process to
   * terminate — this exists to preserve a stable lifecycle contract for
   * callers (e.g. the VS Code extension aborting work on deactivation).
   */
  async dispose(): Promise<void> {
    this._isDisposed = true;
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
