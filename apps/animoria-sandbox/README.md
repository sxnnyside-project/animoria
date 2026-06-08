# Animoria Sandbox

Local Vite + Lit development app for building and testing animated asset preview components without launching an IDE.

## Purpose

The sandbox exists because iterating on WebView UI inside a VS Code Extension Development Host is slow — every change requires a rebuild and a reload of the Extension Development Host. The sandbox gives an instant browser dev server with HMR for the same Lit components that ship inside the VS Code WebView and JetBrains JCEF panel.

## Relationship to the Extension

The Lit components in `src/components/` are the same components bundled into the VS Code WebView and JetBrains JCEF preview panels. Changes made here reflect directly in the IDE targets after a build.

## Running

```bash
# From the repo root
pnpm dev

# Or from this directory
pnpm --filter animoria-sandbox dev
```

The dev server starts at `http://localhost:5173`.

## Stack

- **Vite** — dev server and bundler
- **Lit** — Web Components (no React, Vue, or Svelte)
- **@animoria/core** — workspace dependency for live asset scanning and parsing

---

*Animoria is a Sxnnyside Project Tool. &copy; 2026 Sxnnyside Project.*
