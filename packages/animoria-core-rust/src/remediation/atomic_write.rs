use std::fs;
use std::io;
use std::path::Path;

/// Replaces `path` with `bytes` without ever leaving it empty or half-written: the data goes
/// to a sibling temp file first and is renamed over the target, keeping the target's permissions.
/// Callers that may be handed a symlink must pass the resolved path, or the link is replaced.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("file");
    let tmp = path.with_file_name(format!(".{name}.animoria-tmp"));
    fs::write(&tmp, bytes)?;
    if let Ok(meta) = fs::metadata(path) {
        let _ = fs::set_permissions(&tmp, meta.permissions());
    }
    fs::rename(&tmp, path).inspect_err(|_| {
        let _ = fs::remove_file(&tmp);
    })
}

/// Like [`write_atomic`], but stages the temp file in `staging_dir` (the workspace's git-ignored
/// `.animoria/tmp`) so a crash never leaves a stray file next to the user's source. Falls back to
/// a sibling temp file when `staging_dir` is on another filesystem and the rename cannot cross.
pub fn write_atomic_staged(path: &Path, bytes: &[u8], staging_dir: &Path) -> io::Result<()> {
    let staged = fs::create_dir_all(staging_dir).and_then(|()| {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |d| d.as_nanos());
        let tmp = staging_dir.join(format!("{}-{stamp}.tmp", std::process::id()));
        fs::write(&tmp, bytes)?;
        if let Ok(meta) = fs::metadata(path) {
            let _ = fs::set_permissions(&tmp, meta.permissions());
        }
        fs::rename(&tmp, path).inspect_err(|_| {
            let _ = fs::remove_file(&tmp);
        })
    });
    staged.or_else(|_| write_atomic(path, bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_content_keeps_permissions_and_leaves_no_temp_file() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.txt");
        fs::write(&file, "old").unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&file, fs::Permissions::from_mode(0o640)).unwrap();
        }

        write_atomic(&file, b"new").unwrap();

        assert_eq!(fs::read_to_string(&file).unwrap(), "new");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(&file).unwrap().permissions().mode() & 0o777,
                0o640
            );
        }
    }

    #[test]
    fn staged_write_leaves_nothing_next_to_the_target() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("App.tsx");
        fs::write(&file, "old").unwrap();
        let staging = dir.path().join(".animoria/tmp");

        write_atomic_staged(&file, b"new", &staging).unwrap();

        assert_eq!(fs::read_to_string(&file).unwrap(), "new");
        let mut siblings: Vec<_> = fs::read_dir(dir.path())
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        siblings.sort();
        assert_eq!(siblings, [".animoria", "App.tsx"]);
        assert_eq!(fs::read_dir(&staging).unwrap().count(), 0);
    }

    #[test]
    fn failure_cleans_up_and_keeps_the_original() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("dir");
        fs::create_dir(&target).unwrap();
        // Renaming a file over a directory fails.
        assert!(write_atomic(&target, b"x").is_err());
        assert!(target.is_dir());
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
}
