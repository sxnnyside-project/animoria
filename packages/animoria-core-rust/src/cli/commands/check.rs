use crate::cli::ui::{self, brand, dim, error, grade_badge, success, title, warning};
use crate::cli::workspace::resolve_workspace_path;
use crate::contracts::analysis::DiagnosticSeverity;
use crate::indexer::AssetIndex;
use std::path::Path;

pub fn execute_check(target_path: &Path, json: bool, strict: bool) -> anyhow::Result<i32> {
    let canonical = resolve_workspace_path(target_path)?;
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
    let quiet = ui::is_quiet();

    if !quiet {
        println!(
            "\n{} {} {}\n",
            brand("animoria"),
            title("Governance Check"),
            dim(&format!("({} assets evaluated)", analysis.assets.len()))
        );
    }

    if diagnostics.is_empty() {
        if quiet {
            println!(
                "OK: {}% ({})",
                analysis.health_score.score, analysis.health_score.grade
            );
        } else {
            println!(
                "  {} {}",
                success("✔"),
                success("All visual asset governance checks passed!")
            );
            println!(
                "  {}\n",
                dim(&format!(
                    "Overall Health: {}% ({})",
                    analysis.health_score.score, analysis.health_score.grade
                ))
            );
        }
        return Ok(0);
    }

    if !quiet {
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
    }

    let mut summary = Vec::new();
    if !errors.is_empty() {
        summary.push(format!("{} error(s)", errors.len()));
    }
    if !warnings.is_empty() {
        summary.push(format!("{} warning(s)", warnings.len()));
    }

    if quiet {
        println!(
            "{}: {}% ({})",
            summary.join(", "),
            analysis.health_score.score,
            analysis.health_score.grade
        );
    } else {
        let colored_summary: Vec<String> = {
            let mut v = Vec::new();
            if !errors.is_empty() {
                v.push(error(&format!("{} error(s)", errors.len())));
            }
            if !warnings.is_empty() {
                v.push(warning(&format!("{} warning(s)", warnings.len())));
            }
            v
        };
        let (bold, reset) = (ui::bold_start(), ui::reset());
        println!(
            "  {bold}Result:{reset} {} | {bold}Health Score:{reset} {}% ({})\n",
            colored_summary.join(", "),
            analysis.health_score.score,
            grade_badge(&analysis.health_score.grade)
        );
    }

    if !errors.is_empty() {
        return Ok(1);
    }

    if strict && !warnings.is_empty() {
        return Ok(2);
    }

    Ok(0)
}
