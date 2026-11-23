//! # Animoria Core Rust Engine & CLI
//!
//! High-performance native engine and standalone CLI for visual asset governance.
//!
//! ## Architecture Overview & Data Flow
//!
//! ```text
//! Workspace Root
//!       │
//!       ▼ (1. Ingestion)
//!   [Scanner] ──► .ignore / .animoriaignore filtering
//!       │
//!       ▼ (2. Heuristic Detection)
//!   [Asset] (is_valid: true/false — unparseable assets are NEVER silently dropped)
//!       │
//!       ▼ (3. Deep Enrichment)
//!   [ParserRegistry] ──► Lottie, dotLottie, Rive, GIF, APNG, SVG, WebP, PNG, JPEG, AVIF
//!       │
//!       ├──► [Deduplication Engine] ──► Rayon-parallel SHA-256 Content Hashing
//!       │
//!       ├──► [Reference Detector]   ──► Multi-Syntax Aho-Corasick AST & Token Tracing
//!       │
//!       ▼ (4. Policy Evaluation)
//!   [Governance Engine] ──────────► Rule Evaluation (no-unref, no-dups, max-size, format)
//!       │
//!       ▼ (5. Health & Diagnostic Synthesis)
//!   [WorkspaceAnalysis] ──────────► Health Score (0-100%) + Category Breakdown
//!       │
//!       ├───────────────────────────────┐
//!       ▼                               ▼
//!   [Protocol v1 Daemon]          [Native CLI]
//!   (NDJSON stdio over IDEs)     (`scan`, `check`, `report`, `clean`, `init`)
//! ```
//!
//! ## Core Invariants
//!
//! 1. **Unified Asset Model**: Both `Motion` (Lottie, dotLottie, Rive, GIF, APNG, Animated SVG)
//!    and `Static` (SVG, PNG, JPEG, WebP, AVIF) share the exact same [`Asset`] struct from day 1.
//! 2. **Zero Silent Drops**: If a file is corrupt or fails to parse, it is indexed with
//!    `is_valid: false` and the error attached to [`Asset::error`]. It is never omitted from the index.
//! 3. **Single Source of Truth**: TypeScript and Kotlin bindings are generated directly from
//!    Rust domain models using `ts-rs`, preventing contract drift across tools.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

/// Command-line interface definitions, parsing, and execution handlers.
pub mod cli;
/// Universal domain models, IPC protocol envelopes, and serialization contracts.
pub mod contracts;
/// Long-running background daemon and IDE protocol server.
pub mod daemon;
/// Content-based and visual deduplication algorithms.
pub mod deduplication;
/// Asset governance policy evaluation engine and rules.
pub mod governance;
/// High-throughput workspace asset indexing and caching.
pub mod indexer;
/// Integration snippets and framework-specific code generation.
pub mod integration;
/// Deep format parsers for vector, raster, and motion assets.
pub mod parser;
/// Safe remediation, trash staging, and reference rewrite mechanisms.
pub mod remediation;
/// Workspace file tree walking and ignore rule evaluation.
pub mod scanner;
/// Thumbnail generation and image caching.
pub mod thumbnail;
/// Multi-syntax source code reference tracing.
pub mod tracing;

// Core domain contracts
pub use contracts::{
    AnalysisSnapshot, Asset, AssetFormat, AssetKind, CategoryScore, DaemonErrorPayload,
    DaemonEvent, DaemonRequest, DaemonResponse, DiagnosticSeverity, Dimensions, DuplicateGroup,
    HealthScoreReport, HelloResultPayload, LifecycleState, MessageType, MotionMetadata,
    ProtocolEnvelope, ReferenceRewriteProposal, ResolutionPlan, RuleDiagnostic, SessionItemStored,
    SessionManifest, SnippetOption, StaticMetadata, TrashItem, UsageReference, WorkspaceAnalysis,
};

// Core engine indexer
pub use indexer::AssetIndex;

// Scanner
pub use scanner::{IgnoreRules, WorkspaceScanner};

// Deduplication
pub use deduplication::{compute_file_sha256, find_duplicate_groups, hash_assets_in_parallel};

// Governance
pub use governance::{GovernanceEngine, GovernancePolicy, Rule, SarifReport};

// Daemon
pub use daemon::{CleanupPlan, CleanupProposal, DaemonServer};

// Ingestion and parsing
pub use parser::{
    detect_format, parse_dotlottie, parse_lottie, parse_raster, parse_rive, parse_svg,
    ParserRegistry,
};

// Safe Remediation
pub use remediation::{
    apply_reference_rewrite, create_duplicate_resolution_plan, propose_reference_rewrites,
    write_atomic, TrashManager,
};

// Tracing
pub use tracing::AssetReferenceDetector;

// CLI entry point
pub use cli::{run_cli, Cli, Commands};
