# Changelog — @animoria/core

All notable changes to the **@animoria/core** package are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [1.0.0] — 2026-08-12

### Added

- **Unified `WorkspaceAnalysis` Aggregate**: Centralized, immutable analysis contract carrying `assets`, `diagnostics`, `duplicateGroups`, `coverage`, and deterministic `health`.
- **Structured Evidence & Diagnostic Model**: `RuleDiagnostic` populated with concrete `evidence`, `confidence`, `remediation`, and `helpUri`.
- **Single-Pass Reference Indexing**: Scans and compiles matchers across 23 source file extensions (`.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.mdx`, `.dart`, `.swift`, `.kt`, `.html`, `.css`, etc.) in a single linear pass.
- **Daemon Protocol v1**: JSON-RPC stdio server with strict sequence numbers, request IDs, request timeouts, and cancellation tokens.
- **Multi-Root Workspaces (`WorkspaceSession`)**: Supports multi-root workspace monitoring with isolated per-root analyses and aggregated health reporting.
- **Reversible Cleanup & Duplicate Resolution**: `buildCleanupPlan`, `buildResolutionPlan`, and `executeCleanupPlan` staging files to `.animoria/trash/` with session manifest rollback.
- **Static Asset Inventory**: Discovery and metadata parsing for static SVG, PNG, JPEG, WebP, and AVIF files.

### Changed

- Replaced legacy quadratic AST scans with single-pass regex compiled matcher trees ($O(\text{files})$ execution).
- Health score calculation made strictly deterministic with explicit availability states (`computed`, `no-rules-configured`, `no-assets`).

### Removed

- Removed deprecated `GovernanceAnalyzer` and legacy `overused` / `unused` categories.
- Removed legacy headless Chromium / Puppeteer dependencies in favor of native in-process SVG extraction and format badges.

---

## [0.2.0] — 2026-06-15

### Added

- **Modular Parser Pipeline**: Strategy pattern parser architecture (`ParserRegistry`) supporting dynamic registration for Lottie, dotLottie, Rive, and animated SVG formats.
- **dotLottie V2 Support**: Decompression and multi-animation extraction from `.lottie` ZIP archives.

---

## [0.1.0] — 2026-06-08

### Added

- Initial release of `@animoria/core`.
- `FileScanner`, `LottieParser`, `DotLottieParser`, and `UsageScanner`.
- Basic CLI check command.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.1...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
