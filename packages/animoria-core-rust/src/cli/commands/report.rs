use std::fs;
use std::path::Path;
use crate::cli::ui::{
    accent, brand, dim, format_bytes, grade_badge, success, title, warning, BOLD, RESET,
};
use crate::indexer::AssetIndex;

pub fn execute_report(target_path: &Path, json: bool) -> anyhow::Result<i32> {
    let canonical = fs::canonicalize(target_path).unwrap_or_else(|_| target_path.to_path_buf());
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical);
    let analysis = index.scan_workspace(&[])?;

    if json {
        let payload = serde_json::json!({
            "analysis": analysis,
            "duplicate_groups": index.duplicate_groups(),
            "references_count": index.references().len(),
        });
        println!("{}", serde_json::to_string_pretty(&payload)?);
        return Ok(0);
    }

    let health = &analysis.health_score;
    let duplicate_groups = index.duplicate_groups();

    println!("\n{} {}\n", brand("animoria"), title("Audit & Health Report"));

    // Health Score Card
    println!("  ╭────────────────────────────────────────────────────────╮");
    println!(
        "  │  Health Score: {BOLD}{}%{RESET}  │  Grade: {} │  Total Assets: {BOLD}{}{RESET}  │",
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
                "    • {BOLD}{}{RESET} (SHA-256: {})",
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
    Ok(0)
}
