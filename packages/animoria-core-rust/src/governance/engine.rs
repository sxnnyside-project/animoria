use super::context::AnalysisContext;
use super::rule::Rule;
use super::rules::{
    AllowedFormatsRule, MaxFileSizeRule, NoDuplicateContentRule, NoGifRule,
    NoUnreferencedAssetsRule,
};
use crate::contracts::analysis::{
    CategoryScore, DiagnosticSeverity, HealthScoreReport, RuleDiagnostic,
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

        // Penalty-based health score (0–100). Each violation class has a
        // fixed weight (invalid asset > duplicate/error > unreferenced/
        // warning), summed and then normalized by workspace size — the
        // `/ total_assets` is deliberate: 3 errors in a 5-asset workspace
        // should read as far worse than 3 errors in a 500-asset one, since
        // it's the same absolute defect count over a very different share of
        // the workspace. The trailing `* 10.0` rescales that per-asset
        // average back onto a 0–100 range the categories below also use, so
        // one workspace's score is comparable to another's regardless of size.
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

        // These cutoffs are the *only* place a score becomes a letter grade —
        // `cli/ui.rs::grade_badge` and the VS Code host's
        // `describeHealthState` both key off this `grade` string rather than
        // re-deriving their own thresholds from `score`, specifically so a
        // grade can never disagree with itself across surfaces.
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

/// Combines one `HealthScoreReport` per workspace root into a single
/// aggregate, weighted by each root's asset count — a 5-asset root scoring
/// 40% shouldn't drag a 500-asset root scoring 95% down to their unweighted
/// midpoint. Lives here (not in a host) per the "Zero Client-Side
/// Calculation" invariant: a multi-root UI asks the daemon for this instead
/// of averaging scores itself.
pub fn aggregate_health_scores(reports: &[(HealthScoreReport, usize)]) -> HealthScoreReport {
    let total_assets: usize = reports.iter().map(|(_, count)| count).sum();

    if reports.is_empty() || total_assets == 0 {
        return HealthScoreReport {
            score: 0,
            grade: "N/A".to_string(),
            categories: vec![],
            summary: "No workspace roots to aggregate.".to_string(),
        };
    }

    let weighted_score: f64 = reports
        .iter()
        .map(|(report, count)| report.score as f64 * *count as f64)
        .sum::<f64>()
        / total_assets as f64;
    let score = weighted_score.round() as u32;

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

    // (category name, asset-weighted score sum, asset-weight sum, category's
    // own weight field carried from its first occurrence, violation total)
    let mut categories_by_name: Vec<(String, f64, f64, f64, u32)> = Vec::new();
    for (report, count) in reports {
        for cat in &report.categories {
            let asset_weight = *count as f64;
            match categories_by_name
                .iter_mut()
                .find(|(name, ..)| *name == cat.category)
            {
                Some((_, score_sum, weight_sum, _, violations)) => {
                    *score_sum += cat.score as f64 * asset_weight;
                    *weight_sum += asset_weight;
                    *violations += cat.violations_count;
                }
                None => categories_by_name.push((
                    cat.category.clone(),
                    cat.score as f64 * asset_weight,
                    asset_weight,
                    cat.weight,
                    cat.violations_count,
                )),
            }
        }
    }

    let categories = categories_by_name
        .into_iter()
        .map(
            |(category, score_sum, weight_sum, weight, violations_count)| CategoryScore {
                category,
                score: if weight_sum > 0.0 {
                    (score_sum / weight_sum).round() as u32
                } else {
                    0
                },
                weight,
                violations_count,
            },
        )
        .collect();

    let summary = format!(
        "Aggregate across {} workspace root(s), {} asset(s) total: {}% (Grade {}).",
        reports.len(),
        total_assets,
        score,
        grade
    );

    HealthScoreReport {
        score,
        grade,
        categories,
        summary,
    }
}

#[cfg(test)]
mod aggregate_tests {
    use super::*;

    fn report(score: u32, grade: &str) -> HealthScoreReport {
        HealthScoreReport {
            score,
            grade: grade.to_string(),
            categories: vec![CategoryScore {
                category: "Unreferenced Assets".to_string(),
                score,
                weight: 0.35,
                violations_count: 1,
            }],
            summary: String::new(),
        }
    }

    #[test]
    fn weights_by_asset_count_not_by_root_count() {
        let aggregate = aggregate_health_scores(&[(report(40, "F"), 5), (report(95, "A"), 500)]);
        // 5 assets at 40 + 500 assets at 95, over 505 total, rounds to 94.
        assert_eq!(aggregate.score, 94);
        assert_eq!(aggregate.grade, "A");
    }

    #[test]
    fn empty_input_returns_na() {
        let aggregate = aggregate_health_scores(&[]);
        assert_eq!(aggregate.grade, "N/A");
        assert_eq!(aggregate.score, 0);
    }

    #[test]
    fn merges_categories_across_roots_by_name() {
        let aggregate = aggregate_health_scores(&[(report(80, "B"), 10), (report(60, "D"), 10)]);
        assert_eq!(aggregate.categories.len(), 1);
        assert_eq!(aggregate.categories[0].violations_count, 2);
        assert_eq!(aggregate.categories[0].score, 70);
    }
}
