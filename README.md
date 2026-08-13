# Animoria

![Animoria Banner](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/banner.png)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
[![CI](https://github.com/sxnnyside-project/animoria/workflows/CI/badge.svg)](https://github.com/sxnnyside-project/animoria/actions)

<p align="center">
  <strong>Workspace-aware ✦ Governance-first ✦ Offline-first</strong><br>
  <em>Visual Asset Governance for developers — discover, audit, trace, and clean up animated and static assets directly inside your editor.</em>
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

**Animoria** is a Visual Asset Governance DevTool: a workspace-wide engine for discovering, auditing, and cleaning up the visual assets a codebase accumulates — covering animated (Lottie, dotLottie, Rive, GIF, APNG, Animated SVG) and static (SVG, PNG, JPEG, WebP, AVIF) formats.

As software projects grow, visual assets become a source of silent technical debt: duplicate files get committed across directories, unreferenced assets linger after design iterations, and developers lack traceability into which source files reference which assets.

Animoria indexes your workspace in a single linear pass, validates files by binary signatures and structure rather than extensions alone, traces usage references across 20+ programming syntaxes, and surfaces actionable governance diagnostics (unreferenced files, content duplicates, oversized assets, and disallowed formats) with verified evidence.

### Philosophy

> _"See every asset. Forget none."_

Animoria is a Sxnnyside Project tool, part of the developer tooling initiative.

## Features

- **Asset Governance**: Enforces configurable rules (`no-unreferenced-assets`, `no-duplicate-content`, `no-duplicate-names`, `max-file-size-kb`, `allowed-formats`, `no-gif`) with structured evidence, confidence ratings, and remediation steps.
- **Single-Pass Auto-Scanning**: Traverses the workspace in linear time, extracting metadata (dimensions, FPS, duration, layer count, markers) without background freezing.
- **Reference Tracing**: Scans across 20+ file extensions (`.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.dart`, `.swift`, `.kt`, etc.) with attribute, style, and Markdown awareness.
- **Multi-Root Workspace Support**: Indexes multi-root projects independently while providing aggregate workspace health reporting.
- **Native Offline Previews**: Renders static thumbnails and vector frames directly in-editor with zero external Chromium or cloud dependencies.
- **Multi-IDE Support**: Native extension for VS Code and fully integrated plugin with background daemon for JetBrains IDEs.
- **Reversible Remediation**: Safe staging into local trash with manifest-backed restoration to prevent unrecoverable deletions.

## Installation

### Prerequisites

- Node.js (>= 22.0.0)
- pnpm (>= 11.0.0)

### From Source

```bash
git clone https://github.com/sxnnyside-project/animoria.git
cd animoria

pnpm install
pnpm build
```

To package the extensions locally:

- **VS Code extension:** `pnpm package:vscode`
- **JetBrains plugin:** `pnpm package:jetbrains`

## Usage

Animoria provides a standardized developer command surface via `just` (or equivalent `pnpm` scripts):

```bash
# Verify the whole workspace (format, lint, typecheck, test, build)
just check

# Run all unit and integration test suites
just test

# Start the component sandbox environment
just dev

# Run CLI governance audit directly on a path
pnpm --filter @animoria/core build
node packages/animoria-core/dist/cli.js check .
```

## Architecture

```
animoria/
├── apps/               # Standalone applications (animoria-sandbox)
├── docs/               # System architecture, configuration, and ADR records
├── fixtures/           # Golden workspace fixtures for parity testing
├── packages/           # Core engine, UI components, and IDE extensions
│   ├── animoria-core/       # Pure TypeScript scanning, parsing, and rules engine
│   ├── animoria-jetbrains/  # Kotlin IntelliJ Platform SDK plugin
│   ├── animoria-ui/         # Shared Lit web components
│   └── animoria-vscode/     # VS Code extension package
└── scripts/            # Build automation and packaging helpers
```

For a detailed breakdown of module boundaries, lifecycle contracts, and IDE integration protocols, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contributing

Contributions are accepted. Before contributing code or documentation, maintainers and contributors should review the [**Maintainer Guide Library**](docs/guides/README.md) (`docs/guides/`) and read [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

Before contributing, read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Animoria</strong> — A Sxnnyside Project Tool<br>
  <em>&copy; 2026 Sxnnyside Project</em>
</p>
