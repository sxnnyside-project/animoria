use crate::contracts::analysis::RuleDiagnostic;
use super::context::AnalysisContext;

pub trait Rule: Send + Sync {
    fn id(&self) -> &str;
    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic>;
}
