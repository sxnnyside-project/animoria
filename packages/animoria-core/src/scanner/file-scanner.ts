import { promises as fs } from 'fs';
import { basename, extname } from 'path';
import { performance } from 'perf_hooks';
import fg from 'fast-glob';
import { LottieParser } from '../parsers/lottie-parser.js';
import type { ScannerConfig, ScannerResult, AnimoriaAsset } from '../types/index.js';
import type { AnimatedFormat } from '../types/asset.js';

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.turbo/**',
];

const DEFAULT_MAX_FILE_SIZE = 10_485_760; // 10 MB

const lottieParser = new LottieParser();

export class FileScanner {
  constructor(private config: ScannerConfig) {}

  async scan(): Promise<ScannerResult> {
    const start = performance.now();
    const { workspacePath, exclude = [], maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE } = this.config;

    const ignorePatterns = [...DEFAULT_EXCLUDE, ...exclude];

    const jsonFiles = await fg('**/*.json', {
      cwd: workspacePath,
      absolute: true,
      ignore: ignorePatterns,
    });

    const dotLottieFiles = await fg('**/*.lottie', {
      cwd: workspacePath,
      absolute: true,
      ignore: ignorePatterns,
    });

    const assets: AnimoriaAsset[] = [];
    let scannedFiles = 0;

    // Process .lottie (dotLottie) files — binary archives, no JSON parsing needed
    for (const filePath of dotLottieFiles) {
      scannedFiles++;
      const stat = await fs.stat(filePath);
      if (stat.size > maxFileSizeBytes) continue;

      const name = basename(filePath);
      const stem = basename(filePath, '.lottie');

      assets.push({
        path: filePath,
        name,
        stem,
        format: 'dotlottie' as AnimatedFormat,
        sizeBytes: stat.size,
        mtime: stat.mtimeMs,
        status: 'pending',
      });
    }

    // Process .json files — validate as Lottie JSON
    for (const filePath of jsonFiles) {
      scannedFiles++;

      const stat = await fs.stat(filePath);
      if (stat.size > maxFileSizeBytes) continue;

      let parsed: unknown;
      try {
        const content = await fs.readFile(filePath, 'utf8');
        parsed = JSON.parse(content);
      } catch {
        continue;
      }

      if (!lottieParser.validate(parsed)) continue;

      const name = basename(filePath);
      const stem = basename(filePath, extname(filePath));

      assets.push({
        path: filePath,
        name,
        stem,
        format: 'lottie',
        sizeBytes: stat.size,
        mtime: stat.mtimeMs,
        status: 'pending',
      });
    }

    return {
      assets,
      scannedFiles,
      durationMs: performance.now() - start,
    };
  }
}
