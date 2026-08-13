# Animoria Sandbox

An isolated, browser-based development environment and reference host harness for [`@animoria/ui`](../../packages/animoria-ui).

---

## Purpose & Developer Experience

Iterating on webview components inside IDE extension development hosts (VS Code Extension Development Host or JetBrains IntelliJ Sandbox) can be slow, requiring extension bundling, IPC simulation, and window reloads on every change.

The Sandbox provides:
* **Instant Feedback with HMR:** Fast Vite development server reloading Lit web components instantaneously.
* **Reference Host Contract:** Implements the canonical `HostBridge` interface, matching the message protocol consumed by VS Code WebviewPanels and JetBrains JCEF windows.
* **Offline Mock Capabilities:** Simulates workspace analysis, multi-root switching, live daemon events, and finding diagnostics without needing an active IDE host.

---

## Architectural Role

```
┌─────────────────────────────────────────────────────────────┐
│                   apps/animoria-sandbox                     │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │     sandbox-app.ts      │   │  sandbox-event-console  │  │
│  └───────────┬─────────────┘   └────────────▲────────────┘  │
│              │ HostBridge                   │ Events        │
│  ┌───────────▼──────────────────────────────┴────────────┐  │
│  │           @animoria/ui (Shared Lit Components)        │  │
│  │  <animoria-workspace>  <animoria-finding>  <badges>   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

* **Zero Product Component Ownership:** The sandbox owns **no UI widgets**. All visual surfaces come directly from `@animoria/ui`.
* **Testing Seam:** `src/components/` contains only the harness shell (`sandbox-app.ts`) and the IPC diagnostic inspector (`sandbox-event-console.ts`).
* **Cross-Host Consistency:** Any UI enhancement made in `@animoria/ui` is instantly visible in the sandbox and propagates identically to VS Code and JetBrains.

---

## Security & Read-Only Containment

The sandbox is strictly **read-only by design**:
* **`HostCapabilities.canMutate: false`:** Destructive actions (deleting files, applying resolution plans) are rendered in a disabled state with explanatory tooltips, ensuring developers can visually inspect remediation buttons without risking accidental file loss.
* **Local Path Containment:** Dev bridge endpoints enforce strict path normalization against traversal attacks (`../`).
* **Fixture Default:** The sandbox defaults to loading the safe test fixtures in `fixtures/` rather than modifying the user's root workspace.

---

## Quick Start

```bash
# Start the sandbox from repository root
just dev
# or
pnpm dev

# Or directly from this directory
pnpm --filter animoria-sandbox dev
```

Open your browser at **`http://localhost:5173`** to interact with the live component catalog.

---

## Development Scripts

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts Vite dev server with Hot Module Replacement on port 5173. |
| `pnpm build` | Compiles production assets to `dist/`. |
| `pnpm test` | Runs harness unit tests and security containment assertions with Vitest. |
| `pnpm lint` | Runs Biome static analysis against sandbox code. |

---

*Animoria is a Sxnnyside Project Tool. &copy; 2026 Sxnnyside Project.*
