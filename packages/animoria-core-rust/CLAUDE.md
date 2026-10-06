# Animoria Core — CLAUDE.md (Rust Boundary)

## Boundary Overview
`packages/animoria-core-rust` is the native execution engine, CLI, and NDJSON daemon for Animoria.

## Tooling & Commands
- **Build**: `cargo build --release` (produces `target/release/animoria`)
- **Test**: `cargo test` (runs unit tests, integration tests, contract generation, and fuzz tests)
- **Lint**: `cargo clippy --all-targets -- -D warnings`
- **Format**: `cargo fmt`
- **Format Check**: `cargo fmt -- --check`
- **Auditing**: `cargo-deny check`

## Conventions & Rules
- **Modules**: `snake_case.rs` files; no `mod.rs` (use `feature.rs` + `feature/` folder for submodules).
- **No Generic Names**: No `helpers`, `utils`, `common`, or `misc` names. Use domain concepts (`asset_matcher.rs`).
- **Unit Tests**: In-file `#[cfg(test)] mod tests` per Rust idiom.
- **Integration Tests**: `tests/` directory (`<feature>_test.rs`).
- **Contracts**: Types shared with UI/IDEs must derive `#[derive(TS)]` from `ts-rs` with `#[ts(export, export_to = "...")]`.
- **Zero Fabrication**: Diagnostics, severities, and metrics must be computed strictly from real file contents and user policy.
