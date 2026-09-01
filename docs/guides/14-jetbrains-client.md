# JetBrains Plugin Client

> **Audience:** JetBrains plugin maintainers, Kotlin/JVM developers, IDE integration engineers
> **Scope:** `animoria-jetbrains` Kotlin plugin, out-of-process native daemon manager (`CoreProcessManager.kt`), bundled-binary resolution and extraction (`DaemonBinaryResolver.kt`), JCEF-embedded `@animoria/ui`
> **Status:** Authoritative
> **Primary packages:** [`animoria-jetbrains`](../../packages/animoria-jetbrains), [`animoria-core-rust`](../../packages/animoria-core-rust), [`@animoria/ui`](../../packages/animoria-ui)

## 1. Purpose

This guide explains the architecture and implementation of `animoria-jetbrains`, the IntelliJ Platform plugin for Animoria. Because Kotlin cannot import Rust code directly, the plugin spawns the native `animoria` binary as a background process (`CoreProcessManager.kt`), locates and extracts that binary from the plugin's own JAR (`DaemonBinaryResolver.kt`), speaks NDJSON Protocol v1 to it, and mounts `@animoria/ui` web components in IntelliJ's embedded browser (JCEF).

**Correction from the previous revision of this guide:** there is no Node.js or SEA-binary fallback anywhere in this plugin today. `DaemonBinaryResolver` looks exclusively for a native Rust executable — either in a development checkout's `packages/animoria-core-rust/target/{release,debug}/` (checked first) or extracted from the plugin JAR's bundled `native/<platform-arch>/` resources. If neither is found, the plugin reports `onDaemonUnavailable` and does not attempt any other runtime.

## 2. Architecture

```mermaid
graph TD
    subgraph JVMProcess["JVM Process (IntelliJ Platform / Kotlin)"]
        ProcessMgr["CoreProcessManager.kt"]
        BinaryResolver["DaemonBinaryResolver.kt"]
        ToolWindow["Tool Window / AnimoriaAnalysisHolder"]
        JCEFPanel["JCEF-embedded @animoria/ui panel"]
    end

    subgraph SubprocessBoundary["Subprocess Boundary (stdin / stdout)"]
        DaemonBinary["animoria daemon (native Rust binary, bundled per platform)"]
    end

    subgraph JCEFSurface["Embedded Chromium (JCEF)"]
        SharedUIBundle["@animoria/ui Bundle (Lit Web Components)"]
    end

    ProcessMgr --> BinaryResolver
    BinaryResolver -->|Resolves / extracts from plugin JAR| DaemonBinary
    ProcessMgr -->|Spawns "animoria daemon"| DaemonBinary
    ProcessMgr <-->|NDJSON stdin/stdout Protocol v1| DaemonBinary
    ToolWindow --> JCEFPanel
    JCEFPanel --> SharedUIBundle
    ProcessMgr -->|"analysis-completed" payload, forwarded verbatim| JCEFPanel
```

### Module Boundaries

| Module | Location | Primary Responsibility |
|---|---|---|
| **Process Manager** | [`CoreProcessManager.kt`](../../packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/CoreProcessManager.kt) | Spawns and supervises the native daemon subprocess, sends Protocol v1 requests (`sendCommand`), parses NDJSON responses/events, routes push events. |
| **Binary Resolver** | [`DaemonBinaryResolver.kt`](../../packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/DaemonBinaryResolver.kt) | Locates the native `animoria` executable: dev-tree Cargo output first, then JAR-bundled `native/<platform-arch>/` resources extracted to a fingerprint-keyed cache directory. |

## 3. Lifecycle

```
IntelliJ project open → Tool Window factory calls CoreProcessManager.start()
→ resolveContentRoots() reads every module's content roots (not just project.basePath)
→ binaryResolver.findBundledExecutable() — dev-tree build, else extract from plugin JAR
→ ProcessBuilder spawns `<binary> daemon` (no CLI args — the daemon takes none; every
  request, including which workspace to scan, travels as NDJSON over stdin)
→ Daemon writes `ready` event → CoreProcessManager sets isReady=true, fires onReady,
  and immediately sends `analyze` for the first content root (nothing else triggers
  the first scan — the daemon does not scan any CLI-supplied root on its own)
→ Daemon replies to `analyze`, then pushes an unsolicited `analysis-completed` event
  → CoreProcessManager decodes it, updates AnimoriaAnalysisHolder, forwards to JCEF
→ Tool window disposed → CoreProcessManager.stop() cancels the coroutine scope,
  closes stdin, and destroys the process (falling back to destroyForcibly after 500ms)
```

`CoreProcessManager` is **push-driven**, not request/response-driven, for the analysis surface: the daemon-side code comment in `server.rs` notes explicitly that `CoreProcessManager` discards the ordinary response to `scan`/`check`/`analyze`/`getAnalysis` and waits for the `analysis-completed` event instead, because that event carries the full `MultiRootAnalysis` shape (`roots`/`assets`/`duplicateGroups`/`referenceCounts`) the JCEF UI needs, not the bare `WorkspaceAnalysis` the direct response nests.

## 4. Core Implementation

### Key Invariants & Rules

1. **Zero Native Logic Reimplementation**: Kotlin MUST NEVER reimplement parsing, scanning, reference matching, or governance logic. `animoria-core-rust` is the single source of truth; Kotlin remains strictly a presentation and platform integration layer.
2. **Structured protocol only**: State and commands travel exclusively as Protocol v1 NDJSON over the daemon subprocess's stdio — never via ad hoc JS injection into JCEF.

### Native Binary Resolution & Extraction (`DaemonBinaryResolver.findBundledExecutable`)

Resolution order:
1. `<project.basePath>/packages/animoria-core-rust/target/release/animoria(.exe)`
2. `<project.basePath>/packages/animoria-core-rust/target/debug/animoria(.exe)`
3. Extracted from the plugin's own JAR: resources under `native/<platform-arch>/` (where `<platform-arch>` is computed from `os.name`/`os.arch`, e.g. `darwin-arm64`, `linux-x64`).

There is **no further fallback**. If none of these produce an executable, `findBundledExecutable()` returns `null`, `start()` invokes `onDaemonUnavailable` with a message pointing at `cargo build --release`, and the plugin does not attempt to run any other runtime (no Node.js, no `cli.js`, no SEA binary).

Extraction from the JAR is keyed by a fingerprint of the JAR entry's CRC + size — not by plugin version — so an upgrade that ships a changed binary always re-extracts, while an upgrade that doesn't never needlessly repeats a ~100 MB copy. Stale extractions of previous builds are pruned before writing a new one.

Supported bundled platforms today: **`linux-x64`, `linux-arm64`, `darwin-arm64` (Apple Silicon only — there is no Intel macOS bundle), `win32-x64`** — this is the exact matrix the release workflow (`.github/workflows/release.yml`) builds and packages per target.

The `src/main/resources/native/<platform-arch>/` directories are not part of the versioned source tree — `.gitignore` excludes `packages/animoria-jetbrains/src/main/resources/native/` with the comment "Native CLI binaries — regenerated per-platform by `scripts/copy-native-daemon.mjs`". They are populated at build/release time, not checked into git. The supported-platforms list above is derived from `.github/workflows/release.yml`'s build matrix (`linux-x64`, `linux-arm64`, `darwin-arm64`, `win32-x64`) and from `DaemonBinaryResolver.kt`'s `platformArchDirName()` mapping logic, not from inspecting bundled resources directly.

### `CoreProcessManager.sendCommand`

Every outbound request is a Protocol v1 envelope built explicitly (`protocol`, `id`, `method`, `params` — not `command`/`data`, which was the pre-Rust protocol's vocabulary):

```kotlin
val payload = buildJsonObject {
    put("protocol", PROTOCOL_VERSION) // 1
    put("id", requestId)
    put("method", command)
    put("params", data)
}
stdinWriter?.println(payload.toString())
```

Responses and events are told apart structurally: a line carrying `id` is a response settled against the matching pending `CompletableDeferred`; a line carrying `event`/`sequence` instead is routed to `routeEvent`. A `protocol` field that doesn't match `PROTOCOL_VERSION` is never acted on — `reportProtocolMismatch` logs once and calls `onDaemonUnavailable` rather than guessing at how to interpret a mismatched payload.

### Capability Verification (`verifyDaemonCapabilities`)

On the `hello` event, `CoreProcessManager` checks the daemon's declared `methods` array against a hardcoded `REQUIRED_METHODS` set (`hello`, `getAnalysis`, `analyze`, `getUsageReferences`, `generateThumbnail`, `generateSnippet`, `exportReport`, `buildCleanupProposal`, `buildCleanupPlan`, `applyCleanupPlan`, `buildResolutionPlan`, `applyResolutionPlan`, `listTrashSessions`, `restoreTrashSession`). A stale bundled binary that predates a feature is diagnosed once, at handshake, instead of surfacing as a stream of confusing per-feature `"declared but not implemented"` errors.

### Identified Discrepancy

> [!NOTE]
> **Missing Action: "Reveal in File Manager"**
> Unlike VS Code (which provides `animoria.revealInExplorer`), JetBrains currently lacks an equivalent context-menu action. This is a client-wiring gap, not a daemon limitation — it can be resolved by invoking IntelliJ's public `com.intellij.ide.actions.RevealFileAction` API.

## 5. CLI / Daemon

The JetBrains plugin is a Protocol v1 client exactly as specified in [12-daemon-protocol.md](12-daemon-protocol.md). It calls `hello`, `analyze`, `getUsageReferences`, `generateThumbnail`, `generateSnippet`, `exportReport`, the cleanup/resolution-plan methods, and the trash-session methods, and listens for `ready`/`analysis-completed`/`analysis-stale`/`fatal` events (see the open question in [12-daemon-protocol.md §4](12-daemon-protocol.md#4-core-implementation) about which of these the Rust daemon currently emits versus which `CoreProcessManager` merely knows how to route).

## 6. VS Code

VS Code integration is documented separately in [13-vscode-client.md](13-vscode-client.md). Both clients speak the identical protocol to the identical binary.

## 7. JetBrains Actions & Inspections

The registered actions, confirmed against the current `plugin.xml`, are: `Animoria.ShowToolWindow` (`ShowAnimoriaToolWindowAction`), `Animoria.RefreshAnalysis` (`RefreshAnalysisAction`, default shortcut `shift alt A`), `Animoria.AnalyzeWorkspace` (`AnalyzeWorkspaceAction`, default shortcut `shift alt G`), `Animoria.OpenGovernanceReport` (`OpenGovernanceReportAction`), `Animoria.ReviewCleanup` (`ReviewCleanupAction`), `Animoria.RestoreCleanup` (`RestoreCleanupAction`), and `Animoria.OpenSettings` (`OpenSettingsAction`). All classes live under `com.sxnnyside.animoria.actions`, and all are grouped under `Animoria.MainGroup` added to the platform's `ToolsMenu`.

Plugin actions are registered in [`plugin.xml`](../../packages/animoria-jetbrains/src/main/resources/META-INF/plugin.xml).

## 8. Sandbox

The local sandbox (`apps/animoria-sandbox`) is used to develop and review `@animoria/ui` components against the real native daemon before those components are bundled into the IIFE embedded inside the JetBrains plugin JAR. See [15-sandbox-client-parity.md](15-sandbox-client-parity.md).

## 9. Contracts & Types

JetBrains payload decoding uses `kotlinx.serialization` with `ignoreUnknownKeys = true` — deliberately, so that an additive field the Rust core starts sending does not break an already-installed plugin build. Kotlin data classes (`WorkspaceAnalysisData`, `MultiRootAnalysisData`, etc.) mirror the JSON shapes the daemon emits; they are hand-maintained Kotlin equivalents of the canonical `ts-rs`-generated TypeScript contracts in [`packages/animoria-contracts/src/generated/`](../../packages/animoria-contracts/src/generated/), not generated from the same source.

## 10. Tests & Fixtures

- **JetBrains Kotlin test suite**: [`packages/animoria-jetbrains/src/test/kotlin/com/sxnnyside/animoria/`](../../packages/animoria-jetbrains/src/test/kotlin/com/sxnnyside/animoria)
  - `SemanticBoundaryTest.kt`: Enforces the zero-reimplementation invariant.
  - `backend/ProtocolConformanceTest.kt`, `backend/ProtocolParityTest.kt`: Verify the plugin's protocol usage against the daemon's actual behavior.
  - `backend/DaemonVocabularyTest.kt`: Holds `CoreProcessManager.REQUIRED_METHODS` to the daemon's own declared method vocabulary.
  - `backend/NativeDaemonIntegrationTest.kt`: Spawns the real native binary.
  - `backend/DaemonBenchmarkTest.kt`, `backend/CoroutineLifecycleTest.kt`: Performance and start/stop-cycle correctness.
  - `actions/ActionRegistrationTest.kt`: Verifies action registration against `plugin.xml`.

## 11. Extension Points

### How do I add a new JetBrains action?
1. Create an action class in `packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/actions/`.
2. Register it in `src/main/resources/META-INF/plugin.xml`.
3. If it needs a daemon method not yet in `CoreProcessManager.REQUIRED_METHODS`, add it there so `DaemonVocabularyTest` and `verifyDaemonCapabilities` cover it.

## 12. Failure Modes

| Failure Mode | Root Cause | System Behavior |
|---|---|---|
| **No bundled binary for this platform/arch, and no dev-tree build** | `findBundledExecutable()` returns `null` | `onDaemonUnavailable` fires with a message pointing at `cargo build --release`; no daemon is spawned. |
| **Protocol Mismatch** | Daemon's `protocol` field ≠ `PROTOCOL_VERSION` | `reportProtocolMismatch` logs once and calls `onDaemonUnavailable`; the plugin does not continue parsing further from that daemon. |
| **Request Timeout** | No response within `timeoutMs` (default 10s) | `sendCommand` throws `TimeoutCancellationException`; the pending request is removed from `pendingRequests`. |
| **Stale bundled binary missing a required method** | Plugin upgraded, binary extraction was skipped/failed | `verifyDaemonCapabilities` logs the specific missing methods at handshake, once. |

## 13. Common Maintenance Tasks

### How do I build and test the JetBrains plugin locally?
From `packages/animoria-jetbrains`:
```bash
./gradlew check
./gradlew runIde
```
For `runIde` to find a daemon, first build the native binary so `DaemonBinaryResolver`'s dev-tree check succeeds:
```bash
cargo build --release -p animoria-core-rust
```

## 14. Files & Ownership

| Layer | Path | Responsibility |
|---|---|---|
| JetBrains Adapter | [`.../backend/CoreProcessManager.kt`](../../packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/CoreProcessManager.kt) | Daemon process lifecycle, Protocol v1 client, event routing |
| JetBrains Adapter | [`.../backend/DaemonBinaryResolver.kt`](../../packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/DaemonBinaryResolver.kt) | Native binary discovery and JAR extraction |
| JetBrains Adapter | [`src/main/resources/META-INF/plugin.xml`](../../packages/animoria-jetbrains/src/main/resources/META-INF/plugin.xml) | Plugin manifest and action registry |

## 15. Verification Checklist

```bash
cd packages/animoria-jetbrains && ./gradlew check
```
Verify detekt, ktlint, and the JUnit suite (including `ProtocolConformanceTest`, `DaemonVocabularyTest`, and `NativeDaemonIntegrationTest`, which spawn the real binary) pass cleanly.
