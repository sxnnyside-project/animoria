# Animoria VS Code Extension — CLAUDE.md (TypeScript/Node Boundary)

## Boundary Overview
`packages/animoria-vscode` is the VS Code extension host integrating the Animoria daemon, Webview, tree views, diagnostics, and code actions.

## Tooling & Commands
- **Build**: `pnpm build` (runs Vite / esbuild bundling)
- **Test**: `pnpm test` (Vitest integration and mock suites)
- **Typecheck**: `pnpm typecheck` (`tsc --noEmit`)
- **Lint**: `pnpm lint` (`biome lint .`)
- **Format**: `pnpm format` (`biome format --write .`)
- **Package**: `pnpm package` (`vsce package`)

## Conventions & Rules
- **Files**: Strict `kebab-case.ts` across `src/` and `tests/`.
- **Imports**: Clean ESM imports; use `@animoria/contracts` and `@animoria/ui`.
- **Tests**: Mirror `src/` inside `tests/` (`<feature>.test.ts`).
- **No Governance Computation**: All analysis and health scores are consumed directly from daemon snapshots; the extension never computes scores or simulates diagnostics locally.
