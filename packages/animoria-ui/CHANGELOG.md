# Changelog — @animoria/ui

All notable changes to the **@animoria/ui** package are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.4.0] — 2026-11-24

### Added

- **Modular Tab Elements**:
  - `<animoria-cleanup-tab>`: Standalone Lit custom element encapsulating cleanup review proposals, selection state, and action dispatch.
  - `<animoria-findings-tab>`: Standalone Lit custom element encapsulating governance findings, search filters, and rule detail drawers.
- **Typed Event Emission Helpers**:
  - Added reusable custom event dispatch helpers ensuring type-safe message bubbling up to the host bridge.

### Refactored

- **Monolithic CSS Elimination**:
  - Decomposed 320+ lines of monolithic styles previously aggregated in `AnimoriaWorkspace` into scoped component styles with CSS design tokens.
- **Purity & Naming Conventions**:
  - Resolved P16 (`data`, `item`) and P17 (non-prefixed booleans) violations across bridge contracts, view models, and component properties.

---

## [2.3.3] — 2026-11-19

### Changed

- Synchronized contract dependencies with Core Rust 2.3.3 multi-root protocol.

---

## [1.0.0] — 2026-08-12

### Added

- **Lit Web Components Catalog**: Reusable custom elements including `<animoria-workspace>`, `<animoria-finding>`, `<animoria-confidence-badge>`, `<animoria-coverage-summary>`, `<animoria-duplicate-group>`, `<animoria-evidence-panel>`, `<animoria-health-summary>`, `<animoria-state-panel>`, and `<animoria-cleanup-preview>`.
- **CSS Design Tokens**: Adaptive design token sheet (`src/styles/tokens.css`) supporting IDE dark, light, and high-contrast color palettes.
- **Typed `HostBridge` Protocol**: Bidirectional event and command messaging contract decoupling UI components from IDE host specifics.
- **Dual Bundle Compilation**: Ships compiled ESM module (`dist/animoria-ui.js`) and auto-registering IIFE bundle (`dist/animoria-ui.global.js`).

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/sxnnyside-project/animoria/compare/v2.3.3...v2.4.0
[2.3.3]: https://github.com/sxnnyside-project/animoria/compare/v1.0.0...v2.3.3
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
