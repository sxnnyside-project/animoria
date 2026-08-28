use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::contracts::remediation::TrashItem;

pub struct TrashManager {
    trash_root: PathBuf,
}

impl TrashManager {
    pub fn new(workspace_root: &Path) -> Self {
        let trash_root = workspace_root.join(".animoria").join("trash");
        Self { trash_root }
    }

    pub fn stage_to_trash(&self, asset_id: &str, file_path: &Path) -> anyhow::Result<TrashItem> {
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
        fs::rename(file_path, &dest_path)?;

        Ok(TrashItem {
            asset_id: asset_id.to_string(),
            original_path: file_path.to_string_lossy().to_string(),
            trashed_path: dest_path.to_string_lossy().to_string(),
            trashed_at_ms: now_ms,
        })
    }

    pub fn restore_from_trash(&self, item: &TrashItem) -> anyhow::Result<()> {
        let trashed = Path::new(&item.trashed_path);
        let original = Path::new(&item.original_path);

        if let Some(parent) = original.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::rename(trashed, original)?;
        Ok(())
    }
}
