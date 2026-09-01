use crate::cli::ui::{
    self, brand, dim, error, format_badge, format_bytes, format_duration, success, title,
};
use crate::cli::workspace::resolve_workspace_path;
use crate::indexer::AssetIndex;
use std::path::Path;
use std::time::Instant;

pub fn execute_scan(target_path: &Path, json: bool) -> anyhow::Result<i32> {
    let canonical = resolve_workspace_path(target_path)?;
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical.clone());
    let started = Instant::now();
    let analysis = index.scan_workspace(&[])?;
    let elapsed = started.elapsed();

    if json {
        println!("{}", serde_json::to_string_pretty(&analysis)?);
        return Ok(0);
    }

    let assets = &analysis.assets;

    if ui::is_quiet() {
        println!("{} visual asset(s) found", assets.len());
        return Ok(0);
    }

    println!(
        "\n{} {} {}\n",
        brand("animoria"),
        title("Asset Gallery"),
        dim(&format!("({} visual assets found)", assets.len()))
    );

    if assets.is_empty() {
        println!(
            "  {}",
            dim("No visual assets discovered in this workspace.\n")
        );
        return Ok(0);
    }

    println!(
        "  {:<12}  {:<42}  {:>14}  {:>10}  {:>8}  {:>10}  {:<10}",
        "Format", "Relative Path", "Dimensions", "Duration", "FPS", "Size", "Status"
    );
    println!("  {}", "─".repeat(116));

    for a in assets {
        let badge = format_badge(a.format);
        let dims = match &a.dimensions {
            Some(d) => format!("{}×{}", d.width, d.height),
            None => "-".to_string(),
        };
        let dur = format_duration(a.motion.as_ref().and_then(|m| m.duration_secs));
        let fps = a
            .motion
            .as_ref()
            .and_then(|m| m.fps)
            .map(|f| format!("{:.0}", f))
            .unwrap_or_else(|| "-".to_string());
        let size = format_bytes(a.size_bytes);
        let status = if a.is_valid {
            success("Valid")
        } else {
            error("Invalid")
        };

        // Path truncation for clean display
        let rel_path = if a.relative_path.len() > 40 {
            format!("...{}", &a.relative_path[a.relative_path.len() - 37..])
        } else {
            a.relative_path.clone()
        };

        println!(
            "  {:<21}  {:<42}  {:>14}  {:>10}  {:>8}  {:>10}  {:<10}",
            badge, rel_path, dims, dur, fps, size, status
        );
    }

    let footer = if ui::verbosity() > 0 {
        format!(
            "Scanned {} in {:.1}ms",
            canonical.display(),
            elapsed.as_secs_f64() * 1000.0
        )
    } else {
        format!("Scanned in {}", canonical.display())
    };
    println!("\n  {}\n", dim(&footer));
    Ok(0)
}
