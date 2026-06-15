# Animoria

![Animoria Banner](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/banner.png)

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/sxnnyside-project/animoria/actions)

<p align="center">
  <strong>Workspace-aware ✦ Governance-ready ✦ Offline-first</strong><br>
  <em>Visual asset memory for developers — browse, audit, and trace animated assets without leaving your editor.</em>
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

**Animoria** is a developer tool for asset governance, tracking, and workspace deduplication across animation-heavy codebases. It serves as a visual asset memory that automates the discovery, structural audit, and reference tracing of animations (Lottie, dotLottie, Rive, GIF, APNG, and Animated SVG) directly from your editor.

As codebases and monorepos scale, managing animated assets can become a source of silent technical debt:

1. **Production Bloat**: Duplicate animation files checked into multiple directories, inflating the final bundle size.
2. **Orphan Assets**: Legacy animation files remaining in the workspace after design iterations, cluttering the codebase.
3. **No Reference Traceability**: Developers cannot determine which code files reference which assets, making refactoring or deprecation dangerous and manual.

Animoria scans your workspace automatically, validates each file structurally (checking magic bytes and structure, not just file extensions), extracts metadata (FPS, duration, dimensions, layers, markers), and traces usage references. Unused, duplicate, or overused files are automatically flagged by the local Governance engine to keep your codebase clean, clean of debt, and optimized without compromising design speed.

### Philosophy

> _"Remember motion."_

Animoria is a Sxnnyside Project tool, built as part of the developer tooling initiative.

## Features

- **Workspace Auto-Scanning**: Recursively scans for Lottie (`.json`) and dotLottie (`.lottie`) files on activation and on file-system changes, with no manual configuration required.
- **Structural Validation**: Lottie files are validated by checking for the `v`, `fr`, and `layers` keys — not by file extension alone — so non-Lottie JSON is never shown in the gallery.
- **Metadata Extraction**: Extracts fps, total frames, duration, canvas dimensions, layer count, and named markers from every parsed asset.
- **Inline Thumbnails**: Generates static PNG thumbnails via a headless Chromium renderer. Thumbnails are cached in `.animoria/thumbnails/` and reused across sessions.
- **Code Usage Tracking**: For every asset, finds where it is referenced in TypeScript, JavaScript, Swift, Kotlin, Dart, Vue, Svelte, and Python source files using semantic patterns (imports, `setAnimation`, `R.raw.*`, Lottie Flutter builders, iOS `AnimationView`, asset path strings).
- **Scope Isolation**: In monorepos, usage references are scoped to the nearest project boundary (detected via `package.json`, `Cargo.toml`, `go.mod`, `pubspec.yaml`, and similar markers), preventing cross-package reference pollution.
- **Asset Governance**: Classifies assets as Unused (zero references), Duplicate (identical MD5 content), or Overused (references ≥ configurable threshold). Results appear as collapsible sections in the sidebar and can be exported as Markdown or JSON.
- **dotLottie Support**: Parses `.lottie` binary ZIP archives (V2 format), including multi-animation files. Metadata is extracted from the primary animation; all contained animations are selectable in the preview panel.

## Comparison

| Capability              | Animoria | LottieFiles for VS Code | Standard IDE Explorer |
| :---------------------- | :------: | :---------------------: | :-------------------: |
| Workspace Auto-Scanning |    ✅    |           ✅            |           —           |
| Inline Thumbnails       |    ✅    |           ✅            |           —           |
| Code Usage Tracking     |    ✅    |            —            |           —           |
| Asset Governance        |    ✅    |            —            |           —           |
| dotLottie Support       |    ✅    |            —            |           —           |
| Multi-Format            |    ✅    |       Lottie only       |           —           |
| Offline-First           |    ✅    |            —            |          ✅           |
| Multi-IDE               |    ✅    |      VS Code only       |          ✅           |
| Open Source Core        |    ✅    |            —            |           —           |

## Installation

### Prerequisites

- Node.js 18 or later
- pnpm 9 or later
- Chrome or Chromium (for thumbnail generation only)

### From Source

```bash
git clone https://github.com/sxnnyside-project/animoria.git
cd animoria

pnpm install
pnpm build
```

To launch the VS Code extension in development, open the repo in VS Code and press `F5`. This starts the Extension Development Host with the extension loaded.

## Usage

```bash
# Install all workspace dependencies
pnpm install

# Build all packages (animoria-core, animoria-vscode, animoria-sandbox)
pnpm build

# Run the full test suite
pnpm test

# Start the Lit component sandbox
pnpm dev
```

Once the VS Code extension is active:

1. Open a workspace containing Lottie or dotLottie files.
2. Click the Animoria icon in the Activity Bar.
3. The Gallery panel populates automatically.
4. Expand any asset to see where it is used in source code.
5. Click the shield icon (⛨) in the panel toolbar to run Governance analysis.

## Architecture

```
animoria/
├── packages/animoria-core/        # Pure TypeScript — scanning, parsing, usage, governance
├── packages/animoria-vscode/      # VS Code extension — TreeView, WebView, commands
├── packages/animoria-jetbrains/   # IntelliJ Platform plugin (Kotlin, in development)
└── apps/animoria-sandbox/         # Vite + Lit dev app for WebView component development
```

`animoria-core` has zero IDE dependencies. The VS Code extension and the JetBrains plugin consume it independently. The UI layer (preview panels, gallery components) is built with Lit Web Components so the same component code runs in VS Code WebViews, JetBrains JCEF, and the sandbox browser environment.

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

**Status:** In development
**Packages:** @animoria/core · animoria-vscode · animoria-jetbrains
