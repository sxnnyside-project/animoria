# Changelog — animoria-vscode

All notable changes to the **Animoria VS Code Extension** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [1.0.0] — 2026-07-27

### Added

- Swift (SwiftUI, `lottie-ios`) and Kotlin (Jetpack Compose, `lottie-compose`) code snippet generation, alongside React, Vue, and Flutter.
- `.animoriaignore` — a workspace-root, `.gitignore`-style file excluding matching assets from discovery entirely (gallery, governance, cleanup, duplicate detection, health score).
- Inline `// animoria-ignore` comment — suppresses one specific source-code line from counting as a usage match.
- Bulk Cleanup now stages removed assets in a workspace-local `.animoria/trash/<session>/` directory instead of permanently deleting them, with automatic 7-day retention.
- Assets in the tree view now show a distinct icon while thumbnail generation is in progress, versus a completed thumbnail (any tier, including the format badge), versus a genuine generation failure — previously all three looked the same.

### Changed

- Startup no longer blocks the tree view on reference-counting. Previously, `WorkspaceIndexer.initialize()` fired one unbounded, concurrent source-tree scan per parsed asset before the tree view could paint a single item — a workspace of a few hundred assets meant a few hundred simultaneous scans before first paint. The tree now populates immediately after the scan/parse phase; reference counts and the governance/health state that depend on them are established in the background (bounded to 6 concurrent scans) and arrive via a follow-up update a moment later.

### Fixed

- Hover card thumbnails no longer render as a broken-image icon for any thumbnail tier other than PNG/JPEG. The embed logic hardcoded `image/png` for every extension it didn't recognize, so vector-tier `.svg` thumbnails, embedded-image-tier `.webp`/`.gif` thumbnails, and source-copy `.svg`/`.gif` thumbnails were all base64-embedded with a mismatched MIME type and silently failed to decode. The MIME type is now derived from the thumbnail's actual file extension.
- Clicking the inline "Open Preview"/"Reveal in Explorer" icon on the "Animated Assets" / "Static Assets" / governance category section headers in the sidebar no longer opens a broken, empty Preview panel tab. Those headers are non-interactive category dividers, not openable items — the context-menu `when` clauses excluded other non-asset tree items (folders, health score) but not these three section headers.
- Lottie thumbnails: fixed the file scanner silently excluding any Lottie file whose `v`/`layers` keys fell past the first 1KB (common — real exports often put a large `assets` array first), and rewrote the vector renderer to walk into precomps, render solid layers, approximate gradients/strokes, and skip individual unsupported shapes instead of discarding the whole thumbnail. Validated against real animated asset files from official sources (lottie-web, lottie-android).
- Hover preview thumbnails are now capped to a smaller max width instead of rendering at full source resolution — they were often disproportionately large next to the rest of the card.
- Removed a dead computation in the Cleanup Panel's approve-stage byte total (a placeholder calculation immediately discarded and recomputed correctly right after it); no behavior change.
- Fixed a thumbnail cache-cleanup bug that deleted a _different_ asset's current thumbnail file whenever another asset with the same filename stem (e.g. two unrelated `icon.json` files in different folders — an entirely ordinary layout) regenerated its own thumbnail, leaving the tree view, hover card, and preview panel pointing at a file that no longer existed (a broken/missing-file icon). This was deterministic, not a race, and reproduced identically on every regeneration — clearing the thumbnail cache and regenerating could never fix it. Thumbnail filenames and cache cleanup are now scoped per-asset (by a path hash), not by stem alone.
- Bulk Cleanup now immediately refreshes the tree view, governance report, and Cleanup Review panel after execution, instead of waiting on the raw filesystem watcher.
- "Refresh" (`animoria.refresh`) no longer reports completion before governance state has actually finished recomputing.
- Viewing the Governance Report no longer opens a duplicate raw-source tab alongside the rendered preview.
- Directory-exclusion glob patterns (`**/some/nested/path`, including the default `node_modules`/`dist`/`build` exclusions) now correctly match at any nesting depth — a pre-existing bug limited them to skipping exactly one directory segment.

### Changed

- Thumbnail generation is now fully native (offscreen Canvas / SVG rendering) — Lottie/dotLottie assets render a vector-frame thumbnail directly from the parsed animation data, with a deterministic format badge as the fallback tier. No external Chrome/Chromium process is spawned or required.

### Removed

- The `animoria.chromiumPath` setting and the headless-Chrome thumbnail pipeline it configured have been removed entirely, along with the `chromium-path` auto-detection utility — superseded by the native rendering pipeline above. Any workspace or user setting for `animoria.chromiumPath` is now inert and can be deleted.

### Governance, Cleanup, and Duplicate Resolution

- Continuous background governance indexer — governance state (unused/duplicate/overused assets, `.animoriarc` rule violations, Asset Health Score) recomputes reactively as the workspace changes, without a manual "Run Governance" trigger.
- Declarative `.animoriarc` rules engine (`max-file-size-kb`, `no-gif`, `no-duplicate-names`, `no-unreferenced-assets`, `allowed-formats`).
- Assist Duplicate Resolution — side-by-side comparison panel for content-identical assets, with an explicit canonical-asset picker and atomic reference-rewrite + deletion via `WorkspaceEdit`.
- Bulk Safe Cleanup Review — multi-stage review panel (Analyze → Review → Approve → Execute → Summarize) for removing unused/oversized/duplicate/temporary-named assets in one confirmation.
- Inline Hover Preview — hovering an asset path string in source code shows a preview card with format, dimensions, duration, and usage-reference count.
- Multi-Framework Snippet Generator — copyable integration snippets for React, Vue, and Flutter from the Preview Panel and sidebar context menu.
- Headless CLI (`animoria check --ci`) for CI/CD governance gating.

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
- `animoria.chromiumPath` — manual Chromium path override _(removed in [1.0.0](#100--2026-07-27))_

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
