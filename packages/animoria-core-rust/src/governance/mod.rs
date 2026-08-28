//! # Governance Policy Engine & Health Scoring
//!
//! Evaluates active workspace rules (unreferenced assets, duplicate content/names, max file size,
//! disallowed formats, GIF bans) and calculates the overall Workspace Health Score (0-100%).

pub mod context;
pub mod engine;
pub mod policy;
pub mod rule;
pub mod rules;

pub use context::AnalysisContext;
pub use engine::GovernanceEngine;
pub use policy::GovernancePolicy;
pub use rule::Rule;
pub use rules::{AllowedFormatsRule, MaxFileSizeRule, NoDuplicateContentRule, NoGifRule, NoUnreferencedAssetsRule};
