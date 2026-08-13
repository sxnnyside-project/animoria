# ADR-003: JavaScript Runtime & Engine Selection (Node.js vs Bun)

**Status:** Accepted  
**Scope:** Repository-wide (`packages/*`, `apps/*`, CI/CD release matrix, JetBrains daemon)  
**Related:** `ADR-001`, `ADR-002`, `packages/animoria-core/scripts/build-sea.mjs`, `.github/workflows/release.yml`

---

## Context & Problem Statement

Modern JavaScript/TypeScript toolchains offer alternative runtime engines such as **Bun** (built on JavaScriptCore) alongside standard **Node.js** (built on V8). While Bun provides high-performance runtime execution and instant TypeScript evaluation, Animoria produces IDE-integrated software artifacts, specifically:
1. A **VS Code Extension** (`packages/animoria-vscode`) running inside an IDE extension host.
2. A **JetBrains Background Daemon** (`packages/animoria-jetbrains`) spawned as a standalone native binary.
3. A **Shared Core Analysis Engine** (`packages/animoria-core`) relying on native C++ N-API bindings (`sharp`/libvips) for image hashing.

This ADR records the decision regarding the repository's **target JavaScript execution runtime and engine baseline**, distinct from package management (which is governed by `ADR-001`).

---

## Decision

**Animoria standardizes on Node.js (>= 22 LTS) as the official JavaScript runtime baseline and execution target across the monorepo.**

Bun is not adopted as the project runtime engine.

---

## Options Evaluated

### Option 1: Bun as Primary Runtime (`bun run`, `bun build --compile`)

* **Concept:** Replace the Node.js execution engine with Bun for running scripts, executing CLI commands, and producing standalone binaries.
* **Pros:**
  * Fast runtime startup and built-in native execution of TypeScript without compilation.
  * `bun build --compile` provides a single-command standalone binary compiler with cross-compilation support.
* **Cons & Blockers:**
  * **VS Code Extension Host Incompatibility (Hard Blocker):** VS Code extensions execute strictly within the editor's embedded Node.js/Electron Extension Host process. VS Code provides no mechanism to run extensions on alternative runtimes; extension APIs (`@types/vscode`) and lifecycle events require a Node-compatible runtime environment.
  * **Native C++ Addon Dynamic Linking (`sharp`):** `@animoria/core` uses `@dotlottie/dotlottie-js`, which transitively requires `sharp` (libvips C++ N-API addon). Standalone compiled binaries cannot inline `.node` binary dynamic libraries directly; dynamic loading on external filesystems requires verified extraction mechanisms.
  * **Multi-Arch Daemon Release Stability:** Animoria builds and signs native daemons across 5 targets (`linux-x64`, `linux-arm64`, `darwin-arm64`, `darwin-x64`, `win32-x64`). Bun's Windows support and process lifecycle behavior in long-running IDE background processes are less proven than Node LTS.

### Option 2: Node.js 22 LTS Baseline (Chosen)

* **Concept:** Standardize on Node.js 22 LTS for runtime execution, development scripts, and Single Executable Application (SEA) daemon compilation.
* **Pros:**
  * **100% Native VS Code Extension Compatibility:** Extension code runs natively in the VS Code host during development, testing, and production without translation layers.
  * **Deterministic Multi-Platform Daemon Releases:** The existing `build-sea.mjs` pipeline leverages Node's Single Executable Application (SEA) architecture with:
    * esbuild CommonJS bundling
    * Native module shimming (`module.createRequire`) for `sharp` in `native_modules/`
    * Mach-O universal architecture thinning (`lipo`)
    * macOS Developer ID code signing and Apple Gatekeeper notarization (`notarytool`)
  * **LTS Enterprise Reliability:** Stable process lifecycle, signal handling, and IPC communication when spawned as a background child process from Kotlin in JetBrains IDEs.
* **Cons:**
  * Local CLI script execution requires TypeScript compilation (`tsc`) or bundler output rather than zero-config inline execution.
  * Node SEA compilation pipeline is more complex to orchestrate than a single compiler flag.

---

## Technical Comparison Matrix

| Runtime Dimension | Node.js 22 LTS (Chosen) | Bun Runtime | Architectural Impact |
| :--- | :--- | :--- | :--- |
| **VS Code Extension Host** | Native Electron/Node host | Incompatible | ❌ **Fatal:** VS Code host runtime cannot be changed. |
| **JetBrains Daemon Process** | Node SEA + `sharp` dynamic shim | `bun build --compile` | ⚠️ **Risk:** Addon extraction across OSes. |
| **Release Matrix (5 OS/Archs)** | Tier-1 LTS stability | Tier-2 on select OSes | ⚠️ **Risk:** Windows / Intel Mac daemon regressions. |
| **Native C++ Addons (N-API)** | Rock-solid ABI stability | N-API compatibility layer | ⚠️ **Risk:** Subprocess crash risk in IDE daemon. |
| **macOS Notarization & Signing** | Fully integrated in `build-sea` | Requires custom binary signing |  Both require post-build signing. |

---

## Consequences

### Positive
1. **Host Alignment:** Guarantees zero friction between the extension code and the VS Code runtime environment.
2. **Predictable Daemon Distribution:** The JetBrains plugin continues to deliver signed, notarized native executables verified across macOS, Linux, and Windows.
3. **Engine Uniformity:** All packages, test runners (see `ADR-002`), and IDE integrations operate against a single runtime engine baseline.

### Negative / Accepted Trade-offs
1. `packages/animoria-core/scripts/build-sea.mjs` must remain maintained for generating Node SEA blobs and managing platform-specific Mach-O slicing.

---

## Re-evaluation Criteria

This runtime standard will be revisited if:
1. VS Code provides an official, supported architecture for hosting extensions on alternative JavaScript engines.
2. Bun establishes transparent native C++ N-API addon bundling within single-file compiled executables without filesystem extraction requirements.
