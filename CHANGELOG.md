# Changelog

All notable changes to **Animoria** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

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

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/sxnnyside-project/animoria/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
