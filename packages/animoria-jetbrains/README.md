# Animoria — Visual Asset Governance for JetBrains

**Trace, audit, and clean animated and static assets (Lottie, dotLottie, Rive, GIF, APNG, Animated SVG, plus static SVG/PNG/JPEG/WebP/AVIF) directly inside your JetBrains IDE.**

---

## Why Animoria?

Managing visual assets — motion or static — in large-scale modern applications is a frequent source of silent technical debt:

- **Duplicate Accumulation:** Identical assets are checked into different project directories under different names, inflating production bundles/APKs.
- **Orphan Files:** Legacy assets remain in the codebase long after their corresponding screens or features have been deprecated or refactored.
- **Zero Traceability:** Static code search makes it tedious and error-prone to map which files are active and which are safe to delete.

**Animoria** resolves this by bringing visual workspace discovery, structural analysis, and reference tracing directly into your IDE's sidebar. Install the plugin, open a project — Animoria scans automatically, with nothing to configure.

---

## Core Capabilities

### Asset Governance & Deduplication

Run a structural analysis of all animated assets in your workspace at the click of a button (static-asset governance ships in a later release — see [ROADMAP.md](https://github.com/sxnnyside-project/animoria/blob/main/ROADMAP.md)):

- **Unused (Orphans):** Instantly flags assets with `0` active references in code, so you can delete them and trim repository bloat safely.
- **Duplicates (MD5 Verification):** Computes MD5 checksums of files to locate duplicate animations across modules, helping you merge redundancy.
- **Overused Assets:** Identifies assets referenced in more files than a customizable threshold (default: `10`), highlighting refactoring candidates that should be centralized.

### Code Reference Tracing

Animoria searches your codebase in the background using optimized pattern matching to discover references across files (`.kt`, `.java`, `.ts`, `.tsx`, `.js`, `.jsx`, `.swift`, `.dart`, etc.). Usage references are presented as interactive nodes — clicking a reference navigates you directly to the target line in the editor. A lightweight editor hover surfaces the same information inline while you read code.

### Monorepo & Module Scoping

In multi-module or monorepo workspaces, reference tracing is scoped to the nearest project boundary (resolved via `package.json`, `Cargo.toml`, etc.) to guarantee fast scanning times and avoid cross-package reference pollution.

### Configurable Governance Policy

Workspace-wide rules (`.animoriarc`) and discovery exclusions (`.animoriaignore`) let a team codify its own conventions — see [Configuration](https://github.com/sxnnyside-project/animoria/blob/main/docs/CONFIGURATION.md) for the full reference. Both are optional; Animoria works with zero configuration out of the box.

### Safe Cleanup & Duplicate Resolution

Review flagged assets in a dedicated Cleanup panel before anything happens, and resolve duplicate groups by picking a canonical copy to keep. Every removal — single asset, bulk cleanup, or duplicate resolution — moves files to `.animoria/trash/` instead of deleting them outright, and asks for explicit confirmation first.

---

## Comparison

| Capability                  | Animoria | Android Studio Resource Manager | Standard IDE File Explorer |
| :--------------------------- | :------: | :-------------------------------: | :--------------------------: |
| Workspace Auto-Scanning     |    ✅    |          ✅ (drawables)          |             —              |
| Code Usage Tracking         |    ✅    |                 —                 |             —              |
| Asset Governance            |    ✅    |                 —                 |             —              |
| Multi-Format (Lottie/Rive/GIF/APNG/SVG) | ✅ |          — (drawables only)      |             —              |
| Works Across the JetBrains Family |  ✅  |         Android Studio only       |             ✅              |
| Offline-First                |    ✅    |                 ✅                |             ✅              |
| Open Source Core             |    ✅    |                 —                 |             —              |

---

## Supported Formats

- **Lottie & dotLottie:** Technical metadata (FPS, frames, layers, timeline markers, dimensions), control players, and code references.
- **Rive (.riv):** Extraction of Artboards, State Machines, and references.
- **Raster Animations (GIF/APNG):** Loop counts, frame counts, dimensions, and reference mapping.
- **Animated SVG:** Approximate DOM element counts, SMIL/CSS animation checks, and reference mapping.
- **Static SVG, PNG, JPEG, WebP, AVIF:** Indexed as a separate workspace inventory (discovery only — governance analysis currently covers animated formats).

---

## Requirements

- Any JetBrains IDE built on the 2024.1 platform or later — IntelliJ IDEA, Android Studio, WebStorm, PyCharm, GoLand, Rider, PhpStorm, RubyMine, CLion, DataGrip, and others. The plugin depends only on the common IntelliJ Platform module, not on a specific IDE.
- No separate Node.js install required — the plugin bundles a self-contained native daemon.

## Known Limitations

- The editor hover is a lightweight, substring-based approximation, not a full language-server-grade reference check; the Gallery's usage-reference list is the authoritative source.
- Live animation playback in the preview renders a static representative frame rather than full frame-by-frame playback.
- Static-asset governance (duplicate/unused detection) is not yet implemented — discovery only, today.

---

## Offline & Secure by Design

Animoria runs entirely locally on your machine. Files are scanned, audited, and processed local-first. No network calls are made, ensuring that your codebase intellectual property and design assets remain secure.

---

## Learn More

- [Repository](https://github.com/sxnnyside-project/animoria)
- [Configuration Reference](https://github.com/sxnnyside-project/animoria/blob/main/docs/CONFIGURATION.md)
- [Report an Issue](https://github.com/sxnnyside-project/animoria/issues)
