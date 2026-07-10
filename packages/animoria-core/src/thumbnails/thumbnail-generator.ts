import puppeteer from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';
import { mkdir, writeFile, access, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import type {
  ThumbnailConfig,
  ThumbnailResult,
  ThumbnailBatchResult,
  AnimoriaAsset,
} from '../types/asset.js';

export class ThumbnailGenerator {
  private _config: ThumbnailConfig;
  private _browser: Browser | null = null;
  private _thumbnailDir: string;
  private _isDisposed = false;

  static readonly DEFAULT_WIDTH = 256;
  static readonly DEFAULT_HEIGHT = 256;

  constructor(config: ThumbnailConfig) {
    this._config = config;
    this._thumbnailDir = join(config.workspacePath, '.animoria', 'thumbnails');
  }

  async generateBatch(
    assets: AnimoriaAsset[],
    signal?: AbortSignal
  ): Promise<ThumbnailBatchResult> {
    const start = performance.now();
    const concurrency = this._config.concurrency ?? 4;

    if (signal?.aborted || this._isDisposed) {
      throw new Error('Thumbnail generation aborted before starting.');
    }

    // Only process successfully parsed assets
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

    // Separate cached from work needed
    const cached: AnimoriaAsset[] = [];
    const toGenerate: AnimoriaAsset[] = [];

    for (const asset of parsed) {
      const exists = await fileExists(this._thumbnailPath(asset));
      if (exists) {
        cached.push(asset);
      } else {
        toGenerate.push(asset);
      }
    }

    const generatedResults: ThumbnailResult[] = [];

    const onAbort = () => {
      this.dispose().catch(() => {});
    };

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    try {
      if (toGenerate.length > 0 && !this._isDisposed) {
        this._browser = await puppeteer.launch({
          executablePath: this._config.chromiumPath,
          headless: true,
          handleSIGINT: true,
          handleSIGTERM: true,
          handleSIGHUP: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        });

        for (let i = 0; i < toGenerate.length; i += concurrency) {
          if (signal?.aborted || this._isDisposed) {
            break;
          }
          const batch = toGenerate.slice(i, i + concurrency);
          const settled = await Promise.allSettled(batch.map((asset) => this._generateOne(asset)));
          for (const outcome of settled) {
            if (outcome.status === 'fulfilled') {
              generatedResults.push(outcome.value);
            } else {
              // Should not reach here — _generateOne catches internally
              generatedResults.push({
                asset: toGenerate[i],
                thumbnailPath: null,
                fromCache: false,
                error: String(outcome.reason),
              });
            }
          }
        }
      }
    } finally {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      await this.dispose();
    }

    const cachedResults: ThumbnailResult[] = cached.map((asset) => ({
      asset,
      thumbnailPath: this._thumbnailPath(asset),
      fromCache: true,
    }));

    const allResults = [...cachedResults, ...generatedResults];
    const generated = generatedResults.filter((r) => r.thumbnailPath !== null).length;
    const failed = generatedResults.filter((r) => r.thumbnailPath === null).length;

    return {
      results: allResults,
      generated,
      fromCache: cachedResults.length,
      failed,
      durationMs: performance.now() - start,
    };
  }

  private _thumbnailPath(asset: AnimoriaAsset): string {
    const hash = createHash('md5').update(asset.path).digest('hex').slice(0, 8);
    return join(this._thumbnailDir, asset.stem + '-' + hash + '.png');
  }

  private async _generateOne(asset: AnimoriaAsset): Promise<ThumbnailResult> {
    const targetPath = this._thumbnailPath(asset);

    // Double-check cache (race condition between batch split and now)
    if (await fileExists(targetPath)) {
      return { asset, thumbnailPath: targetPath, fromCache: true };
    }

    // Para formatos planos rasterizados (GIF/APNG), copiamos directamente el archivo en la caché
    if (asset.format === 'gif' || asset.format === 'apng') {
      try {
        const content = await readFile(asset.path);
        await writeFile(targetPath, content);
        return { asset, thumbnailPath: targetPath, fromCache: false };
      } catch (err) {
        return {
          asset,
          thumbnailPath: null,
          fromCache: false,
          error: `Failed to copy raster file: ${err}`,
        };
      }
    }

    if (this._isDisposed || !this._browser) {
      return {
        asset,
        thumbnailPath: null,
        fromCache: false,
        error: 'Thumbnail generator has been disposed',
      };
    }

    const width = this._config.width ?? ThumbnailGenerator.DEFAULT_WIDTH;
    const height = this._config.height ?? ThumbnailGenerator.DEFAULT_HEIGHT;

    try {
      const page = await this._browser.newPage();
      try {
        await page.setViewport({ width, height });

        let htmlContent = '';
        if (asset.format === 'rive') {
          htmlContent = this._getRiveHtml(asset);
        } else if (asset.format === 'animated-svg') {
          htmlContent = this._getSvgHtml(asset);
        } else {
          htmlContent = this._getLottieHtml(asset);
        }

        await page.setContent(htmlContent, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForSelector('#ready', { timeout: 5000 });

        const screenshot = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width, height },
        });

        await writeFile(targetPath, screenshot as Buffer);
        return { asset, thumbnailPath: targetPath, fromCache: false };
      } finally {
        await page.close();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { asset, thumbnailPath: null, fromCache: false, error: message };
    }
  }

  private _getSvgHtml(asset: AnimoriaAsset): string {
    const raw = readFileSync(asset.path, 'utf-8');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
    svg { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  ${raw}
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const ready = document.createElement('div');
        ready.id = 'ready';
        document.body.appendChild(ready);
      }, 200);
    });
  </script>
</body>
</html>`;
  }

  private _getRiveHtml(asset: AnimoriaAsset): string {
    const raw = readFileSync(asset.path);
    const base64 = raw.toString('base64');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    canvas { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script src="https://unpkg.com/@rive-app/canvas@2.7.0" integrity="sha384-/eeUnIO+LtJFuHxtEY5yYVsmKsTCTjuvu2z8iuhGBPdGjwNjS9K7AItr+MyUr+Zh" crossorigin="anonymous"></script>
  <script>
    const base64Data = "${base64}";
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    rive.Rive.load({
      buffer: bytes.buffer,
      canvas: document.getElementById('canvas'),
      autoplay: true,
      onLoad: () => {
        setTimeout(() => {
          const ready = document.createElement('div');
          ready.id = 'ready';
          document.body.appendChild(ready);
        }, 500);
      },
      onLoadError: () => {
        const ready = document.createElement('div');
        ready.id = 'ready';
        document.body.appendChild(ready);
      }
    });
  </script>
</body>
</html>`;
  }

  private _getLottieHtml(asset: AnimoriaAsset): string {
    const frameStrategy = this._config.frame ?? 'first';
    const totalFrames =
      asset.metadata &&
      (asset.metadata.format === 'lottie' || asset.metadata.format === 'dotlottie')
        ? asset.metadata.totalFrames
        : 0;
    const targetFrame = frameStrategy === 'middle' ? Math.floor(totalFrames / 2) : 0;

    const raw = readFileSync(asset.path, 'utf-8');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js" integrity="sha384-J8C0MvgX4WP58J4N2W99vCKd2J6z99ynOJ5bEfE6jeP7kVTW1drYtv/jzrxM5jbm" crossorigin="anonymous"></script>
  <script>
    window.__ANIM_DATA__ = ${raw};

    const anim = lottie.loadAnimation({
      container: document.getElementById('container'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: window.__ANIM_DATA__,
    });

    anim.addEventListener('DOMLoaded', function() {
      anim.goToAndStop(${targetFrame}, true);
      const ready = document.createElement('div');
      ready.id = 'ready';
      document.body.appendChild(ready);
    });
  </script>
</body>
</html>`;
  }

  async dispose(): Promise<void> {
    this._isDisposed = true;
    if (this._browser) {
      try {
        await this._browser.close();
      } catch {
        // ignore already closed error
      } finally {
        this._browser = null;
      }
    }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
