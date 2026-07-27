# Animoria Product Roadmap & Future Milestones

This document outlines the strategic vision and upcoming milestones for Animoria, following the successful completion and hardening of the v1.0.0 Minimum Complete Lovable Product (MCLP) release.

---

## 1. Strategic Vision

Animoria is a **Visual Asset Governance DevTool** engineered to help development teams analyze, organize, maintain, and govern visual motion and static design assets across their workspace. Our core goal is to maintain repository health, eliminate unused design debt, prevent duplicates, and ensure smooth framework integrations.

---

## 2. Completed Foundation: v1.0.0 (MCLP)

The foundational release established the core governance framework across the full supported format set (Lottie, dotLottie, Rive, GIF, APNG, and Animated SVG):
- **Multi-Format Parsing:** A pluggable parser registry covering Lottie, dotLottie, Rive, raster-animated (GIF/APNG), and animated SVG assets.
- **Static Asset Discovery (partial):** Basic workspace inventory of static SVG, PNG, JPEG, WebP, and AVIF files. Governance parity (usage tracking, duplicate/unused detection) for static assets is not yet implemented — see Milestone 2.
- **Zero-Config Engine:** Local, browserless thumbnail rendering with no Chromium dependency.
- **Reference Analysis:** Heuristics and regex scanning with High/Low confidence levels.
- **Rules Engine & Health Score:** Repository policy enforcement (`.animoriarc`) and numerical health grade.
- **Safe Remediation:** Staged deletion via a local trash folder with rollback capabilities.
- **Boilerplate Snippets:** Instant framework integration snippets for React, Vue, Flutter, SwiftUI, and Jetpack Compose.
- **Standard Task Interface:** Root `Justfile` task abstraction and Biome-based linter/formatter migration.

---

## 3. Future Milestones & Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FUTURE MILESTONES ROADMAP                       │
│                                                                        │
│   v1.1.0 History & Governance  →  v1.2.0 Static Parity  →  v1.3.0 Automation │
│   • Asset Timeline              • Shared Abstraction        • Quick-Fix Actions│
│   • Change Event Audits         • Static Scan Parity        • Auto Compression │
│   • Custom AST Linter           • Downscaled Thumbnails     • central Registry │
└────────────────────────────────────────────────────────────────────────┘
```

### Milestone 1: v1.1.0 — History & Extended Governance

**Objective:** Deepen governance insights, historical tracking, and project policy customization.

- **Visual Asset Timeline:** An interactive timeline in the preview panel illustrating when assets were added, updated, moved, or became orphaned.
- **Governance Audit Logs:** Track workspace changes to visual assets to generate project change logs and compliance reports for team reviews.
- **Custom AST Lint Rules:** Support for custom Abstract Syntax Tree (AST) rules in the `.animoriarc` engine, allowing teams to specify framework-specific usage conventions.
- **Visual Parity Extensions:** Bring native Rive preview capabilities (`@rive-app/canvas` web runtime) into the extension's preview pane.

---

### Milestone 2: v1.2.0 — Static Asset Full Implementation

**Objective:** Elevate static assets (non-animated SVG, PNG, JPEG, WebP, AVIF) from basic inspection to first-class citizens in the governance pipeline.

- **Work Package S1 — Shared Abstraction:**
  Implement a shared TypeScript interface (e.g. `IndexedAsset`) implemented by both `AnimoriaAsset` and `AnimoriaStaticAsset`. This provides base fields (`path`, `name`, `stem`, `sizeBytes`, `mtime`) required by downstream features while keeping format-specific details isolated.
- **Work Package S2 — Static Usage References:**
  Extend `UsageScanner` to search for static filenames (e.g., matching `<img src=`, CSS `url()`, or native `Image` imports) with tailored matching strategies.
- **Work Package S3 — Governance & Health Parity:**
  Integrate static assets into duplicate detection, orphaned asset analysis, and the workspace Health Score calculation.
- **Work Package S4 — Safe Bulk Cleanup & Resolving:**
  Widen the duplicate resolver and cleanup planner to support proposing, staging, and restoring static assets.
- **Work Package S5 — Raster Downscaling & Thumbnails:**
  Extend the `ThumbnailEngine` to downscale and cache large static images, ensuring gallery performance isn't degraded by high-resolution design files.
- **Work Package S6 — Static Boilerplate Snippets:**
  Generate framework-specific image embedding code (e.g. `<img>`, `Image()`, SwiftUI `Image`) in the snippet generator.
- **Work Package S7 — CI Check Command Integration:**
  Expose static asset violations in the CLI check command (`animoria check`), ensuring quality gates fail on unused static assets.

---

### Milestone 3: v1.3.0 — Automated Asset Optimization & IDE Actions

**Objective:** Deliver direct, automated optimization pipelines and closer IDE integrations to streamline developer workflows.

- **IDE Lightbulb Quick-Fixes (`CodeActionProvider`):** 
  Provide standard IDE lightbulb quick-fixes to automatically resolve lint errors, consolidate duplicate import strings, or strip orphaned references directly from active source code editors.
- **Automated Compression Pipeline:** 
  Integrate 1-click lossless compression directly in the IDE:
  - SVG optimization using `svgo`.
  - Lottie JSON minification and compression.
  - Image web optimization (PNG/WebP optimization).
- **Design Registry Integration:** 
  Connect local workspace scanning and duplicates metadata to external team registries (Figma APIs, central CDN assets, or enterprise design system servers) to ensure local codebases stay in sync with remote designs.
