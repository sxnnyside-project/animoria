//! Governance report rendering for the daemon's `exportReport` method.
//!
//! JetBrains has no client-side fallback for this the way VS Code's
//! extension does (`exportGovernanceReport` builds Markdown locally) — it
//! asks the daemon for finished report content. This is that renderer, in
//! the same shape VS Code's own report uses, so both hosts show the
//! identical report for the identical analysis.

use crate::contracts::analysis::WorkspaceAnalysis;

pub fn render_markdown(analysis: &WorkspaceAnalysis) -> String {
    let mut lines = vec![
        "# Animoria Visual Governance Report".to_string(),
        String::new(),
        format!("**Health Score:** {}/100", analysis.health_score.score),
        format!("**Total Assets Analyzed:** {}", analysis.assets.len()),
        format!("**Total Findings:** {}", analysis.diagnostics.len()),
        String::new(),
    ];
    for d in &analysis.diagnostics {
        lines.push(format!(
            "- [{}] {}: {} (`{}`)",
            format!("{:?}", d.severity).to_lowercase(),
            d.rule_id,
            d.message,
            d.target_asset_path
        ));
    }
    lines.join("\n")
}

pub fn render(analysis: &WorkspaceAnalysis, format: &str) -> String {
    if format.eq_ignore_ascii_case("json") {
        serde_json::to_string_pretty(analysis).unwrap_or_default()
    } else {
        render_markdown(analysis)
    }
}
