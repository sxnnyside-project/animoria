# ADR-002: Extension Test Harness — Vitest + Module-Aliased `vscode` Mock

**Status:** Accepted  
**Scope:** `packages/animoria-vscode`  
**Related:** `ADR-001`, `ADR-003`, `TASK-H1.1`, `F-TEST-01`, `F-RUN-01`, `F-RUN-02`, `F-RUN-04`

---

## Context & Problem Statement

Testing VS Code extensions typically requires either spinning up an entire Electron/VS Code instance via `@vscode/test-electron` or relying on lightweight in-memory mocks.

The Animoria VS Code extension (`packages/animoria-vscode`) requires a fast, deterministic, and CI-friendly unit test suite for core extension logic (command registration, `WorkspaceEdit` generation, cleanup executors, file watchers, and webview message passing) without incurring the heavy overhead and flakiness of launching full headless Electron instances.

---

## Decision

**`packages/animoria-vscode` unit tests run under Vitest against a custom, in-process `vscode` module mock (`tests/mocks/vscode.ts`), resolved via Vitest's `resolve.alias` in `vitest.config.ts`.**

`@vscode/test-electron` was evaluated and rejected for this layer.

---

## Options Evaluated

### Option 1: Headless Electron Host (`@vscode/test-electron`)

* **Concept:** Download a full VS Code binary on every test run and launch tests inside a headless Extension Host.
* **Pros:**
  * Highest fidelity: executes real VS Code APIs, real webview DOM, and live `WorkspaceEdit` applications.
* **Cons & Blockers:**
  * **Slow & Heavy:** Spawns a full Electron binary for every test invocation; requires `xvfb-run` on Linux CI runners.
  * **Nondeterministic / Flaky:** Prone to OS window focus, timing differences, and CI environment flakiness.
  * **Poor Developer Experience:** Does not scale for rapid TDD loops (~180ms in-process mock vs ~10-15s Electron startup).

### Option 2: Extending Sandbox Webview Mock (`apps/animoria-sandbox/src/mocks/mock-extension-host.ts`)

* **Concept:** Attempt to reuse the sandbox webview mock used for Lit component preview.
* **Pros:**
  * Reuses an existing mock file in the repository.
* **Cons & Blockers:**
  * **Different Layer:** The sandbox mock only simulates browser `postMessage` events for developing webview UI components in isolation. It lacks the entire `vscode.*` namespace (`commands`, `workspace`, `WorkspaceEdit`, `Uri`, `FileSystemWatcher`, etc.).
  * **Coupling:** Conflating webview browser message mocking with extension host API mocking creates brittle abstractions.

### Option 3: Vitest + In-Memory Module Alias (`tests/mocks/vscode.ts`) (Chosen)

* **Concept:** Implement a minimal, strict mock of the imported `vscode` namespace, mapped via `vitest.config.ts` alias.
* **Pros:**
  * **Ultra-Fast Execution:** Full test suite runs in ~180ms in-process.
  * **Deterministic:** Pure in-memory state (`Map`s, `EventEmitter`s) reset cleanly per test via `resetTestWorkspace()`.
  * **Zero CI Overhead:** Integrates seamlessly into the existing `pnpm test` → `turbo test` → `vitest run` pipeline without extra dependencies.
  * **Zero Production Code Changes:** Production code imports `vscode` normally without test flags or artificial seams.
* **Cons:**
  * Does not prove real window/rendering behaviors (addressed complementarily via manual regression testing passes).

---

## Technical Blockers & Justification

| Feature / Criteria | Vitest + Alias Mock (Chosen) | `@vscode/test-electron` | Sandbox Webview Mock |
| :--- | :--- | :--- | :--- |
| **Execution Time** | ⚡ ~180ms | ⏳ ~10–15s per run | ⚡ ~100ms |
| **CI Dependencies** |  None (in-process) | ❌ Heavy (`xvfb`, download step) |  None |
| **`vscode` API Fidelity** |  Covers all imported APIs |  100% full runtime | ❌ None (webview only) |
| **TDD / Watch Mode** |  Instant feedback (`vitest`) | ❌ Slow & awkward | ⚠️ Browser-only |
| **Deterministic State** |  Isolated per test | ⚠️ Prone to timing/focus |  Isolated |

---

## Consequences

### Positive
1. **Sub-second Feedback:** Developers and CI run the entire monorepo test suite across packages in a few seconds.
2. **Unified Test Stack:** `@animoria/core`, `animoria-vscode`, and `animoria-sandbox` all share the same Vitest runner and reporting formats.
3. **Extensible:** Adding support for new VS Code APIs only requires adding standard mock interfaces to `tests/mocks/vscode.ts`.

### Negative / Accepted Trade-offs
1. Mock tests prove logic contracts against the mock implementation, not Electron rendering. Live host verification is preserved for manual release passes.

---

## How Future Tests Use This Harness

1. **Import `vscode` normally** in test and source files; the Vitest alias handles resolution automatically.
2. **Reset State:** Call `resetTestWorkspace()` in `beforeEach` to reset workspace folders, configuration, in-memory files, and command registries.
3. **Configure Scenario State:** Use `mockVscodeState` (from `tests/harness.ts`) to inject files, fake quick-pick selections, or command results.
4. **Simulate Events:** Use `simulate(...)` or `simulateMessageFromWebview(...)` on returned fake objects to drive watcher or webview events.
5. **Add New APIs:** When using a new `vscode.*` API, add only the required methods to `tests/mocks/vscode.ts`.
