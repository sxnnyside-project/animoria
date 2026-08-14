# Changelog

All notable changes to **Animoria** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [1.0.0] — 2026-08-12

### Added

- **Unified Governance Architecture**: Replaced dual analyzer paths with a single authoritative `WorkspaceAnalysis` aggregate contract across all packages.
- **Cross-Client Evidence Model**: `RuleDiagnostic` populated with structured `evidence`, `confidence`, `remediation`, `helpUri`, and `coverage`.
- **Expanded Syntax Tracing**: Multi-syntax usage scanning covering 23 file extensions (`.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.mdx`, `.dart`, `.swift`, `.kt`, `.html`, `.css`, etc.).
- **Shared UI Package (`@animoria/ui`)**: Reusable Lit-based web components (`animoria-workspace`, `animoria-finding`, `animoria-duplicate-group`, `animoria-evidence-panel`) shared by VS Code and JetBrains IDEs.
- **Daemon Protocol v1**: JSON-RPC stdio protocol with explicit sequence ordering, request timeouts, and cancellation tokens.
- **Multi-Root Workspace Support**: Independent indexing per workspace root with aggregated health metrics.
- **Reversible Duplicate Resolution**: Path-aware reference rewriter preserving relative style with local trash rollback.
- **Static Asset Inventory**: Discovery and metadata inspection for static SVG, PNG, JPEG, WebP, and AVIF files alongside animated formats.

### Changed

- **Single-Pass Indexing**: Reference indexer redesigned to read, glob, and compile matchers in a single pass (reducing reference workload times from 28s to ~86ms).
- **JetBrains Lifecycle**: Migrated from `GlobalScope` to project-scoped `AnimoriaCoroutineScope` to eliminate background coroutine leaks.
- **Deterministic Health Scoring**: Strict calculation model with explicit availability states (`missing-signal`, `no-rules-configured`, `no-assets`).

### Fixed

- Eliminated duplicate file deletion race conditions in JetBrains dialogs.
- Fixed root directory calculation errors during duplicate asset resolution in subdirectories.
- Prevented unhandled file watcher burst scheduling during rapid Git branch checkouts.

### Removed

- Removed deprecated `GovernanceAnalyzer` and legacy `overused` / `unused` categories.
- Removed all arbitrary arithmetic health delta projections and uncalibrated confidence estimates.
- Removed legacy headless Chromium / Puppeteer dependencies in favor of native in-IDE thumbnail renderers.

---

## [0.2.0] — 2026-06-15

### Added

- **Modular Parser Pipeline**: Strategy pattern parser architecture (`ParserRegistry`) supporting dynamic registration for Lottie, dotLottie, Rive, and animated SVG formats.
- **dotLottie V2 Support**: Decompression and multi-animation extraction from `.lottie` ZIP archives.
- **Initial JetBrains Plugin**: Background daemon integration bridging `@animoria/core` with the IntelliJ Platform SDK.

### Changed

- Transitioned thumbnail rendering pipeline to native in-process SVG extraction.

---

## [0.1.0] — 2026-05-01

### Added

- Initial release of Animoria as a Visual Asset Governance DevTool.
- Basic Lottie parsing and file discovery scanner.
- Initial VS Code extension with gallery view and JSON report exporter.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.1...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
