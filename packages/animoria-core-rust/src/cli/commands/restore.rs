use crate::cli::ui::{self, brand, dim, error, success, title, warning};
use crate::cli::workspace::resolve_workspace_path;
use crate::daemon::cleanup::{read_sessions, restore_session};
use std::path::Path;

/// Lists or restores trash sessions `clean --apply` recorded.
///
/// The only way to undo a `clean --apply` used to be replaying the daemon's
/// NDJSON protocol by hand — the session journal
/// (`.animoria/trash/sessions.json`) and `restore_session` already existed
/// for the IDE hosts, but the CLI never exposed either.
pub fn execute_restore(
    target_path: &Path,
    list: bool,
    session: Option<&str>,
    all: bool,
) -> anyhow::Result<i32> {
    let (bold, reset) = (ui::bold_start(), ui::reset());
    let quiet = ui::is_quiet();
    let canonical = resolve_workspace_path(target_path)?;

    if !quiet {
        println!(
            "\n{} {}\n",
            brand("animoria"),
            title("Trash Session Restore")
        );
    }

    let sessions = read_sessions(&canonical);

    if list || (session.is_none() && !all) {
        if sessions.is_empty() {
            println!("  {} No trash sessions recorded.\n", dim("·"));
            return Ok(0);
        }
        for s in &sessions {
            println!(
                "  {bold}{}{reset}  {}",
                s.id,
                dim(&format!("{} item(s)", s.items.len()))
            );
        }
        println!(
            "\n  {}\n",
            dim("Run with --session <id> to restore one, or --all to restore every session.")
        );
        return Ok(0);
    }

    let ids: Vec<String> = if all {
        sessions.iter().map(|s| s.id.clone()).collect()
    } else {
        vec![session.unwrap().to_string()]
    };

    if ids.is_empty() {
        println!("  {} No trash sessions to restore.\n", dim("·"));
        return Ok(0);
    }

    let mut had_error = false;
    for id in &ids {
        match restore_session(&canonical, id) {
            Ok(restored) => {
                println!(
                    "  {} Restored session {bold}{}{reset} ({} file(s)):",
                    success("✔"),
                    id,
                    restored.len()
                );
                for path in &restored {
                    println!("    • {}", path);
                }
            }
            Err(e) => {
                println!("  {} {}: {}", error("✖"), warning(id), e);
                had_error = true;
            }
        }
    }
    println!();

    Ok(if had_error { 1 } else { 0 })
}
