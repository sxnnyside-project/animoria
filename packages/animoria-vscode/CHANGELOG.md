# Changelog — animoria-vscode

All notable changes to the **Animoria VS Code Extension** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [2.3.0] — 2026-10-06

### Added

- **Daemon Push Events & Status Bar**: Integrated unsolicited daemon push event subscription (`ready`, `analysis-started`, `analysis-completed`, `analysis-stale`) with a live interactive status bar item and health score badge.
- **O(1) Hover Resolution**: Replaced linear $O(N)$ string searches with an indexed `WeakMap` cache and token boundary extraction, delivering sub-millisecond hover response times without editor stutters.
- **Thumbnail LRU Caching & Native Path Priority**: Prioritized Rust pre-rendered `thumbnail_path` with an in-memory 250-entry LRU Data URI cache in `VsCodeHostBridge`, eliminating redundant disk reads and base64 conversions.
- **Native Diagnostics UX & QuickFixes**: `DiagnosticPublisher` tags `no-unreferenced-assets` with native `vscode.DiagnosticTag.Unnecessary` for dead-code faded styling, alongside rule-specific Lightbulb QuickFix actions (`animoria.startCleanupReview`, `animoria.deleteAsset`, `animoria.resolveDuplicates`, and `animoria.viewFindings`).
- **File Explorer Governance Badges (Fase A)**: `AnimoriaFileDecorationProvider` decorates assets in VS Code's native file explorer with `∅` (dimmed unreferenced), `2x`/`Nx` (duplicate warnings), and `!` governance badges.
- **Inline Asset CodeLenses (Fase B)**: `AnimoriaCodeLensProvider` displays size metrics, total workspace reference counts, and 1-click preview and duplicate resolution triggers directly above asset imports and tags in code.
- **Native Custom Asset Inspector (Fase C)**: `AnimoriaCustomEditorProvider` (`animoria.customAssetViewer`) opens Lottie, Rive, SVG, WebP, and raster assets in a full-featured interactive player tab within the main editor grid.
- **Tree Drag and Drop & Document Drop Edits (Fase D)**: `AnimoriaTreeDragAndDropController` and `AnimoriaDocumentDropEditProvider` enable dragging assets directly from the gallery into code editors with smart framework-aware snippet and image tag insertion.
- **Real VS Code Electron E2E Test Suite (Fase E)**: Configured `@vscode/test-electron` smoke test harness (`npm run test:electron`) to verify extension activation and command registration within headless VS Code/Electron instances.
- **Copilot & Language Model Tools (Fase F)**: Registered native `vscode.lm` tools (`animoria_searchAssets` and `animoria_getGovernanceReport`) allowing AI coding agents to search asset catalogs and inspect visual health metrics.
- **Daemon Resilience, Auto-Recovery & Timeout Guards**: Robust subprocess lifecycle management in `VsCodeDaemonClient` with auto-resuscitation upon unexpected termination, stdin stream write protection, stream cleanup on exit/error, and 30-second request timeouts.
- **Canonical Protocol v1 Contracts**: Direct integration with `@animoria/contracts` derived from Rust native core via `ts-rs`.
- **Extended Governance & Presets**: Full UI and diagnostics support for Biome-style rules (`naming-convention`, `svg-sanitization`, `max-dimensions`, `allowed-formats`) and `.animoriarc.json` configuration presets.

### Fixed

- **Strict Indexed Access & Contract Parity**: Eliminated undefined access diagnostics in tests and aligned all test fakes with lowercase protocol contract enums.

---

## [2.2.1] — 2026-09-30

### Added

- **Expanded Static Asset Previews & Governance**: Native support for previewing and governing `avif`, `bmp`, `eps`, `icns`, `ico`, `jpg`/`jpeg`, `odd`, `png`, `ps`, `psd`, `tiff`, and `webp` assets.
- **Dynamic Template & Source Tracing**: Automatic reference recognition in PHP, Blade, Twig, Jinja, Liquid, ERB, HTMX, GoHTML, CSHTML, and custom source extensions configured via `.animoriarc.json` (`tracing.includeSourceExtensions`).

### Fixed

- **File Watcher Debounce & Flicker Elimination**: Separated asset file changes from source reference changes with robust 300ms debounce, preventing continuous workspace re-indexing and UI diagnostic flickering during editing.
- **Fixture Directory Ignored**: Honor `.animoriaignore` directory patterns (e.g. `fixtures/`) recursively across the workspace tree.

---

## [2.2.0] — 2026-09-27

### Added

- **Precise Hover Token Bounds**: `AssetResolver` now evaluates exact cursor position within asset token boundaries, disambiguating multiple assets on the same line and eliminating whole-line false hovers.
- **Source-Code Diagnostics & Lightbulb Quick-Fixes**: In addition to asset files, diagnostics are now published at the referencing lines in source files. Registered `AnimoriaCodeActionProvider` offering quick-fixes for duplicate resolution, cleanup review, and governance audits.
- **Rendered Markdown Governance Preview**: The `animoria.viewGovernanceReport` command now invokes `markdown.showPreviewToSide` for an artifact-style preview instead of opening raw text.
- **Interactive Rive Web Runtime**: Integrated Rive web player in the preview stage with play/pause and scaling controls.

---

## [2.1.0] — 2026-09-08

### Added

- **Multi-Root Scanning**: `scanWorkspace()` now traverses all open workspace folders, aggregating health scores and displaying combined diagnostics across multi-root repositories.
- **Gitignore Integration**: Automatically adds `.animoria/` to the workspace's `.gitignore` if git is initialized and assets are indexed.
- **Configurable Audit Logging**: New setting `animoria.enableAuditLog` (default: `false`) prevents generation of `.animoria/audit-log.jsonl` and snapshots in repositories with no assets or when disabled.
- **Configurable Gitignore Automation**: New setting `animoria.autoGitignore` (default: `true`).

### Changed

- Status bar indicator now displays asset counts aggregated across all active workspace folders.

---

## [2.0.0] — 2026-08-31

### Added

- The extension now bundles a native `animoria` binary in `bin/`, built per platform (`linux-x64`, `linux-arm64`, `darwin-arm64`, `win32-x64`) — no separate install or system `PATH` entry required for the common case.
- Resolving duplicates no longer shows a confirmation dialog claiming references will be rewritten; that capability never existed on the daemon side, and the misleading line was removed rather than left in place.

### Changed

- The extension's native daemon is the Rust engine (`animoria-core-rust`) exclusively — see the root [CHANGELOG.md](../../CHANGELOG.md)'s `[2.0.0]` entry for the full engine migration.
- A cleanup candidate's confidence badge now reflects the diagnostic that actually produced the candidate, not a second, weaker lookup by asset path.
- The workspace health-score label (excellent/good/fair/poor) now derives from Core's own letter grade instead of a separately hand-picked set of score cutoffs.

### Fixed

- Invalid workspace paths no longer silently report "0 assets, all clear" from the underlying CLI/daemon.

---

## [1.0.1] — 2026-08-13

### Changed

- Maintenance release: dependency updates and release-pipeline fixes (Windows
  and macOS native daemon packaging, JetBrains build/signing). No user-facing
  changes to the extension itself.

---

## [1.0.0] — 2026-08-12

### Added

- **Shared UI Integration**: Integrated `@animoria/ui` Lit web components across the extension webview panel.
- **Multi-Root Support**: Full support for multi-root VS Code workspaces with dynamic workspace folder addition and removal.
- **Protocol v1 Communication**: Communicates with the core engine using the structured Protocol v1 JSON-RPC standard.
- **Problems Panel Integration**: Publishes structured governance rule violations directly to VS Code's Problems diagnostic tray.
- **Interactive Duplicate Resolver**: Visual comparison and import rewriting tool for duplicate assets.
- **Code Snippet Generator**: Copy-paste integration snippets for React, Vue, Flutter, SwiftUI, and Jetpack Compose.
- **Reversible Trash Staging**: Staged removals into `.animoria/trash/` with session manifest restoration.

### Changed

- Replaced ad-hoc HTML string templates in webview panels with `@animoria/ui` custom element bundle.
- Replaced single-root assumptions (`workspaceFolders[0]`) with multi-root session bridge.
- Improved hover card styling and responsive asset dimension caps.

### Fixed

- Resolved thumbnail cache invalidation bug when two files in different directories shared the same name stem.
- Fixed root path resolution errors during multi-folder duplicate resolution.
- Fixed UI blank screen issue caused by unbundled media assets.

---

## [0.2.0] — 2026-06-15

### Added

- Support for dotLottie (.lottie) and Rive (.riv) preview and metadata inspection.
- Enhanced reference tracing with support for Kotlin and Swift syntax.

---

## [0.1.0] — 2026-05-01

### Added

- Initial release of Animoria VS Code extension.
- Basic visual gallery and JSON report export.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/sxnnyside-project/animoria/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/sxnnyside-project/animoria/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/sxnnyside-project/animoria/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/sxnnyside-project/animoria/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sxnnyside-project/animoria/compare/v1.0.1...v2.0.0
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
