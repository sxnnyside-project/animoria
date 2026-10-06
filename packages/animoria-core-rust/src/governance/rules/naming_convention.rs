use crate::contracts::analysis::RuleDiagnostic;
use crate::governance::asset_matcher::is_app_icon;
use crate::governance::context::AnalysisContext;
use crate::governance::policy::NamingCase;
use crate::governance::rule::Rule;
use regex::Regex;

pub struct NamingConventionRule;

impl Rule for NamingConventionRule {
    fn id(&self) -> &str {
        "naming-convention"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            let policy = ctx.policy_for(&asset.relative_path);
            let case = match policy.naming_convention {
                Some(c) => c,
                None => continue,
            };

            // Skip application icons if configured
            if (policy.no_unreferenced_ignore_app_icons || policy.no_duplicate_ignore_app_icons)
                && is_app_icon(&asset.relative_path, &asset.name)
            {
                continue;
            }

            let stem = strip_density_suffix(&asset.stem);

            // Optional regex pattern check
            if let Some(ref pattern) = policy.naming_convention_pattern {
                if let Ok(re) = Regex::new(pattern) {
                    if !re.is_match(stem) {
                        diagnostics.push(RuleDiagnostic {
                            rule_id: self.id().to_string(),
                            severity: policy.naming_convention_severity,
                            message: format!(
                                "Asset stem '{}' does not match configured pattern '{}'.",
                                asset.stem, pattern
                            ),
                            target_asset_id: Some(asset.id.clone()),
                            target_asset_path: asset.path.clone(),
                            evidence_file: None,
                            evidence_line: None,
                            evidence_excerpt: None,
                        });
                        continue;
                    }
                }
            }

            if !matches_case(stem, case) {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: policy.naming_convention_severity,
                    message: format!(
                        "Asset stem '{}' does not conform to '{}' naming convention.",
                        asset.stem,
                        case.as_str()
                    ),
                    target_asset_id: Some(asset.id.clone()),
                    target_asset_path: asset.path.clone(),
                    evidence_file: None,
                    evidence_line: None,
                    evidence_excerpt: None,
                });
            }
        }

        diagnostics
    }
}

pub fn strip_density_suffix(stem: &str) -> &str {
    if let Some(idx) = stem.rfind('@') {
        let suffix = &stem[idx + 1..];
        if suffix.ends_with('x')
            && !suffix[..suffix.len() - 1].is_empty()
            && suffix[..suffix.len() - 1]
                .chars()
                .all(|c| c.is_ascii_digit() || c == '.')
        {
            return &stem[..idx];
        }
    }
    stem
}

pub fn matches_case(stem: &str, case: NamingCase) -> bool {
    if stem.is_empty() {
        return false;
    }

    match case {
        NamingCase::KebabCase => {
            !stem.starts_with('-')
                && !stem.ends_with('-')
                && !stem.contains("--")
                && stem
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        }
        NamingCase::SnakeCase => {
            !stem.starts_with('_')
                && !stem.ends_with('_')
                && !stem.contains("__")
                && stem
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
        }
        NamingCase::CamelCase => {
            stem.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                && stem.chars().all(|c| c.is_ascii_alphanumeric())
        }
        NamingCase::PascalCase => {
            stem.chars().next().is_some_and(|c| c.is_ascii_uppercase())
                && stem.chars().all(|c| c.is_ascii_alphanumeric())
        }
        NamingCase::Lowercase => stem
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_'),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_case_matching_rules() {
        assert!(matches_case("hero-banner", NamingCase::KebabCase));
        assert!(matches_case("icon-123", NamingCase::KebabCase));
        assert!(!matches_case("hero_banner", NamingCase::KebabCase));
        assert!(!matches_case("HeroBanner", NamingCase::KebabCase));
        assert!(!matches_case("-hero", NamingCase::KebabCase));
        assert!(!matches_case("hero--banner", NamingCase::KebabCase));

        assert!(matches_case("hero_banner", NamingCase::SnakeCase));
        assert!(!matches_case("hero-banner", NamingCase::SnakeCase));

        assert!(matches_case("heroBanner", NamingCase::CamelCase));
        assert!(!matches_case("HeroBanner", NamingCase::CamelCase));

        assert!(matches_case("HeroBanner", NamingCase::PascalCase));
        assert!(!matches_case("heroBanner", NamingCase::PascalCase));

        assert_eq!(strip_density_suffix("avatar@2x"), "avatar");
        assert_eq!(strip_density_suffix("avatar@3x"), "avatar");
        assert_eq!(strip_density_suffix("avatar@1.5x"), "avatar");
        assert_eq!(strip_density_suffix("avatar"), "avatar");
    }
}
