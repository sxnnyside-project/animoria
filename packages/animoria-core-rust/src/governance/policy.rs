use crate::contracts::analysis::DiagnosticSeverity;
use crate::contracts::asset::AssetFormat;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FilesConfig {
    #[serde(default)]
    pub ignore: Vec<String>,
    #[serde(default)]
    pub include: Option<Vec<String>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TracingConfig {
    #[serde(default, rename = "ignoreSourceExtensions")]
    pub ignore_source_extensions: Vec<String>,
    #[serde(default, rename = "includeSourceExtensions")]
    pub include_source_extensions: Vec<String>,
    #[serde(default, rename = "minStemLength")]
    pub min_stem_length: Option<usize>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GovernanceSection {
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RawAnimoriaConfig {
    #[serde(default)]
    pub files: FilesConfig,
    #[serde(default)]
    pub tracing: TracingConfig,
    #[serde(default)]
    pub governance: Option<GovernanceSection>,
    /// Backwards compatibility: root-level rules map
    #[serde(default)]
    pub rules: HashMap<String, serde_json::Value>,
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

    pub files_ignore: Vec<String>,
    pub files_include: Option<Vec<String>>,

    pub tracing_ignore_source_extensions: Vec<String>,
    pub tracing_include_source_extensions: Vec<String>,
    pub tracing_min_stem_length: Option<usize>,
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

            files_ignore: Vec::new(),
            files_include: None,

            tracing_ignore_source_extensions: Vec::new(),
            tracing_include_source_extensions: Vec::new(),
            tracing_min_stem_length: None,
        }
    }
}

impl GovernancePolicy {
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
        let mut policy = Self::default();

        if let Ok(raw) = serde_json::from_str::<RawAnimoriaConfig>(content) {
            // 1. Files configuration
            policy.files_ignore = raw.files.ignore;
            policy.files_include = raw.files.include;

            // 2. Tracing configuration
            policy.tracing_ignore_source_extensions = raw.tracing.ignore_source_extensions;
            policy.tracing_include_source_extensions = raw.tracing.include_source_extensions;
            policy.tracing_min_stem_length = raw.tracing.min_stem_length;

            // 3. Collect rules from either `governance.rules` or root `rules`
            let mut combined_rules = raw.rules;
            if let Some(gov) = raw.governance {
                if gov.enabled == Some(false) {
                    policy.no_unreferenced_assets = false;
                    policy.no_duplicate_content = false;
                    policy.max_file_size_kb = None;
                    policy.allowed_formats = None;
                    policy.no_gif = false;
                    return policy;
                }
                for (k, v) in gov.rules {
                    combined_rules.insert(k, v);
                }
            }

            for (rule_id, val) in combined_rules {
                match rule_id.as_str() {
                    "no-unreferenced-assets" => {
                        let parsed = parse_rule_entry(&val, DiagnosticSeverity::Warning);
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
                        let parsed = parse_rule_entry(&val, DiagnosticSeverity::Error);
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
                        let parsed = parse_rule_entry(&val, DiagnosticSeverity::Warning);
                        policy.no_gif = parsed.enabled;
                        if let Some(sev) = parsed.severity {
                            policy.no_gif_severity = sev;
                        }
                    }
                    "max-file-size-kb" => {
                        let parsed = parse_rule_entry(&val, DiagnosticSeverity::Warning);
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
                    "allowed-formats" => {
                        let parsed = parse_rule_entry(&val, DiagnosticSeverity::Error);
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
                    _ => {}
                }
            }
        }

        policy
    }
}

#[derive(Default)]
struct ParsedRule {
    enabled: bool,
    severity: Option<DiagnosticSeverity>,
    threshold: Option<u64>,
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
            }
        }
        serde_json::Value::Array(arr) => {
            if let Some(first) = arr.first().and_then(|v| v.as_str()) {
                if first == "off" || first == "disabled" {
                    parsed.enabled = false;
                } else if let Some(sev) = parse_severity(first) {
                    parsed.severity = Some(sev);
                }
            }
            if arr.len() >= 2 {
                if let Some(n) = arr[1].as_u64() {
                    parsed.threshold = Some(n);
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
        "svg" | "animated-svg" => Some(AssetFormat::Svg),
        "png" => Some(AssetFormat::Png),
        "jpeg" | "jpg" => Some(AssetFormat::Jpeg),
        "webp" => Some(AssetFormat::Webp),
        "avif" => Some(AssetFormat::Avif),
        "bmp" => Some(AssetFormat::Bmp),
        "ico" => Some(AssetFormat::Ico),
        "psd" => Some(AssetFormat::Psd),
        "tiff" | "tif" => Some(AssetFormat::Tiff),
        "icns" => Some(AssetFormat::Icns),
        "eps" => Some(AssetFormat::Eps),
        "ps" => Some(AssetFormat::Ps),
        "odd" => Some(AssetFormat::Odd),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_legacy_v1_config() {
        let json = r#"{
            "rules": {
                "no-gif": "warning",
                "max-file-size-kb": ["warning", 1024],
                "no-duplicate-content": "error",
                "no-unreferenced-assets": "warning"
            }
        }"#;

        let policy = GovernancePolicy::parse_config_str(json);
        assert!(policy.no_gif);
        assert_eq!(policy.no_gif_severity, DiagnosticSeverity::Warning);
        assert_eq!(policy.max_file_size_kb, Some(1024));
        assert!(policy.no_duplicate_content);
        assert_eq!(policy.no_duplicate_severity, DiagnosticSeverity::Error);
        assert!(policy.no_unreferenced_assets);
    }

    #[test]
    fn parses_modern_biome_style_config() {
        let json = r#"{
            "$schema": "https://animoria.dev/schema/animoriarc.json",
            "files": {
                "ignore": ["**/dist/**", "**/node_modules/**"]
            },
            "tracing": {
                "ignoreSourceExtensions": ["md", "mdx", "vue"],
                "minStemLength": 4
            },
            "governance": {
                "enabled": true,
                "rules": {
                    "no-unreferenced-assets": {
                        "severity": "error",
                        "ignoreAppIcons": true,
                        "ignore": ["**/mipmap*/**", "**/*.appiconset/**"]
                    },
                    "no-duplicate-content": {
                        "severity": "warn",
                        "ignoreAppIcons": true
                    },
                    "max-file-size-kb": {
                        "severity": "error",
                        "threshold": 256
                    }
                }
            }
        }"#;

        let policy = GovernancePolicy::parse_config_str(json);
        assert_eq!(
            policy.files_ignore,
            vec!["**/dist/**", "**/node_modules/**"]
        );
        assert_eq!(
            policy.tracing_ignore_source_extensions,
            vec!["md", "mdx", "vue"]
        );
        assert_eq!(policy.tracing_min_stem_length, Some(4));

        assert!(policy.no_unreferenced_assets);
        assert_eq!(policy.no_unreferenced_severity, DiagnosticSeverity::Error);
        assert!(policy.no_unreferenced_ignore_app_icons);
        assert_eq!(
            policy.no_unreferenced_ignore,
            vec!["**/mipmap*/**", "**/*.appiconset/**"]
        );

        assert!(policy.no_duplicate_content);
        assert_eq!(policy.no_duplicate_severity, DiagnosticSeverity::Warning);
        assert!(policy.no_duplicate_ignore_app_icons);

        assert_eq!(policy.max_file_size_kb, Some(256));
        assert_eq!(policy.max_file_size_severity, DiagnosticSeverity::Error);
    }

    #[test]
    fn absorbs_ignore_source_extensions_from_rule_into_tracing() {
        let json = r#"{
            "governance": {
                "rules": {
                    "no-unreferenced-assets": {
                        "ignoreSourceExtensions": ["vue", "md"]
                    }
                }
            }
        }"#;

        let policy = GovernancePolicy::parse_config_str(json);
        assert_eq!(policy.tracing_ignore_source_extensions, vec!["vue", "md"]);
    }
}
