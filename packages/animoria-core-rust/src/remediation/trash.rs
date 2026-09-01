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
        let trash_root = workspace_root.join(".animoria").join("trash");
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

        let dest_path = dest_dir.join(file_name);
        fs::rename(&file_path, &dest_path)?;

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

        fs::rename(trashed, original)?;
        Ok(())
    }
}
