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

pub mod cli;
pub mod contracts;
pub mod daemon;
pub mod deduplication;
pub mod governance;
pub mod indexer;
pub mod integration;
pub mod parser;
pub mod remediation;
pub mod scanner;
pub mod thumbnail;
pub mod tracing;

pub use cli::*;
pub use contracts::*;
pub use daemon::*;
pub use deduplication::*;
pub use governance::*;
pub use indexer::*;
pub use integration::*;
pub use parser::*;
pub use remediation::*;
pub use scanner::*;
pub use thumbnail::*;
pub use tracing::*;
