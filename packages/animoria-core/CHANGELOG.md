# Changelog — @animoria/core

All notable changes to the **@animoria/core** package are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

### Added

### Fixed

### Changed

---

## [0.1.0] — 2026-06-08

### Added

- `FileScanner` — globs `.json` and `.lottie` files from a workspace using `fast-glob` with `absolute: true`; validates Lottie JSON structurally; enforces configurable file-size limit (default 10 MB).
- `LottieParser` — validates Lottie JSON by checking `v`, `fr`, and `layers` keys; extracts fps, totalFrames, durationSeconds, width, height, layerCount, and named markers.
- `DotLottieParser` — parses `.lottie` V2 binary ZIP archives via `@dotlottie/dotlottie-js`; correctly slices Node.js `Buffer` shared pool; extracts primary-animation metadata and full animation manifest.
- `AssetParser` — concurrent pipeline routing assets to `LottieParser` or `DotLottieParser`; configurable concurrency; returns typed parsed/errored results.
- `Animoria` facade — `run()` orchestrates scan → parse with `onScanComplete` and `onAssetParsed` callbacks; `getAnimationData()` returns raw JSON for both Lottie and dotLottie assets.
- `UsageScanner` — searches source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.swift`, `.kt`, `.dart`, `.vue`, `.svelte`, `.py`, `.cs`) using four strategies: `pattern`, `filename`, `stem`, `both`. Supports `scopePath` subtree filtering for monorepo isolation. Batches file reads in groups of 8.
- `reference-patterns` — 9 semantic RegExp patterns covering JS/TS imports and requires, `setAnimation()`, `source={}`, Android `R.raw.*`, Flutter `Lottie.asset()`, iOS `LottieAnimationView(name:)` / `AnimationView(name:)`, and generic asset path strings.
- `ThumbnailGenerator` — headless Chromium renderer via `puppeteer-core`; captures configurable frame (first or middle); caches thumbnails in `.animoria/thumbnails/` keyed by 8-char MD5 prefix of `asset.path`; concurrent batch generation.
- `GovernanceAnalyzer` — classifies parsed assets as Unused (0 refs), Duplicate (identical MD5 file hash), or Overused (refs ≥ threshold); batch-concurrent usage scanning and hashing (batch size 4); returns typed `GovernanceReport` with ISO timestamp and duration.
- Type definitions: `AnimoriaAsset`, `AnimoriaMetadata`, `DotLottieManifestEntry`, `AnimatedFormat`, `AssetStatus`, `UsageReference`, `UsageSearchConfig`, `UsageSearchResult`, `ThumbnailConfig`, `ThumbnailResult`, `ThumbnailBatchResult`, `GovernanceCategory`, `GovernanceIssue`, `GovernanceConfig`, `GovernanceReport`.
- Test suite: 97 tests across 7 suites — `lottie-parser`, `dotlottie-parser`, `file-scanner`, `asset-parser`, `usage-scanner`, `animoria`, `governance-analyzer`.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
