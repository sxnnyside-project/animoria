# Animoria — Codebase Governance & Visual Asset Memory for IntelliJ

**Trace, audit, and clean animated assets (Lottie, dotLottie, Rive, GIF, APNG, and Animated SVG) directly inside your JetBrains IDE.**

---

## Why Animoria?

Managing animated assets in large-scale modern applications (such as Android apps or frontend web applications) is a frequent source of silent technical debt:

- **Duplicate Accumulation:** Identical animations are checked into different project directories under different names, inflating production bundles/APKs.
- **Orphan Files:** Legacy animations remain in the codebase long after their corresponding screens or features have been deprecated or refactored.
- **Zero Traceability:** Static code search makes it tedious and error-prone to map which files are active and which are safe to delete.

**Animoria** resolves this by bringing visual workspace discovery, structural analysis, and reference tracing into your IntelliJ-based IDE (including Android Studio, WebStorm, and IntelliJ IDEA).

---

## Core Capabilities

### ⛨ Asset Governance & Deduplication

Run a structural analysis of all animated assets in your workspace at the click of a button:

- **Unused (Orphans):** Instantly flags assets with `0` active references in code, so you can delete them and trim repository bloat safely.
- **Duplicates (MD5 Verification):** Computes MD5 checksums of files to locate duplicate animations across modules, helping you merge redundancy.
- **Overused Assets:** Identifies assets referenced in more files than a customizable threshold (default: `10`), highlighting refactoring candidates that should be centralized.

### 🔍 Code Reference Tracing

Animoria searches your codebase in the background using optimized pattern matching to discover references across files (`.kt`, `.java`, `.ts`, `.tsx`, `.js`, `.jsx`, `.swift`, `.dart`, etc.). Usage references are presented as interactive nodes—clicking a reference navigates you directly to the target line in the editor.

### 📦 Monorepo & Module Scoping

In multi-module or monorepo workspaces, reference tracing is scoped to the nearest project boundary (resolved via `package.json`, `Cargo.toml`, etc.) to guarantee fast scanning times and avoid cross-package reference pollution.

---

## Supported Formats

- **Lottie & dotLottie:** Technical metadata (FPS, frames, layers, timeline markers, dimensions), control players, and code references.
- **Rive (.riv):** Extraction of Artboards, State Machines, and references.
- **Raster Animations (GIF/APNG):** Loop counts, frame counts, dimensions, and reference mapping.
- **Animated SVG:** Approximate DOM element counts, SMIL/CSS animation checks, and reference mapping.

---

## Offline & Secure by Design

Animoria runs entirely locally on your machine. Files are scanned, audited, and processed local-first. No network calls are made, ensuring that your codebase intellectual property and design assets remain secure.
