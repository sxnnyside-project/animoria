# Changelog — animoria-jetbrains

All notable changes to the **Animoria JetBrains Plugin** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [2.0.0] — 2026-08-31

### Added

- Bundled native daemons are now built directly from `animoria-core-rust` via `cargo build --release`, one per supported platform.

### Changed

- Supported platforms are now **macOS (Apple Silicon only)**, Linux (x64/ARM64), and Windows (x64) — Intel Mac (`darwin-x64`) is no longer built or bundled.

### Fixed

- A `MissingFieldException` crash when decoding any real multi-root analysis: `MultiRootAnalysisData.assets`/`.diagnostics` were typed for an attribution-wrapper shape the daemon never actually sends, so a live scan on a real workspace failed to decode and the tool window stayed empty.

### Removed

- The Node.js/`cli.js` daemon fallback (`DaemonBinaryResolver.findNodeExecutable`/`findCliScriptPath`). A platform with no bundled native binary now fails explicitly with a clear error instead of attempting to spawn a system Node install.

---

## [1.0.0] — 2026-08-12

### Added

- **Bundled Standalone Native Daemons**: Ships with precompiled self-contained native executable daemons for macOS (ARM64/x64), Linux (ARM64/x64), and Windows (x64), eliminating the need for a separate Node.js runtime.
- **Embedded JCEF Tool Window**: Native Chromium-backed tool window embedding the shared `@animoria/ui` Lit web components.
- **Protocol v1 Client Integration**: Kotlin daemon client updated to communicate via Protocol v1 JSON-RPC with request cancellation and sequence ordering.
- **Dynamic Look & Feel (LaF) Sync**: Synchronizes IntelliJ dark/light theme tokens directly to webview CSS custom properties.
- **Automated Duplicate Import Rewriting**: Rewrites referencing import paths in Kotlin, Java, and TypeScript files when resolving duplicate groups.
- **Safe Reversible Deletions**: Moves removed files to `.animoria/trash/` instead of executing unrecoverable disk deletions.

### Changed

- Migrated Kotlin concurrency from unbounded `GlobalScope` to project-scoped `AnimoriaCoroutineScope` to eliminate background thread leaks.
- Removed client-side semantic governance arithmetic in Kotlin; all verdicts derive authoritatively from `@animoria/core`.

### Fixed

- Fixed duplicate file removal race condition in modal confirmation dialogs.
- Fixed process termination deadlock during rapid IDE project close and reopen cycles.

---

## [0.2.0] — 2026-06-15

### Added

- Initial release for JetBrains Marketplace.
- Basic background daemon process management via stdio.
- Tool window tree model and asset metadata viewer.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/sxnnyside-project/animoria/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.2.0
