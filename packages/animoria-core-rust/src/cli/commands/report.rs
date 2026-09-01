use crate::cli::ui::{
    self, accent, brand, dim, format_bytes, grade_badge, success, title, warning,
};
use crate::cli::workspace::resolve_workspace_path;
use crate::contracts::analysis::DiagnosticSeverity;
use crate::indexer::AssetIndex;
use std::path::Path;

pub fn execute_report(target_path: &Path, json: bool) -> anyhow::Result<i32> {
    let (bold, reset) = (ui::bold_start(), ui::reset());
    let canonical = resolve_workspace_path(target_path)?;
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical);
    let analysis = index.scan_workspace(&[])?;

    // Mirrors `check`'s exit code so `report` is usable as a CI gate too —
    // it used to always return 0, which meant a report full of errors and a
    // clean workspace looked identical to anything scripted against it.
    let has_errors = analysis
        .diagnostics
        .iter()
        .any(|d| d.severity == DiagnosticSeverity::Error);
    let exit_code = if has_errors { 1 } else { 0 };

    if json {
        let payload = serde_json::json!({
            "analysis": analysis,
            "duplicate_groups": index.duplicate_groups(),
            "references_count": index.references().len(),
        });
        println!("{}", serde_json::to_string_pretty(&payload)?);
        return Ok(exit_code);
    }

    let health = &analysis.health_score;
    let duplicate_groups = index.duplicate_groups();

    if ui::is_quiet() {
        println!(
            "{}% ({}) | {} asset(s) | {} duplicate group(s)",
            health.score,
            health.grade,
            analysis.assets.len(),
            duplicate_groups.len()
        );
        return Ok(exit_code);
    }

    println!(
        "\n{} {}\n",
        brand("animoria"),
        title("Audit & Health Report")
    );

    // Health Score Card
    println!("  ╭────────────────────────────────────────────────────────╮");
    println!(
        "  │  Health Score: {bold}{}%{reset}  │  Grade: {} │  Total Assets: {bold}{}{reset}  │",
        health.score,
        grade_badge(&health.grade),
        analysis.assets.len()
    );
    println!("  ╰────────────────────────────────────────────────────────╯\n");

    // Category Breakdown
    println!("  {}", title("Category Performance:"));
    for cat in &health.categories {
        let bar_len = ((cat.score as usize) / 5).min(20);
        let bar = format!("{}{}", "█".repeat(bar_len), "░".repeat(20 - bar_len));
        let score_fmt = if cat.score >= 80 {
            success(&format!("{}%", cat.score))
        } else {
            warning(&format!("{}%", cat.score))
        };
        println!(
            "    {:<26} [{}] {} ({} issues)",
            cat.category,
            accent(&bar),
            score_fmt,
            cat.violations_count
        );
    }
    println!();

    // Duplicate Clusters
    if !duplicate_groups.is_empty() {
        let total_wasted: u64 = duplicate_groups.iter().map(|g| g.wasted_bytes).sum();
        println!(
            "  {} {} ({})",
            title("Duplicate Asset Clusters:"),
            warning(&format!("{} groups", duplicate_groups.len())),
            dim(&format!("{} wasted", format_bytes(total_wasted)))
        );
        for g in duplicate_groups {
            println!(
                "    • {bold}{}{reset} (SHA-256: {})",
                g.id,
                dim(&g.content_hash[..8])
            );
            println!("       Canonical: {}", success(&g.canonical_asset_id));
            let dup_ids: Vec<_> = g
                .asset_ids
                .iter()
                .filter(|id| id != &&g.canonical_asset_id)
                .map(|s| s.as_str())
                .collect();
            println!("       Duplicates: {}", dup_ids.join(", "));
        }
        println!();
    }

    // Unreferenced Assets
    let unreferenced: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    if !unreferenced.is_empty() {
        println!(
            "  {} {}",
            title("Unreferenced Assets:"),
            warning(&format!("{} orphan(s)", unreferenced.len()))
        );
        for unref in unreferenced {
            println!("    • {}", unref.target_asset_path);
        }
        println!();
    }

    println!("  {}\n", dim(&format!("Summary: {}", health.summary)));
    Ok(exit_code)
}
