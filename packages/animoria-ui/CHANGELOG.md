# Changelog — @animoria/ui

All notable changes to the **@animoria/ui** package are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [1.0.0] — 2026-08-12

### Added

- **Lit Web Components Catalog**: Reusable custom elements including `<animoria-workspace>`, `<animoria-finding>`, `<animoria-confidence-badge>`, `<animoria-coverage-summary>`, `<animoria-duplicate-group>`, `<animoria-evidence-panel>`, `<animoria-health-summary>`, `<animoria-state-panel>`, and `<animoria-cleanup-preview>`.
- **CSS Design Tokens**: Adaptive design token sheet (`src/styles/tokens.css`) supporting IDE dark, light, and high-contrast color palettes.
- **Typed `HostBridge` Protocol**: Bidirectional event and command messaging contract decoupling UI components from IDE host specifics.
- **Dual Bundle Compilation**: Ships compiled ESM module (`dist/animoria-ui.js`) and auto-registering IIFE bundle (`dist/animoria-ui.global.js`).

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.1...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
