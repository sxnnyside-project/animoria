# Changelog — animoria-sandbox

All notable changes to the **Animoria Sandbox** development harness are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Changes staged for the next release go here. -->

---

## [1.0.0] — 2026-08-12

### Added

- **Reference Host Implementation**: Browser-based development environment implementing the canonical `HostBridge` interface.
- **HMR Dev Server**: Vite development server providing instant Hot Module Replacement for `@animoria/ui` web components.
- **Read-Only Containment Security**: Enforces `HostCapabilities.canMutate: false` to allow non-destructive UI state reviews without modifying live workspace files.
- **Interactive Event Console**: Real-time diagnostic console inspecting inbound and outbound host bridge messages.

---

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.1...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
