# Contributing to Animoria

Contributions are welcome — bugs, fixes, features, or documentation.
This document covers how to work with the project as a contributor.

---

## Repository Architecture

Animoria is organized as a multi-ecosystem monorepo centered around a high-performance native Rust core engine:

```text
                       ┌─────────────────────────┐
                       │   animoria-core-rust    │ (Native Core Engine & CLI)
                       │     Source of Truth     │
                       └───────────┬─────────────┘
                                   │
                              Protocol v1
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     JetBrains Plugin      VS Code Extension       Standalone CLI
   (packages/animoria-    (packages/animoria-    (packages/animoria-
        jetbrains)             vscode)                core-rust)
              │                    │
              │         @animoria/contracts
              │        (Pure Canonical Types)
              │                    │
              └────────────┬───────┘
                           ▼
                  @animoria/ui (Webview)
```

---

## Ecosytem Conventions & Coding Standards

### 1. File Naming Conventions

Strict file naming rules per ecosystem:

* **Rust (`packages/animoria-core-rust`)**: `snake_case.rs` (e.g. `ignore_rules.rs`, `asset_reference_detector.rs`).
* **TypeScript (`packages/animoria-vscode`, `packages/animoria-contracts`, `packages/animoria-ui`)**: `kebab-case.ts` (e.g. `daemon-client.ts`, `diagnostic-publisher.ts`, `asset-card-model.ts`).
* **Kotlin (`packages/animoria-jetbrains`)**: `PascalCase.kt` (e.g. `CoreProcessManager.kt`, `AnimoriaAnalysisHolder.kt`).

### 2. Documentation & Commenting Rules

* **Document Intent and Invariants ("Why", not "What")**:
  Explain non-obvious design decisions, lifecycle boundaries, or safety invariants.
  Avoid redundant comments that merely narrate self-explanatory code syntax.
* **Module Doc Headers (`//!` in Rust, KDoc in Kotlin, JSDoc in TS)**:
  Every major module entry point must define its responsibilities, upstream inputs, and downstream outputs.
* **Contracts Purity**:
  `@animoria/contracts` is the pure representation of domain models generated from Rust with `ts-rs`. Never add ad-hoc `any` or synthetic helper types directly to the contracts root.

---

## Before You Start

- Search [existing issues](https://github.com/sxnnyside-project/animoria/issues) before opening a new one.
- For significant changes, open an issue first to discuss the direction before writing code.
- Read the [Code of Conduct](CODE_OF_CONDUCT.md). It applies to all interactions in this project.
- Review the [Maintainer Guide Library](docs/guides/README.md) (`docs/guides/`) to understand subsystem boundaries, daemon protocol contracts, and architectural invariants.

---

## Pull Request Checklist

Before submitting:

- [ ] Rust tests pass: `cargo test` in `packages/animoria-core-rust`
- [ ] VS Code tests pass: `pnpm --filter animoria-vscode test`
- [ ] JetBrains tests pass: `./gradlew test` in `packages/animoria-jetbrains`
- [ ] File naming matches the ecosystem convention (`kebab-case` for TS, `snake_case` for Rust)
- [ ] Changes are described in [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`
- [ ] The PR description explains what changed and why

---

## Commit Style

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>: <description>

[optional body]
[optional footer]
```

Accepted types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.
