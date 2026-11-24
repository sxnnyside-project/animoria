use crate::cli::ui::{self, brand, format_bytes, success, title, warning};
use crate::cli::workspace::resolve_workspace_path;
use crate::daemon::cleanup::record_trash_session;
use crate::indexer::AssetIndex;
use crate::remediation::{create_duplicate_resolution_plan, TrashManager};
use std::path::Path;

/// Stages duplicate assets to `.animoria/trash`, purges cache, or previews doing so.
///
/// `should_apply` defaults to `false` at the call site (see `cli/args.rs`): running
/// `animoria clean <path>` with no flags only prints what *would* move or purge.
/// Nothing on disk changes until the caller passes `--apply`.
pub fn execute_clean(
    target_path: &Path,
    should_apply: bool,
    should_purge_cache: bool,
    should_empty_trash: bool,
    should_clean_all: bool,
) -> anyhow::Result<i32> {
    let (bold, reset) = (ui::bold_start(), ui::reset());
    let quiet = ui::is_quiet();
    let canonical = resolve_workspace_path(target_path)?;

    let purge_cache = should_purge_cache || should_clean_all;
    let empty_trash = should_empty_trash || should_clean_all;
    let clean_duplicates = should_clean_all || (!should_purge_cache && !should_empty_trash);

    if !quiet {
        println!(
            "\n{} {}\n",
            brand("animoria"),
            title("Asset Remediation & Cache Maintenance")
        );
    }

    // 1. Purge thumbnail cache if requested
    if purge_cache {
        let thumb_dir = canonical.join(".animoria/thumbnails");
        let (file_count, byte_count) = if thumb_dir.is_dir() {
            let mut count = 0;
            let mut bytes = 0;
            if let Ok(entries) = std::fs::read_dir(&thumb_dir) {
                for entry in entries.filter_map(Result::ok) {
                    if entry.path().is_file() {
                        bytes += entry.metadata().map(|m| m.len()).unwrap_or(0);
                        count += 1;
                    }
                }
            }
            (count, bytes)
        } else {
            (0, 0)
        };

        if file_count > 0 {
            if should_apply {
                let (purged, freed) = crate::thumbnail::purge_all_thumbnails(&canonical)?;
                if !quiet {
                    println!(
                        "  {} Purged thumbnail cache: {} file(s) ({}) reclaimed.",
                        success("✔"),
                        purged,
                        format_bytes(freed)
                    );
                }
            } else if !quiet {
                println!(
                    "  {} [Dry Run] Would purge thumbnail cache: {} file(s) ({})",
                    warning("▲"),
                    file_count,
                    format_bytes(byte_count)
                );
            }
        } else if !quiet {
            println!("  {} Thumbnail cache is already clean.", success("✔"));
        }
    }

    // 2. Empty trash if requested
    if empty_trash {
        let trash_mgr = TrashManager::new(&canonical);
        let trash_dir = canonical.join(".animoria/trash");
        let (file_count, byte_count) = if trash_dir.is_dir() {
            let mut count = 0;
            let mut bytes = 0;
            if let Ok(entries) = std::fs::read_dir(&trash_dir) {
                for entry in entries.filter_map(Result::ok) {
                    let p = entry.path();
                    if p.is_file() {
                        bytes += entry.metadata().map(|m| m.len()).unwrap_or(0);
                        count += 1;
                    } else if p.is_dir() {
                        if let Ok(subs) = std::fs::read_dir(&p) {
                            for sub in subs.filter_map(Result::ok) {
                                bytes += sub.metadata().map(|m| m.len()).unwrap_or(0);
                                count += 1;
                            }
                        }
                    }
                }
            }
            (count, bytes)
        } else {
            (0, 0)
        };

        if file_count > 0 {
            if should_apply {
                let (purged, freed) = trash_mgr.purge_trash()?;
                if !quiet {
                    println!(
                        "  {} Emptied trash: {} file(s) ({}) permanently deleted.",
                        success("✔"),
                        purged,
                        format_bytes(freed)
                    );
                }
            } else if !quiet {
                println!(
                    "  {} [Dry Run] Would empty trash: {} file(s) ({})",
                    warning("▲"),
                    file_count,
                    format_bytes(byte_count)
                );
            }
        } else if !quiet {
            println!("  {} Trash is already empty.", success("✔"));
        }
    }

    if !clean_duplicates {
        crate::thumbnail::clean_empty_animoria_dir(&canonical);
        return Ok(0);
    }

    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical.clone());
    let analysis = index.scan_workspace(&[])?;

    let duplicate_groups = index.duplicate_groups();

    if duplicate_groups.is_empty() {
        if !quiet {
            println!(
                "  {} No duplicate assets to clean in this workspace.\n",
                success("✔")
            );
        }
        crate::thumbnail::clean_empty_animoria_dir(&canonical);
        return Ok(0);
    }

    let trash_mgr = TrashManager::new(&canonical);
    let mut staged_count = 0;
    let mut reclaimed_bytes = 0;
    let mut trashed = Vec::new();
    let mut failure = None;
    // Moving a duplicate that source code still imports would break the build, and this
    // command does not rewrite references, so those duplicates stay where they are.
    let referenced: std::collections::HashSet<&str> = index
        .references()
        .iter()
        .map(|r| r.asset_id.as_str())
        .collect();
    let mut skipped_referenced = Vec::new();

    'groups: for group in duplicate_groups {
        let plan = create_duplicate_resolution_plan(group);

        for asset_id in plan.target_assets_to_delete {
            let Some(asset) = analysis.assets.iter().find(|a| a.id == asset_id) else {
                continue;
            };
            if referenced.contains(asset.path.as_str()) {
                skipped_referenced.push(asset.relative_path.clone());
                continue;
            }
            if should_apply {
                match trash_mgr.stage_to_trash(&asset.id, Path::new(&asset.path)) {
                    Ok(item) => {
                        if !quiet {
                            println!(
                                "  {} Staged to .animoria/trash: {} ({})",
                                success("✔"),
                                success(&asset.relative_path),
                                format_bytes(asset.size_bytes)
                            );
                        }
                        trashed.push((item, asset.size_bytes));
                    }
                    Err(e) => {
                        failure = Some(e);
                        break 'groups;
                    }
                }
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

    // Recorded even after a failure, so whatever was already moved can still be restored.
    let session_id = if should_apply && !trashed.is_empty() {
        Some(record_trash_session(&canonical, &trashed).map_err(|e| {
            anyhow::anyhow!(
                "moved {} file(s) into .animoria/trash but could not save the undo journal ({e}); \
                 restore them by hand from: {}",
                trashed.len(),
                trashed
                    .iter()
                    .map(|(item, _)| item.trashed_path.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        })?)
    } else {
        None
    };

    if let Some(e) = failure {
        return Err(e.context(match &session_id {
            Some(id) => format!(
                "stopped after staging {} file(s); undo with `animoria restore --session {id}`",
                trashed.len()
            ),
            None => "stopped before staging any file".to_string(),
        }));
    }

    if !quiet {
        for path in &skipped_referenced {
            println!(
                "  {} Kept {path}: source code still references this duplicate.",
                warning("▲")
            );
        }
    }

    if quiet {
        let mode = if should_apply { "applied" } else { "dry-run" };
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

    let mode = if should_apply { "" } else { "[Dry Run] " };
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
    } else if !should_apply {
        println!(
            "  {}\n",
            warning("This was a preview. Re-run with --apply to actually move these files.")
        );
    }

    Ok(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn workspace_with_duplicates() -> tempfile::TempDir {
        let ws = tempdir().unwrap();
        let png = include_bytes!("../../../tests/fixtures/dup.png").as_slice();
        fs::create_dir_all(ws.path().join("src")).unwrap();
        fs::write(ws.path().join("a.png"), png).unwrap();
        fs::write(ws.path().join("b.png"), png).unwrap();
        ws
    }

    #[test]
    fn clean_apply_keeps_duplicates_that_code_still_references() {
        let ws = workspace_with_duplicates();
        fs::write(
            ws.path().join("src/app.ts"),
            "import a from '../a.png';\nimport b from '../b.png';\n",
        )
        .unwrap();

        execute_clean(ws.path(), true, false, false, false).unwrap();

        assert!(ws.path().join("a.png").exists() && ws.path().join("b.png").exists());
    }

    #[test]
    fn clean_apply_trashes_unreferenced_duplicate_and_can_restore() {
        let ws = workspace_with_duplicates();
        execute_clean(ws.path(), true, false, false, false).unwrap();
        assert!(ws.path().join("a.png").exists() != ws.path().join("b.png").exists());

        let sessions = crate::daemon::cleanup::read_sessions(ws.path());
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].items.len(), 1);
        assert!(Path::new(&sessions[0].items[0].trash_path).is_file());

        crate::daemon::cleanup::restore_session(ws.path(), &sessions[0].id).unwrap();
        assert!(ws.path().join("a.png").exists() && ws.path().join("b.png").exists());
        assert!(crate::daemon::cleanup::read_sessions(ws.path()).is_empty());
    }

    #[test]
    fn clean_dry_run_changes_nothing() {
        let ws = workspace_with_duplicates();
        execute_clean(ws.path(), false, false, false, false).unwrap();
        assert!(ws.path().join("a.png").exists() && ws.path().join("b.png").exists());
        assert!(crate::daemon::cleanup::read_sessions(ws.path()).is_empty());
    }

    #[test]
    fn interrupted_restore_can_be_retried() {
        let ws = workspace_with_duplicates();
        execute_clean(ws.path(), true, false, false, false).unwrap();
        let session = crate::daemon::cleanup::read_sessions(ws.path()).remove(0);
        // Simulate a first restore that moved the file back but died before updating the journal.
        let session_item = &session.items[0];
        fs::rename(&session_item.trash_path, &session_item.original_path).unwrap();

        let restored = crate::daemon::cleanup::restore_session(ws.path(), &session.id).unwrap();
        assert!(
            restored.is_empty(),
            "nothing was restored by the retry itself"
        );
        assert!(crate::daemon::cleanup::read_sessions(ws.path()).is_empty());
    }

    #[test]
    fn clean_cache_and_empty_trash_flags_work() {
        let ws = tempdir().unwrap();
        let thumb_dir = ws.path().join(".animoria/thumbnails");
        fs::create_dir_all(&thumb_dir).unwrap();
        fs::write(thumb_dir.join("test-123.svg"), b"<svg></svg>").unwrap();

        let trash_dir = ws.path().join(".animoria/trash/session_1");
        fs::create_dir_all(&trash_dir).unwrap();
        fs::write(trash_dir.join("trash.png"), b"content").unwrap();

        assert!(thumb_dir.exists());
        assert!(trash_dir.exists());

        // Dry run: does not delete
        execute_clean(ws.path(), false, true, true, false).unwrap();
        assert!(thumb_dir.exists());
        assert!(trash_dir.exists());

        // Apply: deletes cache and empties trash, removing .animoria/ when empty
        execute_clean(ws.path(), true, true, true, false).unwrap();
        assert!(!ws.path().join(".animoria").exists());
    }
}
