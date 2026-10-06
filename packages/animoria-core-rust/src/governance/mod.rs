//! # Governance Policy Engine & Health Scoring
//!
//! Evaluates active workspace rules (unreferenced assets, duplicate content/names, max file size,
//! disallowed formats, GIF bans) and calculates the overall Workspace Health Score (0-100%).

pub mod asset_matcher;
pub mod context;
pub mod engine;
pub mod policy;
pub mod rule;
pub mod rules;
pub mod sarif;

pub use asset_matcher::{is_app_icon, matches_any_pattern};
pub use context::AnalysisContext;
pub use engine::GovernanceEngine;
pub use policy::{GovernancePolicy, NamingCase, PolicyOverride};
pub use rule::Rule;
pub use rules::{
    AllowedFormatsRule, MaxDimensionsRule, MaxFileSizeRule, NamingConventionRule,
    NoDuplicateContentRule, NoGifRule, NoUnreferencedAssetsRule, SvgSanitizationRule,
};
pub use sarif::SarifReport;
