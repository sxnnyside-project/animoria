# @animoria/core

Pure TypeScript library for scanning, parsing, usage analysis, governance, and thumbnail generation of animated assets. No IDE dependencies. Consumed by `animoria-vscode` and re-implemented natively by `animoria-jetbrains`.

## Modules

| Module | Class | Responsibility |
| :--- | :--- | :--- |
| `scanner` | `FileScanner` | Globs `.json` and `.lottie` files from a workspace path; validates Lottie JSON structurally; returns `AnimoriaAsset[]` |
| `parsers` | `LottieParser` | Validates and extracts metadata (fps, frames, duration, dimensions, layers, markers) from a Lottie JSON object |
| `parsers` | `DotLottieParser` | Reads `.lottie` V2 ZIP archives; extracts metadata from the primary animation; lists all contained animations |
| `parser` | `AssetParser` | Routes pending assets to the correct parser concurrently; produces parsed or errored assets |
| `animoria` | `Animoria` | Facade that runs scan → parse in one call with progress callbacks |
| `usage` | `UsageScanner` | Searches source files for references to an asset using semantic patterns; supports `scopePath` for monorepo isolation |
| `thumbnails` | `ThumbnailGenerator` | Renders a PNG frame (first or middle) from a Lottie asset using headless Chromium via `puppeteer-core`; caches by path hash |
| `governance` | `GovernanceAnalyzer` | Batch-concurrent classification of assets as Unused, Duplicate (MD5), or Overused; returns a typed `GovernanceReport` |

## Installation

This package is part of the Animoria monorepo. It is not published to npm independently.

```bash
pnpm install
pnpm build   # compiles TypeScript to dist/
pnpm test    # runs Vitest test suite
```

## Usage Example

```typescript
import { Animoria, UsageScanner, GovernanceAnalyzer } from '@animoria/core';

// Scan and parse all animated assets in a workspace
const animoria = new Animoria({ workspacePath: '/path/to/project' });
const result = await animoria.run();
// result.assets — AnimoriaAsset[]
// result.parsed  — number of successfully parsed assets
// result.durationMs

// Find where an asset is used in source code
const scanner = new UsageScanner({
  workspacePath: '/path/to/project',
  asset: result.assets[0],
  strategy: 'pattern',
  scopePath: '/path/to/project/apps/web',  // optional monorepo scope
});
const { references } = await scanner.search();

// Run governance analysis
const analyzer = new GovernanceAnalyzer({
  workspacePath: '/path/to/project',
  assets: result.assets,
  overusedThreshold: 10,
});
const report = await analyzer.analyze();
// report.unused / report.duplicates / report.overused
```

## Key Constraints

- Zero VS Code or JetBrains API imports.
- All scanned paths are absolute (`fast-glob` runs with `absolute: true`).
- `asset.path` is the single identity key for all caching and deduplication.
- Lottie detection is structural (`v`, `fr`, `layers`), not extension-based.
- Cache (`ThumbnailGenerator`) is keyed by MD5 hash of `asset.path` to prevent collisions across same-named files in different directories.

## Tests

```bash
pnpm test
# 7 test suites, 97 tests
# lottie-parser, dotlottie-parser, file-scanner,
# asset-parser, usage-scanner, animoria, governance-analyzer
```
