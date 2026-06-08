# Changelog

All notable changes to **Animoria** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here.
     Move entries to a versioned section when the release ships. -->

### Added

### Fixed

### Changed

---

## [0.1.0] — 2026-06-08

### Added

- **animoria-core**: `FileScanner` — recursively globs Lottie (`.json`) and dotLottie (`.lottie`) files from a workspace path using `fast-glob` with absolute path output; skips files exceeding a configurable size limit.
- **animoria-core**: `LottieParser` — structural validation and metadata extraction (fps, totalFrames, durationSeconds, width, height, layerCount, markers) from Lottie JSON. Validates on `v`, `fr`, `layers` keys; rejects non-Lottie JSON silently.
- **animoria-core**: `DotLottieParser` — parses `.lottie` V2 binary ZIP archives via `@dotlottie/dotlottie-js`. Handles Node.js `Buffer` shared pool slice correctly. Extracts metadata from the primary animation and lists all contained animations with their IDs.
- **animoria-core**: `AssetParser` — concurrent pipeline that routes assets to the correct parser (Lottie or dotLottie) and produces parsed or errored `AnimoriaAsset` records.
- **animoria-core**: `Animoria` facade — `run()` orchestrates scan → parse pipeline with progress callbacks; `getAnimationData()` returns raw animation JSON for both Lottie and dotLottie assets.
- **animoria-core**: `UsageScanner` — searches source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.swift`, `.kt`, `.dart`, `.vue`, `.svelte`, `.py`, `.cs`) for references to an asset using four strategies: `pattern` (semantic patterns), `filename`, `stem`, `both`. Supports `scopePath` to restrict results to a directory subtree.
- **animoria-core**: `reference-patterns` — 9 semantic RegExp patterns covering JS/TS imports, `setAnimation()`, `source={}`, Android `R.raw.*`, Flutter `Lottie.asset()`, iOS `AnimationView(name:)`, and generic asset path strings.
- **animoria-core**: `ThumbnailGenerator` — headless Chromium renderer (via `puppeteer-core`) that captures a PNG frame (configurable: `first` or `middle`) from each Lottie asset. Thumbnails cached in `.animoria/thumbnails/` keyed by MD5 hash of the asset path to prevent name collisions.
- **animoria-core**: `GovernanceAnalyzer` — batch-concurrent analysis classifying assets as: Unused (0 references), Duplicate (identical MD5 file content), or Overused (references ≥ configurable threshold, default 10). Produces a `GovernanceReport` with ISO timestamp and duration.
- **animoria-core**: Full TypeScript type definitions for `AnimoriaAsset`, `AnimoriaMetadata`, `UsageReference`, `ThumbnailResult`, `GovernanceReport`, and all config interfaces.
- **animoria-vscode**: `AnimoriaTreeProvider` — VS Code `TreeDataProvider` with asset items (thumbnail, metadata description, usage ref count), usage reference leaf items (file:line, navigable), and governance section + issue items (collapsible, category-specific icons).
- **animoria-vscode**: `AnimoriaPreviewPanel` — WebView panel rendering Lottie animations via `@lottiefiles/lottie-player`. Identity tracked by `asset.path`; reloads only when the asset changes. Supports dotLottie animation selector for multi-animation archives.
- **animoria-vscode**: `AnimoriaFileWatcher` — watches the workspace for created, changed, and deleted animation files; notifies the tree provider for live updates without a full rescan.
- **animoria-vscode**: `resolveScopePath` utility — walks upward from an asset's directory to find the nearest project boundary file (`package.json`, `pubspec.yaml`, `Cargo.toml`, `go.mod`, `build.gradle`, etc.) for monorepo scope isolation.
- **animoria-vscode**: Commands: `animoria.refresh`, `animoria.openPreview`, `animoria.revealInExplorer`, `animoria.search`, `animoria.runGovernance`, `animoria.exportGovernanceReport`, `animoria.deleteAsset`.
- **animoria-vscode**: Settings: `animoria.chromiumPath`, `animoria.enableThumbnails`, `animoria.governance.overusedThreshold`.
- **animoria-vscode**: Governance export — saves report as Markdown (with summary table and per-category detail tables) or JSON via save dialog.
- **apps/animoria-sandbox**: Vite + Lit development sandbox for iterating on WebView components without launching an IDE.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
