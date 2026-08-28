use serde::{Deserialize, Serialize};
use super::asset::Asset;

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
#[serde(rename_all = "kebab-case")]
pub enum LifecycleState {
    Initializing,
    Analyzing,
    Ready,
    Stale,
    Incomplete,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
#[serde(rename_all = "kebab-case")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct RuleDiagnostic {
    pub rule_id: String,
    pub severity: DiagnosticSeverity,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub target_asset_id: Option<String>,
    pub target_asset_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub evidence_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub evidence_line: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub evidence_excerpt: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct CategoryScore {
    pub category: String,
    pub score: u32,
    pub weight: f64,
    pub violations_count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct HealthScoreReport {
    pub score: u32,
    pub grade: String,
    pub categories: Vec<CategoryScore>,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct WorkspaceAnalysis {
    pub root_id: String,
    pub root_path: String,
    pub state: LifecycleState,
    pub assets: Vec<Asset>,
    pub diagnostics: Vec<RuleDiagnostic>,
    pub health_score: HealthScoreReport,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub indexed_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct AnalysisSnapshot {
    pub snapshot_id: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub timestamp_ms: u64,
    pub analysis: WorkspaceAnalysis,
}
