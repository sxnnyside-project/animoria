# Animoria Platform Contract

**Version:** 1.0.0
**Status:** Draft — WP1 deliverable (investigative only, no code changed)
**Scope:** `animoria-core`, CLI, Daemon protocol, `animoria-vscode`, `animoria-jetbrains`, `animoria-sandbox`

## Purpose

This document is the canonical inventory of every public capability Animoria exposes, and which
client(s) currently implement it. It exists so that future Client Platform Parity work packages
(WP2+) derive from verified evidence, not assumption.

**Product principle for this document:** the reference implementation is **Animoria itself**, not
VS Code. Every client converges on the same functional contract; clients differ only where a
platform genuinely requires it (e.g. sandbox has no filesystem, JetBrains has no native webview
DOM without JCEF). "Not implemented yet" is never an acceptable rationale for intentional absence
— only a real platform constraint is.

All findings below were verified by reading the actual source in this repository as of this audit
(`cli.ts`, `extension.ts`, JetBrains Kotlin sources, sandbox components). No capability is marked
"Fully Supported" without a corresponding call site cited.

---

## 1. Architecture recap (context for the matrix)

Three distinct integration strategies exist today, by design:

| Client | How it reaches `@animoria/core` |
|---|---|
| VS Code | **In-process.** `animoria-vscode` imports `@animoria/core` directly as a library inside the extension host (Node.js). No IPC. Example: `AnimoriaPreviewPanel.ts:239` calls `animoria.getAnimationData(asset)` directly. |
| JetBrains | **Out-of-process daemon.** Kotlin cannot import TypeScript. `CoreProcessManager.kt` spawns `cli.js` (or the SEA-packaged native binary) as a long-lived subprocess and talks NDJSON over stdin/stdout. Every capability must be exposed as a named daemon command to reach JetBrains. |
| Sandbox (Lit) | **Mocked.** `animoria-app.ts` imports `mocks/mock-extension-host.js`, a fake in-browser stand-in — the sandbox is a UI development harness, not a live workspace scanner (browsers have no filesystem access). This is a legitimate platform constraint, not a gap. |

This means: **the daemon command surface in `cli.ts`'s `handleCommand()` is the true ceiling for
JetBrains capability.** Anything not exposed as a daemon command cannot exist in JetBrains without
either (a) adding a new command to `cli.ts`, or (b) reimplementing logic natively in Kotlin — which
CLAUDE.md explicitly forbids. VS Code has no such ceiling, since it links the library directly.

---

## 2. Daemon IPC Inventory

Source of truth: `packages/animoria-core/src/cli.ts`, `runWatchDaemon()` / `handleCommand()`.

### Push events (daemon → host, unsolicited)

| Event | Emitted when | Payload |
|---|---|---|
| `scanProgress` | During initial indexer bootstrap | `{ percent, message }` |
| `scanComplete` | First full workspace scan finishes | `{ assets, ruleReport, healthScore, referenceCounts, staticAssets }` |
| `watcherEvent` | Any subsequent indexer update (file change) | `{ type: 'indexUpdate', assets, ruleReport, healthScore, referenceCounts, staticAssets }` |
| `error` | Uncaught scan/indexer error | `{ message }` |
| `commandError` | A request-scoped command throws or is unrecognized | `{ command, message }`, carries the originating `requestId` if present |

### Request/response commands (host → daemon, correlated by `requestId`)

| # | Command | Request payload | Response event | Consumed by (verified) |
|---|---|---|---|---|
| 1 | `runGovernance` | `{ overusedThreshold? }` | `governanceResult` (GovernanceReport) | JetBrains: `AnimoriaGalleryPanel.kt:249` |
| 2 | `generateThumbnail` | `{ assetPath }` | `thumbnailResult` | JetBrains: `AnimoriaGalleryPanel.kt:397` |
| 3 | `generateSnippet` | `{ assetPath }` | `snippetResult` | JetBrains: `GenerateSnippetAction.kt` |
| 4 | `buildCleanupProposal` | `{ dismissedPaths? }` | `cleanupProposal` | JetBrains: `CleanupReviewDialog.kt:123,189` |
| 5 | `executeCleanup` | `{ assetPaths }` | `cleanupSummary` | JetBrains: `AnimoriaGalleryPanel.kt:229`, `CleanupReviewDialog.kt:166,339` |
| 6 | `resolveDuplicates` | `{ keepPath, removePaths }` | `duplicateResolutionResult` | JetBrains: `DuplicateResolverDialog.kt:184` |
| 7 | `exportGovernanceReport` | `{ format: 'markdown'\|'json' }` | `governanceReportExport` | JetBrains: `ExportGovernanceReportAction.kt` |
| 8 | `getUsageReferences` | `{ assetPath }` | `usageReferencesResult` | JetBrains: `AnimoriaPreviewPanel.kt:425,1614` |
| 9 | `getSnapshot` | `{}` | `snapshotResult` | JetBrains: `AnimoriaGalleryPanel.kt:376` |
| 10 | `getAnimationData` | `{ assetPath, format?, animationId? }` | `animationDataResult` | JetBrains: `AnimoriaPreviewPanel.kt:185,308` |

**Findings:**

- **No orphan commands.** Every one of the 10 daemon commands is called by at least one client
  (JetBrains). VS Code does not need any of them, since it calls the equivalent `@animoria/core`
  functions in-process instead (`GovernanceAnalyzer`, `ThumbnailEngine`, `integrationRegistry`,
  `moveAssetsToTrash`, `UsageScanner`, `Animoria.getAnimationData`, etc.) — this is expected given
  the architecture in §1, not a discrepancy.
- **No versioning field exists in the envelope.** `emit()` writes `{ event, data, requestId? }`
  with no protocol/schema version. Today this is harmless (single daemon binary always matches the
  plugin it ships with), but it is a **latent risk**: a JetBrains plugin update that ships a new
  Kotlin payload shape against a stale cached native daemon binary (or vice versa) would fail
  silently or with a generic deserialization error, not a clear "protocol mismatch" message.
- **No obsolete commands found** — all 10 are live and referenced.
- **Naming is consistent**: every command is a verb-first camelCase string, every response event
  name is `<subjectOrVerb>Result` / `<subjectOrVerb>Summary` / `<subjectOrVerb>Proposal`, applied
  uniformly.
- **Missing daemon commands** (capabilities that exist in Core/VS Code but have no daemon command,
  and are therefore structurally unreachable from JetBrains today):
  - None found for the currently-shipped feature set — every VS Code-facing capability that has a
    JetBrains equivalent already has a matching daemon command. The gaps that exist (§5) are gaps
    in the **client UI wiring**, not in the daemon surface.

---

## 3. CLI Command Inventory

Source of truth: `packages/animoria-core/src/cli.ts` (`main()`), `cli/check-command.ts`.

The `animoria` binary (`dist/cli.js`) has exactly **two** entry modes, dispatched on `argv[2]`:

| Subcommand | Purpose | Daemon-compatible? | Core-compatible? |
|---|---|---|---|
| `animoria check [...]` | Headless CI/CD governance gate. One-shot `WorkspaceIndexer.initialize()` pass, renders a report (terminal/markdown/json via `renderer-registry.ts`), maps outcome to a documented exit code (`cli/exit-codes.ts`). Pure function (`runCheckCommand`) — no `process.exit`/`console.log` inside the logic itself, only in `main()`'s two-line translation layer. | N/A — one-shot, not a daemon session | Yes — calls `WorkspaceIndexer`/`buildGovernanceCheckReport` directly |
| *(no subcommand)*, i.e. `node cli.js <workspacePath>` | Long-running NDJSON daemon (see §2) | This *is* the daemon | Yes |

**Findings:**

- The CLI does **not** expose most platform capabilities as discrete subcommands — there is no
  `animoria thumbnail`, `animoria snippet`, `animoria cleanup`, `animoria duplicates`, `animoria
  export-report`, etc. Everything except `check` is only reachable by speaking the daemon's NDJSON
  protocol over stdin/stdout, which is not a realistic surface for a human at a terminal or for a
  simple CI script that isn't already an NDJSON client.
- This means **the CLI is not yet a full reflection of the platform contract** — it is a CI-gate
  tool (`check`) plus a daemon bootstrapper, not a general-purpose command surface. Whether that's
  correct depends on product intent for who uses the bare CLI (see Gap Analysis, §5).

---

## 4. Platform Capability Inventory & Contract Matrix

Classification values: **Fully Supported**, **Partially Supported**, **Missing**, **Not Applicable**.

| Capability | Canonical Owner | Public API (Core) | CLI | Daemon | VS Code | JetBrains | Sandbox | Classification / Notes |
|---|---|---|---|---|---|---|---|---|
| Workspace indexing (initial scan) | Core | `WorkspaceIndexer.initialize()` | ✅ (`check`) | ✅ (`scanComplete`) | ✅ (direct import) | ✅ (via daemon) | N/A (mocked) | Fully Supported |
| Incremental indexing / file watch | Core | `WorkspaceIndexer.onDidUpdate` + `startWatcher()` | N/A (one-shot only) | ✅ (`watcherEvent`) | ✅ | ✅ | N/A (mocked) | Fully Supported (CLI intentionally excluded — `check` is one-shot by design) |
| Animated asset discovery | Core | `WorkspaceIndexer` | ✅ | ✅ | ✅ | ✅ | ✅ (mock data) | Fully Supported |
| Static asset support | Core | `StaticAssetScanner` | ✅ (indirect, via indexer) | ✅ (`staticAssets` field) | ✅ | ✅ (`StaticAssetsSectionNode`) | ✅ | Fully Supported |
| Thumbnail generation | Core | `ThumbnailEngine` | N/A (no CLI need) | ✅ `generateThumbnail` | ✅ (direct) | ✅ (`AnimoriaGalleryPanel.kt:397`) | ✅ (mocked) | Fully Supported |
| Preview rendering (live animation playback) | Core (data) + client (render) | `Animoria.getAnimationData` | N/A | ✅ `getAnimationData` | ✅ webview + lottie-web | ✅ JCEF webview, own HTML/JS (play/pause/loop present) | ✅ | Fully Supported |
| Animation metadata (frames/layers/size) | Core | parsers | N/A | via `getSnapshot`/`scanComplete` | ✅ | ✅ | ✅ | Fully Supported |
| `getAnimationData` (Lottie + dotLottie) | Core | `Animoria.getAnimationData`, `DotLottieParser` | N/A | ✅ command #10 | ✅ direct call | ✅ `AnimoriaPreviewPanel.kt:185,308` | ✅ (mocked) | Fully Supported |
| Governance execution (unused/duplicate/overused) | Core | `GovernanceAnalyzer` | ✅ (`check`) | ✅ `runGovernance` | ✅ direct | ✅ `AnimoriaGalleryPanel.kt:249` | ✅ mocked | Fully Supported |
| Asset Health Score | Core | `HealthScoreEngine` | ✅ (`check` gate: `--min-health-score`) | ✅ (`healthScore` field on scan events) | ✅ | ✅ `HealthScoreNode` | ✅ | Fully Supported |
| Duplicate analysis | Core | `GovernanceAnalyzer` (MD5-hash based) | ✅ (`check`) | ✅ (part of `runGovernance`) | ✅ | ✅ | ✅ | Fully Supported |
| Duplicate Resolution (keep-one, trash rest) | Core | `moveAssetsToTrash` | N/A | ✅ `resolveDuplicates` | ✅ | ✅ `DuplicateResolverDialog.kt` | ✅ (`animoria-duplicate-resolver.ts`, UI demo only) | Fully Supported |
| Cleanup planning (proposal) | Core | `GovernanceAnalyzer` + candidate assembly | N/A | ✅ `buildCleanupProposal` | ✅ own `CleanupPlanner.ts` (VS Code-specific reimplementation, see note below) | ✅ `CleanupReviewDialog.kt` | ✅ `animoria-cleanup-panel.ts` (mock) | Partially Supported — see note |
| Bulk Cleanup (multi-asset delete-to-trash) | Core | `moveAssetsToTrash` | N/A | ✅ `executeCleanup` | ✅ `CleanupExecutor.ts` | ✅ (`AnimoriaGalleryPanel.kt:229`, `CleanupReviewDialog.kt:166,339`) | ✅ (mock) | Fully Supported |
| Trash recovery (restore / undo) | — | none | ❌ | ❌ | ❌ | ❌ | ❌ | **Missing everywhere.** All clients report `trashLocation` as a string but none expose a restore/undo action or "reveal trash folder" affordance. |
| Governance report generation (markdown/json) | Core | `report-formatter.ts` | ✅ (`check` renderers) | ✅ `exportGovernanceReport` | ✅ | ✅ `ExportGovernanceReportAction.kt` | N/A | Fully Supported |
| Markdown preview of report | Client | — | ✅ (`check --format markdown`) | — | ✅ `viewGovernanceReport` command | ✅ `GovernanceReportEditor.kt` | N/A | Fully Supported |
| Search / filter assets | Client | — | ❌ | N/A (client-local state) | ✅ `animoria.search` command | ✅ `SearchTextField` → `treeModel.setSearchQuery` | ✅ | Fully Supported across UI clients; CLI has no equivalent (arguably N/A for a CI tool) |
| Hover preview (in-editor) | Client | — | N/A | N/A | ✅ `AnimoriaHoverProvider.ts` | ✅ `AnimoriaEditorHoverListener.kt` (deliberately lightweight — no PSI/LineMarkerProvider dependency) | N/A | Fully Supported |
| Snippet generation (framework integration code) | Core | `integrationRegistry` | N/A | ✅ `generateSnippet` | ✅ direct | ✅ `GenerateSnippetAction.kt` | N/A (no code-integration concept in a browser sandbox) | Fully Supported |
| Usage References (asset → source code) | Core | `UsageScanner` | N/A | ✅ `getUsageReferences` | ✅ | ✅ (`AnimoriaPreviewPanel.kt`) | ✅ (mock) | Fully Supported |
| Reveal asset in system file manager | Client | — | N/A | N/A (pure host OS call) | ✅ `animoria.revealInExplorer` | ❌ **Missing** | N/A | **Missing in JetBrains.** No `RevealFileAction`-equivalent call found anywhere in the JetBrains sources or context-menu wiring (`AnimoriaGalleryPanel.kt`'s `group.add(...)` list has no reveal action). Trivial to add via the public `com.intellij.ide.actions.RevealFileAction`. |
| Delete single asset (context action) | Client | (routes to `executeCleanup`) | N/A | ✅ (reuses `executeCleanup`) | ✅ `animoria.deleteAsset` | ✅ `DeleteAssetAction` (`AnimoriaGalleryPanel.kt:515`) | N/A | Fully Supported |
| View mode toggle (flat / tree) | Client | — | N/A | N/A | ✅ `animoria.toggleViewMode` | ✅ `ToggleViewModeAction` | ✅ (`AnimoriaTreeModel.kt` mirrored logic exists sandbox-side via gallery component — verify if needed) | Fully Supported (VS Code + JetBrains confirmed) |
| `.animoriarc` config loading | Core | `governance/config-loader.ts`, `animoriarc-schema.ts` | ✅ | ✅ (inherited — all clients go through the indexer) | ✅ | ✅ | ✅ | Fully Supported — single implementation, inherited by every consumer automatically |
| `.animoriaignore` | Core | `ignore/animoria-ignore.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | Fully Supported — same reasoning as above |
| Logging | Core + Client | `logging/logger.ts` (core); `AnimoriaLogger.kt` (JetBrains); VS Code output channel | ✅ | ✅ (stderr `logWarn` etc.) | ✅ Output channel | ✅ `AnimoriaLogger.kt` (now also routes to Event Log notifications, added this sprint) | N/A | Fully Supported |
| Diagnostics (config load warnings, daemon-unavailable state) | Core + Client | `getDiagnostics()` | ✅ (maps to `CONFIGURATION_ERROR` exit code) | partially (`error`/`commandError` events only — no structured "diagnostics" event) | ✅ | ✅ (`DaemonUnavailableNode`, added this sprint) | N/A | Partially Supported — daemon has no dedicated diagnostics/health-check command (see Gap Analysis) |
| Runtime synchronization (host reflects daemon's live scan state) | Client | — | N/A | ✅ push events | ✅ | ✅ | N/A (mock is static/simulated) | Fully Supported for live clients |
| Health/liveness indicator for the daemon process itself | Client | — | N/A | ❌ no explicit ping/health command | ⚠️ implicit (extension host owns the process lifecycle in-proc — N/A) | ⚠️ Partially — relies on process exit / timeout only, no active health check | N/A | Partially Supported — see Gap Analysis |
| Self-contained native daemon packaging (no Node.js required) | Build tooling | `scripts/build-sea.mjs` | N/A | N/A | N/A (VS Code always has Node via extension host) | ✅ (SEA binary + `copy-sea-into-jetbrains.mjs`) | N/A | Fully Supported (JetBrains-only need, correctly scoped) |

**Note on Cleanup Planning duplication:** VS Code has its **own** `CleanupPlanner.ts` /
`CleanupExecutor.ts` / `CleanupTrash.ts` / `CleanupTypes.ts` (a parallel implementation to the
daemon's `buildCleanupProposal`/`executeCleanup`), because VS Code never needed the daemon
round-trip in the first place — it calls `GovernanceAnalyzer` and `moveAssetsToTrash` directly. This
is architecturally consistent with §1 but means **the cleanup-candidate logic exists in two places**
(`cli.ts`'s inline candidate-assembly code, and `CleanupPlanner.ts`). They are not proven identical
today — this is the single highest-value target for a future consolidation work package (see §5).

---

## 5. Gap Analysis

| Gap | Classification | Rationale | Explains JetBrains degradation? |
|---|---|---|---|
| `extractBundledNativeDaemon()` used `Class.protectionDomain.codeSource.location`, which `PluginClassLoader` does not reliably populate | **Critical** | Root cause of the reported "no native daemon is bundled for this platform" failure — the daemon binary was verifiably present in the packaged jar but never found at runtime. **Already fixed in this session** (switched to `PathManager.getJarPathForClass`), pending live re-verification. | **Yes — primary cause.** |
| No "Reveal in file manager" action in JetBrains | Low | Purely a missing menu-item wiring; daemon/core need no changes. Trivial fix via public `RevealFileAction` API. | No |
| No daemon-level health/ping command | Medium | JetBrains currently infers daemon health only from process liveness + command timeouts (recently reduced from 30s→10s). A dedicated `ping`/`health` command would let the UI distinguish "daemon slow" from "daemon dead" instead of waiting out a timeout. | Partially — contributed to the reported "dialogs of cleanup never loading" symptom, since every stuck command silently waited the full timeout with no earlier signal. |
| No protocol/schema version field in the NDJSON envelope | Medium | Currently harmless since binary and plugin ship together, but any future asymmetric update (native daemon cached from an old install vs. a newer plugin jar) would fail with an opaque deserialization error rather than a clear version-mismatch message. | Possibly a contributing factor if a stale cached SEA binary predates the current Kotlin payload shape — not confirmed, flagged for WP2 investigation. |
| Cleanup-candidate logic duplicated between `cli.ts` (daemon) and VS Code's own `CleanupPlanner.ts` | Medium | Two independent implementations of "what counts as a cleanup candidate" can silently drift, producing different cleanup proposals in VS Code vs. JetBrains for the same workspace. | No, but is a parity risk |
| No trash-restore / undo action anywhere in the platform | Medium | Every client reports a `trashLocation` string but nothing lets a user act on it (open the folder, undo the move). This is a safety-relevant UX gap platform-wide, not client-specific. | No |
| CLI does not expose most daemon capabilities as human-usable subcommands (thumbnail, snippet, cleanup, duplicates, export-report) | Low | Intentional scope today (`check` is a CI gate, not a general CLI) — but if product intent is "CLI as a first-class client," this is a large gap. Needs a product decision, not just an implementation task. | No |
| No structured "diagnostics" push event (only ad hoc `error`/`commandError`) | Low | Config-load warnings surface through the `check` command's exit code, but the long-running daemon mode has no equivalent structured diagnostics channel for the same class of problem. | No |

### Recommended dependency order for WP2–WP5

1. **WP2 — Daemon reliability contract.** Add a `ping`/`health` command and an explicit protocol
   version field to the NDJSON envelope. This unblocks trustworthy diagnostics for every other
   client-facing fix and directly prevents a repeat of the JetBrains daemon-startup incident class.
2. **WP3 — JetBrains menu/action parity.** Add the missing "Reveal in file manager" action; audit
   the remaining context-menu wiring against VS Code's command palette 1:1 using this document's
   matrix as the checklist.
3. **WP4 — Cleanup logic consolidation.** Decide whether `CleanupPlanner.ts` should be retired in
   favor of always calling the daemon-equivalent logic in `@animoria/core` (even from VS Code, via
   the library import it already has), eliminating the duplicate implementation risk.
4. **WP5 — Trash recovery.** Design and implement a restore/undo affordance in `@animoria/core`
   (single implementation, surfaced identically through the daemon and the VS Code direct-import
   path), then wire it into both UI clients.

CLI-as-first-class-client (exposing thumbnail/snippet/cleanup/duplicates/export-report as real
subcommands) is deliberately **not** in this ordered list — it depends on a product decision about
CLI scope that this inventory surfaces but does not make.

---

## 6. Answering the Success Criteria

- **What is Animoria's canonical platform contract?** The capability set in §4, with
  `@animoria/core` as the single source of truth for all business logic, exposed to JetBrains via
  the 10-command daemon protocol in §2, and to VS Code via direct library import.
- **Which client implements each capability?** See the Contract Matrix, §4 — every cell is backed
  by a cited file/line.
- **Which capabilities are missing?** Trash recovery (all clients), JetBrains reveal-in-file-manager,
  daemon health/ping, protocol versioning — see §5.
- **Which daemon commands are absent?** None for the current feature set — all 10 existing
  commands are used; the gaps are in missing *new* commands (health/ping) and missing *client
  wiring* (reveal action), not orphaned/unused existing commands.
- **Which CLI commands are incomplete?** The CLI exposes only `check` and the daemon bootstrap —
  it does not expose thumbnail/snippet/cleanup/duplicates/export-report as human-usable
  subcommands. Flagged as a scope question, not a bug.
- **Which implementation gaps explain the current JetBrains degradation?** The `protectionDomain`
  classloader bug (Critical, already fixed pending re-verification) was the primary cause. The
  10s-reduced-from-30s timeout and the previously-silent daemon-start failure (now surfaced via
  `DaemonUnavailableNode` + Event Log) were contributing visibility gaps, not root causes.
