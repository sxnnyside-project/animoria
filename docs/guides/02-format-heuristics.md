# Format Heuristics & Asset Parsers

> **Audience:** Core maintainers, format parser engineers
> **Scope:** File format identification, structural validation, header sniffing, deep metadata parsing
> **Status:** Authoritative
> **Primary packages:** [`animoria-core-rust`](../../packages/animoria-core-rust)

## 1. Purpose

This guide explains how Animoria discovers, validates, and deep-parses visual asset formats. Format detection relies on structural heuristics and binary/JSON header sniffing rather than simple file extension matching, so that misnamed or corrupt files are caught rather than silently misclassified.

## 2. Architecture

Format discovery and parsing is a two-stage pipeline inside `animoria-core-rust`: a fast extension+header heuristic decides *what* a file is, then a per-format deep parser enriches the already-discovered asset.

```mermaid
graph TD
    FileCandidate["File Candidate (Path)"]

    subgraph HeuristicPhase["1. Fast Heuristic Detection"]
        Detect["detect_format() (heuristics.rs)"]
    end

    subgraph RegistryPhase["2. Deep Parser Dispatcher"]
        Registry["ParserRegistry::parse_asset() (registry.rs)"]
    end

    subgraph Parsers["3. Deep Format Parsers"]
        LottieP["parse_lottie (lottie/)"]
        DotLottieP["parse_dotlottie (dotlottie/)"]
        RiveP["parse_rive (rive/)"]
        SvgP["parse_svg (vector/)"]
        RasterP["parse_raster (raster/)"]
    end

    FileCandidate --> Detect
    Detect -->|Some(Ok(format))| Registry
    Detect -->|Some(Err(reason))| Invalid["Kept as invalid asset (is_valid=false)"]
    Detect -->|None| Ignored["Not a visual asset — skipped"]

    Registry --> LottieP
    Registry --> DotLottieP
    Registry --> RiveP
    Registry --> SvgP
    Registry --> RasterP
```

### Module Boundaries

| Module | Location | Primary Responsibility |
|---|---|---|
| **Heuristics** | [`src/parser/heuristics.rs`](../../packages/animoria-core-rust/src/parser/heuristics.rs) | `detect_format()`: extension-dispatched header/structure sniffing. Returns `Some(Ok(format))`, `Some(Err(reason))` for a structurally corrupt file matching a visual extension, or `None` for a non-asset file. |
| **Parser Registry** | [`src/parser/registry.rs`](../../packages/animoria-core-rust/src/parser/registry.rs) | `ParserRegistry::parse_asset()`: dispatches an already-discovered `Asset` to its format's deep parser to enrich it with dimensions/motion metadata. |
| **Lottie Parser** | [`src/parser/lottie/`](../../packages/animoria-core-rust/src/parser/lottie) | Deep-parses Lottie JSON documents. |
| **dotLottie Parser** | [`src/parser/dotlottie/`](../../packages/animoria-core-rust/src/parser/dotlottie) | Deep-parses `.lottie` ZIP archives. |
| **Rive Parser** | [`src/parser/rive/`](../../packages/animoria-core-rust/src/parser/rive) | Deep-parses `.riv` binaries. |
| **Vector (SVG) Parser** | [`src/parser/vector/`](../../packages/animoria-core-rust/src/parser/vector) | Deep-parses `.svg` / animated SVG documents. |
| **Raster Parser** | [`src/parser/raster/`](../../packages/animoria-core-rust/src/parser/raster) | Deep-parses GIF, PNG/APNG, JPEG, WebP, AVIF raster assets. |

Each deep parser is a single free function taking `(path: &Path, asset: &mut Asset)` and mutating the asset in place:

- **`parse_lottie`** (`parser/lottie/mod.rs`): deserializes the file into a private `LottieDocument` struct (`v`, `w`, `h`, `fr`, `ip`, `op`, `layers`), rejects files with neither a `v` version string nor any `layers` as structurally invalid, and populates `Dimensions { width, height }` from `w`/`h` and `MotionMetadata { fps, duration_secs, total_frames, layer_count, is_animated }` computed from `fr`/`ip`/`op`/`layers.len()`.
- **`parse_dotlottie`** (`parser/dotlottie/mod.rs`): opens the file as a `zip::ZipArchive`, requires a `manifest.json` entry deserialized into a private `DotLottieManifest { generator, version, author, animations: Vec<DotLottieAnimation> }`, errors if `animations` is empty, then attempts to read `animations/<first-animation-id>.json` to populate `Dimensions` and `MotionMetadata` the same way as the Lottie parser; if that inner animation JSON can't be parsed, it still marks the asset valid with a minimal `MotionMetadata` (`is_animated: true`, all numeric fields `None`).
- **`parse_rive`** (`parser/rive/mod.rs`): validates the `RIVE` magic header, then extracts printable-ASCII string runs (`extract_string_candidates`) from the binary and classifies them by keyword lists (`ARTBOARD_HINTS`, `STATE_MACHINE_HINTS`, `ANIMATION_HINTS`) into artboards/state machines/animations. It populates only `MotionMetadata.layer_count` (artboard count, minimum 1) and `is_animated` (true if any state machine or animation name was found); `fps`, `duration_secs`, and `total_frames` are deliberately left `None` because Rive has no single file-level frame rate. No `Dimensions` are extracted.
- **`parse_svg`** (`parser/vector/mod.rs`, function `parse_svg`): streams the XML with `quick_xml`, reads `width`/`height`/`viewBox` off the root `<svg>` element into `Dimensions` (falling back to `viewBox` when explicit width/height are absent), and flags `is_animated` if any SMIL element (`<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`) or a `@keyframes`/`animation:` CSS string is present. Animated SVGs get `asset.kind = AssetKind::Motion`, `asset.format = AssetFormat::AnimatedSvg`, and a `MotionMetadata` with only `is_animated: true` set; static SVGs get `AssetKind::Static`, `AssetFormat::Svg`, and `StaticMetadata { color_depth: None, has_alpha: Some(true) }`.
- **`parse_raster`** (`parser/raster/mod.rs`): dispatches on `asset.format` to one of four private helpers — `parse_gif`, `parse_png_apng`, `parse_jpeg`, `parse_webp`, `parse_avif` (five formats, four helpers since PNG/APNG share one) — each of which validates the format's magic bytes/header directly against the raw byte buffer (no external image-decoding crate) and populates `Dimensions` plus either `MotionMetadata` (GIF via frame/delay-block counting, defaulting to 10fps when no delay is declared; APNG via the `acTL` chunk, with a hardcoded `fps: Some(30.0)`) or `StaticMetadata` (PNG/JPEG/WebP/AVIF, with `color_depth`/`has_alpha` read from format-specific header fields, or hardcoded to `8`/`true` for WebP and AVIF).

## 3. Lifecycle

Format validation and parsing follows this exact lifecycle, driven by `AssetIndex::ingest_file` in [`indexer/index.rs`](../../packages/animoria-core-rust/src/indexer/index.rs):

```
File Path (from WorkspaceScanner candidates)
→ detect_format(path)  (heuristics.rs — extension + header/structure sniff)
→ Some(Ok(fmt))  → Asset marked is_valid=true, kind derived from AssetFormat::kind()
→ Some(Err(msg)) → Asset still recorded, is_valid=false, error=Some(msg)  ("Never Drop Malformed Assets")
→ None           → not a recognized visual asset, not ingested
→ ParserRegistry::parse_asset()  (only runs if is_valid=true) → deep metadata enrichment
→ Indexed Asset Record
```

## 4. Core Implementation

### Supported Formats & Detection Heuristics

All detection functions live in [`src/parser/heuristics.rs`](../../packages/animoria-core-rust/src/parser/heuristics.rs), dispatched by extension inside `detect_format`:

#### 1. Lottie (`.json`) — `detect_lottie_json`
- Reads up to 8192 bytes and requires the text to start with `{`.
- Requires the presence of `"v"`, `"fr"`, and `"layers"` keys (matched as substrings, single- or double-quoted) — plain `.json` files like `package.json` or `tsconfig.json` simply return `None` (not an asset at all) rather than an error, since they don't start looking like a Lottie document.

#### 2. dotLottie (`.lottie`) — `detect_dotlottie`
- Reads the first 4 bytes and requires the ZIP magic bytes `PK\x03\x04`.
- A `.lottie` file without the ZIP header returns `Some(Err("Invalid dotLottie archive: missing ZIP magic bytes"))`.

#### 3. Rive (`.riv`) — `detect_rive`
- Reads the first 4 bytes and requires the ASCII sequence `RIVE`.
- Otherwise returns `Some(Err("Invalid Rive binary: missing RIVE header bytes"))`.

#### 4. GIF (`.gif`) — `detect_gif`
- Reads 6 bytes and requires `GIF87a` or `GIF89a`.

#### 5. PNG / APNG (`.png`) — `detect_png_or_apng`
- Reads up to 2048 bytes, requires the standard 8-byte PNG magic header.
- If an `acTL` chunk is found anywhere in that window, the format is `Apng`; otherwise `Png`.

#### 6. SVG / Animated SVG (`.svg`) — `detect_svg`
- Reads up to 8192 bytes as UTF-8 text and requires a lowercase `<svg` substring; otherwise `Some(Err("Missing <svg> root element"))`, or `Some(Err("Invalid UTF-8 in SVG file"))` if the bytes aren't valid UTF-8.
- If the text also contains `<animate`, `<animatetransform`, `<animatemotion`, `<set`, `@keyframes`, or `animation:`, the format is `AnimatedSvg`; otherwise plain `Svg`.

#### 7. JPEG (`.jpg`/`.jpeg`) — `detect_jpeg`
- Requires the SOI marker `0xFF 0xD8 0xFF` in the first 3 bytes.

#### 8. WebP (`.webp`) — `detect_webp`
- Requires a `RIFF` header at bytes 0-3 and `WEBP` at bytes 8-11 (12 bytes read).

#### 9. AVIF (`.avif`) — `detect_avif`
- Reads 32 bytes and requires an `ftypavif` or `ftypavis` window anywhere in it.

Any extension not in this list (`json`, `lottie`, `riv`, `gif`, `png`, `svg`, `jpg`/`jpeg`, `webp`, `avif`) returns `None` immediately from `detect_format` — Animoria never attempts format sniffing on arbitrary files.

## 5. CLI / Daemon

Format detection runs as the first step of every workspace scan (`AssetIndex::scan_workspace` → `ingest_file` → `detect_format`), so it's exercised by every CLI subcommand and every daemon `scan`/`check`/`analyze` request. The resulting `Asset.format` and `Asset.kind` fields (see [`packages/animoria-contracts/src/generated/AssetFormat.ts`](../../packages/animoria-contracts/src/generated/AssetFormat.ts) and [`AssetKind.ts`](../../packages/animoria-contracts/src/generated/AssetKind.ts)) are serialized as part of every `Asset` in a `WorkspaceAnalysis` payload.

A file that matches a visual extension but fails structural validation is **not dropped** — it appears in `assets` with `is_valid: false` and `error: Some("...")`, consistent with the "Never Drop Malformed Assets" invariant.

## 6. VS Code

`animoria-vscode`'s `AnimoriaTreeItem` (in [`src/providers/animoria-tree-provider.ts`](../../packages/animoria-vscode/src/providers/animoria-tree-provider.ts)) surfaces `asset.format`/`is_valid` directly on the tree row rather than through a separate hover provider. When `asset.is_valid` is true, the item's `description` is built as `FORMAT · fps · duration · WxH` (e.g. `"LOTTIE · 30fps · 2.0s · 512×512"`), with `asset.format.toUpperCase()` always present and the fps/duration/dimension segments filtered out when absent; the icon is either the generated thumbnail file (when one exists) or a `ThemeIcon` (`play-circle` for motion assets, `file-media` for static ones), tinted by any governance badges the asset carries. When `asset.is_valid` is false, the description is hardcoded to `"Invalid asset"` and the icon becomes the VS Code built-in `error` `ThemeIcon`, regardless of what `asset.format` says. The tooltip is assembled separately in `presented.tooltipLines` (from `badge-presenter.ts`) prefixed with the asset's full path.

## 7. JetBrains

`animoria-jetbrains`'s `AnimoriaGalleryPanel` (in [`src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaGalleryPanel.kt`](../../packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaGalleryPanel.kt)) does not render its own format badge widget — instead, in `publishAnalysis()`, it forwards each static asset's `format` field straight through into a `StaticAssetData(path, name, stem, format, sizeBytes)` record handed to `AnimoriaTreeModel`, and does the same when resolving the currently selected asset (`selectedAsset()` copies `uo.asset.format` into the returned `JetBrainsAsset`). The actual presentation of that `format` string (e.g. as a Swing tree-node label or icon) is delegated to `AnimoriaTreeModel`, which — per its `"allowed-formats"` governance-category label mapping — treats format primarily as a filter/governance dimension rather than a per-asset visual badge; there is no JCEF-rendered thumbnail badge overlay comparable to VS Code's `ThemeIcon` treatment.

## 8. Sandbox

The sandbox's fixture data does not cover all 11 `AssetFormat` variants. The repo-root `fixtures/` directory (used by the sandbox's fake daemon and the Rust golden-corpus tests alike) contains only `.gif`, `.svg`, and `.json` (a candidate Lottie file) among the 11 formats, alongside unrelated non-asset extensions (`.astro`, `.css`, `.html`, `.md`, `.mdx`, `.scss`, `.svelte`, `.ts`, `.vue`, `.gitkeep`). `dot-lottie`, `rive`, `apng`, `animated-svg`, `png`, `jpeg`, `webp`, and `avif` have no fixture representation anywhere in the repo's `fixtures/` tree.

## 9. Contracts & Types

Format definitions are canonical Rust enums, generated into TypeScript via `ts-rs`:

```rust
// packages/animoria-core-rust/src/contracts/asset.rs
pub enum AssetFormat {
    // Motion Formats
    Lottie,
    DotLottie,
    Rive,
    Gif,
    Apng,
    AnimatedSvg,
    // Static Formats
    Svg,
    Png,
    Jpeg,
    Webp,
    Avif,
}
```

`AssetFormat::kind()` maps each variant to `AssetKind::Motion` or `AssetKind::Static`. The generated TypeScript mirror lives at [`packages/animoria-contracts/src/generated/AssetFormat.ts`](../../packages/animoria-contracts/src/generated/AssetFormat.ts).

## 10. Tests & Fixtures

Neither `parser/heuristics.rs` nor `parser/registry.rs` contains an inline `#[cfg(test)]` module — a repo-wide search confirms the only inline test module in `src/` lives in `daemon/server.rs`. Heuristics and registry behavior are instead exercised entirely through the top-level integration suites in `packages/animoria-core-rust/tests/`: `deep_parsers_test.rs` (per-format deep-parse correctness and the "malformed assets are never dropped" invariant), `parser_fuzz_test.rs` (property-based fuzzing of the parsers against arbitrary/garbage byte input), and `golden_corpus_parity_test.rs` (end-to-end scans of the fixture workspaces under `fixtures/`, including format detection as part of `AssetIndex::scan_workspace`).

## 11. Extension Points

### How do I add a new format parser?
1. Add a `detect_<format>` function to [`packages/animoria-core-rust/src/parser/heuristics.rs`](../../packages/animoria-core-rust/src/parser/heuristics.rs) and wire it into `detect_format`'s extension `match`.
2. Add the new variant to `AssetFormat` in [`src/contracts/asset.rs`](../../packages/animoria-core-rust/src/contracts/asset.rs), including its `kind()` and `extension()` mapping.
3. Add a deep parser module under `packages/animoria-core-rust/src/parser/<new_format>/` and register it in the `match asset.format` inside [`src/parser/registry.rs`](../../packages/animoria-core-rust/src/parser/registry.rs)'s `ParserRegistry::parse_asset`.
4. Add the new extension to `RECOGNIZED_EXTENSIONS` in [`src/scanner/walker.rs`](../../packages/animoria-core-rust/src/scanner/walker.rs) so the scanner surfaces candidate files of that type at all.
5. Rebuild with the `ts-bindings` feature so the updated `AssetFormat` enum regenerates in `@animoria/contracts`.

## 12. Failure Modes

| Failure Mode | Root Cause | System Behavior |
|---|---|---|
| **Malformed dotLottie/Rive header** | File has the right extension but wrong magic bytes | `detect_format` returns `Some(Err(...))`; the asset is still ingested with `is_valid: false` and the specific error message. |
| **False Positive JSON** | `package.json`/`tsconfig.json` scanned | `detect_lottie_json` fails the `v`/`fr`/`layers` substring check and returns `None` — the file is never ingested as an asset at all. |
| **Static SVG** | SVG contains graphics but no animation markers | `detect_svg` returns `Some(Ok(AssetFormat::Svg))` (not `AnimatedSvg`, not an error) — it is still a valid static asset. |
| **Unreadable file** | I/O error reading the header (permissions, race with deletion) | Each `detect_*` function returns `Some(Err("Cannot read ... file: {e}"))`; the asset is kept with `is_valid: false`. |

## 13. Common Maintenance Tasks

### How do I test structural validation against a broken Lottie/Rive/dotLottie file?
The repo-root `fixtures/malformed-assets/` directory exists and is the corpus used for this today: it is consumed directly by `golden_corpus_parity_test.rs`'s `test_golden_4_malformed_assets_workspace`, which scans it via `AssetIndex::new("malformed-ws", ...)` and asserts on the resulting `is_valid`/`error` fields. `deep_parsers_test.rs`'s `test_invariant_malformed_assets_are_never_dropped` covers the same invariant with inline byte fixtures (including a corrupt SVG with unclosed tags) rather than reading from `fixtures/`. Point a broken Lottie/Rive/dotLottie file at either of these tests, or run `cargo test --manifest-path packages/animoria-core-rust/Cargo.toml golden_corpus_parity` / `deep_parsers` to exercise structural-validation failures end-to-end.

## 14. Files & Ownership

| Layer | Path | Responsibility |
|---|---|---|
| Engine | [`packages/animoria-core-rust/src/parser/heuristics.rs`](../../packages/animoria-core-rust/src/parser/heuristics.rs) | Fast extension + header/structure format detection |
| Engine | [`packages/animoria-core-rust/src/parser/registry.rs`](../../packages/animoria-core-rust/src/parser/registry.rs) | Deep-parser dispatch and invalid-asset fallback |
| Engine | [`packages/animoria-core-rust/src/parser/lottie/`](../../packages/animoria-core-rust/src/parser/lottie) | Lottie JSON deep parsing |
| Engine | [`packages/animoria-core-rust/src/parser/dotlottie/`](../../packages/animoria-core-rust/src/parser/dotlottie) | dotLottie ZIP archive deep parsing |
| Engine | [`packages/animoria-core-rust/src/parser/rive/`](../../packages/animoria-core-rust/src/parser/rive) | Rive binary deep parsing |
| Engine | [`packages/animoria-core-rust/src/parser/vector/`](../../packages/animoria-core-rust/src/parser/vector) | SVG / animated SVG deep parsing |
| Engine | [`packages/animoria-core-rust/src/parser/raster/`](../../packages/animoria-core-rust/src/parser/raster) | Raster format (GIF/PNG/APNG/JPEG/WebP/AVIF) deep parsing |
| Contracts | [`packages/animoria-contracts/src/generated/AssetFormat.ts`](../../packages/animoria-contracts/src/generated/AssetFormat.ts) | Generated TypeScript mirror of `AssetFormat` |

## 15. Verification Checklist

Execute the Rust test suite after modifying any heuristic or parser:

```bash
cargo test --manifest-path packages/animoria-core-rust/Cargo.toml
cargo clippy --manifest-path packages/animoria-core-rust/Cargo.toml --all-targets -- -D warnings
```
Ensure all tests pass and `clippy` reports zero warnings.
