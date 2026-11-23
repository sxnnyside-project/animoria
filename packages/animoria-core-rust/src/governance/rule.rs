use super::context::AnalysisContext;
use crate::contracts::analysis::RuleDiagnostic;

/// Trait implemented by all governance audit rules.
pub trait Rule: Send + Sync {
    /// Returns the unique static identifier of this rule.
    fn id(&self) -> &str;
    /// Evaluates this rule against the workspace context and returns all detected diagnostics.
    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic>;
}
