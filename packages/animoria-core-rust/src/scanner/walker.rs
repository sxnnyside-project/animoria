use ignore::WalkBuilder;
use std::path::{Path, PathBuf};
use super::ignore_rules::IgnoreRules;

pub const RECOGNIZED_EXTENSIONS: &[&str] = &[
    "json",
    "lottie",
    "riv",
    "gif",
    "apng",
    "svg",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "avif",
];

pub struct WorkspaceScanner {
    root_path: PathBuf,
    ignore_rules: IgnoreRules,
}

impl WorkspaceScanner {
    pub fn new(root_path: PathBuf, custom_ignore_patterns: &[String]) -> anyhow::Result<Self> {
        // Look for .animoriaignore in root
        let mut patterns = custom_ignore_patterns.to_vec();
        let animoria_ignore_path = root_path.join(".animoriaignore");
        if animoria_ignore_path.is_file() {
            if let Ok(content) = std::fs::read_to_string(&animoria_ignore_path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() && !trimmed.starts_with('#') {
                        patterns.push(trimmed.to_string());
                    }
                }
            }
        }

        let ignore_rules = IgnoreRules::new(&patterns)?;
        Ok(Self {
            root_path,
            ignore_rules,
        })
    }

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
            if self.ignore_rules.is_ignored(path) {
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

    pub fn root_path(&self) -> &Path {
        &self.root_path
    }
}
