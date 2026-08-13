# ADR-001: Package Manager & Monorepo Workspace Tooling (pnpm + Turborepo)

**Status:** Accepted  
**Scope:** Repository-wide (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, CI install steps)  
**Related:** `ADR-002`, `ADR-003`, `Justfile`, `.github/workflows/ci.yml`

---

## Context & Problem Statement

Modern TypeScript and DXQE tooling guidelines suggest canonical package manager defaults for JavaScript/TypeScript repositories. While DXQE v2 profiles often suggest **Bun** (`bun install`) as a standard package installer, monorepos containing multiple interdependent packages require rigorous dependency isolation and caching.

This ADR records the decision regarding the repository's **package manager and monorepo workspace orchestration tool**, separating dependency management from JavaScript runtime selection (handled in `ADR-003`).

---

## Decision

**Animoria standardizes on `pnpm` (>= 11) with `Turborepo` as the official package manager, workspace linker, and monorepo task orchestrator.**

The project deviates from the default Bun package manager recommendation while retaining full compliance with all other DXQE standards (Biome for linting/formatting, `just` for task abstraction, Conventional Commits).

---

## Options Evaluated

### Option 1: Bun Package Manager (`bun install`, `bun.lock`)

* **Concept:** Use Bun exclusively as the package manager and workspace linker across all packages.
* **Pros:**
  * Extremely fast package installation and dependency resolution.
  * Single-binary tooling footprint.
* **Cons & Blockers:**
  * **Flat `node_modules` Risk:** Bun defaults to a flat dependency structure, which permits phantom dependencies (where code imports packages not declared in its own `package.json`).
  * **Turborepo Integration Maturity:** `turbo` caching and hash generation are natively tuned for `pnpm-lock.yaml` and pnpm's content-addressable dependency graph.
  * **VS Code Packaging Compatibility:** `@vscode/vsce` dependency bundlers expect standard npm/pnpm layout when constructing `.vsix` extension archives.

### Option 2: pnpm + Turborepo Workspace Architecture (Chosen)

* **Concept:** Use `pnpm` workspace protocol (`workspace:*`) with hard-linked content-addressable storage, coordinated by Turborepo.
* **Pros:**
  * **Strict Non-Flat Dependency Isolation:** Uses symlinks to prevent phantom dependencies across `@animoria/core`, `animoria-vscode`, and `animoria-sandbox`.
  * **Disk & CI Cache Efficiency:** Monorepo dependencies are stored once globally and hard-linked, enabling fast, reproducible CI caching.
  * **Deterministic Workspace Linking:** Native `workspace:*` semantics ensure local cross-package dependencies are resolved accurately without accidental registry fetches.
  * **First-Class Pipeline Caching:** Seamless integration with `turbo` for topological task orchestration (`turbo build`, `turbo test`, `turbo lint`).
* **Cons:**
  * Cold install times on fresh CI runners are slightly slower than Bun's native installer.

---

## Technical Comparison Matrix

| Dimension | pnpm + Turborepo (Chosen) | Bun Package Manager | Architectural Impact |
| :--- | :--- | :--- | :--- |
| **Phantom Dependency Protection** | Strict symlinked isolation | Flat structure by default | ⚠️ **High:** Eliminates invisible undeclared imports across packages. |
| **Workspace Protocol (`workspace:*`)** | Mature & deterministic | Supported |  Both support workspace linking. |
| **Task Graph & Pipeline Caching** | Native Turborepo hashing | Custom runner configuration | ⚠️ **Medium:** Turborepo pipeline caching is established. |
| **Lockfile Determinism** | YAML (`pnpm-lock.yaml`) | Binary / Text (`bun.lock`) |  Both provide reproducible dependency graphs. |
| **Extension Packaging (`vsce`)** | Standard npm/pnpm layout | Non-standard symlink handling | ⚠️ **Medium:** Ensures reliable `.vsix` bundling. |

---

## Consequences

### Positive
1. **Dependency Integrity:** Packages can only import dependencies explicitly defined in their local `package.json`.
2. **Predictable CI/CD:** Workflows in `.github/workflows/ci.yml` utilize official `pnpm/action-setup` actions with deterministic lockfile verification (`--frozen-lockfile`).
3. **Established Stability:** Avoids disruptive package manager migrations across active IDE extension packages.

### Negative / Accepted Trade-offs
1. Requires maintaining a documented deviation from generic single-toolchain DXQE profiles.
2. Developers must have `pnpm` available (managed automatically via Node.js Corepack / `packageManager` field).

---

## Re-evaluation Criteria

This package manager standard will be revisited if:
1. Bun implements strict symlink-isolated `node_modules` layout by default for monorepos.
2. Ecosystem tooling shifts deprecate pnpm workspace compatibility in major IDE extension bundlers.
