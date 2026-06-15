# Animoria JetBrains Plugin Changelog

All notable changes to the Animoria JetBrains plugin will be documented in this file.

---

## [0.2.0] - 2026-06-15

This is the genesis release of Animoria for the JetBrains Marketplace, introducing codebase-level asset governance, deduplication, and visual reference tracking.

### Added

- **Core Daemon Integration (JSON-RPC):** Out-of-process Node.js daemon orchestrator to stream workspace asset analysis and watcher events via Standard I/O.
- **Visual JCEF Tool Window:** Native sidebar rendering of Web Components for browsing, searching, and previewing assets in Android Studio and IntelliJ IDEA.
- **LaF Theme Syncing:** Dynamic Look-and-Feel listener to automatically switch active webview styles when toggling Darcula / Light IDE themes.
- **Reference Tracing:** Native editor navigation linking asset references to the precise Kotlin, Java, JavaScript, and TypeScript source code lines.
- **Multi-Format Pipeline:** Core validation and parsing of Lottie (.json), dotLottie (.lottie), Rive (.riv), GIF/APNG (.gif/.apng), and Animated SVG (.svg).
