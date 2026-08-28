use std::fs;
use std::path::Path;
use crate::cli::ui::{
    brand, dim, format_bytes, success, title, warning, BOLD, RESET,
};
use crate::indexer::AssetIndex;
use crate::remediation::{create_duplicate_resolution_plan, TrashManager};

pub fn execute_clean(target_path: &Path, dry_run: bool) -> anyhow::Result<i32> {
    let canonical = fs::canonicalize(target_path).unwrap_or_else(|_| target_path.to_path_buf());
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical.clone());
    let analysis = index.scan_workspace(&[])?;

    let duplicate_groups = index.duplicate_groups();

    println!(
        "\n{} {}\n",
        brand("animoria"),
        title("Asset Remediation & Trash Staging")
    );

    if duplicate_groups.is_empty() {
        println!("  {} No duplicate assets to clean in this workspace.\n", success("✔"));
        return Ok(0);
    }

    let trash_mgr = TrashManager::new(&canonical);
    let mut staged_count = 0;
    let mut reclaimed_bytes = 0;

    for group in duplicate_groups {
        let plan = create_duplicate_resolution_plan(group);

        for asset_id in plan.target_assets_to_delete {
            if let Some(asset) = analysis.assets.iter().find(|a| a.id == asset_id) {
                if dry_run {
                    println!(
                        "  {} [Dry Run] Would move to .animoria/trash: {BOLD}{}{RESET} ({})",
                        warning("▲"),
                        asset.relative_path,
                        format_bytes(asset.size_bytes)
                    );
                } else {
                    let _ = trash_mgr.stage_to_trash(&asset.id, Path::new(&asset.path))?;
                    println!(
                        "  {} Staged to .animoria/trash: {} ({})",
                        success("✔"),
                        success(&asset.relative_path),
                        format_bytes(asset.size_bytes)
                    );
                }
                staged_count += 1;
                reclaimed_bytes += asset.size_bytes;
            }
        }
    }

    let mode = if dry_run { "[Dry Run] " } else { "" };
    println!(
        "\n  {}{BOLD}Remediation Summary:{RESET} {} duplicate asset(s) staged | {} reclaimed.\n",
        mode,
        staged_count,
        success(&format_bytes(reclaimed_bytes))
    );

    Ok(0)
}
