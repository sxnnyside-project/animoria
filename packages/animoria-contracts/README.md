# @animoria/contracts

Canonical TypeScript types for the Animoria ecosystem. This package contains **zero runtime logic** — every export is a type or interface generated directly from `animoria-core-rust`'s structs via [`ts-rs`](https://github.com/Aleph-Alpha/ts-rs).

## Why this package exists

Before the Rust migration, every TypeScript consumer (VS Code, the UI package, the sandbox) hand-maintained its own copy of the domain model, and those copies drifted from each other and from the engine. `@animoria/contracts` removes the possibility of drift: a type here is a direct reflection of a Rust struct, not a parallel definition someone has to remember to keep in sync.

## What's in `src/generated/`

Every file under `src/generated/` is produced by `cargo test` in `animoria-core-rust` (the `ts-rs` export runs as part of the test suite) and re-exported from `src/index.ts`. **Do not hand-edit files in `src/generated/`** — they're overwritten on the next Rust build. If a type is wrong or missing a field, the fix belongs in the Rust struct it's generated from.

Notable exports: `Asset`, `AssetKind`, `AssetFormat`, `WorkspaceAnalysis`, `HealthScoreReport`, `RuleDiagnostic`, `DuplicateGroup`, `ResolutionPlan`, `UsageReference`, `TrashItem`.

## Consumers

- `@animoria/ui` — every component prop that describes engine data is typed from here.
- `animoria-vscode` — the daemon client and host bridge.
- `animoria-sandbox` — the dev harness's bridge to the daemon.

## Build

```bash
pnpm --filter @animoria/contracts build   # tsc; regenerating types happens in animoria-core-rust, not here
```

To regenerate the types themselves, run `cargo test --manifest-path ../animoria-core-rust/Cargo.toml` after changing a Rust contract struct.
