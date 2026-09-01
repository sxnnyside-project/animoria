# animoria-core-rust

The native engine. Every other package in this monorepo — the CLI, the VS Code extension, the JetBrains plugin, the sandbox — is a client of this crate; none of them compute governance semantics themselves. If you're adding a rule, a parser, or changing how assets are discovered, this is the package you touch.

## What it owns

- **Scanning**: parallel filesystem traversal (`ignore` + `rayon`), respecting `.gitignore`/`.animoriaignore`.
- **Parsing**: structural validation and metadata extraction for 11 formats — Lottie, dotLottie, Rive, GIF, APNG, Animated SVG, SVG, PNG, JPEG, WebP, AVIF — behind one `Asset { kind: AssetKind }` model. Static and motion assets are not separate pipelines.
- **Reference tracing**: an Aho-Corasick automaton built from every asset's filename/stem, run once over every source file across 26 file extensions (TS/JS/JSX family, Vue, Svelte, Astro, Kotlin, Java, Swift, Dart, HTML, CSS/SCSS/Sass/Less, Markdown, JSON, XML, YAML).
- **Deduplication**: parallel SHA-256 content hashing, clustered into `DuplicateGroup`s.
- **Governance**: a `Rule` trait evaluated against an `AnalysisContext`, producing diagnostics and a 0–100 health score.
- **Remediation**: staged, reversible moves into `.animoria/trash/`, restorable by session.
- **Protocol v1 daemon**: an NDJSON server over stdio, the same one every IDE host and the CLI both speak.

## Module map

```
src/
├── contracts/       # Wire types (also the ts-rs source for @animoria/contracts)
├── scanner/         # Filesystem discovery
├── parser/          # Per-format structural validation (lottie/, dotlottie/, rive/, vector/, raster/)
├── tracing/         # Cross-language usage reference detection
├── deduplication/   # Content hashing and clustering
├── governance/      # Rules, health scoring
├── remediation/     # Trash staging and restore
├── indexer/         # AssetIndex — ties the pipeline together
├── daemon/          # Protocol v1 NDJSON server
└── cli/             # `animoria` binary: scan, check, report, clean, restore, init, daemon
```

## Build & test

```bash
cargo build --release           # target/release/animoria
cargo test                      # unit + integration + fuzz (proptest) suites
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

Or via the root task runner: `just core-build`, `just core-test`, `just core-lint`, `just core-format`.

## CLI

```bash
animoria scan .              # inventory: every asset, format, dimensions, size
animoria check . --strict    # governance audit; exit 1 on errors, 2 on warnings under --strict
animoria report .            # health score + category breakdown + duplicate clusters
animoria clean . --apply     # stage duplicates into .animoria/trash (dry-run without --apply)
animoria restore . --list    # list or restore a trash session
animoria daemon              # Protocol v1 NDJSON server over stdio, for IDE hosts
```

`--json`, `--verbose`/`-v`, `--quiet`/`-q`, and `--no-color` are available on every subcommand; run `animoria --help` for the full surface.

## Contracts

`src/contracts/` is the single source of truth for every type this engine exposes. `@animoria/contracts` (TypeScript) is generated from it via [`ts-rs`](https://github.com/Aleph-Alpha/ts-rs) — never hand-authored. Changing a public struct here and running `cargo test` regenerates the TypeScript side.

## Benchmark: Rust engine vs. the retired TypeScript engine

Animoria's engine was originally TypeScript (`@animoria/core`), fully replaced by this crate in v2.0.0. Numbers below are real, measured on the same machine on the same day, against an identical synthetic fixture (1,000 assets across Lottie/SVG/PNG/WebP + 100 source files referencing them) — not simulated or reused from prior documentation. Methodology: median of 7–10 warm runs per command, both engines invoked as a subprocess exactly as an end user would.

| Metric | TypeScript engine (retired) | Rust engine (current) | Difference |
|---|---|---|---|
| Cold start (`--version`) | 70.1 ms | 2.3 ms | **~30× faster** |
| Full audit, 1,000 assets + 100 source files (`check`) | 152.8 ms | 48.3 ms | **~3.2× faster** |
| Peak resident memory during that audit | 93.1 MB | 11.2 MB | **~8.3× less** |

Both engines discover, parse, and trace references across the same 11 formats — format coverage was already at parity before the rewrite; the difference here is entirely runtime cost. `tests/stress_benchmark_test.rs` and `tests/parser_fuzz_test.rs` in this crate are the tests these numbers' methodology is drawn from.

## Design notes worth knowing before you change something

- **Never drop malformed assets.** A parser failure sets `is_valid: false` and records `error`; it does not remove the asset from the index. `parser/registry.rs` is the enforcement point.
- **Path containment is checked at the mutation boundary**, not at every call site — `remediation/trash.rs::TrashManager` canonicalizes and verifies every path against the workspace root before touching the filesystem, so both the CLI and the daemon get the guarantee for free.
- **The daemon's NDJSON reader is capped** (`daemon/server.rs::MAX_LINE_BYTES`) — a line without a terminator is refused past 64 MiB rather than buffered indefinitely.
