use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{self, BufRead, Write};
use std::path::{Path, PathBuf};

use crate::contracts::analysis::WorkspaceAnalysis;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::remediation::{ResolutionPlan, TrashItem};
use crate::contracts::usage::UsageReference;
use crate::daemon::cleanup::{self, CleanupPlan};
use crate::daemon::preview;
use crate::daemon::report;
use crate::governance::engine::aggregate_health_scores;
use crate::indexer::AssetIndex;
use crate::integration::generate_snippets_for_asset;
use crate::parser::heuristics::detect_format;
use crate::remediation::{create_duplicate_resolution_plan, TrashManager};

pub const PROTOCOL_VERSION: u32 = 1;

/// A single NDJSON message larger than this is refused rather than buffered.
///
/// `BufRead::lines()` has no size cap of its own — it keeps appending to an
/// internal `String` until it finds `\n`, so a client that never sends one
/// (a broken pipe, a corrupted write, or a hostile process) would grow that
/// buffer without bound. Real requests/events here are analysis payloads for
/// workspaces this daemon itself just scanned, which tops out in the tens of
/// megabytes even for large monorepos — 64 MiB leaves headroom without
/// leaving the cap effectively unbounded.
const MAX_LINE_BYTES: usize = 64 * 1024 * 1024;

/// Reads one NDJSON line with `MAX_LINE_BYTES` enforced, using `fill_buf`/
/// `consume` instead of `BufRead::lines()` so the cap can be checked as
/// bytes arrive rather than after an unbounded read completes.
///
/// Returns `Ok(None)` at EOF with nothing pending, `Ok(Some(line))` for a
/// complete line (the trailing `\n` stripped), or an error once the pending,
/// still-unterminated line exceeds the cap.
fn read_capped_line<R: BufRead>(reader: &mut R, max_bytes: usize) -> io::Result<Option<String>> {
    let mut buf: Vec<u8> = Vec::new();
    loop {
        let available = reader.fill_buf()?;
        if available.is_empty() {
            return if buf.is_empty() {
                Ok(None)
            } else {
                Ok(Some(String::from_utf8_lossy(&buf).into_owned()))
            };
        }

        if let Some(pos) = available.iter().position(|&b| b == b'\n') {
            buf.extend_from_slice(&available[..pos]);
            reader.consume(pos + 1);
            return Ok(Some(String::from_utf8_lossy(&buf).into_owned()));
        }

        buf.extend_from_slice(available);
        let consumed = available.len();
        reader.consume(consumed);

        if buf.len() > max_bytes {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "NDJSON line exceeded {max_bytes} bytes without a terminator; refusing to buffer further"
                ),
            ));
        }
    }
}

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
    /// Every request method this daemon actually answers — checked by hosts
    /// (JetBrains' `verifyDaemonCapabilities`) against what they call, so a
    /// daemon that predates a feature is diagnosed once at handshake instead
    /// of as a stream of per-feature `unsupported-method` errors.
    pub methods: Vec<String>,
}

/// Kept in one place so `hello.methods` cannot drift from the methods the
/// `match` below actually handles.
fn supported_methods() -> Vec<String> {
    [
        "hello",
        "ping",
        "scan",
        "check",
        "analyze",
        "getAnalysis",
        "getUsageReferences",
        "generateThumbnail",
        "getLottieDocument",
        "generateSnippet",
        "aggregateHealthScores",
        "markStale",
        "applyReferenceRewrite",
        "listAuditEvents",
        "listAnalysisSnapshots",
        "exportReport",
        "remediate_plan",
        "trash_asset",
        "restore_asset",
        "buildCleanupProposal",
        "buildCleanupPlan",
        "applyCleanupPlan",
        "buildResolutionPlan",
        "applyResolutionPlan",
        "listTrashSessions",
        "restoreTrashSession",
        "shutdown",
    ]
    .into_iter()
    .map(String::from)
    .collect()
}

pub struct DaemonServer {
    indices: HashMap<String, AssetIndex>,
    cleanup_plans: HashMap<String, (String, CleanupPlan)>,
    resolution_plans: HashMap<String, (String, ResolutionPlan)>,
    _plan_counter: u64,
    event_sequence: u64,
    /// Since process start — `ping`'s only real signal for a client wondering
    /// whether the daemon is alive versus mid-scan, given a single-threaded
    /// request loop answers requests strictly in arrival order: `ping` sent
    /// while a scan is in flight is queued behind it like anything else, so
    /// it confirms liveness *between* operations, not concurrently during one.
    started_at: std::time::Instant,
}

impl Default for DaemonServer {
    fn default() -> Self {
        Self::new()
    }
}

impl DaemonServer {
    pub fn new() -> Self {
        Self {
            indices: HashMap::new(),
            cleanup_plans: HashMap::new(),
            resolution_plans: HashMap::new(),
            _plan_counter: 0,
            event_sequence: 0,
            started_at: std::time::Instant::now(),
        }
    }

    /// The index for `workspace_path` if given (canonicalized the same way
    /// `scan` keys it), or the sole scanned root when the caller omitted it
    /// — the common single-root case both IDEs exercise today. Returns
    /// `None` rather than guessing when there's more than one candidate and
    /// no explicit path, matching the "never resolve against an arbitrary
    /// root" rule for multi-root workspaces.
    fn resolve_root(&self, workspace_path: Option<&str>) -> Option<(&String, &AssetIndex)> {
        if let Some(ws) = workspace_path {
            let canonical = std::fs::canonicalize(ws)
                .unwrap_or_else(|_| PathBuf::from(ws))
                .to_string_lossy()
                .to_string();
            return self.indices.get_key_value(&canonical);
        }
        if self.indices.len() == 1 {
            return self.indices.iter().next();
        }
        None
    }

    /// Mutable counterpart of `resolve_root`, for methods that need to
    /// transition an index's `LifecycleState` (e.g. `markStale`) rather than
    /// just read it.
    fn resolve_root_mut(&mut self, workspace_path: Option<&str>) -> Option<&mut AssetIndex> {
        if let Some(ws) = workspace_path {
            let canonical = std::fs::canonicalize(ws)
                .unwrap_or_else(|_| PathBuf::from(ws))
                .to_string_lossy()
                .to_string();
            return self.indices.get_mut(&canonical);
        }
        if self.indices.len() == 1 {
            return self.indices.values_mut().next();
        }
        None
    }

    /// A workspace directory to operate on for trash-journal methods, which
    /// touch only the filesystem and must not require a scan to have
    /// happened in *this* daemon process — the journal at
    /// `.animoria/trash/sessions.json` outlives any one process. Prefers an
    /// explicit path; falls back to `resolve_root`'s single-scanned-root
    /// case only when no path was given.
    fn resolve_workspace_dir(&self, explicit: Option<&str>) -> Option<PathBuf> {
        if let Some(ws) = explicit {
            return Some(std::fs::canonicalize(ws).unwrap_or_else(|_| PathBuf::from(ws)));
        }
        self.resolve_root(None)
            .map(|(root_id, _)| PathBuf::from(root_id))
    }

    pub fn run(&mut self) -> anyhow::Result<()> {
        let stdin = io::stdin();
        let mut stdout = io::stdout();
        let mut reader = stdin.lock();

        // Announced before the first request is read, so a client can start
        // its handshake the moment the process is actually listening rather
        // than racing an arbitrary "assume it's up by now" delay.
        let ready_event = DaemonEvent {
            protocol: PROTOCOL_VERSION,
            event: "ready".to_string(),
            sequence: 0,
            payload: serde_json::json!({}),
        };
        if let Ok(json) = serde_json::to_string(&ready_event) {
            let _ = writeln!(stdout, "{json}");
            let _ = stdout.flush();
        }

        loop {
            let line = match read_capped_line(&mut reader, MAX_LINE_BYTES) {
                Ok(None) => break,
                Ok(Some(l)) => l,
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

            let method = request.method.clone();

            if matches!(method.as_str(), "scan" | "check" | "analyze") {
                self.event_sequence += 1;
                let started_event = DaemonEvent {
                    protocol: PROTOCOL_VERSION,
                    event: "analysis-started".to_string(),
                    sequence: self.event_sequence,
                    payload: serde_json::json!({}),
                };
                if let Ok(event_json) = serde_json::to_string(&started_event) {
                    writeln!(stdout, "{event_json}")?;
                    stdout.flush()?;
                }
            }

            let (response, should_exit) = self.handle_request(request);
            let json = serde_json::to_string(&response)?;
            writeln!(stdout, "{json}")?;
            stdout.flush()?;

            // JetBrains' `CoreProcessManager` is push-driven: it discards the
            // response to `scan`/`check`/`analyze`/`getAnalysis` and instead
            // waits for an `analysis-completed` *event* to update its
            // analysis holder and repaint every panel. Without this, that
            // wait never resolves and the tool window sits on "Waiting for
            // the Animoria engine…" forever, even though the response above
            // carried the answer the whole time.
            //
            // The payload is the same `MultiRootAnalysis` shape VS Code's
            // `createSessionAdapter().getAnalysis()` builds — `roots`,
            // `assets`, `duplicateGroups`, `referenceCounts`, `readiness` —
            // not the bare `WorkspaceAnalysis` the response nests it in.
            // JetBrains forwards this payload verbatim to the shared UI's
            // JCEF webview (`AnimoriaAnalysisHolder`'s doc comment: "the raw
            // canonical payload... forwarded directly"), so a payload
            // missing `duplicateGroups` is a Duplicates tab stuck at zero
            // even though `WorkspaceAnalysis.diagnostics` (and therefore the
            // Assets tab's badges) came through fine.
            if matches!(
                method.as_str(),
                "scan" | "check" | "analyze" | "getAnalysis"
            ) {
                if let Some(result) = response.result.as_ref() {
                    if let Some(analysis) = result.get("analysis").cloned() {
                        let duplicate_groups = result
                            .get("duplicate_groups")
                            .cloned()
                            .unwrap_or(serde_json::json!([]));
                        let references = result
                            .get("references")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default();

                        let mut reference_counts = serde_json::Map::new();
                        for reference in &references {
                            if let Some(asset_id) =
                                reference.get("asset_id").and_then(|v| v.as_str())
                            {
                                let count = reference_counts
                                    .get(asset_id)
                                    .and_then(|v| v.as_i64())
                                    .unwrap_or(0);
                                reference_counts
                                    .insert(asset_id.to_string(), serde_json::json!(count + 1));
                            }
                        }

                        let assets = analysis
                            .get("assets")
                            .cloned()
                            .unwrap_or(serde_json::json!([]));

                        let payload = serde_json::json!({
                            "roots": [analysis],
                            "assets": assets,
                            "duplicateGroups": duplicate_groups,
                            "referenceCounts": reference_counts,
                            "readiness": { "referencesResolved": true },
                        });

                        self.event_sequence += 1;
                        let event = DaemonEvent {
                            protocol: PROTOCOL_VERSION,
                            event: "analysis-completed".to_string(),
                            sequence: self.event_sequence,
                            payload,
                        };
                        if let Ok(event_json) = serde_json::to_string(&event) {
                            writeln!(stdout, "{event_json}")?;
                            stdout.flush()?;
                        }
                    }
                }
            }

            if method == "markStale" {
                if let Some(result) = response.result.as_ref() {
                    if result.get("marked") == Some(&serde_json::json!(true)) {
                        self.event_sequence += 1;
                        let event = DaemonEvent {
                            protocol: PROTOCOL_VERSION,
                            event: "analysis-stale".to_string(),
                            sequence: self.event_sequence,
                            payload: serde_json::json!({}),
                        };
                        if let Ok(event_json) = serde_json::to_string(&event) {
                            writeln!(stdout, "{event_json}")?;
                            stdout.flush()?;
                        }
                    }
                }
            }

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
            "ping" => {
                let payload = serde_json::json!({
                    "ready": true,
                    "uptime_ms": self.started_at.elapsed().as_millis() as u64,
                });
                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: Some(payload),
                    error: None,
                };
                (resp, false)
            }

            "hello" => {
                let hello = HelloResultPayload {
                    engine: "animoria-core-rust".to_string(),
                    version: env!("CARGO_PKG_VERSION").to_string(),
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
                    methods: supported_methods(),
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
                        crate::daemon::audit::record_analysis_snapshot(&canonical_root, &analysis);
                        crate::daemon::audit::record_audit_event(
                            &canonical_root,
                            crate::contracts::events::AuditEventKind::ScanCompleted,
                            "daemon",
                            serde_json::json!({
                                "asset_count": analysis.assets.len(),
                                "health_score": analysis.health_score.score,
                            }),
                        );
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

            "getAnalysis" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());

                match self.resolve_root(workspace_path) {
                    Some((_root_id, index)) => {
                        #[derive(Serialize)]
                        struct ScanResultPayload {
                            analysis: WorkspaceAnalysis,
                            references: Vec<UsageReference>,
                            duplicate_groups: Vec<DuplicateGroup>,
                        }
                        let payload = ScanResultPayload {
                            analysis: index.to_workspace_analysis(),
                            references: index.references().to_vec(),
                            duplicate_groups: index.duplicate_groups().to_vec(),
                        };
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(payload).ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => (no_workspace_error(req.id), false),
                }
            }

            "exportReport" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let format = req
                    .params
                    .get("format")
                    .and_then(|v| v.as_str())
                    .unwrap_or("markdown");

                match self.resolve_root(workspace_path) {
                    Some((_root_id, index)) => {
                        let content = report::render(&index.to_workspace_analysis(), format);
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(serde_json::json!({
                                "content": content,
                                "format": format,
                                "error": Option::<String>::None,
                            }))
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => {
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(serde_json::json!({
                                "content": "",
                                "format": format,
                                "error": "No governance report is available yet. Run an analysis first.",
                            }))
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                }
            }

            "getUsageReferences" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let asset_path = req
                    .params
                    .get("assetPath")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                match self.resolve_root(workspace_path) {
                    Some((_root_id, index)) => {
                        let refs: Vec<&UsageReference> = index
                            .references()
                            .iter()
                            .filter(|r| r.asset_id == asset_path)
                            .collect();
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(serde_json::json!({
                                "references": refs,
                                "complete": true,
                            }))
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => (no_workspace_error(req.id), false),
                }
            }

            "generateThumbnail" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let asset_path = req
                    .params
                    .get("assetPath")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                let thumbnail_path = self
                    .resolve_root(workspace_path)
                    .and_then(|(_, index)| {
                        index.assets().into_iter().find(|a| a.path == asset_path)
                    })
                    .and_then(|a| a.thumbnail_path);

                let data_uri = thumbnail_path
                    .as_deref()
                    .and_then(preview::thumbnail_data_uri);

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: serde_json::to_value(serde_json::json!({
                        "assetPath": asset_path,
                        "dataUri": data_uri,
                    }))
                    .ok(),
                    error: None,
                };
                (resp, false)
            }

            "getLottieDocument" => {
                let asset_path = req
                    .params
                    .get("assetPath")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: match preview::read_lottie_document(asset_path) {
                        Some(doc) => serde_json::to_value(serde_json::json!({
                            "animation": doc.animation,
                            "totalFrames": doc.total_frames,
                            "frameRate": doc.frame_rate,
                        }))
                        .ok(),
                        None => serde_json::to_value(serde_json::json!({
                            "animation": Option::<serde_json::Value>::None,
                            "totalFrames": 0,
                            "frameRate": 0,
                        }))
                        .ok(),
                    },
                    error: None,
                };
                (resp, false)
            }

            "remediate_plan" => {
                let dup_group_val = req
                    .params
                    .get("duplicate_group")
                    .or_else(|| req.params.get("duplicateGroup"));

                if let Some(val) = dup_group_val {
                    if let Ok(group) = serde_json::from_value::<DuplicateGroup>(val.clone()) {
                        // `remediate_plan` takes no `workspace_path` — VS Code's only
                        // caller of this method — so reference-rewrite proposals are
                        // only possible in the common single-scanned-root case
                        // `resolve_root` already handles; a genuinely ambiguous
                        // multi-root call still gets a correct plan, just with no
                        // rewrite proposals, rather than guessing which root's
                        // references to use.
                        let plan = match self.resolve_root(None) {
                            Some((_, index)) => cleanup::build_resolution_plan(
                                &group,
                                &group.canonical_asset_id,
                                index.references(),
                                &index.assets(),
                            ),
                            None => create_duplicate_resolution_plan(&group),
                        };
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
                        crate::daemon::audit::record_audit_event(
                            Path::new(ws_root),
                            crate::contracts::events::AuditEventKind::AssetStagedToTrash,
                            "daemon",
                            serde_json::json!({ "asset_id": asset_id, "file_path": file_path }),
                        );
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
                                crate::daemon::audit::record_audit_event(
                                    Path::new(ws_root),
                                    crate::contracts::events::AuditEventKind::AssetRestoredFromTrash,
                                    "daemon",
                                    serde_json::json!({ "original_path": item.original_path }),
                                );
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

            "applyReferenceRewrite" => {
                let proposal_val = req
                    .params
                    .get("proposal")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null);
                let workspace_dir = self.resolve_workspace_dir(
                    req.params
                        .get("workspace_path")
                        .or_else(|| req.params.get("workspacePath"))
                        .and_then(|v| v.as_str()),
                );

                match (
                    serde_json::from_value::<crate::contracts::remediation::ReferenceRewriteProposal>(
                        proposal_val,
                    ),
                    workspace_dir,
                ) {
                    (Ok(proposal), Some(workspace_dir)) => {
                        match crate::remediation::apply_reference_rewrite(&proposal, &workspace_dir)
                        {
                            Ok(()) => (
                                DaemonResponse {
                                    protocol: PROTOCOL_VERSION,
                                    id: req.id,
                                    result: Some(serde_json::json!({ "applied": true })),
                                    error: None,
                                },
                                false,
                            ),
                            Err(e) => (
                                DaemonResponse {
                                    protocol: PROTOCOL_VERSION,
                                    id: req.id,
                                    result: None,
                                    error: Some(DaemonErrorPayload {
                                        code: "mutation-refused".to_string(),
                                        message: e,
                                        detail: None,
                                    }),
                                },
                                false,
                            ),
                        }
                    }
                    (Err(e), _) => (
                        DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: None,
                            error: Some(DaemonErrorPayload {
                                code: "invalid-params".to_string(),
                                message: format!("Invalid reference-rewrite proposal payload: {e}"),
                                detail: None,
                            }),
                        },
                        false,
                    ),
                    (Ok(_), None) => (
                        DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: None,
                            error: Some(DaemonErrorPayload {
                                code: "invalid-params".to_string(),
                                message: "Could not resolve a workspace to apply this rewrite in."
                                    .to_string(),
                                detail: None,
                            }),
                        },
                        false,
                    ),
                }
            }

            "listAuditEvents" => {
                let ws_root = self.resolve_workspace_dir(
                    req.params
                        .get("workspace_path")
                        .or_else(|| req.params.get("workspacePath"))
                        .and_then(|v| v.as_str()),
                );
                let events = ws_root
                    .map(|root| crate::daemon::audit::read_audit_events(&root))
                    .unwrap_or_default();
                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: serde_json::to_value(events).ok(),
                    error: None,
                };
                (resp, false)
            }

            "listAnalysisSnapshots" => {
                let ws_root = self.resolve_workspace_dir(
                    req.params
                        .get("workspace_path")
                        .or_else(|| req.params.get("workspacePath"))
                        .and_then(|v| v.as_str()),
                );
                let snapshots = ws_root
                    .map(|root| crate::daemon::audit::read_analysis_snapshots(&root))
                    .unwrap_or_default();
                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: serde_json::to_value(snapshots).ok(),
                    error: None,
                };
                (resp, false)
            }

            "markStale" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());

                let marked = match self.resolve_root_mut(workspace_path) {
                    Some(index) => {
                        index.mark_stale();
                        true
                    }
                    None => false,
                };

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: Some(serde_json::json!({ "marked": marked })),
                    error: None,
                };
                (resp, false)
            }

            "aggregateHealthScores" => {
                #[derive(Deserialize)]
                struct RootReport {
                    report: crate::contracts::analysis::HealthScoreReport,
                    asset_count: usize,
                }

                let roots: Vec<RootReport> = req
                    .params
                    .get("roots")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .unwrap_or_default();

                let pairs: Vec<(crate::contracts::analysis::HealthScoreReport, usize)> = roots
                    .into_iter()
                    .map(|r| (r.report, r.asset_count))
                    .collect();
                let aggregate = aggregate_health_scores(&pairs);

                let resp = DaemonResponse {
                    protocol: PROTOCOL_VERSION,
                    id: req.id,
                    result: serde_json::to_value(aggregate).ok(),
                    error: None,
                };
                (resp, false)
            }

            "generateSnippet" | "generate-snippet" => {
                let asset_path_str = req
                    .params
                    .get("asset_path")
                    .or_else(|| req.params.get("assetPath"))
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                let workspace_path_str = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());

                let asset_path = PathBuf::from(asset_path_str);
                let stem = asset_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("asset")
                    .to_string();

                let format = match detect_format(&asset_path) {
                    Some(Ok(fmt)) => Some(fmt),
                    _ => None,
                };

                match format {
                    Some(fmt) => {
                        let import_path = workspace_path_str
                            .and_then(|ws| {
                                asset_path.strip_prefix(ws).ok().map(|rel| {
                                    format!("./{}", rel.to_string_lossy().replace('\\', "/"))
                                })
                            })
                            .unwrap_or_else(|| {
                                format!(
                                    "./{}",
                                    asset_path
                                        .file_name()
                                        .map(|n| n.to_string_lossy().to_string())
                                        .unwrap_or_else(|| stem.clone())
                                )
                            });

                        let pkg_manager = workspace_path_str
                            .map(|ws| crate::integration::PackageManager::detect(Path::new(ws)))
                            .unwrap_or(crate::integration::PackageManager::Npm);
                        let results =
                            generate_snippets_for_asset(&stem, fmt, &import_path, pkg_manager);

                        #[derive(Serialize)]
                        struct SnippetResultPayload {
                            results: Vec<crate::integration::SnippetOption>,
                            #[serde(skip_serializing_if = "Option::is_none")]
                            error: Option<String>,
                        }

                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(SnippetResultPayload {
                                results,
                                error: None,
                            })
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => {
                        #[derive(Serialize)]
                        struct SnippetResultPayload {
                            results: Vec<crate::integration::SnippetOption>,
                            error: Option<String>,
                        }

                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(SnippetResultPayload {
                                results: Vec::new(),
                                error: Some(format!(
                                    "No snippet generator supports the asset at '{asset_path_str}'"
                                )),
                            })
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                }
            }

            "buildCleanupProposal" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let dismissed: Vec<String> = req
                    .params
                    .get("dismissedPaths")
                    .or_else(|| req.params.get("dismissed_paths"))
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                match self.resolve_root(workspace_path) {
                    Some((root_id, index)) => {
                        let proposal = cleanup::build_cleanup_proposal(index, &dismissed);
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(serde_json::json!({
                                "roots": [{ "rootId": root_id, "rootName": root_id, "proposal": proposal }]
                            }))
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => (no_workspace_error(req.id), false),
                }
            }

            "buildCleanupPlan" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let asset_paths: Vec<String> = req
                    .params
                    .get("assetPaths")
                    .or_else(|| req.params.get("asset_paths"))
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                self._plan_counter += 1;
                let plan_id = format!("cleanup-{}", self._plan_counter);

                match self.resolve_root(workspace_path) {
                    Some((root_id, index)) => {
                        let root_id = root_id.clone();
                        let plan =
                            cleanup::build_cleanup_plan(index, &asset_paths, plan_id.clone());
                        self.cleanup_plans
                            .insert(plan_id, (root_id.clone(), plan.clone()));

                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(serde_json::json!({
                                "plans": [{ "planId": plan.plan_id, "rootId": root_id, "rootName": root_id, "plan": plan }]
                            }))
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => (no_workspace_error(req.id), false),
                }
            }

            "applyCleanupPlan" => {
                let plan_id = req
                    .params
                    .get("planId")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let allow_partial = req
                    .params
                    .get("allowPartial")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                match self.cleanup_plans.remove(plan_id) {
                    Some((root_id, plan)) => {
                        let (result, _trashed) =
                            cleanup::apply_cleanup_plan(Path::new(&root_id), &plan, allow_partial);
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(result).ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => {
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: None,
                            error: Some(DaemonErrorPayload {
                                code: "invalid-params".to_string(),
                                message: format!("No pending cleanup plan with id '{plan_id}'"),
                                detail: None,
                            }),
                        };
                        (resp, false)
                    }
                }
            }

            "buildResolutionPlan" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let group_id = req
                    .params
                    .get("groupId")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let keep_path = req
                    .params
                    .get("keepPath")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                match self.resolve_root(workspace_path) {
                    Some((root_id, index)) => {
                        let root_id = root_id.clone();
                        let group = index
                            .duplicate_groups()
                            .iter()
                            .find(|g| g.id == group_id)
                            .cloned();
                        let keep_asset = index
                            .assets()
                            .into_iter()
                            .find(|a| a.path == keep_path || a.id == keep_path);

                        match (group, keep_asset) {
                            (Some(group), Some(keep_asset)) => {
                                let plan = cleanup::build_resolution_plan(
                                    &group,
                                    &keep_asset.id,
                                    index.references(),
                                    &index.assets(),
                                );
                                self.resolution_plans
                                    .insert(plan.plan_id.clone(), (root_id.clone(), plan.clone()));

                                let resp = DaemonResponse {
                                    protocol: PROTOCOL_VERSION,
                                    id: req.id,
                                    result: serde_json::to_value(serde_json::json!({
                                        "planId": plan.plan_id,
                                        "rootId": root_id,
                                        "rootName": root_id,
                                        "plan": plan
                                    }))
                                    .ok(),
                                    error: None,
                                };
                                (resp, false)
                            }
                            _ => {
                                let resp = DaemonResponse {
                                    protocol: PROTOCOL_VERSION,
                                    id: req.id,
                                    result: None,
                                    error: Some(DaemonErrorPayload {
                                        code: "invalid-params".to_string(),
                                        message:
                                            "That duplicate group or candidate asset was not found."
                                                .to_string(),
                                        detail: None,
                                    }),
                                };
                                (resp, false)
                            }
                        }
                    }
                    None => (no_workspace_error(req.id), false),
                }
            }

            "applyResolutionPlan" => {
                let plan_id = req
                    .params
                    .get("planId")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let allow_partial = req
                    .params
                    .get("allowPartial")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                match self.resolution_plans.remove(plan_id) {
                    Some((root_id, plan)) => match self.indices.get(&root_id) {
                        Some(index) => {
                            let (result, _trashed) = cleanup::apply_resolution_plan(
                                Path::new(&root_id),
                                &plan,
                                index,
                                allow_partial,
                            );
                            crate::daemon::audit::record_audit_event(
                                Path::new(&root_id),
                                crate::contracts::events::AuditEventKind::DuplicateResolved,
                                "daemon",
                                serde_json::json!({
                                    "plan_id": plan_id,
                                    "removed_asset_paths": result.removed_asset_paths,
                                }),
                            );
                            let resp = DaemonResponse {
                                protocol: PROTOCOL_VERSION,
                                id: req.id,
                                result: serde_json::to_value(result).ok(),
                                error: None,
                            };
                            (resp, false)
                        }
                        None => (no_workspace_error(req.id), false),
                    },
                    None => {
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: None,
                            error: Some(DaemonErrorPayload {
                                code: "invalid-params".to_string(),
                                message: format!("No pending resolution plan with id '{plan_id}'"),
                                detail: None,
                            }),
                        };
                        (resp, false)
                    }
                }
            }

            "listTrashSessions" => {
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());

                match self.resolve_workspace_dir(workspace_path) {
                    Some(root_dir) => {
                        let root_id = root_dir.to_string_lossy().to_string();
                        let sessions = cleanup::read_sessions(&root_dir);
                        let resp = DaemonResponse {
                            protocol: PROTOCOL_VERSION,
                            id: req.id,
                            result: serde_json::to_value(serde_json::json!({
                                "roots": [{ "rootId": root_id, "sessions": sessions }]
                            }))
                            .ok(),
                            error: None,
                        };
                        (resp, false)
                    }
                    None => (no_workspace_error(req.id), false),
                }
            }

            "restoreTrashSession" => {
                let session_id = req
                    .params
                    .get("sessionId")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let workspace_path = req
                    .params
                    .get("workspace_path")
                    .or_else(|| req.params.get("workspacePath"))
                    .and_then(|v| v.as_str());
                let root_id_param = req.params.get("rootId").and_then(|v| v.as_str());

                let root_path = root_id_param.or(workspace_path);
                match self.resolve_workspace_dir(root_path) {
                    Some(root_dir) => match cleanup::restore_session(&root_dir, session_id) {
                        Ok(restored_paths) => {
                            let resp = DaemonResponse {
                                protocol: PROTOCOL_VERSION,
                                id: req.id,
                                result: serde_json::to_value(serde_json::json!({
                                    "restoredPaths": restored_paths,
                                    "error": Option::<String>::None,
                                }))
                                .ok(),
                                error: None,
                            };
                            (resp, false)
                        }
                        Err(e) => {
                            let resp = DaemonResponse {
                                protocol: PROTOCOL_VERSION,
                                id: req.id,
                                result: serde_json::to_value(serde_json::json!({
                                    "restoredPaths": Vec::<String>::new(),
                                    "error": e,
                                }))
                                .ok(),
                                error: None,
                            };
                            (resp, false)
                        }
                    },
                    None => (no_workspace_error(req.id), false),
                }
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

/// The error returned when a method needs a scanned workspace and either
/// none was given (with more than one root scanned, ambiguous) or the given
/// path was never scanned — never silently guessed.
fn no_workspace_error(id: String) -> DaemonResponse {
    DaemonResponse {
        protocol: PROTOCOL_VERSION,
        id,
        result: None,
        error: Some(DaemonErrorPayload {
            code: "invalid-params".to_string(),
            message: "No scanned workspace matches this request. Pass workspace_path, or scan a workspace first.".to_string(),
            detail: None,
        }),
    }
}

#[cfg(test)]
mod ndjson_framing_tests {
    use super::{read_capped_line, MAX_LINE_BYTES};
    use std::io::Cursor;

    #[test]
    fn reads_a_single_terminated_line() {
        let mut cursor = Cursor::new(b"{\"a\":1}\n".to_vec());
        let line = read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap();
        assert_eq!(line, Some("{\"a\":1}".to_string()));
        // Nothing left: the next read hits EOF with no pending bytes.
        assert_eq!(read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap(), None);
    }

    #[test]
    fn reads_multiple_lines_delivered_in_one_chunk() {
        // Two NDJSON messages arriving in a single stdin read, exactly like a
        // fast client that writes both before the daemon's next `fill_buf`.
        let mut cursor = Cursor::new(b"{\"id\":\"1\"}\n{\"id\":\"2\"}\n".to_vec());
        assert_eq!(
            read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap(),
            Some("{\"id\":\"1\"}".to_string())
        );
        assert_eq!(
            read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap(),
            Some("{\"id\":\"2\"}".to_string())
        );
        assert_eq!(read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap(), None);
    }

    #[test]
    fn returns_a_trailing_line_with_no_terminator_at_eof() {
        // A process that dies mid-write (or a client that never sends the
        // final newline) should still surface whatever it did send, not
        // silently drop it.
        let mut cursor = Cursor::new(b"{\"incomplete\":true}".to_vec());
        let line = read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap();
        assert_eq!(line, Some("{\"incomplete\":true}".to_string()));
    }

    #[test]
    fn empty_input_is_a_clean_eof_not_an_empty_line() {
        let mut cursor = Cursor::new(Vec::new());
        assert_eq!(read_capped_line(&mut cursor, MAX_LINE_BYTES).unwrap(), None);
    }

    #[test]
    fn refuses_a_line_that_never_terminates_past_the_cap() {
        // The exact scenario `MAX_LINE_BYTES` exists for: a line that keeps
        // growing with no `\n` in sight. A tiny cap here (not the real 64 MiB
        // one) keeps the test fast while exercising the same code path.
        let huge = vec![b'a'; 1024];
        let mut cursor = Cursor::new(huge);
        let result = read_capped_line(&mut cursor, 100);
        assert!(result.is_err(), "expected the oversized line to be refused");
        assert_eq!(result.unwrap_err().kind(), std::io::ErrorKind::InvalidData);
    }

    #[test]
    fn accepts_a_line_exactly_at_the_cap_once_terminated() {
        // Off-by-one guard: a line whose length equals the cap, but that
        // *does* terminate, must not be refused just for reaching the limit.
        let mut payload = vec![b'a'; 100];
        payload.push(b'\n');
        let mut cursor = Cursor::new(payload);
        let line = read_capped_line(&mut cursor, 100).unwrap();
        assert_eq!(line, Some("a".repeat(100)));
    }
}
