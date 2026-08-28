use globset::{Glob, GlobSet, GlobSetBuilder};
use std::path::Path;

pub const DEFAULT_EXCLUDE_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    "build",
    ".turbo",
    ".gradle",
    "target",
    "coverage",
    ".vscode",
    ".idea",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".animoria",
];

#[derive(Debug, Clone)]
pub struct IgnoreRules {
    glob_set: GlobSet,
}

impl IgnoreRules {
    pub fn new(custom_patterns: &[String]) -> anyhow::Result<Self> {
        let mut builder = GlobSetBuilder::new();

        // Add default exclude directory globs
        for dir in DEFAULT_EXCLUDE_DIRS {
            builder.add(Glob::new(&format!("**/{dir}/**"))?);
            builder.add(Glob::new(&format!("**/{dir}"))?);
            builder.add(Glob::new(dir)?);
        }

        // Add custom patterns from .animoriaignore or config
        for pattern in custom_patterns {
            let trimmed = pattern.trim();
            if !trimmed.is_empty() && !trimmed.starts_with('#') {
                builder.add(Glob::new(trimmed)?);
                if !trimmed.contains('/') {
                    builder.add(Glob::new(&format!("**/{trimmed}"))?);
                    builder.add(Glob::new(&format!("**/{trimmed}/**"))?);
                }
            }
        }

        let glob_set = builder.build()?;
        Ok(Self { glob_set })
    }

    pub fn is_ignored(&self, path: &Path) -> bool {
        self.glob_set.is_match(path)
    }
}

impl Default for IgnoreRules {
    fn default() -> Self {
        Self::new(&[]).expect("Default ignore rules should always build")
    }
}
