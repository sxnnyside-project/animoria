# Animoria — CLAUDE.md

## Repository Overview
Animoria is a polyglot monorepo (Rust, TypeScript, Kotlin) using `pnpm` workspaces.

---

## 1. Repository Purpose & Architecture

Animoria is the visual asset discovery, exploration, and governance engine for IDEs (VS Code and JetBrains). It eliminates silent asset bloat, traces multi-syntax code references, detects SHA-256 duplicate groups, and executes safe, plan-based remediation.

### Package & Module Map

| Package / Module | Language & Profile | Responsibility | Dependencies |
| :--- | :--- | :--- | :--- |
| [`packages/animoria-core-rust`](file:///Users/ti/Downloads/animoria/animoria/packages/animoria-core-rust) | **Rust** (Cargo, Edition 2021) | **Single Source of Truth**: Asset scanning, deep format parsers, usage reference tracing, duplicate detection, health scoring, and immutable remediation plans. Emits native `animoria` daemon binary. | None (pure native engine) |
| [`packages/animoria-contracts`](file:///Users/ti/Downloads/animoria/animoria/packages/animoria-contracts) | **TypeScript** (`strict: true`) | Canonical type definitions exported automatically from Rust structs via `ts-rs`. Pure types; zero runtime logic. | Generated from `core-rust` |
| [`packages/animoria-ui`](file:///Users/ti/Downloads/animoria/animoria/packages/animoria-ui) | **TypeScript** (Lit 3.x, Pure DOM) | Reusable visual dashboard components. Renders `WorkspaceAnalysis` and emits user intent through `HostBridge`. Zero host APIs, zero governance computation. | `@animoria/contracts`, `lit`, `lottie-web` |
| [`packages/animoria-vscode`](file:///Users/ti/Downloads/animoria/animoria/packages/animoria-vscode) | **TypeScript** (VS Code Ext SDK) | VS Code platform integration: Activity Bar, TreeView, problems/diagnostics, hover tooltips, and webview mounting `@animoria/ui`. | `@animoria/contracts`, `@animoria/ui` |
| [`packages/animoria-jetbrains`](file:///Users/ti/Downloads/animoria/animoria/packages/animoria-jetbrains) | **Kotlin** (IntelliJ Platform SDK) | JetBrains platform integration: ToolWindow, action bar, JCEF embedded `@animoria/ui`, and fallback degraded mode. | Embeds `@animoria/ui` & `animoria` binary |
| [`apps/animoria-sandbox`](file:///Users/ti/Downloads/animoria/animoria/apps/animoria-sandbox) | **TypeScript** (Vite App) | Browser harness for testing and developing `@animoria/ui` against read-only fixture workspaces. | `@animoria/contracts`, `@animoria/ui` |

---

## 2. Stack Profiles & Tooling

### Rust Profile (`packages/animoria-core-rust`)
- **Runtime / Build**: `cargo build --release` (produces native `animoria` binary)
- **Correctness & Linter**: `cargo clippy --all-targets -- -D warnings`
- **Formatter**: `cargo fmt` (configured via `rustfmt.toml`)
- **Testing**: `cargo test` (unit tests + integration suites + `ts-rs` contract generation)
- **Dependency & License Auditing**: `cargo-deny` (configured via `deny.toml`)

### TypeScript Profile (`packages/animoria-ui`, `packages/animoria-vscode`, `packages/animoria-contracts`, `apps/animoria-sandbox`)
- **Type Checker**: TypeScript compiler (`tsc --noEmit`, `strict: true`)
- **Formatter & Linter**: Biome (`biome format`, `biome lint`)
- **Testing**: Vitest (`vitest run`)
- **Bundler**: Vite

### Kotlin Profile (`packages/animoria-jetbrains`)
- **Build System**: Gradle 8.5 (Kotlin DSL)
- **Linter**: `detekt` (`./gradlew detekt`)
- **Formatter**: `ktlint` (`./gradlew ktlintCheck`, `./gradlew ktlintFormat`)
- **Testing**: JUnit 5 (`./gradlew test`)

---

## 3. Task Runner Abstraction Layer (`just`)

All routine developer workflows are invoked through the root `justfile`:

```bash
just install     # Bootstrap dependencies (pnpm install)
just dev         # Launch local UI sandbox harness (animoria-sandbox)
just build       # Build all packages (Rust core, Contracts, UI, VS Code, Sandbox, JetBrains)
just test        # Run all test suites across Rust, TypeScript, and Kotlin
just typecheck   # Run compiler typechecks (cargo check + pnpm typecheck)
just lint        # Run all static linters (clippy -D warnings, Biome, detekt, ktlint)
just format      # Run all formatters (cargo fmt, Biome format, ktlintFormat)
just check       # Run complete CI quality gate (format, lint, typecheck, test, build)
just clean       # Clean all build outputs, targets, and caches
```

---

## 4. Core Architectural Invariants

1. **Single Source of Truth**: The Rust engine (`animoria-core-rust`) authoritatively owns all asset discovery, format parsing, duplicate detection, health grading, and remediation plans.
2. **Zero Client-Side Calculation**: Host extensions (VS Code, JetBrains) and the Shared UI are pure presentation layers. They never compute health scores, invent confidence metrics, or mutate the filesystem outside an immutable plan.
3. **Canonical Contracts via `ts-rs`**: All TypeScript interfaces derive directly from Rust structs. No ad-hoc synthetic contracts.
4. **Daemon Protocol v1**: Inter-process communication travels strictly over standard I/O NDJSON using Protocol v1 envelopes with explicit requestId correlation and version handshakes (`hello`).
5. **Shared UI Purity**: `@animoria/ui` relies strictly on `--animoria-*` CSS tokens and standard web components (Lit). It contains zero host APIs (`vscode`, IntelliJ, or `node:*` in `src/`).
6. **Plan-Based Remediation**: Asset deletions and duplicate resolutions generate a reversible `ResolutionPlan` with `.animoria/trash/` staging.
7. **Never Drop Malformed Assets**: Corrupt or unparseable files are recorded with `is_valid = false` and surfaced in the UI with diagnostic details rather than silently skipped.
