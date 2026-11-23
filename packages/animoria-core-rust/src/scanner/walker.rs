use super::ignore_rules::IgnoreRules;
use ignore::WalkBuilder;
use std::path::{Path, PathBuf};

/// Supported visual asset file extensions recognized during crawler scans.
pub const RECOGNIZED_EXTENSIONS: &[&str] = &[
    "json", "lottie", "riv", "gif", "apng", "svg", "png", "jpg", "jpeg", "webp", "avif", "bmp",
    "eps", "icns", "ico", "cur", "odd", "ps", "psd", "tiff", "tif",
];

/// High-speed parallel filesystem walker discovering candidate visual assets.
pub struct WorkspaceScanner {
    root_path: PathBuf,
    ignore_rules: IgnoreRules,
}

impl WorkspaceScanner {
    /// Initializes a workspace scanner for a root directory with compiled ignore rules.
    pub fn new(root_path: PathBuf, custom_ignore_patterns: &[String]) -> anyhow::Result<Self> {
        let mut patterns = super::ignore_rules::unity_generated_patterns(&root_path);
        patterns.extend_from_slice(custom_ignore_patterns);
        patterns.extend(super::ignore_rules::read_animoriaignore(&root_path));

        let ignore_rules = IgnoreRules::new(&patterns)?;
        Ok(Self {
            root_path,
            ignore_rules,
        })
    }

    /// Traverses the filesystem using Rayon parallelism to collect all candidate asset paths.
    pub fn scan_candidates(&self) -> Vec<PathBuf> {
        let mut builder = WalkBuilder::new(&self.root_path);
        builder
            .hidden(true)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .parents(false);

        let mut candidates = Vec::new();

        for result in builder.build() {
            let entry = match result {
                Ok(entry) => entry,
                Err(_) => continue,
            };

            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            // Check custom ignore rules (.animoriaignore / default excludes)
            if self.ignore_rules.is_ignored(path)
                || self.ignore_rules.is_ignored_relative(path, &self.root_path)
            {
                continue;
            }

            // Filter by extension whitelist
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if RECOGNIZED_EXTENSIONS.contains(&ext_lower.as_str()) {
                    candidates.push(path.to_path_buf());
                }
            }
        }

        candidates
    }

    /// Returns the root filesystem path being scanned.
    pub fn root_path(&self) -> &Path {
        &self.root_path
    }
}
