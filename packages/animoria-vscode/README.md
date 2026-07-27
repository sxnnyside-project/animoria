# Animoria — Visual Asset Governance for VS Code

![Animoria Banner](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/banner.png)

**Visual Asset Governance for VS Code — find every animated and static asset in your codebase, see where it's used, and clean up what isn't.**

Animated assets (Lottie, dotLottie, Rive, GIF, APNG, animated SVG) and static assets (SVG, PNG, JPEG, WebP, AVIF) both pile up in every codebase that ships design: duplicates get checked in under different names, orphaned exports outlive the screens they were built for, and nothing tells you which is which. Animoria scans your workspace, builds a visual gallery of every asset, and traces each one back to where it's actually used in code — so you can delete with confidence instead of guessing.

## Why Animoria

- **See it, don't guess it.** A live gallery with thumbnails and playback for every asset in your workspace — animated and static — always up to date.
- **Know what's safe to delete.** Governance analysis flags Unused, Duplicate, and Overused animated assets automatically — no manual auditing. Static-asset governance ships in a later release; discovery is available today.
- **Trace usage, not just files.** Every asset links to the exact file and line that references it, across TypeScript, JavaScript, Swift, Kotlin, Dart, Vue, and Svelte.
- **Clean up safely.** Review and resolve duplicates, delete orphans, and export a governance report — all from the sidebar.
- **Zero setup, zero network calls.** Works the moment you open a workspace. Everything runs locally; nothing leaves your machine.

## Getting Started

1. Install the extension and open a workspace containing visual assets.
2. Animoria scans automatically — no configuration required.
3. Click the Animoria icon in the Activity Bar to open the Gallery.
4. Click any asset to preview it, or expand it to see where it's used in code.
5. Click the shield icon (⛨) to run Governance Analysis and see Unused, Duplicate, and Overused assets.

## Screenshots

| Preview Panel | Governance Report | Bulk Cleanup Review |
| :---: | :---: | :---: |
| ![Preview Panel](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/screenshots/preview-panel.png) | ![Governance Report](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/screenshots/governance-report.png) | ![Cleanup Review](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/screenshots/cleanup-review.png) |

## Supported Formats

**Animated** — full governance (usage tracking, duplicate/unused/overused detection), metadata, thumbnails, playback:

| Format       | Extension |
| :----------- | :-------- |
| Lottie       | `.json`   |
| dotLottie    | `.lottie` |
| Rive         | `.riv`    |
| GIF          | `.gif`    |
| APNG         | `.apng`   |
| Animated SVG | `.svg`    |

**Static** — discovered and browsable in their own Gallery section today; governance (duplicate/unused detection) ships in a later release:

| Format | Extension                    |
| :----- | :---------------------------- |
| SVG    | `.svg`                        |
| Raster | `.png`, `.jpg`/`.jpeg`, `.webp`, `.avif` |

## Comparison

| Capability              | Animoria | LottieFiles for VS Code | Standard IDE Explorer |
| :----------------------- | :------: | :----------------------: | :--------------------: |
| Workspace Auto-Scanning |    ✅    |            ✅            |           —            |
| Inline Thumbnails       |    ✅    |            ✅            |           —            |
| Code Usage Tracking     |    ✅    |            —            |           —            |
| Asset Governance        |    ✅    |            —            |           —            |
| dotLottie Support       |    ✅    |            —            |           —            |
| Multi-Format            |    ✅    |       Lottie only       |           —            |
| Offline-First           |    ✅    |            —            |           ✅            |
| Open Source Core        |    ✅    |            —            |           —            |

## What You Get

- **Gallery Sidebar** — a live, auto-refreshing tree of every asset in your workspace, animated and static, with thumbnails, FPS/duration/reference-count summaries, and inline search.
- **Governance Analysis** — Unused (zero references), Duplicate (identical content), and Overused (referenced past a configurable threshold) animated assets, exportable as Markdown or JSON.
- **Preview Panel** — full playback controls, complete metadata (format, FPS, duration, frames, dimensions, layers, markers, file size), and every code reference, one click away.
- **Cleanup & Duplicate Resolution** — review flagged assets and resolve duplicates directly from the sidebar, with confirmation before anything is deleted.
- **Code Snippets** — one-click, paste-ready integration snippets for React, Vue, Flutter, SwiftUI, and Jetpack Compose.
- **Native Thumbnails** — rendered in-process, no Chrome/Chromium install required.

## Configuration

Animoria works with no configuration. For workspace-wide governance policy (`.animoriarc`) and excluding paths from discovery (`.animoriaignore`), see [Configuration](https://github.com/sxnnyside-project/animoria/blob/main/docs/CONFIGURATION.md).

| Setting                                 | Default | Description                                                    |
| :--------------------------------------- | :------ | :--------------------------------------------------------------- |
| `animoria.enableThumbnails`             | `true`  | Generate thumbnail previews for animated assets in the sidebar. |
| `animoria.governance.overusedThreshold` | `10`    | References at or above this count flag an asset as Overused.   |

## Requirements

- VS Code 1.85 or later
- No Chrome/Chromium installation needed

## Known Limitations

- Vector thumbnail rendering covers the vast majority of real-world Lottie exports; assets with no renderable visual content (e.g. text-only layers) fall back to a format badge.
- Usage search is pattern-based; dynamic `require()` calls with computed paths may not be detected.

## Learn More

- [Repository](https://github.com/sxnnyside-project/animoria)
- [Release Notes](CHANGELOG.md)
- [Report an Issue](https://github.com/sxnnyside-project/animoria/issues)

---

_Animoria is a Sxnnyside Project tool. &copy; 2026 Sxnnyside Project._
