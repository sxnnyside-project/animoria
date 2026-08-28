use std::fs;
use std::path::Path;
use crate::cli::ui::{brand, dim, error, grade_badge, success, title, warning, BOLD, RESET};
use crate::contracts::analysis::DiagnosticSeverity;
use crate::indexer::AssetIndex;

pub fn execute_check(target_path: &Path, json: bool, strict: bool) -> anyhow::Result<i32> {
    let canonical = fs::canonicalize(target_path).unwrap_or_else(|_| target_path.to_path_buf());
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical);
    let analysis = index.scan_workspace(&[])?;

    if json {
        println!("{}", serde_json::to_string_pretty(&analysis)?);
        let has_errors = analysis
            .diagnostics
            .iter()
            .any(|d| d.severity == DiagnosticSeverity::Error);
        return Ok(if has_errors { 1 } else { 0 });
    }

    let diagnostics = &analysis.diagnostics;
    let errors: Vec<_> = diagnostics
        .iter()
        .filter(|d| d.severity == DiagnosticSeverity::Error)
        .collect();
    let warnings: Vec<_> = diagnostics
        .iter()
        .filter(|d| d.severity == DiagnosticSeverity::Warning)
        .collect();

    println!(
        "\n{} {} {}\n",
        brand("animoria"),
        title("Governance Check"),
        dim(&format!("({} assets evaluated)", analysis.assets.len()))
    );

    if diagnostics.is_empty() {
        println!("  {} {}", success("✔"), success("All visual asset governance checks passed!"));
        println!(
            "  {}\n",
            dim(&format!(
                "Overall Health: {}% ({})",
                analysis.health_score.score, analysis.health_score.grade
            ))
        );
        return Ok(0);
    }

    for err in &errors {
        println!("  {} {}", error("✖"), error(&err.rule_id));
        println!("    {}", err.message);
        println!("    {}\n", dim(&format!("at {}", err.target_asset_path)));
    }

    for warn in &warnings {
        println!("  {} {}", warning("▲"), warning(&warn.rule_id));
        println!("    {}", warn.message);
        println!("    {}\n", dim(&format!("at {}", warn.target_asset_path)));
    }

    let mut summary = Vec::new();
    if !errors.is_empty() {
        summary.push(error(&format!("{} error(s)", errors.len())));
    }
    if !warnings.is_empty() {
        summary.push(warning(&format!("{} warning(s)", warnings.len())));
    }

    println!(
        "  {BOLD}Result:{RESET} {} | {BOLD}Health Score:{RESET} {}% ({})\n",
        summary.join(", "),
        analysis.health_score.score,
        grade_badge(&analysis.health_score.grade)
    );

    if !errors.is_empty() {
        return Ok(1);
    }

    if strict && !warnings.is_empty() {
        return Ok(2);
    }

    Ok(0)
}
