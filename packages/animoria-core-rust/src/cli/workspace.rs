//! Resolves the `path` argument every scanning subcommand takes.
//!
//! Every one of `scan`/`check`/`report`/`clean` used to canonicalize with
//! `.unwrap_or_else(|_| target_path.to_path_buf())` — a fallback meant for an
//! already-valid relative path, but silently swallowing the actual failure
//! mode: a typo'd or missing directory. The walker then scans nothing and
//! every command reports "0 assets" / "All checks passed" with exit 0, which
//! reads as a clean workspace rather than the wrong path it actually is.

use anyhow::{bail, Context};
use std::fs;
use std::path::{Path, PathBuf};

/// Canonicalizes `target_path`, failing loudly if it does not exist or is not
/// a directory, instead of silently scanning nothing.
pub fn resolve_workspace_path(target_path: &Path) -> anyhow::Result<PathBuf> {
    if !target_path.exists() {
        bail!("workspace path '{}' does not exist.", target_path.display());
    }

    let canonical = fs::canonicalize(target_path).with_context(|| {
        format!(
            "could not resolve workspace path '{}'",
            target_path.display()
        )
    })?;

    if !canonical.is_dir() {
        bail!(
            "workspace path '{}' is not a directory.",
            canonical.display()
        );
    }

    Ok(canonical)
}
