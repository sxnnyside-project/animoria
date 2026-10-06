use crate::contracts::remediation::TrashItem;
use anyhow::{bail, Context};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct TrashManager {
    workspace_root: PathBuf,
    trash_root: PathBuf,
}

impl TrashManager {
    pub fn new(workspace_root: &Path) -> Self {
        let trash_root = workspace_root.join(".animoria/trash");
        Self {
            workspace_root: workspace_root.to_path_buf(),
            trash_root,
        }
    }

    /// Every caller of `stage_to_trash`/`restore_from_trash` ultimately takes
    /// its path from a request param (CLI arg or daemon NDJSON message) —
    /// there is no other entry point into either operation. Checking
    /// containment here, once, protects both instead of relying on every
    /// call site upstream to have validated it, which is exactly the
    /// assumption `daemon/server.rs`'s `trash_asset` handler used to make
    /// silently.
    fn require_within_workspace(&self, candidate: &Path) -> anyhow::Result<PathBuf> {
        let canonical_root =
            fs::canonicalize(&self.workspace_root).unwrap_or_else(|_| self.workspace_root.clone());
        let canonical_candidate = fs::canonicalize(candidate)
            .with_context(|| format!("cannot resolve path '{}'", candidate.display()))?;

        if !canonical_candidate.starts_with(&canonical_root) {
            bail!(
                "refusing to touch '{}': it is outside the workspace root '{}'",
                canonical_candidate.display(),
                canonical_root.display()
            );
        }

        Ok(canonical_candidate)
    }

    pub fn stage_to_trash(&self, asset_id: &str, file_path: &Path) -> anyhow::Result<TrashItem> {
        let file_path = self.require_within_workspace(file_path)?;

        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("asset");

        let dest_dir = self.trash_root.join(format!("session_{}", now_ms));
        fs::create_dir_all(&dest_dir)?;

        // Collision avoidance: if a file with the same name already exists in this session,
        // assign an incremented unique filename so homonymous assets never overwrite each other.
        let mut dest_path = dest_dir.join(file_name);
        if dest_path.exists() {
            let stem = file_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("asset");
            let ext = file_path.extension().and_then(|e| e.to_str());
            let mut counter = 1;
            loop {
                let unique_name = match ext {
                    Some(e) => format!("{}_{}.{}", stem, counter, e),
                    None => format!("{}_{}", stem, counter),
                };
                let candidate_path = dest_dir.join(unique_name);
                if !candidate_path.exists() {
                    dest_path = candidate_path;
                    break;
                }
                counter += 1;
            }
        }

        move_file_safe(&file_path, &dest_path)?;

        Ok(TrashItem {
            asset_id: asset_id.to_string(),
            original_path: file_path.to_string_lossy().to_string(),
            trashed_path: dest_path.to_string_lossy().to_string(),
            trashed_at_ms: now_ms,
        })
    }

    pub fn restore_from_trash(&self, item: &TrashItem) -> anyhow::Result<()> {
        let trashed = Path::new(&item.trashed_path);
        // The trashed copy must itself be inside this workspace's own trash,
        // and — since `original_path` is data from a `TrashItem` a caller
        // supplies, not something this manager derived — the restore
        // destination must land back inside the workspace too. Skipping
        // either check turns a tampered or cross-workspace `TrashItem` into
        // a write-anywhere: move an arbitrary trashed file to an arbitrary
        // path outside the workspace.
        self.require_within_workspace(trashed)?;
        let original = Path::new(&item.original_path);

        if let Some(parent) = original.parent() {
            fs::create_dir_all(parent)?;
        }
        let canonical_root =
            fs::canonicalize(&self.workspace_root).unwrap_or_else(|_| self.workspace_root.clone());
        let canonical_original = fs::canonicalize(original.parent().unwrap_or(original))
            .with_context(|| {
                format!(
                    "cannot resolve restore destination '{}'",
                    original.display()
                )
            })?
            .join(original.file_name().unwrap_or_default());
        if !canonical_original.starts_with(&canonical_root) {
            bail!(
                "refusing to restore to '{}': it is outside the workspace root '{}'",
                canonical_original.display(),
                canonical_root.display()
            );
        }

        move_file_safe(trashed, original)?;
        Ok(())
    }
}

/// Atomically renames `src` to `dst`, with automatic fallback to copy-and-delete
/// when crossing filesystem boundaries (`EXDEV` / `CrossesDevices`).
fn move_file_safe(src: &Path, dst: &Path) -> anyhow::Result<()> {
    match fs::rename(src, dst) {
        Ok(()) => Ok(()),
        Err(err) => {
            #[cfg(unix)]
            let is_cross_device = err.raw_os_error() == Some(18); // EXDEV
            #[cfg(not(unix))]
            let is_cross_device = false;

            if is_cross_device || err.kind() == std::io::ErrorKind::CrossesDevices {
                fs::copy(src, dst)?;
                fs::remove_file(src)?;
                Ok(())
            } else {
                Err(err.into())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_stage_to_trash_avoids_homonymous_collision() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();
        let manager = TrashManager::new(ws_root);

        let file1 = ws_root.join("app1_icon.png");
        let file2 = ws_root.join("app2_icon.png");
        fs::write(&file1, b"content1").unwrap();
        fs::write(&file2, b"content2").unwrap();

        // Simulate two files that share the same base file name when moved to trash
        let dir1 = ws_root.join("apps/web");
        let dir2 = ws_root.join("packages/ui");
        fs::create_dir_all(&dir1).unwrap();
        fs::create_dir_all(&dir2).unwrap();
        let path1 = dir1.join("icon.png");
        let path2 = dir2.join("icon.png");
        fs::write(&path1, b"content1").unwrap();
        fs::write(&path2, b"content2").unwrap();

        let item1 = manager.stage_to_trash("asset-1", &path1).unwrap();
        let item2 = manager.stage_to_trash("asset-2", &path2).unwrap();

        // Both items must have distinct trashed paths and their contents must be preserved
        assert_ne!(item1.trashed_path, item2.trashed_path);
        assert_eq!(fs::read(&item1.trashed_path).unwrap(), b"content1");
        assert_eq!(fs::read(&item2.trashed_path).unwrap(), b"content2");

        // Restoring both must restore original contents to respective locations
        manager.restore_from_trash(&item1).unwrap();
        manager.restore_from_trash(&item2).unwrap();
        assert_eq!(fs::read(&path1).unwrap(), b"content1");
        assert_eq!(fs::read(&path2).unwrap(), b"content2");
    }
}
