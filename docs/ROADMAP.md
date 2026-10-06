# Animoria Product Roadmap & Future Milestones

This document outlines the strategic vision and upcoming milestones for Animoria, following the v2.0.0 migration of the engine from TypeScript to Rust.

---

## 1. Strategic Vision

Animoria is a **Visual Asset Governance DevTool** engineered to help development teams analyze, organize, maintain, and govern visual motion and static design assets across their workspace. Our core goal is to maintain repository health, eliminate unused design debt, prevent duplicates, and ensure smooth framework integrations.

---

## 2. Completed Foundation

### v1.0.0 (MCLP) — TypeScript engine
- **Multi-Format Parsing:** A pluggable parser registry covering Lottie, dotLottie, Rive, raster-animated (GIF/APNG), and animated SVG assets.
- **Static Asset Discovery (partial):** Basic workspace inventory of static SVG, PNG, JPEG, WebP, and AVIF files.
- **Zero-Config Engine:** Local, browserless thumbnail rendering with no Chromium dependency.
- **Reference Analysis:** Heuristics and regex scanning with confidence levels.
- **Rules Engine & Health Score:** Repository policy enforcement (`.animoriarc`) and numerical health grade.
- **Safe Remediation:** Staged deletion via a local trash folder with rollback capabilities.
- **Boilerplate Snippets:** Instant framework integration snippets for React, Vue, Flutter, SwiftUI, and Jetpack Compose.

### v2.0.0 — Rust engine migration
The engine (`animoria-core-rust`) replaced the TypeScript engine as the sole implementation; the legacy `@animoria/core` package and its Node SEA fallback were removed entirely from the codebase and the release pipeline. Along the way, unifying every asset under one `Asset { kind: AssetKind }` struct — rather than the old split between an animated-asset class and a separate static-asset class — resolved most of what was planned as "Milestone 2: Static Asset Full Implementation" as a side effect of the new architecture, not as separately executed work. See the breakdown below.

- **CLI hardening:** `clean` now previews by default and requires `--apply` to mutate the filesystem; a new `restore` command undoes a `clean --apply` from its recorded trash session; `--verbose`/`--quiet`/`--no-color` global flags; output respects `NO_COLOR` and non-TTY pipes; invalid workspace paths now fail loudly instead of reporting a false "0 assets, all clear."
- **Security hardening:** path-containment checks on every trash/restore operation (daemon and CLI); a size cap on the daemon's NDJSON line reader.
- **Release pipeline:** `build-native-daemon` now compiles the real Rust binary per platform (previously it built and shipped the legacy Node SEA binary); the VS Code extension now bundles a per-platform native binary in its `.vsix` (previously it shipped none, and depended on the user already having `animoria` on `PATH`).
- **Fuzz-tested parsers:** property-based tests (`proptest`) covering Lottie/Rive/PNG/GIF/WebP/SVG against arbitrary and truncated-signature input.

---

## 3. Static Asset Governance — reassessed against the Rust engine

The original "Milestone 2: v1.2.0 — Static Asset Full Implementation" was written for the old split-class TypeScript architecture. Re-auditing it against the unified Rust `Asset` model:

| Work Package | Status |
|---|---|
| S1 — Shared abstraction (`IndexedAsset`) | ✅ **Done, structurally.** `Asset { kind: AssetKind }` is one struct for both static and motion assets; there was never a second class to unify. |
| S2 — Static usage references (`<img src=`, CSS `url()`) | ✅ **Done.** `tracing::patterns::is_valid_exact_filename_reference` matches any quoted or path-prefixed string, which already covers `<img src="...">` and `url(...)` without dedicated logic. |
| S3 — Governance & Health parity for static assets | ✅ **Done.** `no_unreferenced`/`no_duplicates` iterate every asset with no format filter. |
| S4 — Safe bulk cleanup & resolving for static assets | ✅ **Done.** The remediation/trash engine is format-agnostic. |
| S5 — Raster downscaling & thumbnails | ❌ **Not done.** `thumbnail/mod.rs` only generates a placeholder SVG; there is no actual raster downscale/cache path yet. |
| S6 — Static boilerplate snippets | 🟡 **Partial.** `integration/snippets.rs` already generates React/Next `<img>`, React Native `Image`, HTML/Astro, and Vue 3 snippets for static formats — but SwiftUI/Flutter/Jetpack Compose snippets exist only for Lottie, not for static assets. |
| S7 — CI check command integration for static assets | ✅ **Done.** `check`/`report` are format-agnostic already. |
| S8 — Dynamic reference tracing (`${c.id}.webp`, dynamic collections) | ✅ **Done.** Implemented heuristic template literal and dynamic expression scanner in `tracing::patterns` / `tracing::detector` alongside declarative `dynamicCollections` in `.animoriarc.json`. Eliminates false positive orphan alerts for assets consumed via runtime interpolation. |

**Remaining real work from this milestone**: S5 (raster downscaling) in full, and S6's missing native-mobile static snippets.

---

## 4. Future Milestones & Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FUTURE MILESTONES ROADMAP                       │
│                                                                        │
│   v2.1.0 History & Governance   →   v2.2.0 Static Finish ✅ →   v2.3.0 Automation │
│   • Asset Timeline ✅            • Raster downscaling ✅      • Quick-Fix Actions│
│   • Change Event Audits ✅        • Native static snippets ✅  • Auto Compression │
│   • Custom AST Linter            • Interactive Rive ✅        • Central Registry │
│   • Reference Rewriting ✅ (propose-diff)                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Milestone 1: v2.1.0 — History & Extended Governance

**Objective:** Deepen governance insights, historical tracking, and project policy customization.

- **Visual Asset Timeline:** ✅ **Done.** Implemented `animoria-timeline-panel` in `@animoria/ui`, rendering historical analysis snapshots and audit events directly in the UI.
- **Governance Audit Logs & Analysis Snapshots:** ✅ **Done.** `daemon::audit` (`packages/animoria-core-rust/src/daemon/audit.rs`) records a real `AuditEvent` on every scan completion, trash, restore, and duplicate-resolution mutation, and a real `AnalysisSnapshot` after every completed scan — both appended to `.animoria/*.jsonl` and retrievable via the `listAuditEvents`/`listAnalysisSnapshots` daemon methods. `AuditEvent`/`AnalysisSnapshot` are no longer contract types with no producer.
- **Custom AST Lint Rules:** Support for custom Abstract Syntax Tree (AST) rules in the `.animoriarc` engine. Not started — no AST-based rule infrastructure exists in `governance/` today.
- **Visual Parity Extensions:** ✅ **Done.** Native Rive preview runtime (`@rive-app/canvas`) integrated into `@animoria/ui` preview stage with interactive play/pause, speed, and zoom controls.
- **Source Reference Rewriting on Duplicate Resolution:** ✅ **Done, as a propose-diff.** `remediation::reference_rewrite` computes one `ReferenceRewriteProposal` (file, line, before/after) per traced reference to an asset a `ResolutionPlan` would delete, attached to the plan's new `proposed_reference_rewrites` field — never auto-applied. A host calls the new `applyReferenceRewrite` daemon method per proposal only after a human confirms it; the method refuses if the target line has changed since the proposal was computed. Rewrites the *whole path token* (not just the filename), recomputing a real relative path from the referencing file to the canonical asset and preserving that token's own relative-path style (`./`, `../`, or bare) — one generic implementation covers all 26 traced extensions uniformly (quotes/`url()` bound the token without needing per-language parsing), matching the fact that `tracing::detector` itself is a line-heuristic scanner, not a set of per-syntax AST parsers.

---

### Milestone 2: v2.2.0 — Static Asset Governance, Finished ✅

**Objective:** Close the two remaining gaps from the Rust migration's static-asset audit (§3 above) — everything else in the original static-parity milestone is already done.

- **Raster Downscaling & Thumbnails:** ✅ **Done.** Extended `thumbnail/mod.rs` to downscale raster images (>256px) into `.animoria/thumbnails/` using the `image` crate.
- **Native Static Boilerplate Snippets:** ✅ **Done.** Added SwiftUI `Image`, Flutter `Image.asset`, and Jetpack Compose `Image` snippet generators for static formats in `integration::snippets`.

---

### Milestone 3: v2.3.0 — Automated Asset Optimization, Governance Ecosystem & Docs

**Objective:** Deliver direct, automated optimization pipelines, external registry integrations, and documentation infrastructure.

- **Online Rule Documentation & Terminal Hyperlinks (Pending Website Sync):**
  - Host dedicated online documentation pages for every rule (`https://animoria.dev/rules/<rule-id>`) outlining rationale, real-world examples, and remediation.
  - Integrate terminal hyperlinks (OSC-8 or explicit URL references) in CLI diagnostics directing developers directly to web documentation once the website team publishes the route structure.
- **Auto-Fix Remediations via Code Actions & CLI (`--fix`):**
  - Provide automated renaming for `naming-convention` violations and automated safe-stripping of forbidden elements (`<script>`, inline handlers) in `svg-sanitization`.
  - Provide standard IDE lightbulb quick-fixes (`CodeActionProvider`) to resolve lint errors, consolidate duplicate import strings, or strip orphaned references directly from active source code editors.
- **Automated Compression Pipeline:**
  - Integrate 1-click lossless compression directly in the IDE:
    - SVG optimization using `svgo`.
    - Lottie JSON minification and compression.
    - Image web optimization (PNG/WebP optimization).
- **Design Registry Integration:**
  - Connect local workspace scanning and duplicates metadata to external team registries (Figma APIs, central CDN assets, or enterprise design system servers) to ensure local codebases stay in sync with remote designs.


