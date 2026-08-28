use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{self, BufRead, Write};
use std::path::{Path, PathBuf};

use crate::contracts::analysis::WorkspaceAnalysis;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::remediation::TrashItem;
use crate::contracts::usage::UsageReference;
use crate::indexer::AssetIndex;
use crate::remediation::{create_duplicate_resolution_plan, TrashManager};

pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonRequest {
    #[serde(default = "default_protocol_version")]
    pub protocol: u32,
    pub id: String,
    #[serde(alias = "type")]
    pub method: String,
    #[serde(default, alias = "payload")]
    pub params: serde_json::Value,
}

fn default_protocol_version() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonErrorPayload {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonResponse {
    pub protocol: u32,
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<DaemonErrorPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonEvent {
    pub protocol: u32,
    pub event: String,
    pub sequence: u64,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelloResultPayload {
    pub engine: String,
    pub version: String,
    pub protocol_version: u32,
    pub supported_formats: Vec<String>,
    pub capabilities: Vec<String>,
}

#[derive(Default)]
pub struct DaemonServer {
    indices: HashMap<String, AssetIndex>,
    sequence: u64,
}

impl DaemonServer {
    pub fn new() -> Self {
        Self {
            indices: HashMap::new(),
            sequence: 0,
        }
    }

    pub fn run(&mut self) -> anyhow::Result<()> {
        let stdin = io::stdin();
        let mut stdout = io::stdout();
        let reader = stdin.lock();

        for line_res in reader.lines() {
            let line = match line_res {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("[Daemon] Error reading stdin: {e}");
                    break;
                }
            };

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            let request: DaemonRequest = match serde_json::from_str(trimmed) {
                Ok(req) => req,
                Err(err) => {
                    let err_resp = DaemonResponse {
                        protocol: PROTOCOL_VERSION,
                        id: "unknown".to_string(),
                        result: None,
                        error: Some(DaemonErrorPayload {
                            code: "invalid-request".to_string(),
                            message: format!("Malformed JSON request: {err}"),
                            detail: None,
                        }),
                    };
                    let json = serde_json::to_string(&err_resp)?;
                    writeln!(stdout, "{json}")?;
                    stdout.flush()?;
                    continue;
                }
            };

            let (response, should_exit) = self.handle_request(request);
            let json = serde_json::to_string(&response)?;
            writeln!(stdout, "{json}")?;
            stdout.flush()?;

            if should_exit {
                break;
            }
        }

        Ok(())
    }

    pub fn handle_request(&mut self, req: DaemonRequest) -> (DaemonResponse, bool) {
        if req.protocol != PROTOCOL_VERSION {
            let resp = DaemonResponse {
                protocol: PROTOCOL_VERSION,
                id: req.id,
                result: None,
                error: Some(DaemonErrorPayload {
                    code: "unsupported-version".to_string(),
                    message: format!(
                        "Client protocol version {} is not supported; expected {}",
                        req.protocol, PROTOCOL_VERSION
                    ),
                    detail: None,
                }),
            };
            return (resp, false);
        }

        match req.method.as_str() {
            "hello" => {
                let hello = HelloResultPayload {
                    engine: "animoria-core-rust".to_string(),
                    version: "0.1.0".to_string(),
                    protocol_version: PROTOCOL_VERSION,
                    supported_formats: vec![
                        "Lottie".to_string(),
                        "DotLottie".to_string(),
                        "Rive".to_string(),
                        "Gif".to_string(),
                        "Apng".to_string(),
                        "AnimatedSvg".to_string(),
                        "Svg".to_string(),
                        "Png".to_string(),
                        "Jpeg".to_string(),
                        "Webp".to_string(),
                        "Avif".to_string(),
                    ],
                    capabilities: vec![
                        "deep_parsing".to_string(),
                        "parallel_sha256".to_string(),
                        "aho_corasick_tracing".to_string(),
                        "governance_rules".to_string(),
                        "trash_remediation".to_string(),
                        "multi_syntax_detection".to_string(),
                    ],
                };

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: serde_json::to_value(hello).ok(),
                    error: None,
                };
                (resp, false)
            }

            "scan" | "check" | "analyze" => {
                let root_path_str = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("root_path"))
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");

                let custom_ignores: Vec<String> = req
                    .params
                    .get("custom_ignore_patterns")
                    .or_else(|| req.params.get("customIgnorePatterns"))
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                let root_path = PathBuf::from(root_path_str);
                let canonical_root = std::fs::canonicalize(&root_path).unwrap_or(root_path);

                let root_id = canonical_root.to_string_lossy().to_string();
                let mut index = AssetIndex::new(root_id.clone(), canonical_root.clone());

                match index.scan_workspace(&custom_ignores) {
                    Ok(analysis) => {
                        let references = index.references().to_vec();
                        let duplicate_groups = index.duplicate_groups().to_vec();
                        self.indices.insert(root_id, index);

                        #[derive(Serialize)]
                        struct ScanResultPayload {
                            analysis: WorkspaceAnalysis,
                            references: Vec<UsageReference>,
                            duplicate_groups: Vec<DuplicateGroup>,
                        }

                        let payload = ScanResultPayload {
                            analysis,
                            references,
                            duplicate_groups,
                        };

                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(payload).ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    Err(e) => {
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: None,
                            error: Some(DaemonErrorPayload {
                                code: "analysis-failed".to_string(),
                                message: format!("Scan failed: {e}"),
                                detail: Some(e.to_string()),
                            }),
                        };
                        (resp, false)
                    }
                }
            }

            "remediate_plan" => {
                let dup_group_val = req
                    .params
                    .get("duplicate_group")
                    .or_else(|| req.params.get("duplicateGroup"));

                if let Some(val) = dup_group_val {
                    if let Ok(group) = serde_json::from_value::<DuplicateGroup>(val.clone()) {
                        let plan = create_duplicate_resolution_plan(&group);
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(plan).ok(),
                            error: None,
                        };
                        return (resp, false);
                    }
                }

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: None,
                    error: Some(DaemonErrorPayload {
                        code: "invalid-params".to_string(),
                        message: "Invalid duplicate_group payload".to_string(),
                        detail: None,
                    }),
                };
                (resp, false)
            }

            "trash_asset" => {
                let ws_root = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");
                let asset_id = req
                    .params
                    .get("asset_id")
                    .or_else(|| req.params.get("assetId"))
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let file_path = req
                    .params
                    .get("file_path")
                    .or_else(|| req.params.get("filePath"))
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                let trash_mgr = TrashManager::new(Path::new(ws_root));
                match trash_mgr.stage_to_trash(asset_id, Path::new(file_path)) {
                    Ok(item) => {
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(item).ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    Err(e) => {
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: None,
                            error: Some(DaemonErrorPayload {
                                code: "mutation-refused".to_string(),
                                message: format!("Failed to trash asset: {e}"),
                                detail: Some(e.to_string()),
                            }),
                        };
                        (resp, false)
                    }
                }
            }

            "restore_asset" => {
                let ws_root = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");
                let item_val = req
                    .params
                    .get("trash_item")
                    .or_else(|| req.params.get("trashItem"));

                if let Some(val) = item_val {
                    if let Ok(item) = serde_json::from_value::<TrashItem>(val.clone()) {
                        let trash_mgr = TrashManager::new(Path::new(ws_root));
                        match trash_mgr.restore_from_trash(&item) {
                            Ok(_) => {
                                let resp = DaemonResponse {
                                    protocol: PROTOCOL_VERSION,
                                    id: req.id,
                                    result: Some(serde_json::json!({ "restored": true })),
                                    error: None,
                                };
                                return (resp, false);
                            }
                            Err(e) => {
                                let resp = DaemonResponse {
                                    protocol: PROTOCOL_VERSION,
                                    id: req.id,
                                    result: None,
                                    error: Some(DaemonErrorPayload {
                                        code: "mutation-refused".to_string(),
                                        message: format!("Failed to restore asset: {e}"),
                                        detail: Some(e.to_string()),
                                    }),
                                };
                                return (resp, false);
                            }
                        }
                    }
                }

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: None,
                    error: Some(DaemonErrorPayload {
                        code: "invalid-params".to_string(),
                        message: "Invalid trash_item payload".to_string(),
                        detail: None,
                    }),
                };
                (resp, false)
            }

            "shutdown" => {
                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: Some(serde_json::json!({ "shutdown": true })),
                    error: None,
                };
                (resp, true)
            }

            _ => {
                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: None,
                    error: Some(DaemonErrorPayload {
                        code: "unsupported-method".to_string(),
                        message: format!("Unsupported request method: '{}'", req.method),
                        detail: None,
                    }),
                };
                (resp, false)
            }
        }
    }
}
