# Changelog

All notable changes to **Animoria** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [2.2.1] — 2026-09-30

### Added

- **Expanded Static Asset Discovery & Parser Engine**: Added support for `avif`, `bmp`, `eps`, `icns`, `ico`, `jpg`/`jpeg`, `odd`, `png`, `ps`, `psd`, `tiff`, and `webp` with magic-byte verification, header parsing, dimension extraction, and format badges.
- **Dynamic Framework & Template Tracing**: Expanded built-in source code tracing to cover PHP, Blade, Twig, Liquid, ERB, Nunjucks, EJS, Handlebars, Mustache, Jinja, HEEx, HTMX, GoHTML, Razor/CSHTML, Python, Ruby, Rust, Go, C/C++, C#, and TOML.
- **Configurable Source Extensions in `.animoriarc.json`**: Added `tracing.includeSourceExtensions` and `tracing.ignoredSourceExtensions` to governance schema and native engine, enabling custom template engines and proprietary extensions to be traced or excluded dynamically.
- **Nested Quote Token Extraction**: Tracing engine recursively inspects inner quoted strings and HTML attributes (e.g. `src="..."` inside single-quoted strings or template literals).

### Fixed

- **Directory-Level `.animoriaignore` Matching**: Trailing-slash patterns (such as `fixtures/`) and relative directory exclusions are now normalized and matched recursively against nested assets, preventing unwanted fixture directories from being ingested.
- **File Watcher Debouncing & Incremental Rescan**: Fixed aggressive re-scanning loops and error view flickering on rapid edits by debouncing change events and isolating asset modifications from source code references.

---

## [2.2.0] — 2026-09-27

### Added

- **Multi-Route Reference Disambiguation**: Path tokens (`./`, `../`, subpaths) in source files are now normalized to resolve to their exact target asset directory, eliminating false positive matches between homonymous assets in different folders.
- **Multiline Comment Filtering**: Source code scanner ignores block comments (`/* ... */` and `<!-- ... -->`).
- **Markdown Reference Confidence**: Asset mentions in `.md` and `.mdx` files now receive `"low"` confidence, ensuring orphan governance audits are not masked by documentation references.
- **Cursor Column Precision in Editor Hovers**: VS Code and JetBrains hover providers now check the exact cursor column within token bounds, supporting multiple assets per line and eliminating spurious whole-line triggers.
- **Multilingual Rive Parsing**: Rive `.riv` parser recognizes Spanish animation identifiers and candidate names.
- **Raster Downscaling & Thumbnail Caching**: Large raster images (>256px) are automatically downscaled and cached under `.animoria/thumbnails/` to optimize WebView memory.
- **Interactive Rive Web Player**: Added `@rive-app/canvas` runtime to `@animoria/ui` stage with play/pause, speed, and zoom controls.
- **Native Static Boilerplate Snippets**: Generates idiomatic code snippets for SwiftUI (`Image`), Flutter (`Image.asset`), and Jetpack Compose (`Image`).
- **Visual Asset Timeline Panel**: New Lit component (`animoria-timeline-panel`) in `@animoria/ui` rendering historical snapshots and audit events.
- **Source-Code Diagnostics & Quick-Fixes**: In VS Code, governance diagnostics are attached directly to import lines in source files with Lightbulb Quick-Fixes (`AnimoriaCodeActionProvider`).
- **Rendered Markdown Governance Report**: VS Code opens governance reports using `markdown.showPreviewToSide` for an artifact-style view.

---

## [2.1.0] — 2026-09-08

### Added

- **Ergonomics DX / Zero-Asset Quiet Mode**: The daemon no longer creates the `.animoria/` governance directory, `audit-log.jsonl`, or `snapshots.jsonl` when opening workspaces that contain zero visual assets.
- **Git Ignore Auto-Provisioning**: Automatically appends `.animoria/` to `.gitignore` when initializing workspaces or indexing visual assets in Git repositories.
- **Multi-Root Workspace Scanning**: VS Code extension now indexes and aggregates diagnostics across all configured `workspaceFolders` rather than only the first root.
- **New VS Code Settings**:
  - `animoria.enableAuditLog` (boolean, default: `false`): Enables writing governance audit logs and snapshots to `.animoria/`.
  - `animoria.autoGitignore` (boolean, default: `true`): Automatically configures `.gitignore` when visual assets are indexed.

### Changed

- **Build / Toolchain**:
  - Upgraded JetBrains plugin Gradle wrapper to `8.14.4` to eliminate deprecation warnings under Kotlin 2.5 while preserving Gradle 8 plugin compatibility.
  - Bumped CI actions `actions/setup-java` to v6.0.0 and `softprops/action-gh-release` to v3.0.3.
  - Bumped `kotlinx-serialization-json` to 1.11.0.

### Fixed

- JetBrains: Corrected redundant boolean condition when evaluating rewrite proposals in `JetBrainsHostBridge.kt`.
- Rust Core: Suppressed `ts-rs` serde attribute parsing warnings using the official `no-serde-warnings` crate feature.

---

## [2.0.0] — 2026-08-31

### Added

- **CLI `restore` command**: lists and restores a `clean --apply` trash session, reusing the same journal the daemon already recorded.
- **CLI global flags**: `--verbose`/`-v`, `--quiet`/`-q`, `--no-color`; output respects `NO_COLOR` and non-TTY pipes.
- **Property-based fuzz tests** (`proptest`) for the Lottie/Rive/PNG/GIF/WebP/SVG parsers against arbitrary and truncated-signature input.
- **Path-containment checks** on every trash/restore operation, in both the daemon and the CLI (`TrashManager::require_within_workspace`).
- A cap on the daemon's NDJSON line reader (64 MiB), replacing an unbounded `BufRead::lines()`.

### Changed

- **Engine replaced**: `@animoria/core` (TypeScript) is retired; `animoria-core-rust` is now the sole engine behind the CLI, the daemon, and every IDE host. See `packages/animoria-core-rust/README.md` for real before/after numbers.
- **`clean` no longer mutates by default**: it previews what would move; `--apply` is required to actually stage files. Previously `--dry-run` was opt-in.
- **`report`'s exit code now reflects governance errors**, matching `check` — it previously always returned `0`.
- **Release pipeline builds and ships the real Rust binary**: `build-native-daemon` compiles native per platform instead of the retired Node SEA binary, and the VS Code extension now bundles a per-platform binary in its `.vsix` (it previously shipped none).

### Fixed

- Invalid workspace paths passed to `scan`/`check`/`report`/`clean` now fail with a clear error and non-zero exit, instead of silently reporting "0 assets, all clear."
- JetBrains: a `MissingFieldException` crash on decoding any real multi-root analysis — `MultiRootAnalysisData.assets`/`.diagnostics` were typed for an attribution wrapper the daemon never sends.
- VS Code: a cleanup candidate's confidence badge could reflect an unrelated diagnostic on the same asset path, from a second, weaker lookup instead of the diagnostic that actually produced the candidate.
- VS Code: the health-score state (excellent/good/fair/poor) could disagree with Core's own letter grade — it was derived from a different, hand-picked set of score cutoffs.

### Removed

- **`@animoria/core`** (the TypeScript engine), its Node SEA build (`build:sea`), and every fallback path to it — the CLI, the daemon binary resolvers, and the release pipeline are Rust-only now.
- **`animoria-jetbrains`'s Node/`cli.js` daemon fallback** — a platform with no bundled native binary now fails explicitly instead of spawning a system Node install.
- **`ResolutionPlan.references_to_rewrite` / `ResolutionResult.updatedReferenceCount`**, across the wire contract, the daemon, and both IDE hosts. The field was never implemented in the Rust engine — always an empty list / `0` — but VS Code's duplicate-resolution confirmation dialog used it to claim "N reference(s) will be rewritten," a capability that does not exist. Removed rather than left as a stub; see `docs/guides/07-duplicates-resolution.md` for what real reference-rewriting would require.

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

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/sxnnyside-project/animoria/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/sxnnyside-project/animoria/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/sxnnyside-project/animoria/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sxnnyside-project/animoria/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
