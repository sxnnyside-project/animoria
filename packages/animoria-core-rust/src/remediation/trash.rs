use crate::contracts::remediation::TrashItem;
use anyhow::{bail, Context};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Files engines keep next to an asset: Unity's `.meta` (its GUID) and Godot's `.import` (its uid).
/// They travel with the asset, or restoring it would give it a new identity.
const SIDECAR_SUFFIXES: &[&str] = &[".meta", ".import"];

fn sidecar(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

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
        for suffix in SIDECAR_SUFFIXES {
            let side = sidecar(&file_path, suffix);
            if side.is_file() {
                if let Err(e) = move_file_safe(&side, &sidecar(&dest_path, suffix)) {
                    eprintln!("[Trash] Could not move '{}': {e}", side.display());
                }
            }
        }

        Ok(TrashItem {
            asset_id: asset_id.to_string(),
            original_path: file_path.to_string_lossy().to_string(),
            trashed_path: dest_path.to_string_lossy().to_string(),
            trashed_at_ms: now_ms,
        })
    }

    pub fn restore_from_trash(&self, item: &TrashItem) -> anyhow::Result<()> {
        let canonical_root =
            fs::canonicalize(&self.workspace_root).unwrap_or_else(|_| self.workspace_root.clone());
        // `TrashItem` is caller-supplied data, so both ends are validated before anything
        // touches the disk: the source must be in this workspace's own trash, and the
        // destination must land back inside the workspace without clobbering a file.
        let trashed = self.require_within_workspace(Path::new(&item.trashed_path))?;
        if !trashed.starts_with(canonical_root.join(".animoria/trash")) {
            bail!(
                "refusing to restore '{}': it is not inside the workspace trash",
                trashed.display()
            );
        }

        let original = Path::new(&item.original_path);
        if original
            .components()
            .any(|c| matches!(c, std::path::Component::ParentDir))
        {
            bail!(
                "refusing to restore to '{}': path contains '..'",
                original.display()
            );
        }
        let existing_ancestor = original
            .ancestors()
            .skip(1)
            .find(|a| a.exists())
            .with_context(|| {
                format!(
                    "cannot resolve restore destination '{}'",
                    original.display()
                )
            })?;
        let canonical_ancestor = fs::canonicalize(existing_ancestor)?;
        if !canonical_ancestor.starts_with(&canonical_root) {
            bail!(
                "refusing to restore to '{}': it is outside the workspace root '{}'",
                original.display(),
                canonical_root.display()
            );
        }
        if original.exists() {
            bail!(
                "refusing to restore '{}': a file already exists there",
                original.display()
            );
        }

        if let Some(parent) = original.parent() {
            fs::create_dir_all(parent)?;
        }
        move_file_safe(&trashed, original)?;
        for suffix in SIDECAR_SUFFIXES {
            let (from, to) = (sidecar(&trashed, suffix), sidecar(original, suffix));
            if from.is_file() && !to.exists() {
                if let Err(e) = move_file_safe(&from, &to) {
                    eprintln!("[Trash] Could not restore '{}': {e}", to.display());
                }
            }
        }
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
    fn unity_meta_and_godot_import_travel_with_the_asset() {
        let ws = tempdir().unwrap();
        let png = ws.path().join("hero.png");
        for (name, body) in [
            ("hero.png", "png"),
            ("hero.png.meta", "guid: a"),
            ("hero.png.import", "uid"),
        ] {
            fs::write(ws.path().join(name), body).unwrap();
        }
        let manager = TrashManager::new(ws.path());

        let item = manager.stage_to_trash("a", &png).unwrap();
        assert!(!ws.path().join("hero.png.meta").exists());
        assert!(!ws.path().join("hero.png.import").exists());
        assert!(Path::new(&format!("{}.meta", item.trashed_path)).is_file());

        manager.restore_from_trash(&item).unwrap();
        assert_eq!(
            fs::read_to_string(ws.path().join("hero.png.meta")).unwrap(),
            "guid: a"
        );
        assert_eq!(
            fs::read_to_string(ws.path().join("hero.png.import")).unwrap(),
            "uid"
        );
    }

    #[test]
    fn restore_refuses_to_overwrite_and_does_not_create_outside_dirs() {
        let ws = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let file = ws.path().join("logo.png");
        fs::write(&file, b"old").unwrap();
        let manager = TrashManager::new(ws.path());
        let item = manager.stage_to_trash("a", &file).unwrap();

        fs::write(&file, b"new").unwrap();
        assert!(manager.restore_from_trash(&item).is_err());
        assert_eq!(fs::read(&file).unwrap(), b"new");

        let mut escaping = item.clone();
        escaping.original_path = outside
            .path()
            .join("x/y/a.png")
            .to_string_lossy()
            .to_string();
        assert!(manager.restore_from_trash(&escaping).is_err());
        assert!(!outside.path().join("x").exists());

        let mut not_trash = item;
        not_trash.trashed_path = file.to_string_lossy().to_string();
        assert!(manager.restore_from_trash(&not_trash).is_err());
    }

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
