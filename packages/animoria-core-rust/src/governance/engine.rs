use crate::contracts::analysis::{
    CategoryScore, DiagnosticSeverity, HealthScoreReport, RuleDiagnostic,
};
use super::context::AnalysisContext;
use super::rule::Rule;
use super::rules::{
    AllowedFormatsRule, MaxFileSizeRule, NoDuplicateContentRule, NoGifRule,
    NoUnreferencedAssetsRule,
};

pub struct GovernanceEngine {
    rules: Vec<Box<dyn Rule>>,
}

impl Default for GovernanceEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl GovernanceEngine {
    pub fn new() -> Self {
        let rules: Vec<Box<dyn Rule>> = vec![
            Box::new(NoUnreferencedAssetsRule),
            Box::new(NoDuplicateContentRule),
            Box::new(MaxFileSizeRule),
            Box::new(AllowedFormatsRule),
            Box::new(NoGifRule),
        ];

        Self { rules }
    }

    pub fn evaluate(&self, ctx: &AnalysisContext) -> (Vec<RuleDiagnostic>, HealthScoreReport) {
        let mut diagnostics = Vec::new();

        for rule in &self.rules {
            let mut results = rule.evaluate(ctx);
            diagnostics.append(&mut results);
        }

        let total_assets = ctx.assets.len();
        if total_assets == 0 {
            let report = HealthScoreReport {
                score: 0,
                grade: "N/A".to_string(),
                categories: vec![],
                summary: "Empty workspace: no visual assets discovered.".to_string(),
            };
            return (diagnostics, report);
        }

        // Calculate penalty-based health score (0–100)
        let error_count = diagnostics
            .iter()
            .filter(|d| d.severity == DiagnosticSeverity::Error)
            .count();
        let warning_count = diagnostics
            .iter()
            .filter(|d| d.severity == DiagnosticSeverity::Warning)
            .count();
        let invalid_count = ctx.assets.iter().filter(|a| !a.is_valid).count();

        // Error penalty = 15 points per violation, Warning penalty = 5 points, Invalid asset = 20 points
        let penalty = (error_count as f64 * 15.0)
            + (warning_count as f64 * 5.0)
            + (invalid_count as f64 * 20.0);

        let base_score = 100.0 - (penalty / (total_assets as f64).max(1.0) * 10.0);
        let score = (base_score.clamp(0.0, 100.0).round()) as u32;

        let grade = if score >= 90 {
            "A".to_string()
        } else if score >= 80 {
            "B".to_string()
        } else if score >= 70 {
            "C".to_string()
        } else if score >= 60 {
            "D".to_string()
        } else {
            "F".to_string()
        };

        let categories = vec![
            CategoryScore {
                category: "Unreferenced Assets".to_string(),
                score: if warning_count == 0 { 100 } else { 80 },
                weight: 0.35,
                violations_count: warning_count as u32,
            },
            CategoryScore {
                category: "Content Duplication".to_string(),
                score: if error_count == 0 { 100 } else { 70 },
                weight: 0.35,
                violations_count: error_count as u32,
            },
            CategoryScore {
                category: "Format & Sizing Policy".to_string(),
                score: if invalid_count == 0 { 100 } else { 60 },
                weight: 0.30,
                violations_count: invalid_count as u32,
            },
        ];

        let summary = format!(
            "Governance evaluation complete: {} asset(s), {} error(s), {} warning(s). Overall Health: {}% (Grade {}).",
            total_assets, error_count, warning_count, score, grade
        );

        let report = HealthScoreReport {
            score,
            grade,
            categories,
            summary,
        };

        (diagnostics, report)
    }
}
