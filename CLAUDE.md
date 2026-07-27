# Animoria — CLAUDE.md

## What is Animoria

IDE extension for visual discovery and exploration of animated assets (Lottie, Rive, GIF, APNG, Animated SVG). Developers forget which file contains which animation. Animoria makes animated assets visually navigable inside the editor.

## Architecture

This is a pnpm monorepo with Turborepo.

packages/animoria-core — Pure TypeScript. All scanning, parsing, metadata extraction, and caching logic lives here. No IDE dependencies. No VS Code API. No JetBrains API.

packages/animoria-vscode — VS Code extension. Consumes @animoria/core. Implements the IDE-specific UI: TreeView, WebView panels, commands.

packages/animoria-jetbrains — IntelliJ Platform plugin (Kotlin). Kotlin cannot import `@animoria/core` directly, so the plugin spawns it as a background Node.js CLI daemon (`CoreProcessManager`) and communicates over an NDJSON stdin/stdout protocol. All governance, parsing, and indexing logic stays in `@animoria/core`; Kotlin is a presentation layer only.

apps/animoria-sandbox — Local Vite + Lit app. Used to develop and test animoria-core features without launching an IDE.

## Key Decisions

- animoria-core has zero IDE dependencies
- JetBrains plugin spawns @animoria/core as a Node.js CLI daemon (NDJSON over stdin/stdout) since Kotlin cannot import it directly; no governance/parsing logic is reimplemented in Kotlin
- Lottie detection is structural validation (checking for v, fr, layers keys), NOT file signature/magic bytes
- Cache is introduced AFTER the core flow works and performance is measured
- Usage References (where an asset is used in code) is the highest-priority post-MVP feature

## Supported Formats (by phase)

Phase 1: Lottie (.json)
Phase 2: Rive (.riv)
Phase 3: GIF, APNG, Animated SVG

## What NOT to do

- Do not add VS Code API imports to animoria-core
- Do not implement caching before the scanner and parser are tested
- Do not reimplement governance/parsing logic natively in Kotlin — the JetBrains plugin must stay a presentation layer over the @animoria/core daemon
- Do not add AI description features (low priority, deferred indefinitely)

## Commands

All tasks should be run through the task runner (`just`):

just install    — bootstrap all packages and dependencies (runs pnpm install)
just dev        — run local dev sandbox workflow
just build      — compile and build all packages (JS packages and Kotlin plugin)
just test       — run the test suite
just typecheck  — run TypeScript compiler correctness checks
just lint       — run static analysis (Biome for TS, detekt + ktlint for Kotlin)
just format     — apply formatting (Biome for TS, ktlintFormat for Kotlin)
just check      — run full quality gate (format, lint, typecheck, test, build)
just clean      — remove build artifacts and caches

## UI Layer — Lit + Web Components

The UI for all targets (sandbox, VS Code WebView, JetBrains JCEF) is built
with Lit (https://lit.dev). Do not introduce React, Vue, or Svelte anywhere
in this project.

Lit components live in apps/animoria-sandbox/src/components/.
These same components are bundled and injected into IDE WebViews.

Reasons:

- Web Components are native to the browser — no runtime overhead
- VS Code WebView and JetBrains JCEF both run Chromium — full support
- Single component codebase for all visual targets
- Bundle size: ~5KB (Lit) vs ~45KB (React)

## Release Process

To publish a new version of animoria-vscode:

1. Update version in packages/animoria-vscode/package.json
2. Update packages/animoria-vscode/CHANGELOG.md — move [Unreleased]
   entries to the new version section
3. Commit: `chore: release vX.X.X`
4. Tag: `git tag vX.X.X`
5. Push: `git push origin main --tags`

The release.yml workflow triggers automatically on the tag push.
It verifies the tag version matches package.json before publishing.

Required GitHub secrets:

- VSCE_PAT: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token
- OVSX_PAT: https://open-vsx.org/user-settings/tokens
