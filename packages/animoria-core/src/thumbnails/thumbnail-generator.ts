import puppeteer from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';
import { mkdir, writeFile, access } from 'fs/promises';
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

  static readonly DEFAULT_WIDTH = 256;
  static readonly DEFAULT_HEIGHT = 256;

  constructor(config: ThumbnailConfig) {
    this._config = config;
    this._thumbnailDir = join(config.workspacePath, '.animoria', 'thumbnails');
  }

  async generateBatch(assets: AnimoriaAsset[]): Promise<ThumbnailBatchResult> {
    const start = performance.now();
    const concurrency = this._config.concurrency ?? 4;

    // Only process successfully parsed assets
    const parsed = assets.filter(a => a.status === 'parsed');

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

    if (toGenerate.length > 0) {
      this._browser = await puppeteer.launch({
        executablePath: this._config.chromiumPath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      });

      try {
        for (let i = 0; i < toGenerate.length; i += concurrency) {
          const batch = toGenerate.slice(i, i + concurrency);
          const settled = await Promise.allSettled(
            batch.map(asset => this._generateOne(asset))
          );
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
      } finally {
        await this._browser.close();
        this._browser = null;
      }
    }

    const cachedResults: ThumbnailResult[] = cached.map(asset => ({
      asset,
      thumbnailPath: this._thumbnailPath(asset),
      fromCache: true,
    }));

    const allResults = [...cachedResults, ...generatedResults];
    const generated = generatedResults.filter(r => r.thumbnailPath !== null).length;
    const failed = generatedResults.filter(r => r.thumbnailPath === null).length;

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

    const width = this._config.width ?? ThumbnailGenerator.DEFAULT_WIDTH;
    const height = this._config.height ?? ThumbnailGenerator.DEFAULT_HEIGHT;

    try {
      const page = await this._browser!.newPage();
      try {
        await page.setViewport({ width, height });
        await page.setContent(this._getLottieHtml(asset), {
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

  private _getLottieHtml(asset: AnimoriaAsset): string {
    const frameStrategy = this._config.frame ?? 'first';
    const totalFrames = asset.metadata?.totalFrames ?? 0;
    const targetFrame = frameStrategy === 'middle'
      ? Math.floor(totalFrames / 2)
      : 0;

    // Embed raw JSON directly — it's already valid JSON, no stringify needed
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
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
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
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
