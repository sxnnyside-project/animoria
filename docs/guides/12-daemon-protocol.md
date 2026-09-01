# Daemon Process & Protocol v1

> **Audience:** Rust core maintainers, VS Code/JetBrains client engineers, IPC protocol engineers
> **Scope:** The native `animoria` daemon subprocess, NDJSON Protocol v1 envelope shapes, the `hello` handshake, the 20 request methods `supported_methods()` declares, NDJSON line-size capping
> **Status:** Authoritative
> **Primary packages:** [`animoria-core-rust`](../../packages/animoria-core-rust), [`animoria-vscode`](../../packages/animoria-vscode), [`animoria-jetbrains`](../../packages/animoria-jetbrains)

## 1. Purpose

This guide is the authoritative specification for Animoria's daemon process and **Protocol v1**. `animoria-core-rust` is a native Rust binary (`animoria`), not a library any host can import directly — VS Code's Node.js extension host and IntelliJ's JVM runtime both reach it the same way: by spawning `animoria daemon` as a long-lived subprocess and exchanging newline-delimited JSON (NDJSON) over its `stdin`/`stdout`. The sandbox app spawns the identical binary for the same reason.

## 2. Architecture

The daemon is implemented in `animoria-core-rust/src/daemon/server.rs`, driven from the CLI's `daemon` subcommand (`src/cli/mod.rs`, `Commands::Daemon`):

```mermaid
graph TD
    subgraph HostProcess["Host Process (VS Code Ext Host / JetBrains JVM / Sandbox Node)"]
        VsCode["VsCodeDaemonClient (daemon-client.ts)"]
        JetBrains["CoreProcessManager.kt"]
        SandboxClient["RustDaemonClient (rust-daemon-client.ts)"]
    end

    subgraph DaemonProcess["animoria daemon (native Rust subprocess)"]
        Server["DaemonServer::run (server.rs)"]
        Framing["read_capped_line (64 MiB NDJSON cap)"]
        Handler["handle_request match"]
        Index["AssetIndex / duplicate groups / references"]
    end

    VsCode <-->|stdin (Requests) / stdout (Responses + Events)| Server
    JetBrains <-->|stdin (Requests) / stdout (Responses + Events)| Server
    SandboxClient <-->|stdin (Requests) / stdout (Responses + Events)| Server
    Server --> Framing
    Server --> Handler
    Handler --> Index
```

### Module Boundaries

| Module | Location | Primary Responsibility |
|---|---|---|
| **Daemon Server** | [`src/daemon/server.rs`](../../packages/animoria-core-rust/src/daemon/server.rs) | Envelope types (`DaemonRequest`/`DaemonResponse`/`DaemonEvent`), the NDJSON read loop, `read_capped_line` framing, `handle_request` routing, and `supported_methods()`. |
| **CLI Entry Point** | [`src/cli/mod.rs`](../../packages/animoria-core-rust/src/cli/mod.rs) | `Commands::Daemon` constructs a `DaemonServer` and calls `.run()`. |
| **Cleanup Subsystem** | [`src/daemon/cleanup.rs`](../../packages/animoria-core-rust/src/daemon/cleanup.rs) | Cleanup/resolution proposal and plan builders invoked by the daemon's cleanup and duplicate-resolution methods. |
| **Preview Subsystem** | [`src/daemon/preview.rs`](../../packages/animoria-core-rust/src/daemon/preview.rs) | Thumbnail data-URI lookup and Lottie document reads backing `generateThumbnail` / `getLottieDocument`. |

## 3. Lifecycle

A daemon session follows this sequence, as implemented in `DaemonServer::run`:

```
Spawn subprocess (`animoria daemon`, stdio: pipe/pipe/inherit)
→ Daemon writes a `ready` event (sequence 0) immediately, before reading any request
→ Client sends `hello` request (protocol: 1) — daemon replies with engine/version/methods
→ Client issues request methods (`scan`, `analyze`, `getUsageReferences`, etc.)
→ For `scan` | `check` | `analyze` | `getAnalysis`, the daemon ALSO emits an unsolicited
  `analysis-completed` event carrying the push-oriented `MultiRootAnalysis` shape
  (`roots`/`assets`/`duplicateGroups`/`referenceCounts`/`readiness`), immediately after
  the ordinary response — this is what JetBrains' push-driven `CoreProcessManager` waits on
→ Client sends `shutdown` → daemon replies `{ "shutdown": true }` and the read loop exits
```

Note that the daemon's `ready` event is emitted *before* the first request is read — a client can start writing `hello` the moment the process is live, without an arbitrary startup delay.

## 4. Core Implementation

### Envelope Shapes (`server.rs`)

Protocol v1 defines three disjoint NDJSON envelope shapes, each one JSON object per line:

```rust
pub struct DaemonRequest {
    pub protocol: u32,             // must equal PROTOCOL_VERSION (1)
    pub id: String,                // client-assigned, echoed back on the response
    pub method: String,            // aliases: field can arrive as "type"
    pub params: serde_json::Value, // aliases: field can arrive as "payload"
}

pub struct DaemonResponse {
    pub protocol: u32,
    pub id: String,                       // correlates to the request's id
    pub result: Option<serde_json::Value>,
    pub error: Option<DaemonErrorPayload>, // { code, message, detail? }
}

pub struct DaemonEvent {
    pub protocol: u32,
    pub event: String,   // e.g. "ready", "analysis-completed"
    pub sequence: u64,   // monotonically increasing per daemon process
    pub payload: serde_json::Value,
}
```

A request whose `protocol` does not equal `PROTOCOL_VERSION` (currently `1`) is rejected with an `unsupported-version` error — there is no legacy negotiation.

### Example NDJSON Exchange

```jsonc
// Client → Daemon (hello handshake)
{"protocol":1,"id":"req-1","method":"hello","params":{}}

// Daemon → Client (response)
{"protocol":1,"id":"req-1","result":{"engine":"animoria-core-rust","version":"0.1.0","protocol_version":1,"supported_formats":["Lottie","DotLottie","Rive","Gif","Apng","AnimatedSvg","Svg","Png","Jpeg","Webp","Avif"],"capabilities":["deep_parsing","parallel_sha256","aho_corasick_tracing","governance_rules","trash_remediation","multi_syntax_detection"],"methods":["hello","scan", "..."]}}

// Client → Daemon (scan)
{"protocol":1,"id":"req-2","method":"scan","params":{"workspace_path":"/repo","custom_ignore_patterns":[]}}

// Daemon → Client (response)
{"protocol":1,"id":"req-2","result":{"analysis":{"...":"WorkspaceAnalysis"},"references":[],"duplicate_groups":[]}}

// Daemon → Client (unsolicited push event, sent right after the scan response)
{"protocol":1,"event":"analysis-completed","sequence":1,"payload":{"roots":[{"...":"analysis"}],"assets":[],"duplicateGroups":[],"referenceCounts":{},"readiness":{"referencesResolved":true}}}
```

Note `params` accepts both snake_case (`workspace_path`) and camelCase (`workspacePath`) keys interchangeably for most methods — `req.params.get("workspace_path").or_else(|| req.params.get("workspacePath"))` is a recurring pattern in `server.rs`, since the two JVM/Node clients have historically favored different casing.

### NDJSON Line Framing (`read_capped_line`, `MAX_LINE_BYTES`)

`server.rs` does not use `BufRead::lines()` to read requests, because that call has no size limit — it keeps growing an internal buffer until it sees a `\n`, so a client that never terminates a line (a broken pipe, a corrupted write, or a hostile process) could grow that buffer without bound. Instead, `read_capped_line` reads via `fill_buf`/`consume` and enforces:

```rust
const MAX_LINE_BYTES: usize = 64 * 1024 * 1024; // 64 MiB
```

A single NDJSON line larger than 64 MiB is refused (`io::ErrorKind::InvalidData`) rather than buffered — real request/event payloads (workspace analyses) top out in the tens of megabytes even for large monorepos, so 64 MiB leaves headroom without leaving the cap effectively unbounded. This is covered by the `ndjson_framing_tests` module in `server.rs` itself (terminated lines, multiple lines in one chunk, a trailing unterminated line at EOF, and the oversize-refusal case).

### Error Codes

Error codes seen in `server.rs` are not a fixed closed enum type in the Rust source — they are string literals attached ad hoc to each failure site. The ones the daemon actually returns today are: `unsupported-version`, `unsupported-method`, `invalid-request`, `invalid-params`, `analysis-failed`, `mutation-refused`.

### The Declared Daemon Methods (`supported_methods()`)

`supported_methods()` is the single place the `hello.methods` list is built, kept intentionally in sync with the `match` arms in `handle_request` so the two cannot drift. As of this writing it returns exactly these 20 methods:

1. **Handshake**: `hello`
2. **Scanning & Analysis**: `scan`, `check`, `analyze`, `getAnalysis`, `getUsageReferences`
3. **Preview**: `generateThumbnail`, `getLottieDocument`
4. **Snippets & Reports**: `generateSnippet`, `exportReport`
5. **Duplicate Resolution**: `remediate_plan`, `buildResolutionPlan`, `applyResolutionPlan`
6. **Trash**: `trash_asset`, `restore_asset`, `listTrashSessions`, `restoreTrashSession`
7. **Cleanup**: `buildCleanupProposal`, `buildCleanupPlan`, `applyCleanupPlan`
8. **Lifecycle**: `shutdown`

This count reflects `supported_methods()` in `packages/animoria-core-rust/src/daemon/server.rs` at the time this document was written. If you need the current number, count the entries in that array yourself — it is the only source of truth.

Any method not in this list returns `unsupported-method`.

### Push Events

Events observed being emitted by `DaemonServer::run`/`handle_request`: `ready` (sequence 0, on process start) and `analysis-completed` (after `scan`/`check`/`analyze`/`getAnalysis`, built from that response's `analysis`/`duplicate_groups`/`references` fields). JetBrains' `CoreProcessManager.kt` additionally handles `analysis-stale`, `analysis-started`, `analysis-progress`, `indexing-started`, `indexing-progress`, `workspace-changed`, `fatal`, `analysis-failed`, and `diagnostics` as event names it knows how to route — but the Rust daemon in this repository does not currently emit all of those; only `ready` and `analysis-completed` are constructed in `server.rs`.

None of `analysis-stale`, `analysis-started`, `analysis-progress`, `indexing-started`, `indexing-progress`, `workspace-changed`, `fatal`, `analysis-failed`, or `diagnostics` is constructed as a `DaemonEvent` anywhere in `packages/animoria-core-rust/src`. `CoreProcessManager.kt`'s handlers for these event names are dead code: they route events the current daemon never emits, presumably written ahead of a streaming/watch-mode feature that has not shipped.

## 5. CLI / Daemon

Launching the daemon from the command line:

```bash
# Build the native binary
cargo build --release -p animoria-core-rust

# Run it in daemon mode (reads NDJSON requests from stdin, writes to stdout)
./target/release/animoria daemon
```

The daemon reserves `stdout` strictly for protocol NDJSON lines; it does not write diagnostics there, so a client's readline loop over `stdout` never has to filter incidental log noise (JetBrains additionally drains the subprocess's separate `stderr` stream to its own log).

## 6. VS Code

`VsCodeDaemonClient` (`packages/animoria-vscode/src/daemon/daemon-client.ts`) spawns the same `animoria daemon` binary as a child process and speaks Protocol v1 exactly as specified above — VS Code does **not** run any engine logic in-process. See [13-vscode-client.md](13-vscode-client.md) for binary resolution and command wiring.

## 7. JetBrains

`CoreProcessManager.kt` spawns the bundled native daemon and communicates over the same NDJSON protocol, verifying `hello.methods` against `REQUIRED_METHODS` at handshake time so a stale bundled binary is diagnosed once rather than as a stream of per-feature `unsupported-method` errors. See [14-jetbrains-client.md](14-jetbrains-client.md).

## 8. Sandbox

`apps/animoria-sandbox/src/host/rust-daemon-client.ts`'s `RustDaemonClient` spawns the identical `animoria` binary the IDEs use and speaks the identical protocol — the sandbox does not run a simulated or mock daemon. See [15-sandbox-client-parity.md](15-sandbox-client-parity.md).

## 9. Contracts & Types

There is no separate hand-written protocol-types file analogous to a `protocol.ts` — the envelope and payload types live directly in [`packages/animoria-core-rust/src/daemon/server.rs`](../../packages/animoria-core-rust/src/daemon/server.rs) as ordinary `serde`-derived Rust structs (`DaemonRequest`, `DaemonResponse`, `DaemonEvent`, `HelloResultPayload`, `DaemonErrorPayload`). The `hello` response shape:

```rust
pub struct HelloResultPayload {
    pub engine: String,             // "animoria-core-rust"
    pub version: String,
    pub protocol_version: u32,
    pub supported_formats: Vec<String>,
    pub capabilities: Vec<String>,
    pub methods: Vec<String>,       // supported_methods()
}
```

Client-side TypeScript mirrors of the envelope (`DaemonRequestEnvelope`, `DaemonResponseEnvelope`) live in `packages/animoria-vscode/src/daemon/daemon-client.ts` and `apps/animoria-sandbox/src/host/rust-daemon-client.ts` — these are structurally-typed hand copies, not generated from Rust the way domain types under `packages/animoria-contracts/src/generated/` are.

## 10. Tests & Fixtures

- **Rust daemon framing tests**: inline `#[cfg(test)] mod ndjson_framing_tests` at the bottom of [`server.rs`](../../packages/animoria-core-rust/src/daemon/server.rs) — covers single/multiple terminated lines, an unterminated trailing line at EOF, empty input, and the oversize-line refusal.
- **JetBrains protocol tests**: [`ProtocolConformanceTest.kt`](../../packages/animoria-jetbrains/src/test/kotlin/com/sxnnyside/animoria/backend/ProtocolConformanceTest.kt), [`ProtocolParityTest.kt`](../../packages/animoria-jetbrains/src/test/kotlin/com/sxnnyside/animoria/backend/ProtocolParityTest.kt), [`DaemonVocabularyTest.kt`](../../packages/animoria-jetbrains/src/test/kotlin/com/sxnnyside/animoria/backend/DaemonVocabularyTest.kt) (this last one holds `CoreProcessManager.REQUIRED_METHODS` to the protocol's own declared method names), and [`NativeDaemonIntegrationTest.kt`](../../packages/animoria-jetbrains/src/test/kotlin/com/sxnnyside/animoria/backend/NativeDaemonIntegrationTest.kt).
- **VS Code daemon integration test**: [`native-daemon.integration.test.ts`](../../packages/animoria-vscode/tests/native-daemon.integration.test.ts).

## 11. Extension Points

### How do I add a new daemon protocol method?
1. Add a new arm to the `match req.method.as_str()` block in `handle_request` (`src/daemon/server.rs`).
2. Add the method's literal name to the array returned by `supported_methods()` — this is the only source `hello.methods` reads from, so a method left out here is invisible to capability checks even once implemented.
3. If JetBrains depends on it, add it to `CoreProcessManager.REQUIRED_METHODS` (Kotlin) so `DaemonVocabularyTest` and `verifyDaemonCapabilities` cover it.
4. Add the corresponding typed client method to `VsCodeDaemonClient` and/or `RustDaemonClient` as needed.
5. Add or extend a test in the `ndjson_framing_tests`/handler-level Rust tests, and in the relevant JetBrains/VS Code integration test.

## 12. Failure Modes

| Failure Mode | Root Cause | System Behavior |
|---|---|---|
| **Protocol Mismatch** | Client sends `protocol` other than `1` | Daemon responds with `unsupported-version` error and the response still returns (the connection is not forcibly torn down by the server; each request is checked independently). |
| **Unknown Method** | Client requests a method not in `supported_methods()` | Daemon returns `unsupported-method` error response carrying the request's `id`. |
| **Oversized NDJSON Line** | A line (request or a client accidentally streaming garbage) exceeds 64 MiB without a `\n` | `read_capped_line` returns an `io::Error`, the daemon logs to stderr and stops its read loop (the process exits). |
| **No Scanned Workspace** | A method needing an index is called before any `scan`/`analyze`, with no explicit `workspace_path`, or with more than one root scanned and no path given | `no_workspace_error` — `invalid-params`: "No scanned workspace matches this request. Pass workspace_path, or scan a workspace first." |

## 13. Common Maintenance Tasks

### How do I build the native daemon binary locally?
```bash
cargo build --release -p animoria-core-rust
```
The binary is produced at `packages/animoria-core-rust/target/release/animoria` (`animoria.exe` on Windows).

## 14. Files & Ownership

| Layer | Path | Responsibility |
|---|---|---|
| Rust Daemon | [`src/daemon/server.rs`](../../packages/animoria-core-rust/src/daemon/server.rs) | Envelope types, NDJSON framing, method routing, `supported_methods()` |
| Rust Daemon | [`src/daemon/cleanup.rs`](../../packages/animoria-core-rust/src/daemon/cleanup.rs) | Cleanup/resolution plan builders used by daemon methods |
| Rust Daemon | [`src/daemon/preview.rs`](../../packages/animoria-core-rust/src/daemon/preview.rs) | Thumbnail/Lottie document reads for preview methods |
| Rust CLI | [`src/cli/mod.rs`](../../packages/animoria-core-rust/src/cli/mod.rs) | `daemon` subcommand entry point |

## 15. Verification Checklist

Execute the Rust test suite (includes the NDJSON framing tests):

```bash
cargo test -p animoria-core-rust
```

Verify the framing tests (`reads_a_single_terminated_line`, `refuses_a_line_that_never_terminates_past_the_cap`, etc.) and the daemon's handshake/routing behavior pass cleanly. On the JetBrains side, `./gradlew test --tests "*Protocol*"` exercises `ProtocolConformanceTest`, `ProtocolParityTest`, and `DaemonVocabularyTest` against a live spawned binary.
