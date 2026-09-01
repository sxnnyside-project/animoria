# Animoria Platform Contract

**Version:** 2.0.0 (post Rust migration)
**Status:** Reflects the current Rust engine (`animoria-core-rust`) as the single source of truth.
**Scope:** `animoria-core-rust` (engine, CLI, daemon), `animoria-contracts`, `animoria-vscode`, `animoria-jetbrains`, `apps/animoria-sandbox`

## Purpose

This document is the canonical inventory of every capability the Rust engine exposes over the daemon protocol, and how each client (VS Code, JetBrains, sandbox) reaches it. It supersedes the pre-2.0.0 version of this document, which described a TypeScript engine (`@animoria/core`, since fully removed from this repository) and a 10-command daemon surface that no longer exists.

**Product principle for this document:** the reference implementation is **Animoria's Rust engine**, not any one client. Every host converges on the same functional contract exposed by `animoria-core-rust`; clients differ only where a platform genuinely requires it (e.g. the sandbox has no filesystem, JetBrains has no native webview DOM without JCEF).

---

## 1. Architecture recap (context for the inventory)

Unlike the pre-2.0.0 architecture — where VS Code linked the TypeScript engine in-process and only JetBrains spoke a daemon protocol — **every host now reaches the engine the same way**: by spawning the compiled `animoria` native binary and speaking NDJSON over its stdin/stdout. There is no in-process integration path left.

| Client | How it reaches `animoria-core-rust` |
|---|---|
| VS Code | **Out-of-process daemon.** `daemon-client.ts` (`packages/animoria-vscode/src/daemon/daemon-client.ts`) spawns the `animoria` binary via `node:child_process` and speaks NDJSON over stdin/stdout, correlating requests by `id`. |
| JetBrains | **Out-of-process daemon.** Kotlin cannot link Rust directly. `CoreProcessManager.kt` spawns the platform-appropriate `animoria` binary (located by `DaemonBinaryResolver.kt`) as a long-lived subprocess and talks NDJSON over stdin/stdout. |
| Sandbox (Lit) | **Out-of-process daemon, against fixtures.** `apps/animoria-sandbox/src/host/rust-daemon-client.ts` speaks the same NDJSON protocol as the other two hosts, but against read-only fixture workspaces rather than a live user filesystem (a browser has no filesystem access of its own). |

This means: **the daemon method surface in `daemon/server.rs`'s `supported_methods()` is the true ceiling for every client's capability.** Anything not exposed as a daemon method cannot exist in any host without a change to the Rust engine — CLAUDE.md's "Single Source of Truth" and "Zero Client-Side Calculation" invariants forbid reimplementing governance/scanning/scoring logic natively in TypeScript or Kotlin.

---

## 2. Daemon Protocol v1 — Method Inventory

Source of truth: `packages/animoria-core-rust/src/daemon/server.rs` (`PROTOCOL_VERSION`, `DaemonRequest`, `DaemonResponse`, `DaemonEvent`, `supported_methods()`).

### Envelope shapes

```
request  { protocol, id, method, params }
response { protocol, id, result | error }
event    { protocol, event, sequence, payload }
```

`protocol` is required on every message in both directions; a client outside the daemon's supported window is told which side is out of date. `hello` establishes the protocol version, engine version, `supported_formats`, `capabilities`, and the full `methods` list the running daemon actually answers — a host can therefore detect a daemon that predates a feature at handshake time instead of failing per-call.

### Request/response methods (host → daemon, correlated by `id`)

The complete, current set of methods, as returned by `supported_methods()`:

| Method | Category |
|---|---|
| `hello` | Handshake |
| `scan` | Indexing |
| `check` | Governance (CI-style one-shot) |
| `analyze` | Indexing / analysis |
| `getAnalysis` | Indexing / analysis |
| `getUsageReferences` | Usage tracing |
| `generateThumbnail` | Thumbnails |
| `getLottieDocument` | Preview / playback |
| `generateSnippet` | Framework integration snippets |
| `exportReport` | Reporting |
| `remediate_plan` | Remediation |
| `trash_asset` | Remediation |
| `restore_asset` | Remediation |
| `buildCleanupProposal` | Cleanup planning |
| `buildCleanupPlan` | Cleanup planning |
| `applyCleanupPlan` | Cleanup planning |
| `buildResolutionPlan` | Duplicate resolution |
| `applyResolutionPlan` | Duplicate resolution |
| `listTrashSessions` | Trash recovery |
| `restoreTrashSession` | Trash recovery |
| `shutdown` | Lifecycle |

**Findings:**

- **Protocol versioning exists** (`PROTOCOL_VERSION`, checked against every incoming request's `protocol` field) — this closes the gap the pre-2.0.0 version of this document flagged as a "latent risk" (no version field in the NDJSON envelope). A version mismatch is now reported explicitly rather than failing with an opaque deserialization error.
- **Trash recovery exists** (`listTrashSessions`, `restoreTrashSession`, `restore_asset`) — this closes the "Missing everywhere: trash recovery" gap the pre-2.0.0 document flagged. Assets removed via a resolution/cleanup plan are staged under `.animoria/trash/` and are restorable, per CLAUDE.md's "Plan-Based Remediation" invariant.
- **`ping`/health method:** No explicit `ping` or `health` method exists. The daemon's request dispatcher in `packages/animoria-core-rust/src/daemon/server.rs` matches only functional methods (`hello`, `scan`, `check`, `analyze`, `getAnalysis`, `exportReport`, `getUsageReferences`, `generateThumbnail`, `getLottieDocument`, `remediate_plan`, `trash_asset`, `restore_asset`, `generateSnippet`, `buildCleanupProposal`, `buildCleanupPlan`, `applyCleanupPlan`, `buildResolutionPlan`, `applyResolutionPlan`, and the trash-session methods) — there is no liveness-check arm in the match. Instead, each host distinguishes "slow" from "dead" purely via per-request timeouts and process-exit handling: the JetBrains `CoreProcessManager.kt` wraps every `sendCommand` in `withTimeout(timeoutMs) { deferred.await() }` with a default `timeoutMs = 10_000L`, treating a timeout as a liveness failure for that request rather than polling a dedicated health endpoint. The VS Code `VsCodeDaemonClient` has no per-request timeout at all — its `pendingRequests` promises resolve or reject only when a matching response line arrives on stdout, or when the child process's `exit`/`error` event fires and `rejectAllPending()` rejects every outstanding request; a hung-but-still-running daemon that never writes a response has no dedicated detection path on the VS Code side today.

---

## 3. CLI Command Inventory

Source of truth: `packages/animoria-core-rust/src/cli/commands/` (`main.rs` dispatch).

The `animoria` binary exposes subcommands directly under `cli/commands/`:

| Subcommand | File | Purpose |
|---|---|---|
| `check` | `check.rs` | Headless CI/CD governance gate — one-shot scan against configured rules. |
| `clean` | `clean.rs` | Cleanup-plan construction/execution from the CLI. |
| `init` | `init.rs` | Scaffolds a starting `.animoriarc.json` (and/or `.animoriaignore`) for a workspace. |
| `report` | `report.rs` | Generates a governance report (see `exportReport` daemon method for the equivalent programmatic path). |
| `restore` | `restore.rs` | Restores previously trashed assets. |
| `scan` | `scan.rs` | One-shot asset discovery/indexing without applying governance rules. |
| *(no subcommand / daemon mode)* | `daemon/server.rs` | Long-running NDJSON daemon (see §2). |

**Findings:**

- Unlike the pre-2.0.0 CLI (`check` plus an undifferentiated daemon bootstrapper only), the Rust CLI now exposes `clean`, `init`, `report`, and `restore` as first-class human-usable subcommands in addition to `check` and `scan` — this closes the "CLI is not yet a full reflection of the platform contract" gap the previous version of this document flagged, at least for the commands listed above.
- Confirmed directly from the `clap` `Commands` enum in `packages/animoria-core-rust/src/cli/args.rs`: the CLI exposes exactly six subcommands, invoked with these literal names and flags — `animoria scan [path] [--json]`; `animoria check [path] [--json] [--strict]` (exit 0 = no violations, 1 = error-level violation, 2 = warnings-only with `--strict`); `animoria report [path] [--json]`; `animoria clean [path] [--apply]` (previews by default; `--apply` stages duplicates into `.animoria/trash`); `animoria restore [path] [--list] [--session <id>] [--all]`; `animoria init [path] [--force]`; and `animoria daemon` (no path argument — starts the Protocol v1 NDJSON server over stdio). Global flags available on every subcommand are `--no-color`, `-q`/`--quiet`, and `-v`/`--verbose` (repeatable).

---

## 4. Platform Capability Inventory & Contract Matrix

**Scope note:** The detailed per-client capability matrix that existed in the pre-2.0.0 version of this document cited specific Kotlin/TypeScript file:line call sites (e.g. `AnimoriaGalleryPanel.kt:249`, `AnimoriaPreviewPanel.ts:239`) against the old architecture, where the engine ran TypeScript in-process and the daemon exposed 10 methods. Those call sites no longer apply: the engine is now Rust-only, the daemon method surface grew from 10 to 20 methods, and VS Code no longer imports the engine in-process. Rebuilding an equally precise matrix — citing real, current call sites in `packages/animoria-vscode/src/` and `packages/animoria-jetbrains/src/main/kotlin/` against each of the 20 daemon methods — requires a full line-by-line audit of both host codebases, which is a substantially larger body of work than fits inside this documentation pass. That matrix has been deliberately removed from this document rather than published stale or fabricated; reconstructing it is intentionally scoped out as a separate, dedicated audit task.

What can be stated with confidence from the source read for this update:

- `CoreProcessManager.kt` (JetBrains) calls at least `analyze` and `getAnalysis` against the daemon (confirmed by direct grep of the Kotlin source), consistent with the method inventory in §2.
- The unified `Asset` contract (motion + static formats in one model, see `docs/ARCHITECTURE.md` §2.A) means capabilities that previously required two parallel type hierarchies (animated vs. static asset classes) in the TypeScript engine are now uniform across all clients by construction — there is only one `Asset` shape to render, regardless of host.

---

## 5. Gap Analysis

| Gap | Classification | Rationale |
|---|---|---|
| Daemon `ping`/health method | Confirmed missing | No `ping`/`health` arm exists in the daemon's method dispatch (`packages/animoria-core-rust/src/daemon/server.rs`). Liveness is inferred purely from per-request timeout (JetBrains: `withTimeout(timeoutMs)`, default 10s) and process exit/error events (VS Code: `rejectAllPending()` on the child process's `exit`/`error` handlers) — see §3 above. |
| Full per-capability client matrix (§4) | Out of scope for this document | The previous matrix's citations (Kotlin/TypeScript file:line) predate the Rust migration and the daemon method surface change (10 → 20 methods); rebuilding it accurately requires a fresh, dedicated source audit of both host codebases against the current method list in §2, and is intentionally not attempted inline in this pass — see the scope note in §4. |
| CLI subcommand flag surface | Confirmed | Verified directly against the `clap` `Commands` enum in `packages/animoria-core-rust/src/cli/args.rs`: subcommand names, arguments, and flags are as documented in §3 above. |

---

## 6. Answering the Success Criteria

- **What is Animoria's canonical platform contract?** The daemon method set in §2, sourced from `animoria-core-rust`'s `supported_methods()`, plus the CLI subcommands in §3. `animoria-core-rust` is the single source of truth for all business logic (scanning, parsing, tracing, deduplication, governance, remediation) per CLAUDE.md.
- **Which client implements each capability?** Every host (VS Code, JetBrains, sandbox) reaches the engine identically, by spawning the `animoria` binary and speaking Protocol v1 NDJSON — see §1. A full per-capability, per-call-site matrix could not be rebuilt with verified citations in this pass (see §4 TODO) and needs a dedicated follow-up audit.
- **Which daemon methods exist today?** The 20 methods enumerated in §2 — a superset of the pre-2.0.0 10-command surface, notably adding trash recovery (`listTrashSessions`, `restoreTrashSession`) and protocol versioning.
- **Which CLI commands exist today?** `check`, `clean`, `init`, `report`, `restore`, `scan`, plus the daemon-mode bootstrap — a superset of the pre-2.0.0 CLI, which exposed only `check` as a human-usable subcommand.
