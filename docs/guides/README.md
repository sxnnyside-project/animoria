# Animoria Maintainer Guide Library

Welcome to the canonical maintainer documentation for **Animoria**. This guide library is designed to make Animoria understandable, debuggable, and maintainable by developers working on `@animoria/core`, `animoria-vscode`, `animoria-jetbrains`, `animoria-ui`, or `animoria-sandbox`.

These guides are reverse-engineered directly from the actual codebase. They document authoritative contracts, data flow boundaries, daemon IPC protocols, and platform integration mechanics as they exist today.

---

## Intended Audience

- **Core Maintainers**: Developers modifying file scanning, AST parsing, reference usage indexing, or governance rules in `@animoria/core`.
- **VS Code Extension Engineers**: Engineers working on extension lifecycle, native tree views, diagnostics, and webview panels in `animoria-vscode`.
- **JetBrains Plugin Engineers**: Engineers maintaining JVM plugin integration, native tool windows, JCEF rendering, actions, and NDJSON daemon communication in `animoria-jetbrains`.
- **UI & Web Component Developers**: Engineers creating shared web components in `packages/animoria-ui` or working in the local Vite sandbox harness (`apps/animoria-sandbox`).

---

## Architecture Map

Animoria is a monorepo coordinated via **pnpm workspaces**, **Turborepo**, and **Gradle**. Business logic, scanning, and governance decision-making reside exclusively inside `@animoria/core`.

```mermaid
graph TD
    subgraph CoreEngine["@animoria/core (Node.js / Pure TS)"]
        Scanner["Directory Scanner & Parsers"]
        Indexer["Workspace Indexer & Watcher"]
        Governance["Rules Engine & Health Score"]
        Usage["Reference Usage Scanner"]
        DaemonServer["NDJSON Daemon Server (Protocol v1)"]
    end

    subgraph SharedUI["@animoria/ui (Lit / ESM + IIFE)"]
        Components["Shared UI Web Components"]
        HostBridge["HostBridge Contract"]
    end

    subgraph VSCodeClient["animoria-vscode (Extension Host)"]
        VSCodeHost["Extension Host (In-Process)"]
        VSCodeWebview["Webview Panel"]
    end

    subgraph JetBrainsClient["animoria-jetbrains (IntelliJ SDK / JVM)"]
        JBHost["Plugin Host (Kotlin)"]
        JCDaemon["CoreProcessManager (Subprocess)"]
        JCEFWebview["JCEF Browser Surface"]
    end

    subgraph SandboxApp["animoria-sandbox (Local Harness)"]
        ViteApp["Vite Dev Harness"]
        MockBridge["MockHostBridge (canMutate: false)"]
    end

    VSCodeHost -->|Direct TS Library Import| CoreEngine
    VSCodeWebview -->|Renders| Components
    VSCodeHost <-->|HostBridge Messages| VSCodeWebview

    JCDaemon <-->|Protocol v1 NDJSON over stdin/stdout| DaemonServer
    JCEFWebview -->|Renders| Components
    JBHost <-->|HostBridge Messages| JCEFWebview

    ViteApp -->|Renders| Components
    MockBridge <-->|HostBridge Messages| ViteApp
```

---

## Maintainer Guides Inventory

The library consists of 15 specialized technical guides:

| # | Guide | Primary Scope | Primary Packages |
|---|---|---|---|
| 01 | [**Get Started**](01-get-started.md) | Maintainer onboarding, monorepo layout, toolchain (`just`, pnpm, Gradle), DXQE standards | Root, All packages |
| 02 | [**Format Heuristics**](02-format-heuristics.md) | Asset sniffing, structural JSON validation (Lottie), ZIP parsing (dotLottie), Rive binary signatures | `@animoria/core` |
| 03 | [**Asset Indexing**](03-asset-indexing.md) | Workspace scanning, `.animoriaignore`, watcher event debouncing, multi-root indexers | `@animoria/core` |
| 04 | [**Reference Usage Analysis**](04-reference-usage-analysis.md) | Multi-syntax source code reference scanning (20+ languages), confidence scoring, inline ignores | `@animoria/core` |
| 05 | [**Governance Pipeline**](05-governance-pipeline.md) | `.animoriarc` policy loading, 6 built-in rules, Health Score (0–100%), headless CI gate (`check`) | `@animoria/core` |
| 06 | [**Workspace Analysis**](06-workspace-analysis.md) | 6 lifecycle states (`initializing` → `ready`), multi-root aggregation, view-model projection | `@animoria/core`, `@animoria/ui` |
| 07 | [**Duplicates Resolution**](07-duplicates-resolution.md) | SHA-256 binary content hashing, plan-based resolution, source reference auto-rewriting | `@animoria/core` |
| 08 | [**Cleanup, Trash & Restore**](08-cleanup-trash-restore.md) | Staged deletion to `.animoria/trash`, cleanup proposal vs plan execution, restore mechanics | `@animoria/core`, `animoria-vscode` |
| 09 | [**Asset Preview & Inspection**](09-asset-preview-inspection.md) | Interactive playback data (`getAnimationData`), metadata extraction, preview webviews | `@animoria/core`, `@animoria/ui` |
| 10 | [**Thumbnail Engine**](10-thumbnail-engine.md) | Vector Lottie SVG string rendering, embedded image extraction, badge rendering, thumbnail cache | `@animoria/core` |
| 11 | [**Snippet Generation**](11-snippet-generation.md) | Framework code generation (React, Vue, Flutter, Swift, Kotlin), relative path resolution | `@animoria/core` |
| 12 | [**Daemon Protocol v1**](12-daemon-protocol.md) | Protocol v1 NDJSON contract, `hello` handshake, 19 request methods, 12 push events, SEA builds | `@animoria/core` |
| 13 | [**VS Code Client**](13-vscode-client.md) | Extension host architecture, native TreeView, diagnostics, hover providers, WebviewPanel | `animoria-vscode` |
| 14 | [**JetBrains Client**](14-jetbrains-client.md) | IntelliJ plugin architecture, `CoreProcessManager`, JCEF tool window, actions & inspections | `animoria-jetbrains` |
| 15 | [**Sandbox & Client Parity**](15-sandbox-client-parity.md) | Vite dev harness, mock host bridge (`canMutate: false`), client capability parity matrix | `apps/animoria-sandbox` |

---

## Recommended Reading Order

For developers new to the project, follow this recommended sequence:

```
[01-get-started.md]
        │
        ▼
[03-asset-indexing.md]
        │
        ▼
[06-workspace-analysis.md]
        │
        ▼
[05-governance-pipeline.md]
        │
  ┌─────┴──────────────────┬────────────────────────┐
  ▼                        ▼                        ▼
Capabilities (02, 04,    Cleanup & Duplicates     Daemon & Clients
07, 09, 10, 11)          (07, 08)                 (12, 13, 14, 15)
```

1. **Start with Core Concepts**: Read [01-get-started.md](01-get-started.md) to set up your environment, followed by [03-asset-indexing.md](03-asset-indexing.md) and [06-workspace-analysis.md](06-workspace-analysis.md) to understand how Animoria discovers and presents workspace assets.
2. **Understand Rules & Health**: Read [05-governance-pipeline.md](05-governance-pipeline.md) to see how policies and health scores are evaluated.
3. **Deep-Dive into Capabilities**: Explore format handling ([02](02-format-heuristics.md)), reference scanning ([04](04-reference-usage-analysis.md)), duplicates ([07](07-duplicates-resolution.md)), cleanup ([08](08-cleanup-trash-restore.md)), previews ([09](09-asset-preview-inspection.md)), thumbnails ([10](10-thumbnail-engine.md)), or snippets ([11](11-snippet-generation.md)).
4. **Master IDE Integrations**: Read [12-daemon-protocol.md](12-daemon-protocol.md) before modifying JetBrains ([14](14-jetbrains-client.md)) or VS Code ([13](13-vscode-client.md)) integration layers.

---

## Maintainer Contribution & Update Rules

When making architectural or feature changes to Animoria:

1. **Update Documentation Alongside Code**: Any change to daemon protocol methods, governance rules, UI bridge messages, or CLI flags MUST update the corresponding guide in `docs/guides/`.
2. **No Invented Contracts**: Document only implemented behavior. If a capability is partial, deferred, or host-specific, state it explicitly.
3. **Enforce Canonical Vocabulary**: Use canonical product terms verified by `packages/animoria-core/src/terminology/canon.ts`:
   - `unreferenced` (never `unused` or `orphaned`)
   - `finding` (never `violation`, `issue`, or `opportunity`)
   - `duplicate` (never `clone`)
   - `trash` (never `quarantine` or `purgatory`)
   - `health score` (never `grade` or `rating`)
   - `overused` is deleted and banned.
4. **Maintain Section Structure**: Every guide must retain the standardized 15-section layout.
