# Domain Glossary

This document serves as the canonical domain glossary for **Animoria**, establishing unambiguous English terms for all concepts across Rust, TypeScript, Kotlin, tests, and documentation, in compliance with `sxnnyside-std-naming`.

---

## 1. Core Domain Concepts

| Term | Definition | Context / Usage |
|---|---|---|
| **Asset** | A visual or motion media file stored in the workspace repository (e.g., PNG, WebP, SVG, GIF, Lottie, Rive). | Core entity represented by `Asset` model. |
| **Raster Asset** | A pixel-grid visual asset with fixed dimensions and bit depth (PNG, JPEG, WebP, GIF, AVIF). | Handled by `parser::raster`. |
| **Vector Asset** | An XML-based scalable vector graphic (SVG) containing vector instructions, attributes, and optional styling. | Handled by `parser::svg`. |
| **Motion Asset** | An animated visual asset (Lottie JSON, Rive `.riv`, GIF) with timeline, frame count, fps, and duration metrics. | Handled by `parser::lottie` and `parser::rive`. |
| **Dynamic Asset** | An asset loaded via computed or runtime paths, asset catalogs, or platform conventions where exact string literal matches cannot be statically traced. | Handled by `dynamic_collections` pattern matching. |
| **App Icon** | A platform-managed icon (iOS `.appiconset`, Android `mipmap-*`, PWA launcher) referenced by OS manifests rather than explicit source imports. | Classified by `governance::asset_matcher::is_app_icon`. |

---

## 2. Deduplication & Analysis

| Term | Definition | Context / Usage |
|---|---|---|
| **Content Hash** | A 64-bit perceptual or cryptographic hash (`fxhash` / `farmhash`) representing byte-level or visual identity. | Produced by `deduplication::hasher`. |
| **Duplicate Group** | A collection of two or more identical assets sharing identical content hash or visual similarity. | Produced by `deduplication::cluster`. |
| **Canonical Asset** | The chosen primary copy within a Duplicate Group, selected deterministically based on reference count, shortest path, and file age. | Target asset retained during deduplication. |
| **Unreferenced Asset** | An asset for which zero code references or dynamic glob patterns match within the scanned workspace. | Flagged by `no-unreferenced-assets` rule. |

---

## 3. Governance & Quality Rules

| Term | Definition | Context / Usage |
|---|---|---|
| **Governance Policy** | The configuration loaded from `.animoriarc.json` that sets rule severities, size limits, naming conventions, and file path overrides. | Evaluated by `governance::engine`. |
| **Rule Diagnostic** | A structured finding emitted when an asset violates an active policy rule (includes rule ID, severity, message, suggested fix). | Emitted as `RuleDiagnostic`. |
| **Health Score** | A normalized overall score (0–100%) reflecting workspace asset hygiene, calculated across category weights: hygiene, weight, performance, standards. | Displayed in CLI and IDE badges. |
| **Policy Override** | A scoped rule adjustment in `.animoriarc.json` applied to specific glob patterns (e.g., exempting legacy directories). | Configured in `policy.overrides`. |
| **Frame Budget** | The upper bound on keyframes or execution complexity permitted for a motion asset before a performance diagnostic is emitted. | Configured in `lottie-frame-budget`. |

---

## 4. Remediation & Workspace Operations

| Term | Definition | Context / Usage |
|---|---|---|
| **Resolution Plan** | A pre-computed execution plan describing safe deletions, trash moves, or reference rewrites. | Produced before mutating workspace state. |
| **Reference Rewrite** | An atomic, AST-aware or boundary-safe substitution of code imports redirecting obsolete asset paths to the canonical asset. | Executed by `remediation::reference_rewrite`. |
| **Trash Directory** | A recoverable `.animoria/trash/` location where deleted files and manifest metadata are preserved for reversible cleanup. | Managed by `remediation::trash`. |
| **Fuzz Testing** | Automated property-based testing feeding high-entropy and boundary-edge inputs to parsers and reference rewrite engines. | Implemented in `reference_rewrite_fuzz_test.rs`. |

---

## 5. IPC Architecture & IDE Integration

| Term | Definition | Context / Usage |
|---|---|---|
| **Daemon Protocol** | The NDJSON streaming line protocol (`\n`-delimited envelopes) facilitating bi-directional communication between the Rust core and IDE hosts. | Defined in `contracts::protocol`. |
| **Host Bridge** | The client-side abstraction in IDEs (VS Code, JetBrains, Web UI) that connects UI webviews with the background daemon. | Defined in `@animoria/ui` and `animoria-vscode`. |
| **Analysis Snapshot** | A timestamped, immutable representation of a complete workspace scan, asset inventory, duplicate groups, and health score. | Exchanged via daemon `Scan` and `Subscribe`. |
