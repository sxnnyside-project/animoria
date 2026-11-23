use crate::contracts::analysis::DiagnosticSeverity;
use crate::contracts::asset::AssetFormat;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
/// Casing convention enforced by the `naming-convention` governance rule.
pub enum NamingCase {
    /// Enforces `kebab-case` naming (e.g. `icon-user.svg`).
    KebabCase,
    /// Enforces `snake_case` naming (e.g. `icon_user.svg`).
    SnakeCase,
    /// Enforces `camelCase` naming (e.g. `iconUser.svg`).
    CamelCase,
    /// Enforces `PascalCase` naming (e.g. `IconUser.svg`).
    PascalCase,
    /// Enforces flat lowercase naming (e.g. `iconuser.svg`).
    Lowercase,
}

impl NamingCase {
    /// Returns the canonical string identifier for this naming case.
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
/// Workspace crawler inclusion and exclusion pattern configuration.
pub(crate) struct FilesConfig {
    #[serde(default)]
    pub(crate) ignore: Vec<String>,
    #[serde(default)]
    pub(crate) include: Option<Vec<String>>,
    #[serde(default, rename = "ignoreDocs")]
    pub(crate) ignore_docs: Option<bool>,
    #[serde(default, rename = "includeDocs")]
    pub(crate) include_docs: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
/// Source code reference scanner configuration options.
pub(crate) struct TracingConfig {
    #[serde(default, rename = "ignoreSourceExtensions")]
    pub(crate) ignore_source_extensions: Vec<String>,
    #[serde(default, rename = "includeSourceExtensions")]
    pub(crate) include_source_extensions: Vec<String>,
    #[serde(default, rename = "minStemLength")]
    pub(crate) min_stem_length: Option<usize>,
    #[serde(default, rename = "dynamicCollections")]
    pub(crate) dynamic_collections: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
/// CI quality gate thresholds (minimum score, maximum warnings).
pub(crate) struct CiConfig {
    #[serde(default, rename = "minScore")]
    pub(crate) min_score: Option<u32>,
    #[serde(default, rename = "maxWarnings")]
    pub(crate) max_warnings: Option<usize>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
/// Nested governance settings container in `.animoriarc.json`.
pub(crate) struct GovernanceSection {
    #[serde(default)]
    pub(crate) enabled: Option<bool>,
    #[serde(default)]
    pub(crate) ci: Option<CiConfig>,
    #[serde(default)]
    pub(crate) rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
/// Monorepo path-specific policy override configuration.
pub(crate) struct RuleOverrideConfig {
    #[serde(default)]
    pub(crate) files: Vec<String>,
    #[serde(default)]
    pub(crate) rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
/// Raw deserialization target for `.animoriarc.json` files.
pub(crate) struct RawAnimoriaConfig {
    #[serde(default)]
    pub(crate) extends: Option<serde_json::Value>,
    #[serde(default)]
    pub(crate) files: FilesConfig,
    #[serde(default)]
    pub(crate) tracing: TracingConfig,
    #[serde(default)]
    pub(crate) ci: Option<CiConfig>,
    #[serde(default)]
    pub(crate) governance: Option<GovernanceSection>,
    #[serde(default)]
    pub(crate) overrides: Vec<RuleOverrideConfig>,
    /// Backwards compatibility: root-level rules map
    #[serde(default)]
    pub(crate) rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
/// Path-scoped governance policy override rule.
pub struct PolicyOverride {
    /// Glob patterns matching target file paths for this override.
    pub files: Vec<String>,
    /// Specific policy adjustments applied to matching paths.
    pub policy: GovernancePolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
/// Fully resolved policy rules and quality gates governing a workspace.
pub struct GovernancePolicy {
    /// Whether unreferenced asset detection is enabled.
    #[serde(rename = "no_unreferenced_assets")]
    pub is_no_unreferenced_assets: bool,
    /// Severity level for unreferenced asset violations.
    pub no_unreferenced_severity: DiagnosticSeverity,
    /// Whether to exclude application icon bundles from unreferenced checks.
    #[serde(rename = "no_unreferenced_ignore_app_icons")]
    pub is_no_unreferenced_ignore_app_icons: bool,
    /// Custom path glob patterns ignored by unreferenced checks.
    pub no_unreferenced_ignore: Vec<String>,

    /// Whether duplicate content detection is enabled.
    #[serde(rename = "no_duplicate_content")]
    pub is_no_duplicate_content: bool,
    /// Severity level for duplicate content violations.
    pub no_duplicate_severity: DiagnosticSeverity,
    /// Whether to exclude application icon bundles from duplicate checks.
    #[serde(rename = "no_duplicate_ignore_app_icons")]
    pub is_no_duplicate_ignore_app_icons: bool,
    /// Custom path glob patterns ignored by duplicate checks.
    pub no_duplicate_ignore: Vec<String>,

    /// Maximum allowed asset file size in kilobytes.
    pub max_file_size_kb: Option<u64>,
    /// Severity level for file size budget violations.
    pub max_file_size_severity: DiagnosticSeverity,

    /// Whitelist of permitted asset file formats.
    pub allowed_formats: Option<Vec<AssetFormat>>,
    /// Severity level for disallowed asset format violations.
    pub allowed_formats_severity: DiagnosticSeverity,

    /// Whether to flag all animated and static GIF files.
    #[serde(rename = "no_gif")]
    pub is_no_gif: bool,
    /// Severity level for GIF usage violations.
    pub no_gif_severity: DiagnosticSeverity,

    /// Maximum allowed asset width in pixels.
    pub max_dimensions_width: Option<u32>,
    /// Maximum allowed asset height in pixels.
    pub max_dimensions_height: Option<u32>,
    /// Severity level for dimension limit violations.
    pub max_dimensions_severity: DiagnosticSeverity,

    /// Casing convention required for visual asset filenames.
    pub naming_convention: Option<NamingCase>,
    /// Severity level for naming convention violations.
    pub naming_convention_severity: DiagnosticSeverity,
    /// Optional custom regex pattern enforced for filenames.
    pub naming_convention_pattern: Option<String>,

    /// Whether SVG security sanitization inspection is enabled.
    #[serde(rename = "svg_sanitization")]
    pub is_svg_sanitization_enabled: bool,
    /// Severity level for SVG security risks (scripts, foreignObjects).
    pub svg_sanitization_severity: DiagnosticSeverity,

    /// Minimum acceptable composite health score threshold for CI gates.
    pub ci_min_score: Option<u32>,
    /// Maximum allowed warning findings before failing CI gates.
    pub ci_max_warnings: Option<usize>,

    /// Glob patterns ignored during workspace file discovery.
    pub files_ignore: Vec<String>,
    /// Optional whitelist restricting discovery to matching globs.
    pub files_include: Option<Vec<String>>,
    /// Whether documentation directories should be excluded from file discovery.
    #[serde(rename = "files_ignore_docs")]
    pub should_ignore_docs: bool,

    /// Source file extensions ignored by the reference tracer.
    pub tracing_ignore_source_extensions: Vec<String>,
    /// Explicit source file extensions inspected by the reference tracer.
    pub tracing_include_source_extensions: Vec<String>,
    /// Minimum filename stem length required before performing reference tracing.
    pub tracing_min_stem_length: Option<usize>,
    /// Dynamic token collections recognized during reference tracing.
    pub tracing_dynamic_collections: Vec<String>,

    /// Path-specific policy overrides active in the workspace.
    pub overrides: Vec<PolicyOverride>,
}

impl Default for GovernancePolicy {
    fn default() -> Self {
        Self {
            is_no_unreferenced_assets: true,
            no_unreferenced_severity: DiagnosticSeverity::Warning,
            is_no_unreferenced_ignore_app_icons: true,
            no_unreferenced_ignore: Vec::new(),

            is_no_duplicate_content: true,
            no_duplicate_severity: DiagnosticSeverity::Error,
            is_no_duplicate_ignore_app_icons: true,
            no_duplicate_ignore: Vec::new(),

            max_file_size_kb: Some(512),
            max_file_size_severity: DiagnosticSeverity::Warning,

            allowed_formats: None,
            allowed_formats_severity: DiagnosticSeverity::Error,

            is_no_gif: false,
            no_gif_severity: DiagnosticSeverity::Warning,

            max_dimensions_width: None,
            max_dimensions_height: None,
            max_dimensions_severity: DiagnosticSeverity::Warning,

            naming_convention: None,
            naming_convention_severity: DiagnosticSeverity::Warning,
            naming_convention_pattern: None,

            is_svg_sanitization_enabled: true,
            svg_sanitization_severity: DiagnosticSeverity::Error,

            ci_min_score: None,
            ci_max_warnings: None,

            files_ignore: Vec::new(),
            files_include: None,
            should_ignore_docs: true,

            tracing_ignore_source_extensions: Vec::new(),
            tracing_include_source_extensions: Vec::new(),
            tracing_min_stem_length: None,
            tracing_dynamic_collections: Vec::new(),

            overrides: Vec::new(),
        }
    }
}

impl GovernancePolicy {
    /// Recommended balanced governance configuration preset.
    pub fn recommended() -> Self {
        Self {
            is_no_unreferenced_ignore_app_icons: true,
            is_no_duplicate_ignore_app_icons: true,
            is_no_gif: true,
            is_svg_sanitization_enabled: true,
            svg_sanitization_severity: DiagnosticSeverity::Error,
            ..Default::default()
        }
    }

    /// Strict governance configuration preset enforcing zero warnings.
    pub fn strict() -> Self {
        Self {
            no_unreferenced_severity: DiagnosticSeverity::Error,
            is_no_unreferenced_ignore_app_icons: false,
            is_no_duplicate_ignore_app_icons: false,
            max_file_size_kb: Some(256),
            max_file_size_severity: DiagnosticSeverity::Error,
            max_dimensions_width: Some(2560),
            max_dimensions_height: Some(1440),
            max_dimensions_severity: DiagnosticSeverity::Error,
            is_no_gif: true,
            no_gif_severity: DiagnosticSeverity::Error,
            naming_convention: Some(NamingCase::KebabCase),
            naming_convention_severity: DiagnosticSeverity::Error,
            is_svg_sanitization_enabled: true,
            svg_sanitization_severity: DiagnosticSeverity::Error,
            ci_min_score: Some(90),
            ci_max_warnings: Some(0),
            ..Default::default()
        }
    }

    /// Relaxed governance configuration preset suitable for legacy workspaces.
    pub fn relaxed() -> Self {
        Self {
            is_no_unreferenced_assets: false,
            no_duplicate_severity: DiagnosticSeverity::Warning,
            is_no_duplicate_ignore_app_icons: true,
            max_file_size_kb: Some(2048),
            max_file_size_severity: DiagnosticSeverity::Warning,
            is_no_gif: false,
            is_svg_sanitization_enabled: true,
            svg_sanitization_severity: DiagnosticSeverity::Warning,
            ..Default::default()
        }
    }

    /// Resolves the specific policy applicable to a relative file path.
    pub fn policy_for_path<'a>(&'a self, relative_path: &str) -> &'a GovernancePolicy {
        for ovr in &self.overrides {
            if crate::governance::asset_matcher::matches_any_pattern(relative_path, &ovr.files) {
                return &ovr.policy;
            }
        }
        self
    }

    /// Like `load_from_workspace`, but a config that exists and cannot be read or parsed is
    /// an error, so a CI gate never silently falls back to default rules.
    pub fn try_load_from_workspace(root: &Path) -> Result<Self, String> {
        let path = root.join(".animoriarc.json");
        let path = if path.is_file() {
            path
        } else {
            root.join(".animoriarc")
        };
        if !path.is_file() {
            return Ok(Self::default());
        }
        let content = fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
        serde_json::from_str::<RawAnimoriaConfig>(&content)
            .map_err(|e| format!("{}: {e}", path.display()))?;
        Ok(Self::parse_config_str(&content))
    }

    /// Loads workspace policy from disk, falling back to defaults on error.
    pub fn load_from_workspace(root: &Path) -> Self {
        Self::try_load_from_workspace(root).unwrap_or_else(|e| {
            warn_once(format!(
                "[Config] Ignoring invalid config, using defaults: {e}"
            ));
            Self::default()
        })
    }

    /// Parses a configuration string into a resolved GovernancePolicy.
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
                policy.should_ignore_docs = false;
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
                    policy.is_no_unreferenced_assets = false;
                    policy.is_no_duplicate_content = false;
                    policy.max_file_size_kb = None;
                    policy.max_dimensions_width = None;
                    policy.max_dimensions_height = None;
                    policy.allowed_formats = None;
                    policy.is_no_gif = false;
                    policy.naming_convention = None;
                    policy.is_svg_sanitization_enabled = false;
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
                    policy.should_ignore_docs = false;
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

/// The config is re-read on every scan (and per override), so each distinct warning is
/// printed once per process instead of on every file change.
fn warn_once(message: String) {
    static SEEN: std::sync::OnceLock<std::sync::Mutex<std::collections::HashSet<String>>> =
        std::sync::OnceLock::new();
    let seen = SEEN.get_or_init(Default::default);
    if let Ok(mut seen) = seen.lock() {
        if seen.insert(message.clone()) {
            eprintln!("{message}");
        }
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
        other => {
            if other.is_some() {
                warn_once(
                    "[Config] Unknown preset in \"extends\"; using the default policy.".into(),
                );
            }
            GovernancePolicy::default()
        }
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
                policy.is_no_unreferenced_assets = parsed.is_enabled;
                if let Some(sev) = parsed.severity {
                    policy.no_unreferenced_severity = sev;
                }
                if let Some(ignore_icons) = parsed.ignore_app_icons {
                    policy.is_no_unreferenced_ignore_app_icons = ignore_icons;
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
                policy.is_no_duplicate_content = parsed.is_enabled;
                if let Some(sev) = parsed.severity {
                    policy.no_duplicate_severity = sev;
                }
                if let Some(ignore_icons) = parsed.ignore_app_icons {
                    policy.is_no_duplicate_ignore_app_icons = ignore_icons;
                }
                policy.no_duplicate_ignore.extend(parsed.ignore_patterns);
            }
            "no-gif" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                policy.is_no_gif = parsed.is_enabled;
                if let Some(sev) = parsed.severity {
                    policy.no_gif_severity = sev;
                }
            }
            "max-file-size-kb" => {
                let parsed = parse_rule_entry(val, DiagnosticSeverity::Warning);
                if !parsed.is_enabled {
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
                if !parsed.is_enabled {
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
                if !parsed.is_enabled {
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
                if !parsed.is_enabled {
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
                policy.is_svg_sanitization_enabled = parsed.is_enabled;
                if let Some(sev) = parsed.severity {
                    policy.svg_sanitization_severity = sev;
                }
            }
            "scan-docs" | "include-docs" => {}
            unknown => warn_once(format!(
                "[Config] Unknown rule '{unknown}' ignored (typo?)."
            )),
        }
    }
}

#[derive(Default)]
struct ParsedRule {
    is_enabled: bool,
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
        is_enabled: true,
        severity: Some(default_severity),
        ..Default::default()
    };

    match val {
        serde_json::Value::Bool(b) => {
            parsed.is_enabled = *b;
        }
        serde_json::Value::String(s) => {
            if s == "off" || s == "disabled" {
                parsed.is_enabled = false;
            } else if let Some(sev) = parse_severity(s) {
                parsed.severity = Some(sev);
            } else if let Some(case) = parse_naming_case(s) {
                parsed.naming_convention = Some(case);
            }
        }
        serde_json::Value::Array(arr) => {
            if let Some(first) = arr.first().and_then(|v| v.as_str()) {
                if first == "off" || first == "disabled" {
                    parsed.is_enabled = false;
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
                    parsed.is_enabled = false;
                } else if let Some(sev) = parse_severity(sev_val) {
                    parsed.severity = Some(sev);
                }
            }
            if let Some(b) = map.get("enabled").and_then(|v| v.as_bool()) {
                parsed.is_enabled = b;
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
        assert!(!p_relaxed.is_no_unreferenced_assets);
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

    #[test]
    fn broken_config_is_an_error_for_strict_loading_but_defaults_for_lenient() {
        let ws = tempfile::tempdir().unwrap();
        assert!(GovernancePolicy::try_load_from_workspace(ws.path()).is_ok());

        std::fs::write(
            ws.path().join(".animoriarc.json"),
            r#"{ "ci": { "minScore": 90, }, }"#,
        )
        .unwrap();
        let err = GovernancePolicy::try_load_from_workspace(ws.path()).unwrap_err();
        assert!(err.contains(".animoriarc.json"));
        assert_eq!(
            GovernancePolicy::load_from_workspace(ws.path()).ci_min_score,
            None
        );

        std::fs::write(
            ws.path().join(".animoriarc.json"),
            r#"{ "ci": { "minScore": 90 } }"#,
        )
        .unwrap();
        let ok = GovernancePolicy::try_load_from_workspace(ws.path()).unwrap();
        assert_eq!(ok.ci_min_score, Some(90));
    }
}
