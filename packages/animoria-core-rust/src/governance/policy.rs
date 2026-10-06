use crate::contracts::analysis::DiagnosticSeverity;
use crate::contracts::asset::AssetFormat;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NamingCase {
    KebabCase,
    SnakeCase,
    CamelCase,
    PascalCase,
    Lowercase,
}

impl NamingCase {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::KebabCase => "kebab-case",
            Self::SnakeCase => "snake_case",
            Self::CamelCase => "camelCase",
            Self::PascalCase => "PascalCase",
            Self::Lowercase => "lowercase",
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FilesConfig {
    #[serde(default)]
    pub ignore: Vec<String>,
    #[serde(default)]
    pub include: Option<Vec<String>>,
    #[serde(default, rename = "ignoreDocs")]
    pub ignore_docs: Option<bool>,
    #[serde(default, rename = "includeDocs")]
    pub include_docs: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TracingConfig {
    #[serde(default, rename = "ignoreSourceExtensions")]
    pub ignore_source_extensions: Vec<String>,
    #[serde(default, rename = "includeSourceExtensions")]
    pub include_source_extensions: Vec<String>,
    #[serde(default, rename = "minStemLength")]
    pub min_stem_length: Option<usize>,
    #[serde(default, rename = "dynamicCollections")]
    pub dynamic_collections: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CiConfig {
    #[serde(default, rename = "minScore")]
    pub min_score: Option<u32>,
    #[serde(default, rename = "maxWarnings")]
    pub max_warnings: Option<usize>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GovernanceSection {
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub ci: Option<CiConfig>,
    #[serde(default)]
    pub rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RuleOverrideConfig {
    #[serde(default)]
    pub files: Vec<String>,
    #[serde(default)]
    pub rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RawAnimoriaConfig {
    #[serde(default)]
    pub extends: Option<serde_json::Value>,
    #[serde(default)]
    pub files: FilesConfig,
    #[serde(default)]
    pub tracing: TracingConfig,
    #[serde(default)]
    pub ci: Option<CiConfig>,
    #[serde(default)]
    pub governance: Option<GovernanceSection>,
    #[serde(default)]
    pub overrides: Vec<RuleOverrideConfig>,
    /// Backwards compatibility: root-level rules map
    #[serde(default)]
    pub rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyOverride {
    pub files: Vec<String>,
    pub policy: GovernancePolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernancePolicy {
    pub no_unreferenced_assets: bool,
    pub no_unreferenced_severity: DiagnosticSeverity,
    pub no_unreferenced_ignore_app_icons: bool,
    pub no_unreferenced_ignore: Vec<String>,

    pub no_duplicate_content: bool,
    pub no_duplicate_severity: DiagnosticSeverity,
    pub no_duplicate_ignore_app_icons: bool,
    pub no_duplicate_ignore: Vec<String>,

    pub max_file_size_kb: Option<u64>,
    pub max_file_size_severity: DiagnosticSeverity,

    pub allowed_formats: Option<Vec<AssetFormat>>,
    pub allowed_formats_severity: DiagnosticSeverity,

    pub no_gif: bool,
    pub no_gif_severity: DiagnosticSeverity,

    pub max_dimensions_width: Option<u32>,
    pub max_dimensions_height: Option<u32>,
    pub max_dimensions_severity: DiagnosticSeverity,

    pub naming_convention: Option<NamingCase>,
    pub naming_convention_severity: DiagnosticSeverity,
    pub naming_convention_pattern: Option<String>,

    pub svg_sanitization: bool,
    pub svg_sanitization_severity: DiagnosticSeverity,

    pub ci_min_score: Option<u32>,
    pub ci_max_warnings: Option<usize>,

    pub files_ignore: Vec<String>,
    pub files_include: Option<Vec<String>>,
    pub files_ignore_docs: bool,

    pub tracing_ignore_source_extensions: Vec<String>,
    pub tracing_include_source_extensions: Vec<String>,
    pub tracing_min_stem_length: Option<usize>,
    pub tracing_dynamic_collections: Vec<String>,

    pub overrides: Vec<PolicyOverride>,
}

impl Default for GovernancePolicy {
    fn default() -> Self {
        Self {
            no_unreferenced_assets: true,
            no_unreferenced_severity: DiagnosticSeverity::Warning,
            no_unreferenced_ignore_app_icons: false,
            no_unreferenced_ignore: Vec::new(),

            no_duplicate_content: true,
            no_duplicate_severity: DiagnosticSeverity::Error,
            no_duplicate_ignore_app_icons: false,
            no_duplicate_ignore: Vec::new(),

            max_file_size_kb: Some(512),
            max_file_size_severity: DiagnosticSeverity::Warning,

            allowed_formats: None,
            allowed_formats_severity: DiagnosticSeverity::Error,

            no_gif: false,
            no_gif_severity: DiagnosticSeverity::Warning,

            max_dimensions_width: None,
            max_dimensions_height: None,
            max_dimensions_severity: DiagnosticSeverity::Warning,

            naming_convention: None,
            naming_convention_severity: DiagnosticSeverity::Warning,
            naming_convention_pattern: None,

            svg_sanitization: true,
            svg_sanitization_severity: DiagnosticSeverity::Error,

            ci_min_score: None,
            ci_max_warnings: None,

            files_ignore: Vec::new(),
            files_include: None,
            files_ignore_docs: true,

            tracing_ignore_source_extensions: Vec::new(),
            tracing_include_source_extensions: Vec::new(),
            tracing_min_stem_length: None,
            tracing_dynamic_collections: Vec::new(),

            overrides: Vec::new(),
        }
    }
}

impl GovernancePolicy {
    pub fn recommended() -> Self {
        Self {
            no_unreferenced_ignore_app_icons: true,
            no_duplicate_ignore_app_icons: true,
            no_gif: true,
            svg_sanitization: true,
            svg_sanitization_severity: DiagnosticSeverity::Error,
            ..Default::default()
        }
    }

    pub fn strict() -> Self {
        Self {
            no_unreferenced_severity: DiagnosticSeverity::Error,
            no_unreferenced_ignore_app_icons: false,
            no_duplicate_ignore_app_icons: false,
            max_file_size_kb: Some(256),
            max_file_size_severity: DiagnosticSeverity::Error,
            max_dimensions_width: Some(2560),
            max_dimensions_height: Some(1440),
            max_dimensions_severity: DiagnosticSeverity::Error,
            no_gif: true,
            no_gif_severity: DiagnosticSeverity::Error,
            naming_convention: Some(NamingCase::KebabCase),
            naming_convention_severity: DiagnosticSeverity::Error,
            svg_sanitization: true,
            svg_sanitization_severity: DiagnosticSeverity::Error,
            ci_min_score: Some(90),
            ci_max_warnings: Some(0),
            ..Default::default()
        }
    }

    pub fn relaxed() -> Self {
        Self {
            no_unreferenced_assets: false,
            no_duplicate_severity: DiagnosticSeverity::Warning,
            no_duplicate_ignore_app_icons: true,
            max_file_size_kb: Some(2048),
            max_file_size_severity: DiagnosticSeverity::Warning,
            no_gif: false,
            svg_sanitization: true,
            svg_sanitization_severity: DiagnosticSeverity::Warning,
            ..Default::default()
        }
    }

    pub fn policy_for_path<'a>(&'a self, relative_path: &str) -> &'a GovernancePolicy {
        for ovr in &self.overrides {
            if crate::governance::asset_matcher::matches_any_pattern(relative_path, &ovr.files) {
                return &ovr.policy;
            }
        }
        self
    }

    pub fn load_from_workspace(root: &Path) -> Self {
        let path = root.join(".animoriarc.json");
        let alt_path = root.join(".animoriarc");

        let target_file = if path.is_file() {
            Some(path)
        } else if alt_path.is_file() {
            Some(alt_path)
        } else {
            None
        };

        if let Some(cfg_path) = target_file {
            if let Ok(content) = fs::read_to_string(&cfg_path) {
                return Self::parse_config_str(&content);
            }
        }

        Self::default()
    }

    pub fn parse_config_str(content: &str) -> Self {
        if let Ok(raw) = serde_json::from_str::<RawAnimoriaConfig>(content) {
            let mut policy = if let Some(ref ext) = raw.extends {
                parse_preset(ext)
            } else {
                Self::default()
            };

            // 1. Files configuration
            policy.files_ignore = raw.files.ignore;
            policy.files_include = raw.files.include;
            if raw.files.ignore_docs == Some(false) || raw.files.include_docs == Some(true) {
                policy.files_ignore_docs = false;
            }

            // 2. Tracing configuration
            policy.tracing_ignore_source_extensions = raw.tracing.ignore_source_extensions;
            policy.tracing_include_source_extensions = raw.tracing.include_source_extensions;
            policy.tracing_min_stem_length = raw.tracing.min_stem_length;
            policy.tracing_dynamic_collections = raw.tracing.dynamic_collections;

            // 3. CI quality gates configuration
            if let Some(ref gov) = raw.governance {
                if let Some(ref ci) = gov.ci {
                    policy.ci_min_score = ci.min_score;
                    policy.ci_max_warnings = ci.max_warnings;
                }
            }
            if let Some(ref ci) = raw.ci {
                if policy.ci_min_score.is_none() {
                    policy.ci_min_score = ci.min_score;
                }
                if policy.ci_max_warnings.is_none() {
                    policy.ci_max_warnings = ci.max_warnings;
                }
            }

            // 4. Collect rules from either `governance.rules` or root `rules`
            let mut combined_rules = raw.rules;
            if let Some(gov) = raw.governance {
                if gov.enabled == Some(false) {
                    policy.no_unreferenced_assets = false;
                    policy.no_duplicate_content = false;
                    policy.max_file_size_kb = None;
                    policy.max_dimensions_width = None;
                    policy.max_dimensions_height = None;
                    policy.allowed_formats = None;
                    policy.no_gif = false;
                    policy.naming_convention = None;
                    policy.svg_sanitization = false;
                    return policy;
                }
                for (k, v) in gov.rules {
                    combined_rules.insert(k, v);
                }
            }

            if let Some(val) = combined_rules
                .get("scan-docs")
                .or_else(|| combined_rules.get("include-docs"))
            {
                if val.as_bool() == Some(true)
                    || val.as_str() == Some("on")
                    || val.as_str() == Some("enabled")
                {
                    policy.files_ignore_docs = false;
                }
            }

            apply_rules_to_policy(&mut policy, &combined_rules);

            // 5. Monorepo folder overrides
            for ovr in raw.overrides {
                if !ovr.files.is_empty() {
                    let mut override_policy = policy.clone();
                    apply_rules_to_policy(&mut override_policy, &ovr.rules);
                    policy.overrides.push(PolicyOverride {
                        files: ovr.files,
                        policy: override_policy,
                    });
                }
            }

            return policy;
        }

        Self::default()
    }
}

fn parse_preset(val: &serde_json::Value) -> GovernancePolicy {
    let preset_name = if let Some(s) = val.as_str() {
        Some(s)
    } else if let Some(arr) = val.as_array() {
        arr.first().and_then(|v| v.as_str())
    } else {
        None
    };

    match preset_name {
        Some("strict") | Some("animoria:strict") => GovernancePolicy::strict(),
        Some("relaxed") | Some("animoria:relaxed") => GovernancePolicy::relaxed(),
        Some("recommended") | Some("animoria:recommended") => GovernancePolicy::recommended(),
        _ => GovernancePolicy::default(),
    }
}

fn apply_rules_to_policy(
    policy: &mut GovernancePolicy,
    rules: &HashMap<String, serde_json::Value>,
) {
    for (rule_id, val) in rules {
        match rule_id.as_str() {
            "no-unreferenced-assets" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                policy.no_unreferenced_assets = parsed.enabled;
                if let Some(sev) = parsed.severity {
                    policy.no_unreferenced_severity = sev;
                }
                if let Some(ignore_icons) = parsed.ignore_app_icons {
                    policy.no_unreferenced_ignore_app_icons = ignore_icons;
                }
                policy.no_unreferenced_ignore.extend(parsed.ignore_patterns);
                for ext in parsed.ignore_source_extensions {
                    if !policy.tracing_ignore_source_extensions.contains(&ext) {
                        policy.tracing_ignore_source_extensions.push(ext);
                    }
                }
            }
            "no-duplicate-content" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Error);
                policy.no_duplicate_content = parsed.enabled;
                if let Some(sev) = parsed.severity {
                    policy.no_duplicate_severity = sev;
                }
                if let Some(ignore_icons) = parsed.ignore_app_icons {
                    policy.no_duplicate_ignore_app_icons = ignore_icons;
                }
                policy.no_duplicate_ignore.extend(parsed.ignore_patterns);
            }
            "no-gif" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                policy.no_gif = parsed.enabled;
                if let Some(sev) = parsed.severity {
                    policy.no_gif_severity = sev;
                }
            }
            "max-file-size-kb" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                if !parsed.enabled {
                    policy.max_file_size_kb = None;
                } else {
                    if let Some(sev) = parsed.severity {
                        policy.max_file_size_severity = sev;
                    }
                    if let Some(threshold) = parsed.threshold {
                        policy.max_file_size_kb = Some(threshold);
                    } else if let Some(arr) = val.as_array() {
                        if arr.len() >= 2 {
                            policy.max_file_size_kb = arr[1].as_u64();
                        }
                    } else if let Some(n) = val.as_u64() {
                        policy.max_file_size_kb = Some(n);
                    }
                }
            }
            "max-dimensions" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                if !parsed.enabled {
                    policy.max_dimensions_width = None;
                    policy.max_dimensions_height = None;
                } else {
                    if let Some(sev) = parsed.severity {
                        policy.max_dimensions_severity = sev;
                    }
                    policy.max_dimensions_width = parsed.max_width;
                    policy.max_dimensions_height = parsed.max_height;
                }
            }
            "allowed-formats" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Error);
                if !parsed.enabled {
                    policy.allowed_formats = None;
                } else {
                    if let Some(sev) = parsed.severity {
                        policy.allowed_formats_severity = sev;
                    }
                    let mut formats = Vec::new();
                    if !parsed.formats.is_empty() {
                        for f in parsed.formats {
                            if let Some(fmt) = parse_format_str(&f) {
                                formats.push(fmt);
                            }
                        }
                    } else if let Some(arr) = val.as_array() {
                        let target_arr = if arr.len() == 2 && arr[1].is_array() {
                            arr[1].as_array().unwrap()
                        } else {
                            arr
                        };
                        for item in target_arr {
                            if let Some(s) = item.as_str() {
                                if let Some(fmt) = parse_format_str(s) {
                                    formats.push(fmt);
                                }
                            }
                        }
                    }
                    if !formats.is_empty() {
                        policy.allowed_formats = Some(formats);
                    }
                }
            }
            "naming-convention" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                if !parsed.enabled {
                    policy.naming_convention = None;
                    policy.naming_convention_pattern = None;
                } else {
                    if let Some(sev) = parsed.severity {
                        policy.naming_convention_severity = sev;
                    }
                    if parsed.naming_convention.is_some() {
                        policy.naming_convention = parsed.naming_convention;
                    } else if policy.naming_convention.is_none() {
                        policy.naming_convention = Some(NamingCase::KebabCase);
                    }
                    if parsed.naming_convention_pattern.is_some() {
                        policy.naming_convention_pattern = parsed.naming_convention_pattern;
                    }
                }
            }
            "svg-sanitization" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Error);
                policy.svg_sanitization = parsed.enabled;
                if let Some(sev) = parsed.severity {
                    policy.svg_sanitization_severity = sev;
                }
            }
            _ => {}
        }
    }
}

#[derive(Default)]
struct ParsedRule {
    enabled: bool,
    severity: Option<DiagnosticSeverity>,
    threshold: Option<u64>,
    max_width: Option<u32>,
    max_height: Option<u32>,
    naming_convention: Option<NamingCase>,
    naming_convention_pattern: Option<String>,
    formats: Vec<String>,
    ignore_app_icons: Option<bool>,
    ignore_patterns: Vec<String>,
    ignore_source_extensions: Vec<String>,
}

fn parse_rule_entry(val: &serde_json::Value, default_severity: DiagnosticSeverity) -> ParsedRule {
    let mut parsed = ParsedRule {
        enabled: true,
        severity: Some(default_severity),
        ..Default::default()
    };

    match val {
        serde_json::Value::Bool(b) => {
            parsed.enabled = *b;
        }
        serde_json::Value::String(s) => {
            if s == "off" || s == "disabled" {
                parsed.enabled = false;
            } else if let Some(sev) = parse_severity(s) {
                parsed.severity = Some(sev);
            } else if let Some(case) = parse_naming_case(s) {
                parsed.naming_convention = Some(case);
            }
        }
        serde_json::Value::Array(arr) => {
            if let Some(first) = arr.first().and_then(|v| v.as_str()) {
                if first == "off" || first == "disabled" {
                    parsed.enabled = false;
                } else if let Some(sev) = parse_severity(first) {
                    parsed.severity = Some(sev);
                } else if let Some(case) = parse_naming_case(first) {
                    parsed.naming_convention = Some(case);
                }
            }
            if arr.len() >= 2 {
                if let Some(n) = arr[1].as_u64() {
                    parsed.threshold = Some(n);
                } else if let Some(case_str) = arr[1].as_str() {
                    if let Some(case) = parse_naming_case(case_str) {
                        parsed.naming_convention = Some(case);
                    }
                } else if let Some(obj) = arr[1].as_object() {
                    if let Some(w) = obj.get("maxWidth").and_then(|v| v.as_u64()) {
                        parsed.max_width = Some(w as u32);
                    }
                    if let Some(h) = obj.get("maxHeight").and_then(|v| v.as_u64()) {
                        parsed.max_height = Some(h as u32);
                    }
                    if let Some(case_str) = obj.get("case").and_then(|v| v.as_str()) {
                        parsed.naming_convention = parse_naming_case(case_str);
                    }
                    if let Some(pat) = obj.get("pattern").and_then(|v| v.as_str()) {
                        parsed.naming_convention_pattern = Some(pat.to_string());
                    }
                }
            }
        }
        serde_json::Value::Object(map) => {
            if let Some(sev_val) = map.get("severity").and_then(|v| v.as_str()) {
                if sev_val == "off" || sev_val == "disabled" {
                    parsed.enabled = false;
                } else if let Some(sev) = parse_severity(sev_val) {
                    parsed.severity = Some(sev);
                }
            }
            if let Some(b) = map.get("enabled").and_then(|v| v.as_bool()) {
                parsed.enabled = b;
            }
            if let Some(t) = map.get("threshold").and_then(|v| v.as_u64()) {
                parsed.threshold = Some(t);
            } else if let Some(t) = map.get("maxKb").and_then(|v| v.as_u64()) {
                parsed.threshold = Some(t);
            }
            if let Some(w) = map.get("maxWidth").and_then(|v| v.as_u64()) {
                parsed.max_width = Some(w as u32);
            }
            if let Some(h) = map.get("maxHeight").and_then(|v| v.as_u64()) {
                parsed.max_height = Some(h as u32);
            }
            if let Some(case_str) = map.get("case").and_then(|v| v.as_str()) {
                parsed.naming_convention = parse_naming_case(case_str);
            }
            if let Some(pat) = map.get("pattern").and_then(|v| v.as_str()) {
                parsed.naming_convention_pattern = Some(pat.to_string());
            }
            if let Some(icons) = map.get("ignoreAppIcons").and_then(|v| v.as_bool()) {
                parsed.ignore_app_icons = Some(icons);
            }
            if let Some(ignore_arr) = map.get("ignore").and_then(|v| v.as_array()) {
                for item in ignore_arr {
                    if let Some(pat) = item.as_str() {
                        parsed.ignore_patterns.push(pat.to_string());
                    }
                }
            }
            if let Some(ext_arr) = map.get("ignoreSourceExtensions").and_then(|v| v.as_array()) {
                for item in ext_arr {
                    if let Some(ext) = item.as_str() {
                        parsed.ignore_source_extensions.push(ext.to_string());
                    }
                }
            }
            if let Some(formats_arr) = map.get("formats").and_then(|v| v.as_array()) {
                for item in formats_arr {
                    if let Some(f) = item.as_str() {
                        parsed.formats.push(f.to_string());
                    }
                }
            }
        }
        _ => {}
    }

    parsed
}

fn parse_naming_case(s: &str) -> Option<NamingCase> {
    match s.to_lowercase().replace(['-', '_'], "").as_str() {
        "kebabcase" => Some(NamingCase::KebabCase),
        "snakecase" => Some(NamingCase::SnakeCase),
        "camelcase" => Some(NamingCase::CamelCase),
        "pascalcase" => Some(NamingCase::PascalCase),
        "lowercase" => Some(NamingCase::Lowercase),
        _ => None,
    }
}

fn parse_severity(s: &str) -> Option<DiagnosticSeverity> {
    match s.to_lowercase().as_str() {
        "error" => Some(DiagnosticSeverity::Error),
        "warn" | "warning" => Some(DiagnosticSeverity::Warning),
        "info" => Some(DiagnosticSeverity::Info),
        _ => None,
    }
}

fn parse_format_str(s: &str) -> Option<AssetFormat> {
    match s.to_lowercase().as_str() {
        "lottie" => Some(AssetFormat::Lottie),
        "dotlottie" => Some(AssetFormat::DotLottie),
        "rive" | "riv" => Some(AssetFormat::Rive),
        "gif" => Some(AssetFormat::Gif),
        "apng" => Some(AssetFormat::Apng),
        "animated-svg" => Some(AssetFormat::AnimatedSvg),
        "svg" => Some(AssetFormat::Svg),
        "png" => Some(AssetFormat::Png),
        "jpg" | "jpeg" => Some(AssetFormat::Jpeg),
        "webp" => Some(AssetFormat::Webp),
        "avif" => Some(AssetFormat::Avif),
        "bmp" => Some(AssetFormat::Bmp),
        "eps" => Some(AssetFormat::Eps),
        "icns" => Some(AssetFormat::Icns),
        "ico" => Some(AssetFormat::Ico),
        "odd" => Some(AssetFormat::Odd),
        "ps" => Some(AssetFormat::Ps),
        "psd" => Some(AssetFormat::Psd),
        "tiff" | "tif" => Some(AssetFormat::Tiff),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_presets_parsing() {
        let strict_cfg = r#"{ "extends": "strict" }"#;
        let p_strict = GovernancePolicy::parse_config_str(strict_cfg);
        assert_eq!(p_strict.max_file_size_kb, Some(256));
        assert_eq!(p_strict.no_unreferenced_severity, DiagnosticSeverity::Error);
        assert_eq!(p_strict.naming_convention, Some(NamingCase::KebabCase));

        let relaxed_cfg = r#"{ "extends": "relaxed" }"#;
        let p_relaxed = GovernancePolicy::parse_config_str(relaxed_cfg);
        assert!(!p_relaxed.no_unreferenced_assets);
        assert_eq!(p_relaxed.max_file_size_kb, Some(2048));
    }

    #[test]
    fn test_overrides_parsing_and_resolution() {
        let config = r#"{
            "governance": {
                "rules": {
                    "max-file-size-kb": 100
                }
            },
            "overrides": [
                {
                    "files": ["apps/marketing/**"],
                    "rules": {
                        "max-file-size-kb": 2048
                    }
                }
            ]
        }"#;

        let policy = GovernancePolicy::parse_config_str(config);
        assert_eq!(policy.max_file_size_kb, Some(100));

        let default_asset_policy = policy.policy_for_path("packages/core/icon.png");
        assert_eq!(default_asset_policy.max_file_size_kb, Some(100));

        let override_asset_policy = policy.policy_for_path("apps/marketing/hero.png");
        assert_eq!(override_asset_policy.max_file_size_kb, Some(2048));
    }
}
