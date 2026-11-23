//! # Governance Policy Engine & Health Scoring
//!
//! Evaluates active workspace rules (unreferenced assets, duplicate content/names, max file size,
//! disallowed formats, GIF bans) and calculates the overall Workspace Health Score (0-100%).

pub(crate) mod asset_matcher;
pub(crate) mod context;
/// Governance engine orchestrating rule evaluation across asset collections.
pub mod engine;
/// Governance policy representation and configuration schemas.
pub mod policy;
/// Rule definition trait and diagnostic emission primitives.
pub mod rule;
/// Concrete governance rule implementations.
pub mod rules;
/// SARIF 2.1.0 report generation and serialization.
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
