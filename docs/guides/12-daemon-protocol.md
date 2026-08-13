# Daemon Process & Protocol v1

> **Audience:** Core daemon maintainers, JetBrains plugin developers, IPC protocol engineers
> **Scope:** Out-of-process Node.js/SEA daemon execution, NDJSON Protocol v1 specification, handshake, envelope formats, 19 request methods, 12 push events, 16 closed error codes, SEA builds
> **Status:** Authoritative
> **Primary packages:** [`@animoria/core`](../../packages/animoria-core), [`animoria-jetbrains`](../../packages/animoria-jetbrains)

## 1. Purpose

This guide is the authoritative specification for Animoria's out-of-process daemon and **Protocol v1**. Because non-Node environments (such as IntelliJ IDEA's JVM runtime) cannot import `@animoria/core` TypeScript modules directly, the JetBrains plugin spawns `@animoria/core` as a long-lived background daemon process communicating over `stdin`/`stdout` using newline-delimited JSON (NDJSON).

## 2. Architecture

The daemon subsystem is implemented inside `@animoria/core/daemon`:

```mermaid
graph TD
    subgraph HostProcess["Host Process (IntelliJ Plugin / CLI Client)"]
        ClientManager["CoreProcessManager.kt / DaemonClient"]
    end

    subgraph DaemonProcess["Daemon Subprocess (Node.js / SEA Binary)"]
        Server["DaemonServer (server.ts)"]
        Registry["RequestRegistry (request-registry.ts)"]
        Protocol["Protocol v1 Engine (protocol.ts)"]
        CoreEngine["@animoria/core Subsystems"]
    end

    ClientManager <-->|stdin (Requests) / stdout (Responses & Events)| Server
    Server --> Registry
    Server --> Protocol
    Server --> CoreEngine
```

### Module Boundaries

| Module | Location | Primary Responsibility |
|---|---|---|
| **Protocol Specification** | [`src/daemon/protocol.ts`](../../packages/animoria-core/src/daemon/protocol.ts) | Authoritative Protocol v1 types, closed error codes, method & event definitions. |
| **Daemon Server** | [`src/daemon/server.ts`](../../packages/animoria-core/src/daemon/server.ts) | NDJSON stream reader, request router, handshake state machine, and event emitter. |
| **Request Registry** | [`src/daemon/request-registry.ts`](../../packages/animoria-core/src/daemon/request-registry.ts) | In-flight request correlation and cancellation manager. |
| **SEA Build Tooling** | [`scripts/build-sea.mjs`](../../packages/animoria-core/scripts/build-sea.mjs) | Compiles Node.js Single Executable Application (SEA) binaries for distribution. |

## 3. Lifecycle

A daemon session follows an explicit handshake lifecycle:

```
Spawn Subprocess (node dist/cli.js <workspacePath> OR native SEA binary)
→ Client sends `hello` Request (Method: "hello", protocol: 1)
→ Daemon answers `hello` Response (Capabilities, session ID, workspace roots)
→ Daemon completes initial scan → emits `ready` Event
→ Client issues Request Methods (analyze, getAnalysis, generateThumbnail, etc.)
→ Daemon emits unsolicited Push Events (analysis-completed, workspace-changed)
→ Client sends `shutdown` Request → Daemon drains requests & exits cleanly
```

## 4. Core Implementation

### The Protocol v1 Contract (`protocol.ts`)

#### 1. Versioning Requirement
Every envelope in both directions MUST include `protocol: 1`. If a client sends an incompatible protocol version, the daemon immediately returns `unsupported-version` and terminates the connection. **There is no legacy fallback.**

#### 2. Disjoint Envelope Shapes

```typescript
// 1. Request Envelope (Client → Daemon)
interface DaemonRequest {
  readonly protocol: 1;
  readonly id: string; // Correlated on response
  readonly method: DaemonMethod;
  readonly params?: Record<string, unknown>;
}

// 2. Response Envelope (Daemon → Client, exactly 1 per request)
interface DaemonResponse {
  readonly protocol: 1;
  readonly id: string;
  readonly result?: unknown;
  readonly error?: DaemonError;
}

// 3. Event Envelope (Daemon → Client, unsolicited state push)
interface DaemonEvent {
  readonly protocol: 1;
  readonly event: DaemonEventName;
  readonly sequence: number; // Monotonically increasing counter
  readonly sessionId: string;
  readonly payload: unknown;
}
```

#### 3. Closed Error Taxonomy (16 Error Codes)
Every failure returns a structured `DaemonError` object with one of 16 closed codes:
- `invalid-request`, `unsupported-version`, `unsupported-method`, `invalid-params`, `duplicate-request-id`, `unknown-request-id`, `workspace-not-found`, `workspace-invalid`, `analysis-failed`, `analysis-incomplete`, `stale-plan`, `unsupported-capability`, `mutation-refused`, `permission-denied`, `cancelled`, `internal-error`.

#### 4. The 19 Declared Daemon Methods
1. **Session & Liveness**: `hello`, `ping`, `cancel`, `shutdown`
2. **Analysis & References**: `analyze`, `getAnalysis`, `getUsageReferences`, `generateThumbnail`, `getLottieDocument`, `generateSnippet`, `exportReport`
3. **Cleanup**: `buildCleanupProposal`, `buildCleanupPlan`, `applyCleanupPlan`
4. **Duplicates**: `buildResolutionPlan`, `applyResolutionPlan`
5. **Trash & Restore**: `listTrashSessions`, `restoreTrashSession`

#### 5. The 12 Push Events
`hello`, `ready`, `fatal`, `indexing-started`, `indexing-progress`, `analysis-started`, `analysis-progress`, `analysis-completed`, `analysis-stale`, `analysis-failed`, `workspace-changed`, `diagnostics`.

### Single Executable Application (SEA) Builds (`build-sea.mjs`)
For distribution with JetBrains plugins without requiring a system Node.js installation, `@animoria/core` is compiled into native single-file binaries across 5 target architectures:
- `darwin-arm64` (macOS Apple Silicon)
- `darwin-x64` (macOS Intel)
- `linux-x64` (Linux x86_64)
- `linux-arm64` (Linux ARM64)
- `win32-x64` (Windows x64)

Packaging scripts in `packages/animoria-core/scripts/` handle blob injection, signing, notarization, and resource bundling into the JetBrains plugin JAR.

## 5. CLI / Daemon

Launching the daemon from the command line:

```bash
# Launch Node.js daemon serving target workspace path
node packages/animoria-core/dist/cli.js /path/to/workspace
```

The daemon logs operational diagnostics to `stderr` and reserves `stdout` strictly for protocol NDJSON strings.

## 6. VS Code

VS Code runs `@animoria/core` in-process inside the extension host Node.js runtime and does **not** use the daemon IPC protocol.

## 7. JetBrains

- IntelliJ plugin manages daemon process lifecycle via `CoreProcessManager.kt`.
- Communicates using `DaemonClient.kt` NDJSON stream reader.
- Handshakes via `hello` command and subscribes to `scanComplete` and `watcherEvent` push events.

## 8. Sandbox

The local sandbox (`apps/animoria-sandbox`) operates browser-side and does not launch the daemon.

## 9. Contracts & Types

Authoritative protocol types reside in [`packages/animoria-core/src/daemon/protocol.ts`](../../packages/animoria-core/src/daemon/protocol.ts).

```typescript
export interface HelloResult {
  readonly protocol: 1;
  readonly minProtocol: 1;
  readonly methods: readonly DaemonMethod[];
  readonly coreVersion: string;
  readonly daemonVersion: string;
  readonly sessionId: string;
  readonly capabilities: DaemonCapabilities;
  readonly workspace: {
    readonly id: string;
    readonly roots: readonly { id: string; path: string; name: string }[];
  };
}
```

## 10. Tests & Fixtures

- **Daemon Unit Tests**: [`packages/animoria-core/tests/daemon/`](../../packages/animoria-core/tests/daemon)
  - `protocol.test.ts`: Validates envelope discriminators and closed error code exhaustiveness.
  - `server.test.ts`: Tests `hello` handshake, request routing, sequence counters, and clean shutdown.
  - `request-registry.test.ts`: Verifies request correlation and cancellation.

## 11. Extension Points

### How do I add a new daemon protocol method?
1. Add method name to `DaemonMethod` union in `src/daemon/protocol.ts`.
2. Add method name to `DAEMON_METHODS` array.
3. Implement request handler in `src/daemon/server.ts`.
4. Add method handler to JetBrains `DaemonClient.kt`.
5. Add unit tests in `tests/daemon/server.test.ts`.

## 12. Failure Modes

| Failure Mode | Root Cause | System Behavior |
|---|---|---|
| **Protocol Mismatch** | Client sends `protocol: 2` | Daemon responds with `unsupported-version` error code and terminates stream. |
| **Unknown Method** | Client requests non-existent method | Daemon returns `unsupported-method` error response with request ID. |
| **In-Flight Cancellation** | Client issues `cancel` for active request ID | Daemon interrupts handler and returns `cancelled` error response. |

## 13. Common Maintenance Tasks

### How do I build native SEA daemon binaries?
Run the SEA build script from core:
```bash
pnpm --filter @animoria/core build:sea
```

## 14. Files & Ownership

| Layer | Path | Responsibility |
|---|---|---|
| Core Daemon | [`packages/animoria-core/src/daemon/protocol.ts`](../../packages/animoria-core/src/daemon/protocol.ts) | Protocol v1 specification & error taxonomy |
| Core Daemon | [`packages/animoria-core/src/daemon/server.ts`](../../packages/animoria-core/src/daemon/server.ts) | NDJSON stream server & request router |
| Core Daemon | [`packages/animoria-core/src/daemon/request-registry.ts`](../../packages/animoria-core/src/daemon/request-registry.ts) | Request correlation & cancellation manager |
| Build Tooling | [`packages/animoria-core/scripts/build-sea.mjs`](../../packages/animoria-core/scripts/build-sea.mjs) | SEA single binary packaging script |

## 15. Verification Checklist

Execute daemon test suite:

```bash
pnpm --filter @animoria/core test tests/daemon/
```
Verify protocol envelope, server handshake, and request cancellation tests pass cleanly.
