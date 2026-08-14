# Changelog — animoria-jetbrains

All notable changes to the **Animoria JetBrains Plugin** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- **Migrated to IntelliJ Platform Gradle Plugin 2.11.0** from the discontinued
  `org.jetbrains.intellij` 1.17.4, and the Gradle wrapper from 8.5 to 8.14.5.
  The supported IDE range is unchanged: `since-build` remains `241`
  (IntelliJ 2024.1) with no `until-build`.
- **Stopped bundling `kotlinx-coroutines-core`.** Coroutines ship inside the
  IntelliJ Platform and are now taken from it, as the platform requires. The
  plugin previously packaged its own copy at 1.11.0.
- Build tasks renamed by the migration: `verifyPlugin` is now the IntelliJ
  Plugin Verifier (it was the structure check under 1.x), and the structure
  check is `verifyPluginStructure`. CI and `release.yml` run both.

### Fixed

- **Removed all internal, experimental, and deprecated `ToolWindowFactory` API
  usage** reported by the JetBrains Plugin Verifier against 1.0.1 —
  `isApplicable`, `isDoNotActivateOnStart`, `manage`, `getAnchor`, and
  `getIcon`, ten findings in total. None were written in Animoria's source:
  `ToolWindowFactory` is a Kotlin interface, and the compiler's default
  jvm-default mode emitted a compatibility stub into `AnimoriaToolWindowFactory`
  for every inherited default member. Compiling with
  `-jvm-default=no-compatibility` removes the stubs, so the class inherits those
  members instead of re-declaring them. No behaviour changes: the tool window's
  anchor, icon, id, startup and applicability semantics were already declared in
  `plugin.xml` or inherited from the platform's defaults.

### Added

- `ToolWindowContractTest` pins the tool window's registration against
  `plugin.xml` — id, anchor, icon, factory class, open-ended IDE range — and
  asserts from the *compiled bytecode* that the factory declares none of the
  five reserved members, so losing the compiler flag fails the build.
- `verifyNoForbiddenPlatformApi` fails the build on any internal, experimental
  or deprecated platform API attributable to an Animoria class, reading the
  Plugin Verifier's own per-category reports. It refuses to pass when no reports
  were produced or when the IDE matrix shrinks. The gate it replaces was wired
  to a task CI never invoked.

### Known

- One deprecated API usage remains and is deliberate:
  `FileSaverDescriptor(String, String, String...)` in
  `ExportGovernanceReportAction`. It is the only constructor available in
  IntelliJ 2024.1–2024.3, and it is deprecated from 2025.1 onward, so no single
  compiled artifact spanning that range can avoid it. It is allowlisted by exact
  signature in `build.gradle.kts` and will be removed when the floor moves past
  2025.1.

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

[Unreleased]: https://github.com/sxnnyside-project/animoria/compare/v1.0.1...HEAD
[1.0.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v1.0.0
[0.2.0]: https://github.com/sxnnyside-project/animoria/releases/tag/v0.2.0
