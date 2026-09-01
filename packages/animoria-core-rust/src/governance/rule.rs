use super::context::AnalysisContext;
use crate::contracts::analysis::RuleDiagnostic;

pub trait Rule: Send + Sync {
    fn id(&self) -> &str;
    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic>;
}
