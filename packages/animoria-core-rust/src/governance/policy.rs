use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use crate::contracts::asset::AssetFormat;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawAnimoriaConfig {
    #[serde(default)]
    pub rules: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernancePolicy {
    pub no_unreferenced_assets: bool,
    pub no_duplicate_content: bool,
    pub max_file_size_kb: Option<u64>,
    pub allowed_formats: Option<Vec<AssetFormat>>,
    pub no_gif: bool,
}

impl Default for GovernancePolicy {
    fn default() -> Self {
        Self {
            no_unreferenced_assets: true,
            no_duplicate_content: true,
            max_file_size_kb: Some(512),
            allowed_formats: None,
            no_gif: false,
        }
    }
}

impl GovernancePolicy {
    pub fn load_from_workspace(root: &Path) -> Self {
        let mut policy = Self::default();

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
                if let Ok(raw) = serde_json::from_str::<RawAnimoriaConfig>(&content) {
                    for (rule_id, val) in raw.rules {
                        match rule_id.as_str() {
                            "no-unreferenced-assets" => {
                                policy.no_unreferenced_assets = is_rule_enabled(&val);
                            }
                            "no-duplicate-content" => {
                                policy.no_duplicate_content = is_rule_enabled(&val);
                            }
                            "no-gif" => {
                                policy.no_gif = is_rule_enabled(&val);
                            }
                            "max-file-size-kb" => {
                                if let Some(arr) = val.as_array() {
                                    if arr.len() >= 2 {
                                        policy.max_file_size_kb = arr[1].as_u64();
                                    }
                                } else if let Some(n) = val.as_u64() {
                                    policy.max_file_size_kb = Some(n);
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }

        policy
    }
}

fn is_rule_enabled(val: &serde_json::Value) -> bool {
    match val {
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::String(s) => s != "off" && s != "disabled",
        serde_json::Value::Array(arr) => {
            if let Some(first) = arr.first().and_then(|v| v.as_str()) {
                first != "off" && first != "disabled"
            } else {
                true
            }
        }
        _ => true,
    }
}
