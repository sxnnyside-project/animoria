# @animoria/core-rust

High-performance native Rust core engine for Animoria.

## Responsibilities
- **Zero-overhead Workspace Scanning:** Leverages `ignore` (ripgrep file traversal) and `rayon` data parallelism.
- **Deep Asset Parsing:** Structural validation and metadata extraction for Lottie (`serde_json`), dotLottie (`zip`), Rive, GIF, APNG, and SVG.
- **Multi-Language Usage Tracing:** SIMD-accelerated Aho-Corasick / regex scanning across TypeScript, JavaScript, Kotlin, Java, Swift, Dart, Compose, and more.
- **Governance & SHA-256 Deduplication:** Parallel binary content hashing and rule evaluation.
- **Native Daemon (Protocol v1):** Lightweight (~10MB) native binary providing instant cold startup (<10ms) for JetBrains and IDE hosts over NDJSON stdin/stdout.

## Architecture
- `src/contracts/`: Data transfer objects and canonical analysis schemas with optional `ts-rs` export.
- `src/scanner/`: Fast recursive directory traversal honoring `.gitignore` and `.animoriaignore`.
- `src/parser/`: Motion and static format heuristics.
- `src/usage/`: Multi-syntax code reference analyzer.
- `src/governance/`: Rule diagnostics, health scoring, and cleanup plan generator.
- `src/daemon/`: Protocol v1 request/response/event dispatcher over standard I/O.
