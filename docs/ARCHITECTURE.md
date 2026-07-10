# Animoria Technical Architecture Reference Guide

This document provides a technical overview of the Animoria codebase, explaining package boundaries, internal module relations, core API surfaces, and cross-process message protocols.

---

## 1. Directory Structure & Module Hierarchy

Animoria is built as a monorepo containing the following workspaces:

```mermaid
graph TD
    subgraph apps
        sandbox[animoria-sandbox]
    end
    subgraph packages
        core[@animoria/core]
        vscode[animoria-vscode]
        jetbrains[animoria-jetbrains]
    end
    
    sandbox -->|Imports (Browser)| core
    vscode -->|Imports (Node)| core
    jetbrains -->|Runs Daemon| core
```

### Module Boundaries
- **`@animoria/core`**: 
  - Pure TypeScript, zero IDE-specific dependencies (no VS Code or IntelliJ APIs).
  - Handles parsing, scanning, references search, and asset governance logic.
  - Divided into browser-safe parts (types, locales) and node-specific processes (puppeteer, fs, child_process).
- **`animoria-vscode`**:
  - VS Code extension integrating the core scanner and running custom WebView panels.
- **`animoria-jetbrains`**:
  - IntelliJ Platform plugin (Kotlin). Launches the `@animoria/core` CLI scanner as a background daemon process and loads the WebView component inside JCEF.
- **`animoria-sandbox`**:
  - Vite + Lit dev web application. Used to test visual components and layouts in a standard web browser sandbox.

---

## 2. Core API Surface

### Animoria Runner
The central orchestrator for scans:
```typescript
import { Animoria } from '@animoria/core';

const engine = new Animoria({
  workspacePath: '/path/to/project',
  onScanComplete: (count) => {},
  onAssetParsed: (asset, index, total) => {}
});
const result = await engine.run();
```

### Usage References Scanner
Searches source files for references to a given animation:
```typescript
import { UsageScanner } from '@animoria/core/usage';

const usageScanner = new UsageScanner({
  workspacePath: '/path/to/project',
  asset: assetInstance,
  strategy: 'pattern',
  scopePath: '/path/to/project/package' // Scoping limit for monorepos
});
const result = await usageScanner.search();
```

### Governance Analyzer
Audits technical debt (unused, duplicate, and overused files):
```typescript
import { GovernanceAnalyzer } from '@animoria/core/governance';

const analyzer = new GovernanceAnalyzer({
  workspacePath: '/path/to/project',
  assets: parsedAssetsArray,
  overusedThreshold: 10
});
const report = await analyzer.analyze();
```

---

## 3. WebView ↔ Host Communication Protocol

The web application UI component running inside JCEF or IDE WebViews communicates with the parent IDE process via standard structured `postMessage` calls.

### Outgoing Messages (WebView to Host)

| Message Command | Payload Schema | Description |
| :--- | :--- | :--- |
| `scan` | `{ target: 'extension' }` | Triggers the parent host to start a filesystem recursive scan. |
| `deleteAsset` | `{ path: string }` | Requests the host to permanently delete an asset from disk. |
| `open-usage-file` | `{ file: string, line: number }` | Asks the host editor to open a source file at the specified line number. |
| `copy-path` | *None* | Requests the parent host to copy the active asset absolute path to the system clipboard. |
| `copy-stem` | *None* | Requests the parent host to copy the asset filename stem to the system clipboard. |
| `reveal-in-explorer` | *None* | Requests the host to reveal the asset path in the IDE filesystem view. |

### Incoming Messages (Host to WebView)

#### `scanProgress`
Sent by the host process to report progress:
```json
{
  "command": "scanProgress",
  "index": 12,
  "total": 50,
  "message": "Parsed 12 of 50 assets",
  "assets": [...]
}
```

#### `scanComplete`
Sent when a workspace scan finishes:
```json
{
  "command": "scanComplete",
  "assets": [...]
}
```

#### `watcherEvent`
Dispatched when files are created, modified, or deleted in the workspace:
```json
{
  "command": "watcherEvent",
  "type": "added" | "modified" | "removed",
  "asset": {
    "path": "/path/to/animation.json",
    "name": "animation.json",
    "stem": "animation",
    "format": "lottie",
    "status": "parsed",
    "metadata": {...}
  }
}
```

#### `assetDeleted`
Sent after an asset has been successfully deleted from disk:
```json
{
  "command": "assetDeleted",
  "path": "/path/to/deleted/asset.json"
}
```
