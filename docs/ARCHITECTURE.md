# Animoria System Architecture & Developer Reference Guide

Welcome to Animoria! This document serves as the canonical technical architecture reference for new maintainers, contributors, and agentic assistants. It explains the monorepo boundaries, execution boundaries, data flows, and design patterns that govern Animoria.

---

## 1. System Overview & Component Topography

Animoria is a monorepo structured via **pnpm workspaces** and coordinated by **Turborepo** and **Gradle**. It contains four main packages, split by environment boundaries (Node, Browser, JVM):

```mermaid
graph TD
    %% Environments
    subgraph Browser["Runtime: Webview (Lit / CSS)"]
        sandbox[animoria-sandbox]
        webview_ui[Shared Webview Components]
    end

    subgraph NodeEnv["Runtime: Node.js (V8)"]
        core[@animoria/core]
        vscode[animoria-vscode]
    end

    subgraph JVMEnv["Runtime: JetBrains SDK (JVM 17)"]
        jetbrains[animoria-jetbrains]
    end

    %% Dependencies & Communication
    sandbox -->|Renders UI components| webview_ui
    vscode -->|Directly imports & runs| core
    jetbrains -->|Spawns as daemon process| core
    jetbrains -->|Renders UI via JCEF| webview_ui
    vscode -->|Mounts in WebviewPanel| webview_ui

    style Browser fill:#f9f,stroke:#333,stroke-width:2px
    style NodeEnv fill:#bbf,stroke:#333,stroke-width:2px
    style JVMEnv fill:#dfd,stroke:#333,stroke-width:2px
```

### Module Boundaries

| Package | Path | Environment | Primary Responsibility |
|---|---|---|---|
| **`@animoria/core`** | [packages/animoria-core](../packages/animoria-core/) | Node.js / CLI | Hard core library: scanners, parsers, rules engine, reference scanning, duplicate content hashing, and thumbnail engines. |
| **`animoria-vscode`** | [packages/animoria-vscode](../packages/animoria-vscode/) | Node.js (VS Code Extension Host) | IDE integration for VS Code: tree views, text hovers, command actions, webview panel mounting, and file system watchers. |
| **`animoria-jetbrains`** | [packages/animoria-jetbrains](../packages/animoria-jetbrains/) | JVM (IntelliJ Platform SDK) | IDE integration for IntelliJ-based IDEs: spawns the core CLI daemon, parses output, and mounts web views via JCEF. |
| **`animoria-sandbox`** | [apps/animoria-sandbox](../apps/animoria-sandbox/) | Browser (Vite / Lit) | Frontend sandbox to develop and iterate on webview components offline and without IDE host overhead. |

---

## 2. `@animoria/core` Subsystem Deep-Dive

The core package is divided into several focused domains:

```
packages/animoria-core/src/
├── scanner/           # Directory scanners and fast validator guards
├── parser/            # Core Lottie, dotLottie, and raster/vector parsers
├── governance/        # Rules Engine, duplicate detection, health scoring
├── usage/             # Reference searching across workspace files
├── indexer/           # Watcher-triggered change coalescing and scheduling
├── thumbnails/        # Canvas-based vector & format badge renderers
└── types/             # Shared TypeScript structures
```

### A. Scanning & Parsing Pipeline
- **[fast-validator.ts](../packages/animoria-core/src/scanner/fast-validator.ts)**: Fast structural checks (reading first 1KB of file) to quickly confirm potential Lotties without parsing full multi-MB payloads.
- **[file-scanner.ts](../packages/animoria-core/src/scanner/file-scanner.ts)**: Recursively searches directories while matching `.animoriaignore` globs.
- **[parser-registry.ts](../packages/animoria-core/src/parsers/parser-registry.ts)**: Decides whether to dispatch to `LottieParser`, `DotLottieParser`, or animated SVG/raster image parsers.

### B. Workspace Indexer & Watcher Coalescer
- **[workspace-indexer.ts](../packages/animoria-core/src/indexer/workspace-indexer.ts)**: Maintains the live in-memory registry of all parsed assets in the active workspace.
- **[indexing-scheduler.ts](../packages/animoria-core/src/indexer/indexing-scheduler.ts)**: Coalesces rapid-fire watcher events (e.g. bulk copy-paste or branch checkouts) to prevent thread blocking and UI stutter.

### C. Reference Engine (`UsageScanner`)
- **[usage-scanner.ts](../packages/animoria-core/src/usage/usage-scanner.ts)**: Scans source code files (e.g. `.js`, `.ts`, `.tsx`, `.dart`, `.swift`, `.kt`) for references to assets.
- **Search Strategies**: Supports regex strategies: `filename`, `stem` (no extension), or `both`.
- **Confidence Scoring**: 
  - **High Confidence**: Direct paths or exact matches (e.g., `"assets/logo.json"`).
  - **Low Confidence**: Substring heuristics that might refer to the asset stem.
  - **Inline Ignores**: Excludes lines annotated with `// animoria-ignore` or similar comments.

### D. Governance & Rules Engine
- **[rules-engine.ts](../packages/animoria-core/src/governance/rules-engine.ts)**: Executes built-in rules (e.g. `no-gif`, `max-file-size`, `no-duplicate-names`, `no-unreferenced-assets`) against workspace assets.
- **[health-score.ts](../packages/animoria-core/src/governance/health-score.ts)**: Applies penalties based on rules outcomes to generate a single repository score (0-100).
- **[duplicate-group-detector.ts](../packages/animoria-core/src/governance/duplicates/duplicate-group-detector.ts)**: Hashes binary payloads to identify identical assets, proposing a canonical target to resolve redundancies.

---

## 3. IDE Integration Protocols

### VS Code Extension Host
- Direct Integration: Imports `@animoria/core` modules directly. 
- Watchers: Utilizes `vscode.RelativePattern` file watchers that pipe changes into the core indexer.
- Webviews: Launches instances of the Lit-based dashboard and duplicate resolver via custom `WebviewPanel` overlays.

### IntelliJ / JetBrains Host
- Daemon Integration: Since Kotlin cannot import TypeScript directly, the JVM plugin spawns a core CLI helper process in the background (`node dist/cli.js --daemon`).
- IPC: Standard input/output JSON streams are used to exchange commands (e.g., `scan`, `deleteAsset`, `watcherEvent`, `scanComplete`).

---

## 4. Testing & Quality Standards (DXQE Compliance)

To maintain a zero-regression baseline and keep the workspace highly discoverable, Animoria follows strict quality guidelines:

1. **Standard Command Surface (`Justfile`):** 
   All operations should be executed via the task runner. For example, `just check` runs formatting, linting, typechecking, tests, and builds in a unified sequence.
2. **Linter & Formatter (Biome):** 
   JS/TS files are governed by Biome (configured in [biome.json](../biome.json)). To keep clean, run `just format` or `just lint`.
3. **Kotlin Formatting (ktlint & detekt):**
   Kotlin codebase conventions are verified automatically via `just lint`. Wildcard imports are suppressed in `.editorconfig`.
4. **Organized Test Topology:**
   Tests in `@animoria/core` are organized into subdirectories under [packages/animoria-core/tests/](../packages/animoria-core/tests/) based on domains:
   - `core/`: Core orchestrator and config loader tests.
   - `cli/`: Command-line interface and reports rendering.
   - `governance/`: Rules engine, health scoring, and duplicates detection.
   - `indexer/`: Watcher event scheduling and index state updates.
   - `parsers/`: File parsing (Lottie, dotLottie, SVG).
   - `scanner/`: Fast validators and recursive directory scanning.
   - `thumbnails/`: Image converters and formatting badges.
   - `usage/`: Reference searches and ignore directives.
   - `integration/`: Target framework snippets integration.

---

## 5. Cheat Sheet: Where to Edit What

For quick navigation, use this guide to identify where changes should be made:

| Objective | Target Workspace / Directory | Key Files |
|---|---|---|
| **Add a new Lottie lint rule** | `@animoria/core` | [rules/builtins/](../packages/animoria-core/src/governance/rules/builtins/) & [rule-registry.ts](../packages/animoria-core/src/governance/rules/rule-registry.ts) |
| **Add a new framework code snippet** | `@animoria/core` | [src/integration/providers/](../packages/animoria-core/src/integration/providers/) |
| **Modify the extension sidebar UI** | `animoria-vscode` | [src/providers/AnimoriaTreeProvider.ts](../packages/animoria-vscode/src/providers/AnimoriaTreeProvider.ts) |
| **Improve Webview layout / dashboard components** | `animoria-sandbox` | [src/components/](../apps/animoria-sandbox/src/components/) |
| **Adjust IntelliJ sidebar or JCEF configuration** | `animoria-jetbrains` | [src/main/kotlin/](../packages/animoria-jetbrains/src/main/kotlin/) |
| **Tweak TypeScript strict checking limits** | Root Configuration | [tsconfig.base.json](../tsconfig.base.json) |
| **Configure Biome linter rule severity** | Root Configuration | [biome.json](../biome.json) |
