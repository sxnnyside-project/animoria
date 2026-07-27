# Animoria

![Animoria Banner](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/banner.png)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
[![CI](https://github.com/sxnnyside-project/animoria/workflows/CI/badge.svg)](https://github.com/sxnnyside-project/animoria/actions)

<p align="center">
  <strong>Workspace-aware ✦ Governance-first ✦ Offline-first</strong><br>
  <em>Visual Asset Governance for developers — discover, audit, and trace animated and static assets without leaving your editor.</em>
</p>

<p align="center">
  <a href="#about">About</a> ✦
  <a href="#features">Features</a> ✦
  <a href="#installation">Installation</a> ✦
  <a href="#usage">Usage</a> ✦
  <a href="#architecture">Architecture</a> ✦
  <a href="#contributing">Contributing</a>
</p>

---

## About

**Animoria** is a Visual Asset Governance DevTool: a workspace-wide engine for discovering, auditing, and cleaning up the visual assets a codebase accumulates — both animated (Lottie, dotLottie, Rive, GIF, APNG, Animated SVG) and static (SVG, PNG, JPEG, WebP, AVIF). It serves as a visual asset memory that automates discovery, structural audit, and reference tracing directly from your editor.

As codebases and monorepos scale, managing visual assets — motion or static — becomes a source of silent technical debt:

1. **Production Bloat**: Duplicate asset files checked into multiple directories, inflating the final bundle size.
2. **Orphan Assets**: Legacy files remaining in the workspace after design iterations, cluttering the codebase.
3. **No Reference Traceability**: Developers cannot determine which code files reference which assets, making refactoring or deprecation dangerous and manual.

Animoria scans your workspace automatically, validates each file structurally (checking magic bytes and structure, not just file extensions), extracts metadata (FPS, duration, dimensions, layers, markers), and traces usage references. Unused, duplicate, or overused files are automatically flagged by the local Governance engine to keep your codebase clean and optimized without compromising design speed. Static assets are indexed as first-class citizens in the same workspace inventory today; governance analysis (usage, duplicate, and unused detection) for them is the next milestone — see [ROADMAP.md](ROADMAP.md).

### Philosophy

> _"See every asset. Forget none."_

Animoria is a Sxnnyside Project tool, built as part of the developer tooling initiative.

## Features

- **Asset Governance**: Classifies assets as Unused (zero references), Duplicate (identical MD5 content), or Overused (references ≥ configurable threshold). Results appear as collapsible sections in the sidebar and can be exported as Markdown or JSON.
- **Workspace Auto-Scanning**: Recursively scans for both animated (Lottie, dotLottie, Rive, GIF, APNG, animated SVG) and static (SVG, PNG, JPEG, WebP, AVIF) files on activation and on file-system changes, with no manual configuration required.
- **Structural Validation**: Assets are validated by structure and, where applicable, magic bytes — not by file extension alone — so unrelated files are never shown in the gallery.
- **Code Usage Tracking**: For every asset, finds where it is referenced in TypeScript, JavaScript, Swift, Kotlin, Dart, Vue, Svelte, and Python source files using semantic patterns (imports, `setAnimation`, `R.raw.*`, Lottie Flutter builders, iOS `AnimationView`, asset path strings).
- **Scope Isolation**: In monorepos, usage references are scoped to the nearest project boundary (detected via `package.json`, `Cargo.toml`, `go.mod`, `pubspec.yaml`, and similar markers), preventing cross-package reference pollution.
- **Metadata Extraction**: Extracts fps, total frames, duration, canvas dimensions, layer count, and named markers from every parsed animated asset.
- **Inline Thumbnails**: Renders preview frames directly inside the Node.js/Electron runtime the IDE already provides — no Chromium install or external process required. Thumbnails are cached in `.animoria/thumbnails/` and reused across sessions.
- **dotLottie Support**: Parses `.lottie` binary ZIP archives (V2 format), including multi-animation files. Metadata is extracted from the primary animation; all contained animations are selectable in the preview panel.
- **Static Asset Inventory**: SVG, PNG, JPEG, WebP, and AVIF files are indexed and browsable alongside animated assets today. Duplicate/unused governance for static assets is on the roadmap, not yet shipped — see [ROADMAP.md](ROADMAP.md).

## Installation

### Prerequisites

- Node.js 22 or later
- pnpm 11 or later

### From Source

```bash
git clone https://github.com/sxnnyside-project/animoria.git
cd animoria

pnpm install
pnpm build
```

Package the VS Code extension or JetBrains plugin from source with `pnpm package:vscode` or `pnpm package:jetbrains`. For running either directly from source during development, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Usage

Animoria uses `just` as its task runner to provide a standard developer command surface:

```bash
# Bootstrap the repository and install all dependencies
just install

# Build all packages and the JetBrains plugin
just build

# Run the full test suite
just test

# Run TypeScript compiler type checking
just typecheck

# Run static analysis (Biome for JS/TS, detekt + ktlint for Kotlin)
just lint

# Apply formatting automatically
just format

# Run the complete quality gate (format, lint, typecheck, test, build)
just check

# Start the sandbox dev server
just dev

# Remove all build artifacts and clean caches
just clean
```

Once the VS Code extension is active:

1. Open a workspace containing Lottie or dotLottie files.
2. Click the Animoria icon in the Activity Bar.
3. The Gallery panel populates automatically.
4. Expand any asset to see where it is used in source code.
5. Click the shield icon (⛨) in the panel toolbar to run Governance analysis.

Governance policy (`.animoriarc`) and discovery exclusions (`.animoriaignore`) are documented in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Architecture

```
animoria/
├── packages/animoria-core/        # Pure TypeScript — scanning, parsing, usage, governance
├── packages/animoria-vscode/      # VS Code extension — TreeView, WebView, commands
├── packages/animoria-jetbrains/   # IntelliJ Platform plugin (Kotlin)
└── apps/animoria-sandbox/         # Vite + Lit dev app for WebView component development
```

`animoria-core` has zero IDE dependencies. The UI layer (preview panels, gallery components) is built with Lit Web Components so the same component code runs in VS Code WebViews, JetBrains JCEF, and the sandbox browser environment.

For a detailed breakdown of module boundaries and data flow, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contributing

Contributions are accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before contributing, read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Animoria</strong> — A Sxnnyside Project Tool<br>
  <em>&copy; 2026 Sxnnyside Project</em>
</p>
