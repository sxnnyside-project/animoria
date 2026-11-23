# Animoria Core API

The authoritative specification and public interface contract for `animoria_core` (the native Rust asset intelligence engine) and its Protocol v1 IPC daemon.

## Statuses

| Status | What it promises | In the code |
|---|---|---|
| `public` | Stable. Documented, tested, and covered by SemVer: a breaking change requires a major version bump. | Exported at the `animoria_core` crate root (`src/lib.rs`); complete doc comments and integration tests. |
| `experimental` | Exported intentionally for active trial, but may change or be removed in any minor release. Not covered by SemVer. | Marked with doc comment indicating experimental status or gated under feature flags. |
| `deprecated` | Maintained for backward compatibility. Persists for at least one minor release, then removed in a major release. | Marked with `#[deprecated(since = "...", note = "...")]` with an explicit replacement symbol. |
| `internal` | No compatibility guarantee. Intended exclusively for internal engine coordination. | Private modules, `pub(crate)` visibility, or `detail` submodules not re-exported at the crate root. |

Anything not explicitly listed in the symbol tables below is `internal`, regardless of visibility in the language compiler.

---

## Engine ABI & Protocol Specification

The inter-process communication between the native `animoria` daemon and IDE host surfaces (VS Code, JetBrains, CLI, Action) operates strictly over NDJSON standard I/O conforming to Protocol v1:

- **Protocol Version**: `1.0.0` (numeric identifier: `1`)
- **Transport**: Standard I/O newline-delimited JSON (`application/x-ndjson`)
- **Handshake Method**: `hello` (returns `HelloResultPayload` with daemon capability matrix)
- **Lifecycle Envelope**: `ProtocolEnvelope` / `DaemonRequest` / `DaemonResponse` / `DaemonEvent`

---

## Public Symbols

### 1. Domain Models & Asset Types

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::contracts::Asset` | public | 2.0.0 | | Universal visual asset model representing static and motion media |
| `animoria_core::contracts::AssetKind` | public | 2.0.0 | | Classification enum (`Motion` vs `Static`) |
| `animoria_core::contracts::AssetFormat` | public | 2.0.0 | | Deep-parsed format variant (Lottie, dotLottie, Rive, SVG, PNG, WebP, etc.) |
| `animoria_core::contracts::Dimensions` | public | 2.0.0 | | Width and height bounds with optional aspect ratio |
| `animoria_core::contracts::MotionMetadata` | public | 2.0.0 | | Frame count, duration in seconds, frame rate, and layer topology |
| `animoria_core::contracts::StaticMetadata` | public | 2.0.0 | | Color space, bit depth, transparency channels, and density descriptors |
| `animoria_core::contracts::UsageReference` | public | 2.0.0 | | Traced code reference: file path, line number, syntax style, and excerpt |
| `animoria_core::contracts::DuplicateGroup` | public | 2.0.0 | | Clustered duplicate assets sharing content hash or visual equivalence |

### 2. Workspace Analysis & Health Diagnostics

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::contracts::WorkspaceAnalysis` | public | 2.0.0 | | Top-level immutable analysis state containing all assets, rules, and metrics |
| `animoria_core::contracts::LifecycleState` | public | 2.0.0 | | State machine enum (`Initializing`, `Analyzing`, `Ready`, `Stale`, `Failed`) |
| `animoria_core::contracts::HealthScoreReport` | public | 2.0.0 | | Composite health rating (0-100), letter grade (A-F), and categorical summaries |
| `animoria_core::contracts::CategoryScore` | public | 2.0.0 | | Sub-score breakdown (Duplicates, Unreferenced, Sizing, Hygiene) |
| `animoria_core::contracts::RuleDiagnostic` | public | 2.0.0 | | Policy violation diagnostic with rule ID, severity, message, and line anchor |
| `animoria_core::contracts::DiagnosticSeverity` | public | 2.0.0 | | Severity level (`Error`, `Warning`, `Info`) |
| `animoria_core::contracts::AnalysisSnapshot` | public | 2.0.0 | | Point-in-time serialized analysis metric used for audit trails |
| `animoria_core::contracts::SnippetOption` | public | 2.0.0 | | Context-aware framework import snippet generated for an asset |

### 3. Safe Remediation & Trash Protocol

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::contracts::ResolutionPlan` | public | 2.0.0 | | Immutable multi-step remediation plan with target deletions and rewrites |
| `animoria_core::contracts::ReferenceRewriteProposal` | public | 2.0.0 | | Proposed line-level replacement diff updating code to point to canonical asset |
| `animoria_core::contracts::TrashItem` | public | 2.0.0 | | Record of an asset staged into `.animoria/trash/` with rollback metadata |
| `animoria_core::contracts::SessionManifest` | public | 2.0.0 | | Persisted session journal allowing atomic restore of executed cleanup plans |
| `animoria_core::remediation::TrashManager` | public | 2.0.0 | | Safe filesystem staging manager backing non-destructive clean operations |
| `animoria_core::remediation::create_duplicate_resolution_plan()` | public | 2.0.0 | | Generates deterministic resolution plan choosing optimal canonical asset |
| `animoria_core::remediation::propose_reference_rewrites()` | public | 2.0.0 | | Computes line-level source diffs when replacing references |
| `animoria_core::remediation::apply_reference_rewrite()` | public | 2.0.0 | | Safely executes user-confirmed source file rewrites |
| `animoria_core::remediation::write_atomic()` | public | 2.0.0 | | Atomic temp-rename file write preventing partial or corrupted outputs |

### 4. IPC Protocol & Daemon Server

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::contracts::ProtocolEnvelope` | public | 2.0.0 | | Standard wrapper for all NDJSON frames |
| `animoria_core::contracts::MessageType` | public | 2.0.0 | | Frame type (`Request`, `Response`, `Event`) |
| `animoria_core::contracts::DaemonRequest` | public | 2.0.0 | | Incoming IDE request with method, correlation ID, and parameters |
| `animoria_core::contracts::DaemonResponse` | public | 2.0.0 | | Outgoing response correlating to `DaemonRequest` |
| `animoria_core::contracts::DaemonEvent` | public | 2.0.0 | | Asynchronous notification emitted by daemon (progress, file watch events) |
| `animoria_core::contracts::DaemonErrorPayload` | public | 2.0.0 | | Standardized error payload with error code, message, and diagnostic detail |
| `animoria_core::daemon::DaemonServer` | public | 2.0.0 | | High-performance stdio IPC daemon service orchestrating workspace lifecycle |
| `animoria_core::daemon::CleanupPlan` | public | 2.0.0 | | Validated cleanup proposal containing candidate actions and eligibility checks |
| `animoria_core::daemon::CleanupProposal` | public | 2.0.0 | | Candidate action item presented to user in IDE UI |
| `animoria_core::daemon::record_audit_event()` | public | 2.0.0 | | Writes persistent JSON audit log to workspace metadata |
| `animoria_core::daemon::thumbnail_data_uri()` | public | 2.0.0 | | Renders base64 data URI raster thumbnail for IDE previews |

### 5. Ingestion, Parsers & Deduplication

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::scanner::WorkspaceScanner` | public | 2.0.0 | | Fast parallel filesystem traversal respecting ignore rules |
| `animoria_core::scanner::IgnoreRules` | public | 2.0.0 | | Hierarchical ignore matcher combining `.gitignore` and `.animoriaignore` |
| `animoria_core::parser::ParserRegistry` | public | 2.0.0 | | Extensible parser registry routing candidates by magic numbers and extension |
| `animoria_core::parser::detect_format()` | public | 2.0.0 | | Heuristic binary format detector identifying 18+ asset types |
| `animoria_core::parser::parse_lottie()` | public | 2.0.0 | | Deep JSON AST analyzer for Bodymovin / Lottie animations |
| `animoria_core::parser::parse_dotlottie()` | public | 2.0.0 | | ZIP archive parser extracting manifest, animation states, and resources |
| `animoria_core::parser::parse_rive()` | public | 2.0.0 | | Binary Rive run-time parser extracting artboards, state machines, and inputs |
| `animoria_core::parser::parse_svg()` | public | 2.0.0 | | Streaming XML parser extracting viewport, paths, embedded fonts, and scripts |
| `animoria_core::parser::parse_raster()` | public | 2.0.0 | | Header extractor for PNG, APNG, JPEG, WebP, AVIF, and GIF |
| `animoria_core::deduplication::compute_file_sha256()` | public | 2.0.0 | | Streaming SHA-256 content hasher |
| `animoria_core::deduplication::hash_assets_in_parallel()` | public | 2.0.0 | | Multi-threaded Rayon hasher processing asset pools |
| `animoria_core::deduplication::find_duplicate_groups()` | public | 2.0.0 | | Clusters exact hash collisions and normalized vector duplicates |

### 6. Reference Tracing & Governance Engine

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::tracing::AssetReferenceDetector` | public | 2.0.0 | | Multi-syntax Aho-Corasick reference scanner indexing code usages |
| `animoria_core::governance::GovernanceEngine` | public | 2.0.0 | | Deterministic rule execution engine evaluating configured asset policies |
| `animoria_core::governance::GovernancePolicy` | public | 2.0.0 | | Parsed governance configuration loaded from `.animoriarc.json` |
| `animoria_core::governance::Rule` | public | 2.0.0 | | Trait defining governance rule validation logic and diagnostic emission |
| `animoria_core::governance::NoDuplicateContentRule` | public | 2.0.0 | | Flagging identical duplicate assets across workspaces |
| `animoria_core::governance::NoUnreferencedAssetsRule` | public | 2.0.0 | | Flagging unused visual assets with zero traced references |
| `animoria_core::governance::SvgSanitizationRule` | public | 2.0.0 | | Security scanner detecting scripts, foreignObjects, and external entities in SVGs |
| `animoria_core::governance::MaxFileSizeRule` | public | 2.0.0 | | Threshold rule enforcing maximum byte budgets per asset format |
| `animoria_core::governance::MaxDimensionsRule` | public | 2.0.0 | | Threshold rule enforcing maximum pixel widths/heights |
| `animoria_core::governance::AllowedFormatsRule` | public | 2.0.0 | | Whitelist rule banning legacy or disallowed asset formats |
| `animoria_core::governance::NamingConventionRule` | public | 2.0.0 | | Rule enforcing casing standards (`kebab-case`, `snake_case`, etc.) |

### 7. CLI Surface Interface

| Symbol | Status | Since | Replacement | Notes |
|---|---|---|---|---|
| `animoria_core::cli::run_cli()` | public | 2.0.0 | | Main CLI execution entry point returning shell exit codes |
| `animoria_core::cli::Cli` | public | 2.0.0 | | Clap-derived root argument model supporting subcommands and global flags |
| `animoria_core::cli::Commands` | public | 2.0.0 | | Subcommand enum (`Scan`, `Check`, `Report`, `Clean`, `Restore`, `Explain`, `Init`) |
| `animoria_core::cli::execute_scan()` | public | 2.0.0 | | Runs interactive or JSON workspace asset discovery |
| `animoria_core::cli::execute_check()` | public | 2.0.0 | | Evaluates governance rules and returns non-zero exit code on errors |
| `animoria_core::cli::execute_report()` | public | 2.0.0 | | Generates human-readable Markdown or SARIF health reports |
| `animoria_core::cli::execute_clean()` | public | 2.0.0 | | Applies safe resolution plans moving duplicates to `.animoria/trash/` |
| `animoria_core::cli::execute_restore()` | public | 2.0.0 | | Restores assets from recorded trash sessions |
| `animoria_core::cli::execute_explain()` | public | 2.0.0 | | Prints detailed documentation and rationale for a governance rule |
| `animoria_core::cli::execute_init()` | public | 2.0.0 | | Scaffolds `.animoriarc.json` configuration file |

---

## Internal Areas

The following modules and paths are strictly `internal` implementation details. They are not covered by public API stability promises and must not be imported by external tools:

1. **`animoria_core::parser::dotlottie::internal`**: Low-level ZIP decompressor wrappers and raw memory buffers.
2. **`animoria_core::remediation::atomic_write`**: Platform-specific atomic file swap primitives (`std::fs::rename`).
3. **`animoria_core::daemon::transport`**: Stdio raw byte stream framing and pipe polling loops.
4. **`animoria_core::tracing::patterns`**: Regular expression and tokenization heuristics internal to AST traversal.

## Compatibility & Deprecation Policy

Animoria strictly adheres to Semantic Versioning (SemVer 2.0.0):
- **Deprecation**: Deprecated symbols will be marked with `#[deprecated]` in Rust, documented with an explicit migration path in the `Replacement` column, and retained for a minimum of one minor release cycle before removal.
- **Breaking Changes**: Any breaking change to `public` symbols or Protocol v1 envelope formats requires a major version increment (e.g., v3.0.0).
- **Experimental Features**: Symbols designated as `experimental` may evolve based on host IDE requirements and are announced in `CHANGELOG.md`.
