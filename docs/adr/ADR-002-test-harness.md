# ADR-002: Extension test harness — vitest + module-aliased `vscode` mock

**Status:** Accepted
**Scope:** `packages/animoria-vscode`
**Related:** `TASK-H1.1`, resolves the infrastructure portion of `F-TEST-01`, `F-RUN-01`, `F-RUN-02`, `F-RUN-04`.

## Decision

`packages/animoria-vscode` tests run under vitest, the same runner already used by `@animoria/core`, against a hand-built `vscode` module mock (`tests/mocks/vscode.ts`) that vitest resolves in place of the real `vscode` package via `resolve.alias` in `vitest.config.ts`. `@vscode/test-electron` was evaluated and rejected for this layer.

## Options considered

### Option A — `@vscode/test-electron`

Downloads a real VS Code build and runs tests inside an actual Extension Host process.

- **Fidelity:** highest possible — the real `vscode` API, real webviews, real `WorkspaceEdit` application semantics.
- **Speed:** slow. Each run launches a full Electron/VS Code instance; a CI run needs a display server (`xvfb-run` or equivalent) and pays VS Code's own startup cost on every invocation.
- **Determinism:** lower. Real Electron/VS Code instances are more prone to environment-dependent flakiness (window focus, timing, platform differences between local macOS and CI Linux runners) than an in-process mock.
- **CI compatibility:** works, but adds a second, heavier execution mode (`xvfb`, a VS Code download step, longer job time) that the rest of the monorepo's toolchain (`turbo`, plain `vitest run`) doesn't otherwise need.
- **Signal-to-cost:** highest signal per test, but at a cost that scales badly — every additional test pays the same fixed per-run overhead, and the fast, TDD-friendly loop the rest of the monorepo has (`pnpm test` in ~1s for `@animoria/core`'s 384 tests) would not extend to this package.

### Option B — `apps/animoria-sandbox/src/mocks/mock-extension-host.ts`

Investigated first per the task's explicit instruction to reuse or extend it rather than create a competing mock.

- This class mocks the **webview side** of the sandbox app: it listens for `window.postMessage` calls from the Lit UI running inside a plain browser tab and answers with fake `scanProgress`/`scanComplete`/`assetDeleted` events, entirely to let `apps/animoria-sandbox` be developed without an IDE host at all.
- It does not mock the `vscode` module namespace — no `commands`, `workspace`, `WorkspaceEdit`, `Uri`, `FileSystemWatcher`, `OutputChannel`, etc. Its message vocabulary is also a different, narrower protocol than the real extension's webview panels use.
- **Conclusion:** this is a different layer solving a different problem (developing the shared Lit components outside any host) and has no surface overlap with what `packages/animoria-vscode`'s unit tests need (a `vscode` API to import against). Extending it to also mock the `vscode` namespace would conflate two unrelated concerns into one file and still leave every test needing to reach through a browser-`postMessage` indirection it doesn't otherwise use. It is left untouched.
- The instruction to avoid a _competing_ mock is honored at the right layer: this ADR does not introduce a second webview-message simulator. `tests/mocks/vscode.ts` mocks the extension-host-side `vscode` API surface, which has no existing implementation anywhere in the repo to duplicate.

### Option C (chosen) — vitest + `tests/mocks/vscode.ts`, aliased via `vitest.config.ts`

A minimal, hand-written implementation of the exact `vscode` namespace surface the extension's source code actually imports (enumerated by grepping every `vscode.*` call site — see `tests/mocks/vscode.ts`'s module doc comment). Vitest's `resolve.alias` maps the bare `vscode` specifier to this file, the same way `@vscode/test-electron` isn't needed to make `import * as vscode from 'vscode'` resolve — vitest just points it somewhere real instead of somewhere Electron-only.

- **Fidelity:** narrower than a real Extension Host — no real window rendering, no real Electron IPC. Sufficient for everything this epic's remaining tasks need: command registration/execution, `WorkspaceEdit` construction and application against an in-memory filesystem, file-watcher event simulation, `QuickPick`/dialog result injection, `OutputChannel` capture, and webview `postMessage`/`onDidReceiveMessage` round-tripping in both directions.
- **Speed:** in-process, no subprocess or Electron cost — the full new suite (10 tests) runs in ~180ms, in line with `@animoria/core`'s existing sub-second suite.
- **Determinism:** high — pure in-memory state (`Map`s, `EventEmitter`s), reset per test via `resetTestWorkspace()`; no timing- or environment-dependent behavior.
- **CI compatibility:** zero new CI infrastructure — the existing `pnpm test` → `turbo test` → per-package `vitest run` pipeline picks it up automatically once the package exposes a `test` script, exactly like `@animoria/core` already does.
- **Extensibility:** adding a new capability is adding one function/class to `tests/mocks/vscode.ts` — no separate test-runner configuration or CI job to touch.
- **Signal-to-cost:** the right default for the bulk of this epic's remaining work (`CleanupExecutor`, `workspace-edit-builder.ts`, `AnimoriaDuplicateResolver`'s apply path, the watcher/indexer bridge) — all of it is logic that reads and writes through the `vscode` API surface, not logic that depends on real window/rendering behavior.

## Consequences

- **What this harness does not prove.** A test passing against `tests/mocks/vscode.ts` proves the extension's logic drives the `vscode` API correctly according to this mock's understanding of that API's contract — it does not prove the real VS Code Extension Host behaves identically, and it does not exercise real webview rendering. This is why `TASK-H5.1` (live Extension-Host regression pass) exists as a separate, complementary verification step in the hardening epic — this harness and that manual pass answer different questions and neither substitutes for the other.
- **If a future task genuinely needs real-host fidelity** (e.g. verifying actual Local History rollback behavior for `TASK-H2.1`, which by its nature cannot be answered by any mock), that specific verification should be done manually or, if it recurs often enough to justify the fixed cost, as a narrowly-scoped `@vscode/test-electron` suite added later — not as a wholesale replacement of this harness.
- **No production code was changed to enable testing.** The alias technique means `src/**/*.ts` imports `vscode` exactly as it does today; no test-mode flags, conditional branches, or injected seams were added. The only new production-adjacent code is `buildWorkspaceEdit` itself, which was already structured as a standalone, side-effect-free function before this task (see its own doc comment) — the harness took advantage of an existing seam rather than requiring a new one.

## How future tests use this harness

1. Import `vscode` normally in both test and source files — the alias handles resolution.
2. Call `resetTestWorkspace()` (from `tests/harness.ts`) in `beforeEach` whenever a test touches shared mock state (workspace folders, configuration, the in-memory filesystem, or the command registry) — the mock is a module-level singleton, like the real API, so state leaks across tests without an explicit reset.
3. Configure scenario state directly through `mockVscodeState` (from `tests/harness.ts`) before invoking the code under test — e.g. seed `mockVscodeState.fileSystem` before testing a delete path, or set `mockVscodeState.quickPickResult` before testing a command that awaits `showQuickPick`.
4. For file watchers and webviews, use the returned fake object's `simulate(...)` / `simulateMessageFromWebview(...)` test-only methods (see `tests/harness.smoke.test.ts` for one example of each) to drive events the way a real watcher or webview would.
5. If a call site needs a `vscode` API this mock doesn't yet implement, add it to `tests/mocks/vscode.ts` — keep it narrow (only what a real call site needs) rather than attempting to mirror the full `vscode` typings up front.
