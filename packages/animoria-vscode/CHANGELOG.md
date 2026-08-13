# Changelog — animoria-vscode

All notable changes to the **Animoria VS Code Extension** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [1.0.0] — 2026-08-12

### Added

- **Shared UI Integration**: Integrated `@animoria/ui` Lit web components across the extension webview panel.
- **Multi-Root Support**: Full support for multi-root VS Code workspaces with dynamic workspace folder addition and removal.
- **Protocol v1 Communication**: Communicates with the core engine using the structured Protocol v1 JSON-RPC standard.
- **Problems Panel Integration**: Publishes structured governance rule violations directly to VS Code's Problems diagnostic tray.
- **Interactive Duplicate Resolver**: Visual comparison and import rewriting tool for duplicate assets.
- **Code Snippet Generator**: Copy-paste integration snippets for React, Vue, Flutter, SwiftUI, and Jetpack Compose.
- **Reversible Trash Staging**: Staged removals into `.animoria/trash/` with session manifest restoration.

### Changed

- Replaced ad-hoc HTML string templates in webview panels with `@animoria/ui` custom element bundle.
- Replaced single-root assumptions (`workspaceFolders[0]`) with multi-root session bridge.
- Improved hover card styling and responsive asset dimension caps.

### Fixed

- Resolved thumbnail cache invalidation bug when two files in different directories shared the same name stem.
- Fixed root path resolution errors during multi-folder duplicate resolution.
- Fixed UI blank screen issue caused by unbundled media assets.

---

## [0.2.0] — 2026-06-15

### Added

- Support for dotLottie (.lottie) and Rive (.riv) preview and metadata inspection.
- Enhanced reference tracing with support for Kotlin and Swift syntax.

---

## [0.1.0] — 2026-05-01

### Added

- Initial release of Animoria VS Code extension.
- Basic visual gallery and JSON report export.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.1.0
