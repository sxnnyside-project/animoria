use crate::contracts::analysis::{DiagnosticSeverity, RuleDiagnostic, WorkspaceAnalysis};
use serde::Serialize;
use std::collections::HashSet;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifReport {
    #[serde(rename = "$schema")]
    pub schema: &'static str,
    pub version: &'static str,
    pub runs: Vec<SarifRun>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifRun {
    pub tool: SarifTool,
    pub results: Vec<SarifResult>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifTool {
    pub driver: SarifDriver,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifDriver {
    pub name: &'static str,
    pub version: &'static str,
    pub information_uri: &'static str,
    pub rules: Vec<SarifRuleDefinition>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifRuleDefinition {
    pub id: String,
    pub name: String,
    pub short_description: SarifText,
    pub default_configuration: SarifRuleConfig,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifRuleConfig {
    pub level: &'static str,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifResult {
    pub rule_id: String,
    pub level: &'static str,
    pub message: SarifText,
    pub locations: Vec<SarifLocation>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifText {
    pub text: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifLocation {
    pub physical_location: SarifPhysicalLocation,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifPhysicalLocation {
    pub artifact_location: SarifArtifactLocation,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<SarifRegion>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifArtifactLocation {
    pub uri: String,
    pub uri_base_id: &'static str,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SarifRegion {
    pub start_line: usize,
}

impl SarifReport {
    pub fn from_analysis(analysis: &WorkspaceAnalysis, workspace_root: &std::path::Path) -> Self {
        Self::from_diagnostics(&analysis.diagnostics, workspace_root)
    }

    pub fn from_diagnostics(
        diagnostics: &[RuleDiagnostic],
        workspace_root: &std::path::Path,
    ) -> Self {
        let mut seen_rule_ids = HashSet::new();
        let mut rules = Vec::new();

        for diag in diagnostics {
            if seen_rule_ids.insert(diag.rule_id.clone()) {
                rules.push(SarifRuleDefinition {
                    id: diag.rule_id.clone(),
                    name: diag.rule_id.clone(),
                    short_description: SarifText {
                        text: rule_description(&diag.rule_id).to_string(),
                    },
                    default_configuration: SarifRuleConfig {
                        level: severity_to_sarif_level(diag.severity),
                    },
                });
            }
        }

        let canon_ws = workspace_root
            .canonicalize()
            .unwrap_or_else(|_| workspace_root.to_path_buf());

        let results = diagnostics
            .iter()
            .map(|diag| {
                let target_path = diag
                    .evidence_file
                    .as_deref()
                    .unwrap_or(&diag.target_asset_path);

                let canon_target = std::path::Path::new(target_path)
                    .canonicalize()
                    .unwrap_or_else(|_| std::path::PathBuf::from(target_path));

                let relative = canon_target
                    .strip_prefix(&canon_ws)
                    .or_else(|_| std::path::Path::new(target_path).strip_prefix(workspace_root))
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|_| target_path.to_string());

                let region = diag.evidence_line.map(|line| SarifRegion {
                    start_line: line as usize,
                });

                SarifResult {
                    rule_id: diag.rule_id.clone(),
                    level: severity_to_sarif_level(diag.severity),
                    message: SarifText {
                        text: diag.message.clone(),
                    },
                    locations: vec![SarifLocation {
                        physical_location: SarifPhysicalLocation {
                            artifact_location: SarifArtifactLocation {
                                uri: relative.replace('\\', "/"),
                                uri_base_id: "%SRCROOT%",
                            },
                            region,
                        },
                    }],
                }
            })
            .collect();

        SarifReport {
            schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            version: "2.1.0",
            runs: vec![SarifRun {
                tool: SarifTool {
                    driver: SarifDriver {
                        name: "animoria",
                        version: env!("CARGO_PKG_VERSION"),
                        information_uri: "https://github.com/sxnnyside-project/animoria",
                        rules,
                    },
                },
                results,
            }],
        }
    }
}

fn severity_to_sarif_level(sev: DiagnosticSeverity) -> &'static str {
    match sev {
        DiagnosticSeverity::Error => "error",
        DiagnosticSeverity::Warning => "warning",
        DiagnosticSeverity::Info => "note",
    }
}

fn rule_description(rule_id: &str) -> &'static str {
    match rule_id {
        "no-unreferenced-assets" => {
            "Disallows visual assets with no detected source code references in the workspace."
        }
        "no-duplicate-content" => {
            "Disallows two or more visual assets with byte-identical content (SHA-256 collision)."
        }
        "max-file-size-kb" => {
            "Disallows visual assets exceeding the configured size limit in kilobytes."
        }
        "max-dimensions" => {
            "Disallows visual assets exceeding configured pixel width or height boundaries."
        }
        "allowed-formats" => "Restricts visual assets to a permitted whitelist of file formats.",
        "no-gif" => "Disallows legacy GIF format assets in favor of modern animated alternatives.",
        _ => "Animoria visual asset governance rule.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sarif_serialization() {
        let diags = vec![RuleDiagnostic {
            rule_id: "max-file-size-kb".into(),
            severity: DiagnosticSeverity::Warning,
            message: "File is too large".into(),
            target_asset_id: Some("id1".into()),
            target_asset_path: "/workspace/icon.png".into(),
            evidence_file: None,
            evidence_line: None,
            evidence_excerpt: None,
        }];

        let report = SarifReport::from_diagnostics(&diags, std::path::Path::new("/workspace"));
        let json = serde_json::to_string_pretty(&report).expect("sarif json serialization");
        assert!(json.contains("\"version\": \"2.1.0\""));
        assert!(json.contains("\"ruleId\": \"max-file-size-kb\""));
        assert!(json.contains("\"uri\": \"icon.png\""));
    }
}
