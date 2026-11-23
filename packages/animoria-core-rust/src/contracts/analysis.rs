use super::asset::Asset;
use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
#[serde(rename_all = "kebab-case")]
/// Operational lifecycle state of an asset within the workspace index.
pub enum LifecycleState {
    /// Asset is newly discovered and awaiting deep parsing.
    Initializing,
    /// Asset is actively being enriched by background parsers.
    Analyzing,
    /// Asset is fully indexed, enriched, and ready for queries.
    Ready,
    /// Asset on-disk content changed and requires re-analysis.
    Stale,
    /// Partial parsing completed; some metadata could not be extracted.
    Incomplete,
    /// Asset failed validation or binary parsing.
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
#[serde(rename_all = "kebab-case")]
/// Severity level of a governance diagnostic finding.
pub enum DiagnosticSeverity {
    /// Fatal rule violation that fails builds and CI quality gates.
    Error,
    /// Non-blocking warning indicating sub-optimal asset usage.
    Warning,
    /// Informational notice or optimization opportunity.
    Info,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Diagnostic finding produced by evaluating a governance rule against an asset.
pub struct RuleDiagnostic {
    /// Unique identifier of the rule that produced this diagnostic.
    pub rule_id: String,
    /// Severity level of the diagnostic finding.
    pub severity: DiagnosticSeverity,
    /// Human-readable explanation of the finding and remediation tip.
    pub message: String,
    /// Target asset identifier if associated with a single asset.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub target_asset_id: Option<String>,
    /// Workspace-relative path to the violating asset.
    pub target_asset_path: String,
    /// Referencing source file path if evidence was discovered in code.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub evidence_file: Option<String>,
    /// 1-based line number in source code where violation was referenced.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub evidence_line: Option<u32>,
    /// Line text excerpt displaying the violation context.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub evidence_excerpt: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Granular category score breakdown for health score synthesis.
pub struct CategoryScore {
    /// Category name identifier (e.g., `duplicates`, `unreferenced`, `sizing`, `hygiene`).
    pub category: String,
    /// Synthesized category score rating from 0 to 100.
    pub score: u32,
    /// Relative weight of this category in the composite score calculation.
    pub weight: f64,
    /// Total count of rule violations detected in this category.
    pub violations_count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Comprehensive composite health score report for a workspace audit.
pub struct HealthScoreReport {
    /// Overall composite health score from 0 to 100.
    pub score: u32,
    /// Letter grade classification (A, B, C, D, or F).
    pub grade: String,
    /// Category score breakdowns contributing to this score.
    pub categories: Vec<CategoryScore>,
    /// Human-readable explanation and health status summary.
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Complete analysis payload containing assets, diagnostics, duplicates, and health score.
pub struct WorkspaceAnalysis {
    /// Unique workspace root identifier.
    pub root_id: String,
    /// Absolute filesystem path to the workspace root.
    pub root_path: String,
    /// Current lifecycle state of the workspace analysis.
    pub state: LifecycleState,
    /// Collection of all discovered visual assets.
    pub assets: Vec<Asset>,
    /// All rule violation diagnostics emitted during policy evaluation.
    pub diagnostics: Vec<RuleDiagnostic>,
    /// Composite health score report synthesizing workspace quality.
    pub health_score: HealthScoreReport,
    /// Unix timestamp in milliseconds when the analysis completed.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub indexed_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Serialized historical snapshot of workspace analysis metrics.
pub struct AnalysisSnapshot {
    /// Unique snapshot identifier.
    pub snapshot_id: String,
    /// Unix timestamp in milliseconds when snapshot was recorded.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub timestamp_ms: u64,
    /// Workspace analysis data captured at this point in time.
    pub analysis: WorkspaceAnalysis,
}
