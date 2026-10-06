# Animoria — CLAUDE.md

## Repository Overview
Animoria is a polyglot monorepo (Rust, TypeScript, Kotlin) using `pnpm` workspaces, a native Rust engine, and multi-IDE extensions.

---

## 1. Repository Purpose & Architecture

Animoria is the visual asset discovery, exploration, and governance engine for modern IDEs (VS Code and JetBrains). It eliminates silent asset bloat, traces multi-syntax code references, detects duplicate groups, and executes safe, plan-based remediation.

### Package & Module Map

| Package / Module | Language & Profile | Responsibility | Dependencies |
| :--- | :--- | :--- | :--- |
| `packages/animoria-core-rust` | **Rust** (Cargo, Edition 2021) | **Single Source of Truth**: Asset scanning, deep format parsers, usage reference tracing, duplicate detection, health scoring, and immutable remediation plans. Emits native `animoria` daemon binary. | None (pure native engine) |
| `packages/animoria-contracts` | **TypeScript** (`strict: true`) | Canonical type definitions exported automatically from Rust structs via `ts-rs`. Pure types; zero runtime logic. | Generated from `core-rust` |
| `packages/animoria-ui` | **TypeScript** (Lit 3.x, Pure DOM) | Reusable visual dashboard components. Renders `WorkspaceAnalysis` and emits user intent through `HostBridge`. Zero host APIs, zero governance computation. | `@animoria/contracts`, `lit`, `lottie-web` |
| `packages/animoria-vscode` | **TypeScript** (VS Code Ext SDK) | VS Code platform integration: Activity Bar, TreeView, problems/diagnostics, hover tooltips, and webview mounting `@animoria/ui`. | `@animoria/contracts`, `@animoria/ui` |
| `packages/animoria-jetbrains` | **Kotlin** (IntelliJ Platform SDK) | JetBrains platform integration: ToolWindow, action bar, JCEF embedded `@animoria/ui`, and fallback degraded mode. | Embeds `@animoria/ui` & `animoria` binary |
| `apps/animoria-sandbox` | **TypeScript** (Vite App) | Browser harness for testing and developing `@animoria/ui` against read-only fixture workspaces. | `@animoria/contracts`, `@animoria/ui` |

---

## 2. Where things go

| Kind | Location | Naming |
| :--- | :--- | :--- |
| **Rust Core, CLI & Daemon** | `packages/animoria-core-rust/src/` | `snake_case.rs` (no `helpers` or `utils`) |
| **Rust Unit Tests** | In-file (`#[cfg(test)] mod tests`) | N/A (per Rust idiom) |
| **Rust Integration & Fuzz Tests** | `packages/animoria-core-rust/tests/` | `snake_case_test.rs` |
| **IPC Protocol & Contracts** | `packages/animoria-core-rust/src/contracts/`, `packages/animoria-contracts/src/` | `snake_case.rs` (Rust), `PascalCase.ts` (TS generated) |
| **Web UI Components** | `packages/animoria-ui/src/components/` | `animoria-kebab-case.ts` |
| **VS Code Extension Features** | `packages/animoria-vscode/src/<feature>/` | `kebab-case.ts` |
| **JetBrains Plugin Code** | `packages/animoria-jetbrains/src/main/kotlin/` | `PascalCase.kt` |
| **TypeScript Tests** | `packages/<pkg>/tests/<mirror of src>/` | `<name>.test.ts` |
| **Automation Scripts** | `scripts/` | `kebab-case.mjs` |
| **Domain Glossary** | `docs/glossary.md` | Markdown English terms |
| **Documentation & ADRs** | `docs/`, `docs/adr/`, `docs/ROADMAP.md` | `kebab-case.md` |
| **CI/CD Workflows** | `.github/workflows/` | `kebab-case.yml` with SHA-pinned actions |

> **Domain Glossary**: Before introducing or modifying domain concepts, consult and update [docs/glossary.md](file:///Users/houjousxnnyside/Documents/repos/sxnnyside-project/animoria/docs/glossary.md).

---

## 3. Stack Profiles & Tooling

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

## 4. Task Runner Abstraction Layer (`just`)

All routine developer workflows are invoked through the root `Justfile`:

```bash
just install       # Bootstrap dependencies (pnpm install)
just dev           # Launch local UI sandbox harness (animoria-sandbox)
just build         # Build all packages (Rust core, Contracts, UI, VS Code, Sandbox, JetBrains)
just test          # Run all test suites across Rust, TypeScript, and Kotlin
just typecheck     # Run compiler typechecks (cargo check + pnpm typecheck)
just lint          # Run all static linters (clippy -D warnings, Biome, detekt, ktlint)
just format-check  # Verify formatting idempotently (cargo fmt --check, Biome format, ktlintCheck)
just format        # Run all formatters mutating files (cargo fmt, Biome format, ktlintFormat)
just check         # Run complete CI quality gate (format-check, lint, typecheck, test)
just clean         # Clean all build outputs, targets, and caches
```

---

## 5. Core Architectural Invariants

1. **Single Source of Truth**: The Rust engine (`animoria-core-rust`) authoritatively owns all asset discovery, format parsing, duplicate detection, health grading, and remediation plans.
2. **Zero Client-Side Calculation**: Host extensions (VS Code, JetBrains) and the Shared UI are pure presentation layers. They never compute health scores, invent confidence metrics, or mutate the filesystem outside an immutable plan.
3. **Canonical Contracts via `ts-rs`**: All TypeScript interfaces derive directly from Rust structs. No ad-hoc synthetic contracts.
4. **Daemon Protocol v1**: Inter-process communication travels strictly over standard I/O NDJSON using Protocol v1 envelopes with explicit requestId correlation and version handshakes (`hello`).
5. **Shared UI Purity**: `@animoria/ui` relies strictly on `--animoria-*` CSS tokens and standard web components (Lit). It contains zero host APIs (`vscode`, IntelliJ, or `node:*` in `src/`).
6. **Plan-Based Remediation**: Asset deletions and duplicate resolutions generate a reversible `ResolutionPlan` with `.animoria/trash/` staging.
7. **Never Drop Malformed Assets**: Corrupt or unparseable files are recorded with `is_valid = false` and surfaced in the UI with diagnostic details rather than silently skipped.
