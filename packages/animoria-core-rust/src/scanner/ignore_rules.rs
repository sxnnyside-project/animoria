use globset::{Glob, GlobMatcher};
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

struct Rule {
    matcher: GlobMatcher,
    negate: bool,
}

/// Ignore rules evaluated in gitignore order: rules are checked front-to-back
/// and the *last* matching rule wins, so a `!pattern` appearing after a
/// broader exclude re-includes whatever that exclude covered. Default
/// excluded directories are seeded first as ordinary (non-negatable) rules,
/// so a later custom `!node_modules/keep-me.json` can still override them.
#[derive(Clone)]
pub struct IgnoreRules {
    rules: std::sync::Arc<Vec<Rule>>,
}

impl std::fmt::Debug for IgnoreRules {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("IgnoreRules")
            .field("rule_count", &self.rules.len())
            .finish()
    }
}

fn push_rule(rules: &mut Vec<Rule>, pattern: &str, negate: bool) -> anyhow::Result<()> {
    rules.push(Rule {
        matcher: Glob::new(pattern)?.compile_matcher(),
        negate,
    });
    Ok(())
}

impl IgnoreRules {
    pub fn new(custom_patterns: &[String]) -> anyhow::Result<Self> {
        let mut rules = Vec::new();

        for dir in DEFAULT_EXCLUDE_DIRS {
            push_rule(&mut rules, &format!("**/{dir}/**"), false)?;
            push_rule(&mut rules, &format!("**/{dir}"), false)?;
            push_rule(&mut rules, dir, false)?;
        }

        for raw in custom_patterns {
            let trimmed = raw.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            let (negate, pattern) = match trimmed.strip_prefix('!') {
                Some(rest) => (true, rest),
                None => (false, trimmed),
            };
            if pattern.is_empty() {
                continue;
            }

            push_rule(&mut rules, pattern, negate)?;
            if !pattern.contains('/') {
                push_rule(&mut rules, &format!("**/{pattern}"), negate)?;
                push_rule(&mut rules, &format!("**/{pattern}/**"), negate)?;
            }
        }

        Ok(Self {
            rules: std::sync::Arc::new(rules),
        })
    }

    pub fn is_ignored(&self, path: &Path) -> bool {
        let mut ignored = false;
        for rule in self.rules.iter() {
            if rule.matcher.is_match(path) {
                ignored = !rule.negate;
            }
        }
        ignored
    }
}

impl Default for IgnoreRules {
    fn default() -> Self {
        Self::new(&[]).expect("Default ignore rules should always build")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn default_dirs_are_ignored_with_no_custom_patterns() {
        let rules = IgnoreRules::default();
        assert!(rules.is_ignored(&PathBuf::from("node_modules/lottie-web/anim.json")));
        assert!(!rules.is_ignored(&PathBuf::from("src/assets/anim.json")));
    }

    #[test]
    fn negation_reincludes_a_path_excluded_by_an_earlier_pattern() {
        let rules = IgnoreRules::new(&[
            "assets/vendor/**".to_string(),
            "!assets/vendor/keep-me.json".to_string(),
        ])
        .unwrap();

        assert!(rules.is_ignored(&PathBuf::from("assets/vendor/other.json")));
        assert!(!rules.is_ignored(&PathBuf::from("assets/vendor/keep-me.json")));
    }

    #[test]
    fn a_later_broad_exclude_overrides_an_earlier_negation() {
        let rules = IgnoreRules::new(&[
            "!assets/vendor/keep-me.json".to_string(),
            "assets/vendor/**".to_string(),
        ])
        .unwrap();

        assert!(rules.is_ignored(&PathBuf::from("assets/vendor/keep-me.json")));
    }

    #[test]
    fn negation_can_override_a_default_excluded_directory() {
        let rules = IgnoreRules::new(&["!node_modules/keep-me.json".to_string()]).unwrap();

        assert!(!rules.is_ignored(&PathBuf::from("node_modules/keep-me.json")));
        assert!(rules.is_ignored(&PathBuf::from("node_modules/other.json")));
    }
}
