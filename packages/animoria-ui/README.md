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

Host environments communicate with `<animoria-workspace>` through a typed message bridge (`src/bridge/types.ts`):

```typescript
export interface HostBridge {
  send(message: HostOutbound): void;
  subscribe(listener: (message: HostInbound) => void): () => void;
}
```

`HostOutbound`/`HostInbound` are discriminated unions on `type`; every variant is enumerated at runtime in `OUTBOUND_TYPES`/`INBOUND_TYPES` for conformance testing across hosts.

### Inbound (Host → UI) — a representative subset
* `analysis`: the current `MultiRootAnalysis`, pushed after every scan.
* `analysis-progress`: readiness flags and a status message while a scan is running.
* `capabilities`: what this host allows (`canMutate`, `canRestore`, etc.) — components disable controls the host can't fulfill rather than hiding them.
* `usage-references`, `animation-data`, `thumbnail`, `cleanup-proposal`, `cleanup-plan`: responses to the matching outbound request.

### Outbound (UI → Host) — a representative subset
* `open-asset` / `reveal-asset` / `open-reference`: navigation, always carrying the `rootId` Core attributed the target to — the UI never re-derives which root a path belongs to.
* `request-cleanup-plan` / `apply-cleanup-plan`: preview, then execute, a cleanup.
* `request-resolution-plan` / `apply-resolution-plan`: same shape, for duplicate resolution.
* `restore-session`: restores a trash session by id.

---

## Design Tokens & Theming

Components consume design tokens defined in `src/styles/tokens.css`. IDE hosts bridge their native theme variables automatically:

```css
:root {
  --animoria-bg-primary: var(--vscode-sideBar-background, #1e1e1e);
  --animoria-text-primary: var(--vscode-foreground, #cccccc);
  --animoria-border: var(--vscode-widget-border, #3e3e42);
  --animoria-accent: var(--vscode-button-background, #0e639c);
  --animoria-danger: var(--vscode-errorForeground, #e05252);
  --animoria-warning: var(--vscode-charts-yellow, #d8a012);
  --animoria-success: var(--vscode-charts-green, #4ec26b);
}
```

Each host maps its own theme variables onto these once (VS Code's mapping lives in `animoria-workspace-panel.ts`); components never reference a host-specific variable directly, only `--animoria-*`.

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
