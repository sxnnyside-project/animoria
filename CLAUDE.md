# Animoria — CLAUDE.md

## What is Animoria

IDE extension for visual discovery and exploration of animated assets (Lottie, Rive, GIF, APNG, Animated SVG). Developers forget which file contains which animation. Animoria makes animated assets visually navigable inside the editor.

## Architecture

This is a pnpm monorepo with Turborepo.

packages/animoria-core — Pure TypeScript. All scanning, parsing, metadata extraction, and caching logic lives here. No IDE dependencies. No VS Code API. No JetBrains API.

packages/animoria-ui — Shared product UI (Lit). Renders a `WorkspaceAnalysis` and emits host intent through a typed `HostBridge`. Zero host APIs, zero governance decisions. Built into one ESM bundle (VS Code) and one IIFE bundle (JetBrains). Private; not published.

packages/animoria-vscode — VS Code extension. Consumes @animoria/core and @animoria/ui. Owns the platform surfaces only: TreeView, Problems/diagnostics, commands, keybindings, hovers, and the one webview that mounts the shared UI.

packages/animoria-jetbrains — IntelliJ Platform plugin (Kotlin). Kotlin cannot import `@animoria/core` directly, so the plugin spawns it as a background Node.js CLI daemon (`CoreProcessManager`) and communicates over an NDJSON stdin/stdout protocol. All governance, parsing, and indexing logic stays in `@animoria/core`; Kotlin owns the ToolWindow, actions, inspections and notifications, and mounts @animoria/ui in JCEF.

apps/animoria-sandbox — Local Vite harness for @animoria/ui. Implements the same `HostBridge` the IDEs do, against a **read-only** fixture-backed dev server (`canMutate: false`). It is a host, not a client of Core, and it owns no product component of its own.

## Key Decisions

- animoria-core has zero IDE dependencies
- JetBrains plugin spawns @animoria/core as a Node.js CLI daemon (NDJSON over stdin/stdout) since Kotlin cannot import it directly; no governance/parsing logic is reimplemented in Kotlin
- Lottie detection is structural validation (checking for v, fr, layers keys), NOT file signature/magic bytes
- Cache is introduced AFTER the core flow works and performance is measured
- Usage References (where an asset is used in code) is the highest-priority post-MVP feature
- Cleanup and duplicate resolution are **plan-based**: Core builds an immutable plan, the UI renders it and applies it *by id*. Preview and execution consume the same object, so "what you saw is what ran" is structural. A partial plan is refused unless the caller explicitly opts in having shown the refusals.
- Analysis has **six lifecycle states** (initializing / analyzing / ready / stale / incomplete / failed), never `loading: boolean`. An empty workspace and a failed scan are different screens.
- Product terminology is enforced mechanically by `terminology.test.ts` against `core/src/terminology/canon.ts`.
- The daemon speaks **protocol v1** (`core/src/daemon/protocol.ts`): three disjoint envelopes (request / response / event), a required `protocol` version on every message, a `hello` handshake, declared capabilities, and 16 closed error codes. There is **no legacy fallback** — a version mismatch is reported, never guessed around.
- A workspace may have **several roots**. Identity is the hashed canonical path, never a display name; each root gets its own `WorkspaceIndexer` because `.animoriarc` is root-scoped; aggregation attributes and counts but never merges root-scoped meaning. A relative path is *refused* in a multi-root workspace rather than resolved against an arbitrary root.

## Supported Formats (by phase)

Phase 1: Lottie (.json)
Phase 2: Rive (.riv)
Phase 3: GIF, APNG, Animated SVG

## What NOT to do

- Do not add VS Code API imports to animoria-core
- Do not add host API imports (`vscode`, IntelliJ, `node:*`) to animoria-ui
- Do not author product markup in a host package — it belongs in animoria-ui
- Do not define an `--animoria-*` token in terms of a host CSS variable
- Do not push state into JCEF with `executeJavaScript` — use the message bridge
- Do not compute a verdict in the UI: if it needs a number, Core sends the number
- Do not use `workspaceFolders[0]` or `project.basePath` as the workspace — ask the platform for every root
- Do not key anything on a workspace or root *name*; compare `WorkspaceIdentity.id`
- Do not add a daemon message outside the protocol's declared methods and events
- Do not accept a request without a `protocol` version, and never fall back on its absence
- Do not average per-root health scores — there is no workspace-level score for a multi-root workspace
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

Lit components live in **packages/animoria-ui/src/components/**, and every host
loads the built bundle from there. This was previously documented as true while
being false — the components lived in the sandbox and no IDE loaded them, and the
build even copied them into the JetBrains jar where nothing read them.
`shared-ui-adoption.test.ts` now fails the build if any client stops consuming the
package or starts authoring product markup of its own.

Reasons:

- Web Components are native to the browser — no runtime overhead
- VS Code WebView and JetBrains JCEF both run Chromium — full support
- Single component codebase for all visual targets
- Bundle size: ~5KB (Lit) vs ~45KB (React)

### The layer rule

| Layer | Owns | Forbidden |
| :--- | :--- | :--- |
| `@animoria/core` | What is true about the workspace, what is wrong, how confident, what to do | Any IDE type; any rendering |
| `@animoria/ui` | How a `WorkspaceAnalysis` looks; how a user expresses intent about it | Any decision Core could make; any host API |
| Hosts | Native problem surfaces, navigation, notifications, progress, settings, keymaps, dialogs | Computing scores, matching references, classifying assets, inventing confidence |

Shared UI consumes `@animoria/core/contracts` — a browser-safe entry point of types
and pure functions. Importing the main entry drags a filesystem scanner into a
webview; `contracts-purity.test.ts` prevents it.

### The host bridge

Hosts implement `HostBridge` (`@animoria/ui/bridge`): `send(HostOutbound)` and
`subscribe(HostInbound)`. Host→UI state travels as messages only — never as
interpolated JavaScript source, which `SemanticBoundaryTest.noStateInjection`
enforces on the Kotlin side.

`HostCapabilities` declares what a host can do. Destructive controls render
**disabled with a reason** rather than being hidden, which is how the sandbox
exercises every screen without touching the filesystem.

### Design tokens

Shared UI reads `--animoria-*` only. Each host maps its own theme onto those names
in its own package. Never define an `--animoria-*` token in terms of a host
variable — that was the previous arrangement, and it forced the JetBrains plugin to
emit `--vscode-*` from `JBColor` values.

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
