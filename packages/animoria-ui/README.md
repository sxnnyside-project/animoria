# @animoria/ui

Shared Lit-based Web Component design system and visual UI dashboard for **Animoria**.

This package contains the reusable visual components, cards, state panels, and duplicate resolution dialogs embedded inside the **VS Code Extension Webview**, the **JetBrains JCEF ToolWindow**, and the **Standalone Sandbox**.

---

## Architectural Role

```
┌─────────────────────────────────────────────────────────────┐
│                       @animoria/ui                          │
│                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   <animoria-workspace>  │   │   <animoria-finding>    │  │
│  └────────────┬────────────┘   └────────────┬────────────┘  │
│               │                             │               │
│  ┌────────────▼────────────┐   ┌────────────▼────────────┐  │
│  │  <animoria-duplicate>   │   │  <animoria-confidence>  │  │
│  └────────────┬────────────┘   └────────────┬────────────┘  │
│               │                             │               │
│               ▼                             ▼               │
│          HostBridge Interface (Events & Commands)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
      VS Code Webview    JetBrains JCEF     Browser Sandbox
```

* **Framework-Agnostic Web Components:** Built with [Lit](https://lit.dev/) with zero framework dependencies (no React, Vue, or Angular runtime overhead).
* **Dual Packaging:** Compiles to standard ESM modules (`dist/animoria-ui.js`) and a self-registering IIFE bundle (`dist/animoria-ui.global.js`).
* **Design Token System:** Styled via CSS custom properties in `src/styles/tokens.css` that automatically adapt to IDE dark, light, and high-contrast themes.

---

## Component Catalog

| Web Component Tag | Component Class | Purpose |
| :--- | :--- | :--- |
| `<animoria-workspace>` | `AnimoriaWorkspace` | Top-level visual container managing search, view mode (flat vs tree), health header, and asset grid. |
| `<animoria-finding>` | `AnimoriaFinding` | Renders a governance finding with severity icons, evidence summaries, remediation recommendations, and help links. |
| `<animoria-confidence-badge>` | `AnimoriaConfidenceBadge` | Visual indicator for heuristic confidence (`high`, `moderate`, `low`). |
| `<animoria-coverage-summary>` | `AnimoriaCoverageSummary` | Summarizes reference scan reach (e.g. `23 file extensions scanned`). |
| `<animoria-duplicate-group>` | `AnimoriaDuplicateGroup` | Interactive duplicate group card for comparing byte-identical assets and selecting a canonical copy. |
| `<animoria-evidence-panel>` | `AnimoriaEvidencePanel` | Collapsible inspection tray detailing file paths, line references, and byte signatures. |
| `<animoria-health-summary>` | `AnimoriaHealthSummary` | Radial/badge display showing the 0–100% repository Health Score and qualifications. |
| `<animoria-state-panel>` | `AnimoriaStatePanel` | Handles loading, empty workspace, degraded indexer, and error states. |
| `<animoria-cleanup-preview>` | `AnimoriaCleanupPreview` | Preview dialog showing files to be staged into `.animoria/trash/`. |

---

## Host Bridge Protocol (`HostBridge`)

Host environments communicate with `<animoria-workspace>` through a typed message bridge:

```typescript
export interface HostBridge {
  postMessage(message: HostInboundMessage): void;
  onMessage(handler: (message: HostOutboundMessage) => void): () => void;
  capabilities: HostCapabilities;
}
```

### Inbound Events (Host → UI)
* `workspaceAnalysisUpdated`: Pushes fresh `WorkspaceAnalysis` data on index completion.
* `scanProgress`: Pushes percentage and file counters during active scanning passes.
* `themeChanged`: Notifies components of IDE theme shifts.

### Outbound Commands (UI → Host)
* `openAsset`: Opens the asset file in the IDE editor.
* `revealReference`: Jumps to a specific line in a referencing code file.
* `executeCleanup`: Requests execution of a validated `CleanupPlan`.
* `resolveDuplicates`: Requests execution of a `ResolutionPlan`.

---

## Design Tokens & Theming

Components consume design tokens defined in `src/styles/tokens.css`. IDE hosts bridge their native theme variables automatically:

```css
:root {
  --animoria-bg: var(--vscode-editor-background, var(--jb-editor-background, #1e1e1e));
  --animoria-fg: var(--vscode-editor-foreground, var(--jb-editor-foreground, #cccccc));
  --animoria-border: var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
  --animoria-accent: #3b82f6;
  --animoria-error: #ef4444;
  --animoria-warning: #f59e0b;
  --animoria-success: #10b981;
}
```

---

## Build & Test

```bash
# Build ESM and Global bundles
pnpm --filter @animoria/ui build

# Run unit tests and DOM architecture checks
pnpm --filter @animoria/ui test
```

---

*Part of the [Sxnnyside Project](https://sxnnysideproject.com).*
