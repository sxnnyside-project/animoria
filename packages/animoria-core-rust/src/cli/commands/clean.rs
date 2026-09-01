use crate::cli::ui::{self, brand, format_bytes, success, title, warning};
use crate::cli::workspace::resolve_workspace_path;
use crate::daemon::cleanup::record_trash_session;
use crate::indexer::AssetIndex;
use crate::remediation::{create_duplicate_resolution_plan, TrashManager};
use std::path::Path;

/// Stages duplicate assets to `.animoria/trash`, or previews doing so.
///
/// `apply` defaults to `false` at the call site (see `cli/args.rs`): running
/// `animoria clean <path>` with no flags only prints what *would* move.
/// Nothing on disk changes until the caller passes `--apply`, and only then
/// is a trash session actually recorded — a dry run must not litter
/// `.animoria/trash/sessions.json` with a session there is nothing to
/// restore.
pub fn execute_clean(target_path: &Path, apply: bool) -> anyhow::Result<i32> {
    let (bold, reset) = (ui::bold_start(), ui::reset());
    let quiet = ui::is_quiet();
    let canonical = resolve_workspace_path(target_path)?;
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical.clone());
    let analysis = index.scan_workspace(&[])?;

    let duplicate_groups = index.duplicate_groups();

    if !quiet {
        println!(
            "\n{} {}\n",
            brand("animoria"),
            title("Asset Remediation & Trash Staging")
        );
    }

    if duplicate_groups.is_empty() {
        if !quiet {
            println!(
                "  {} No duplicate assets to clean in this workspace.\n",
                success("✔")
            );
        }
        return Ok(0);
    }

    let trash_mgr = TrashManager::new(&canonical);
    let mut staged_count = 0;
    let mut reclaimed_bytes = 0;
    let mut trashed = Vec::new();

    for group in duplicate_groups {
        let plan = create_duplicate_resolution_plan(group);

        for asset_id in plan.target_assets_to_delete {
            if let Some(asset) = analysis.assets.iter().find(|a| a.id == asset_id) {
                if apply {
                    let item = trash_mgr.stage_to_trash(&asset.id, Path::new(&asset.path))?;
                    if !quiet {
                        println!(
                            "  {} Staged to .animoria/trash: {} ({})",
                            success("✔"),
                            success(&asset.relative_path),
                            format_bytes(asset.size_bytes)
                        );
                    }
                    trashed.push((item, asset.size_bytes));
                } else if !quiet {
                    println!(
                        "  {} [Dry Run] Would move to .animoria/trash: {bold}{}{reset} ({})",
                        warning("▲"),
                        asset.relative_path,
                        format_bytes(asset.size_bytes)
                    );
                }
                staged_count += 1;
                reclaimed_bytes += asset.size_bytes;
            }
        }
    }

    let session_id = if apply && !trashed.is_empty() {
        Some(record_trash_session(&canonical, &trashed))
    } else {
        None
    };

    if quiet {
        let mode = if apply { "applied" } else { "dry-run" };
        println!(
            "{}: {} duplicate asset(s), {} reclaimed{}",
            mode,
            staged_count,
            format_bytes(reclaimed_bytes),
            session_id
                .as_deref()
                .map(|id| format!(" (session {id})"))
                .unwrap_or_default()
        );
        return Ok(0);
    }

    let mode = if apply { "" } else { "[Dry Run] " };
    println!(
        "\n  {}{bold}Remediation Summary:{reset} {} duplicate asset(s) staged | {} reclaimed.\n",
        mode,
        staged_count,
        success(&format_bytes(reclaimed_bytes))
    );

    if let Some(id) = &session_id {
        println!(
            "  {}\n",
            warning(&format!(
                "Run `animoria restore {} --session {id}` to undo this.",
                canonical.display()
            ))
        );
    } else if !apply {
        println!(
            "  {}\n",
            warning("This was a preview. Re-run with --apply to actually move these files.")
        );
    }

    Ok(0)
}
