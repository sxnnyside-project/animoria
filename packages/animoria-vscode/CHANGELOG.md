# Changelog — animoria-vscode

All notable changes to the **Animoria VS Code Extension** are documented here.

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

- `AnimoriaTreeProvider` — VS Code `TreeDataProvider` rendering a three-level hierarchy: asset items (thumbnail icon, metadata description, usage ref count) → usage reference leaf items (file:line, navigable via `vscode.open`) → governance section headers → governance issue items.
- `AnimoriaPreviewPanel` — WebView panel rendering Lottie animations with `@lottiefiles/lottie-player`. Identity tracked by `asset.path`; reloads only when the displayed asset changes. Supports dotLottie multi-animation selector for archives containing more than one animation. Shows fps, dimensions, duration, layer count, and usage references in the panel sidebar.
- `AnimoriaFileWatcher` — watches the workspace for created, changed, and deleted `.json` / `.lottie` files; notifies the tree provider via callbacks for live gallery updates without a full rescan.
- `resolveScopePath` utility — walks upward from an asset's directory to find the nearest project boundary file (`package.json`, `pubspec.yaml`, `Cargo.toml`, `go.mod`, `build.gradle`, `build.gradle.kts`, `Podfile`, `Package.swift`, `pyproject.toml`) for monorepo scope isolation in usage scanning.
- `chromium-path` utility — auto-detects Chrome/Chromium executable across macOS, Windows, and Linux default install paths.
- Commands: `animoria.refresh`, `animoria.openPreview`, `animoria.revealInExplorer`, `animoria.search` (quick-pick with live filter), `animoria.runGovernance`, `animoria.exportGovernanceReport`, `animoria.deleteAsset` (with modal confirmation).
- Governance analysis — `runGovernance()` invokes `GovernanceAnalyzer` with configurable threshold and per-asset scope resolver; displays results as collapsible sidebar sections; status bar summary on completion; inline offer to export.
- Governance export — saves as Markdown (summary table + per-category detail tables with emoji category headers) or JSON via save dialog; opens the file on confirmation.
- Settings: `animoria.chromiumPath` (string, auto-detect default), `animoria.enableThumbnails` (boolean, default true), `animoria.governance.overusedThreshold` (number, default 10, min 1).
- Menu contributions: refresh and search buttons in view/title; shield icon button for governance; delete inline button on governance issue items; export in context menu on governance section headers; reveal in explorer in asset context menu.
- Thumbnail generation — non-blocking background task after scan; status bar shows generated/cached/failed counts; graceful fallback with settings link when Chromium is not found.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2026-06-08

### 🎉 Initial MVP Release

This is the first public release of Animoria — Visual Asset Memory for Developers.

#### Added

**Gallery Sidebar**
- Auto-scans workspace for Lottie `.json` animation files on activation and on workspace change
- Collapsible tree view with per-asset usage references as child nodes
- Inline quick-pick search to filter assets by name
- Refresh command to manually re-trigger a full scan
- Status bar progress during scan and thumbnail generation

**Enhanced Preview Panel**
- Thumbnail header — static PNG identity image, asset name, format badge, and FPS/duration/dimension summary
- Live Lottie player with Play, Pause, Restart, and Loop toggle controls
- Metadata grid — 8 fields: Format, FPS, Duration, Frames, Dimensions, Layers, Markers, File Size
- Usage References section — async pattern search across source files; each result is clickable and jumps to the exact line
- Quick Actions — Copy Path, Copy Name (stem), Reveal in Explorer
- "Searching codebase…" loading state while usage scan runs; results appear progressively

**Usage Scanner (`@animoria/core`)**
- Pattern-based search across `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`, `.swift`, `.kt`, `.dart`, `.py`, `.cs`, `.svelte`
- Batch file processing with configurable concurrency
- Returns file path, line number, and matched line content

**Thumbnail Generator (`@animoria/core`)**
- Headless Chrome renders a PNG from the middle frame of each animation
- Disk cache keyed by content hash — unchanged files skip re-render
- Background non-blocking generation; gallery is immediately usable while thumbnails load
- Auto-detection of Chrome/Chromium on macOS, Windows, and Linux
- Manual override via `animoria.chromiumPath` setting

**File Watcher**
- Real-time monitoring for added, changed, and removed animation files
- Panel notifies user when the currently previewed asset is deleted

**Settings**
- `animoria.enableThumbnails` — toggle thumbnail generation
- `animoria.chromiumPath` — manual Chromium path override

---

## [Unreleased]

### Planned

- `.lottie` (dotLottie zip format) support
- GIF export from preview panel
- Marker navigation controls in the player
- Multi-root workspace support
- Configurable scan include/exclude glob patterns
- Light theme gallery banner
