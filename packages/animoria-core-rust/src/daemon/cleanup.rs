//! Cleanup proposals/plans and trash-session bookkeeping for the daemon.
//!
//! JetBrains has no in-process fallback the way VS Code's host bridge does —
//! it is a pure presentation layer that expects the daemon to own every one
//! of these methods (`buildCleanupProposal`, `buildCleanupPlan`,
//! `applyCleanupPlan`, `buildResolutionPlan`, `applyResolutionPlan`,
//! `listTrashSessions`, `restoreTrashSession`). None of them existed before
//! this module — every one of those calls hit `unsupported-method`.
//!
//! Trash *sessions* (one batch of assets moved together, restorable as a
//! unit) are not something `TrashManager` tracks — it stages one asset per
//! call. A session is a small JSON journal at
//! `.animoria/trash/sessions.json`, so it survives the daemon process
//! exiting between IDE restarts, unlike an in-memory map.

use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::contracts::asset::Asset;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::remediation::{
    ResolutionPlan, SessionItemStored, SessionManifest, TrashItem,
};
use crate::contracts::usage::UsageReference;
use crate::indexer::AssetIndex;
use crate::remediation::{create_duplicate_resolution_plan, TrashManager};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupReason {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupEligibility {
    pub eligible: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCandidate {
    pub asset: Asset,
    pub reasons: Vec<CleanupReason>,
    pub size_bytes: u64,
    pub reference_count: u32,
    pub eligibility: CleanupEligibility,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupProposal {
    pub candidates: Vec<CleanupCandidate>,
    pub total_size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupEntry {
    pub asset: Asset,
    pub reasons: Vec<CleanupReason>,
    pub confidence: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupRefusal {
    pub asset_path: String,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupPlan {
    pub plan_id: String,
    pub entries: Vec<CleanupEntry>,
    pub refusals: Vec<CleanupRefusal>,
    pub safety: String,
    pub bytes_reclaimed: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub status: String,
    pub removed_asset_paths: Vec<String>,
    pub recovered_bytes: u64,
    pub trash_session_id: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionResult {
    pub status: String,
    pub removed_asset_paths: Vec<String>,
    pub recovered_bytes: u64,
    pub trash_session_id: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionItem {
    pub original_path: String,
    pub trash_path: String,
    pub size_bytes: u64,
}

const RULE_UNREFERENCED: &str = "no-unreferenced-assets";

/// Every asset the governance engine already flagged as unreferenced, minus
/// whatever the developer dismissed — Core's own diagnostics decide
/// eligibility; this only assembles them.
pub fn build_cleanup_proposal(index: &AssetIndex, dismissed_paths: &[String]) -> CleanupProposal {
    let dismissed: std::collections::HashSet<&str> =
        dismissed_paths.iter().map(String::as_str).collect();
    let assets = index.assets();
    let by_path: HashMap<&str, &Asset> = assets.iter().map(|a| (a.path.as_str(), a)).collect();

    let mut candidates = Vec::new();
    for d in index.diagnostics() {
        if d.rule_id != RULE_UNREFERENCED {
            continue;
        }
        let Some(asset) = by_path.get(d.target_asset_path.as_str()) else {
            continue;
        };
        if dismissed.contains(asset.path.as_str()) {
            continue;
        }
        candidates.push(CleanupCandidate {
            asset: (*asset).clone(),
            reasons: vec![CleanupReason {
                code: d.rule_id.clone(),
                message: d.message.clone(),
            }],
            size_bytes: asset.size_bytes,
            reference_count: 0,
            eligibility: CleanupEligibility { eligible: true },
        });
    }

    let total_size_bytes = candidates.iter().map(|c| c.size_bytes).sum();
    CleanupProposal {
        candidates,
        total_size_bytes,
    }
}

fn confidence_for(index: &AssetIndex, asset_path: &str) -> String {
    let severity = index
        .diagnostics()
        .iter()
        .find(|d| d.target_asset_path == asset_path)
        .map(|d| format!("{:?}", d.severity).to_lowercase());
    match severity.as_deref() {
        Some("error") => "certain".to_string(),
        Some("warning") => "moderate".to_string(),
        _ => "low".to_string(),
    }
}

/// Builds an immutable plan for exactly `asset_paths` — Core's own decision
/// about what is reclaimable, never re-derived by a caller.
pub fn build_cleanup_plan(
    index: &AssetIndex,
    asset_paths: &[String],
    plan_id: String,
) -> CleanupPlan {
    let proposal = build_cleanup_proposal(index, &[]);
    let by_path: HashMap<&str, &CleanupCandidate> = proposal
        .candidates
        .iter()
        .map(|c| (c.asset.path.as_str(), c))
        .collect();

    let wanted: Vec<&String> = if asset_paths.is_empty() {
        proposal.candidates.iter().map(|c| &c.asset.path).collect()
    } else {
        asset_paths.iter().collect()
    };

    let mut entries = Vec::new();
    let mut refusals = Vec::new();
    for path in wanted {
        match by_path.get(path.as_str()) {
            Some(candidate) => entries.push(CleanupEntry {
                asset: candidate.asset.clone(),
                reasons: candidate.reasons.clone(),
                confidence: confidence_for(index, path),
                size_bytes: candidate.size_bytes,
            }),
            None => refusals.push(CleanupRefusal {
                asset_path: path.clone(),
                explanation: "Not currently proposed for cleanup.".to_string(),
            }),
        }
    }

    let bytes_reclaimed = entries.iter().map(|e| e.size_bytes).sum();
    let safety = if refusals.is_empty() {
        "safe"
    } else {
        "partial"
    }
    .to_string();

    CleanupPlan {
        plan_id,
        entries,
        refusals,
        safety,
        bytes_reclaimed,
    }
}

/// Actually stages every entry in `plan` to `.animoria/trash/`, recording a
/// session journal entry for the ones that succeeded.
pub fn apply_cleanup_plan(
    workspace_root: &Path,
    plan: &CleanupPlan,
    allow_partial: bool,
) -> (CleanupResult, Vec<(TrashItem, u64)>) {
    if !plan.refusals.is_empty() && !allow_partial {
        return (
            CleanupResult {
                status: "failed".to_string(),
                removed_asset_paths: vec![],
                recovered_bytes: 0,
                trash_session_id: None,
                error: Some(format!(
                    "{} asset(s) could not be resolved for cleanup; refusing a partial application.",
                    plan.refusals.len()
                )),
            },
            vec![],
        );
    }

    let trash_mgr = TrashManager::new(workspace_root);
    let mut removed_asset_paths = Vec::new();
    let mut trashed: Vec<(TrashItem, u64)> = Vec::new();
    let mut recovered_bytes = 0u64;
    let mut first_error: Option<String> = None;

    for entry in &plan.entries {
        match trash_mgr.stage_to_trash(&entry.asset.id, Path::new(&entry.asset.path)) {
            Ok(item) => {
                trashed.push((item, entry.size_bytes));
                removed_asset_paths.push(entry.asset.path.clone());
                recovered_bytes += entry.size_bytes;
            }
            Err(e) => {
                first_error = Some(e.to_string());
                if !allow_partial {
                    break;
                }
            }
        }
    }

    let status = if removed_asset_paths.is_empty() {
        "failed"
    } else if removed_asset_paths.len() < plan.entries.len() {
        "partial"
    } else {
        "applied"
    };

    let session_id = if trashed.is_empty() {
        None
    } else {
        Some(record_trash_session(workspace_root, &trashed))
    };

    (
        CleanupResult {
            status: status.to_string(),
            removed_asset_paths,
            recovered_bytes,
            trash_session_id: session_id,
            error: if status == "failed" {
                first_error
            } else {
                None
            },
        },
        trashed,
    )
}

/// Builds a `ResolutionPlan` for a duplicate group, honoring the caller's
/// choice of which asset to keep by overriding the group's canonical id
/// before Core computes the plan — Core still decides what gets deleted.
/// Also proposes (but does not apply) source rewrites for every traced
/// reference to an asset the plan would delete.
pub fn build_resolution_plan(
    group: &DuplicateGroup,
    keep_asset_id: &str,
    references: &[UsageReference],
    assets: &[Asset],
) -> ResolutionPlan {
    let mut adjusted = group.clone();
    adjusted.canonical_asset_id = keep_asset_id.to_string();
    let mut plan = create_duplicate_resolution_plan(&adjusted);
    plan.proposed_reference_rewrites = crate::remediation::propose_reference_rewrites(
        references,
        assets,
        &plan.target_assets_to_delete,
        keep_asset_id,
    );
    plan
}

pub fn apply_resolution_plan(
    workspace_root: &Path,
    plan: &ResolutionPlan,
    index: &AssetIndex,
    allow_partial: bool,
) -> (ResolutionResult, Vec<(TrashItem, u64)>) {
    let assets = index.assets();
    let assets_by_id: HashMap<&str, &Asset> = assets.iter().map(|a| (a.id.as_str(), a)).collect();
    let trash_mgr = TrashManager::new(workspace_root);

    let mut removed_asset_paths = Vec::new();
    let mut trashed: Vec<(TrashItem, u64)> = Vec::new();
    let mut recovered_bytes = 0u64;
    let mut first_error: Option<String> = None;

    for asset_id in &plan.target_assets_to_delete {
        let Some(asset) = assets_by_id.get(asset_id.as_str()) else {
            first_error = Some(format!(
                "Asset '{asset_id}' from the resolution plan is no longer in the analysis."
            ));
            if !allow_partial {
                break;
            }
            continue;
        };
        match trash_mgr.stage_to_trash(&asset.id, Path::new(&asset.path)) {
            Ok(item) => {
                trashed.push((item, asset.size_bytes));
                removed_asset_paths.push(asset.path.clone());
                recovered_bytes += asset.size_bytes;
            }
            Err(e) => {
                first_error = Some(e.to_string());
                if !allow_partial {
                    break;
                }
            }
        }
    }

    let status = if removed_asset_paths.is_empty() {
        "failed"
    } else {
        "applied"
    };
    let session_id = if trashed.is_empty() {
        None
    } else {
        Some(record_trash_session(workspace_root, &trashed))
    };

    (
        ResolutionResult {
            status: status.to_string(),
            removed_asset_paths,
            recovered_bytes,
            trash_session_id: session_id,
            error: if status == "failed" {
                first_error
            } else {
                None
            },
        },
        trashed,
    )
}

fn sessions_journal_path(workspace_root: &Path) -> PathBuf {
    workspace_root
        .join(".animoria")
        .join("trash")
        .join("sessions.json")
}

pub fn record_trash_session(workspace_root: &Path, trashed: &[(TrashItem, u64)]) -> String {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let session_id = format!("session-{now_ms}");

    let mut sessions = read_sessions(workspace_root);
    sessions.push(SessionManifest {
        id: session_id.clone(),
        timestamp_ms: now_ms,
        items: trashed
            .iter()
            .map(|(item, size_bytes)| SessionItemStored {
                original_path: item.original_path.clone(),
                trash_path: item.trashed_path.clone(),
                size_bytes: *size_bytes,
            })
            .collect(),
    });
    write_sessions(workspace_root, &sessions);
    session_id
}

pub fn read_sessions(workspace_root: &Path) -> Vec<SessionManifest> {
    let path = sessions_journal_path(workspace_root);
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn write_sessions(workspace_root: &Path, sessions: &[SessionManifest]) {
    let path = sessions_journal_path(workspace_root);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(sessions) {
        let _ = fs::write(path, json);
    }
}

pub fn restore_session(workspace_root: &Path, session_id: &str) -> Result<Vec<String>, String> {
    let mut sessions = read_sessions(workspace_root);
    let Some(pos) = sessions.iter().position(|s| s.id == session_id) else {
        return Err(format!("Trash session '{session_id}' was not found."));
    };
    let session = &sessions[pos];

    let trash_mgr = TrashManager::new(workspace_root);
    let mut restored = Vec::new();
    for item in &session.items {
        let trash_item = TrashItem {
            asset_id: String::new(),
            original_path: item.original_path.clone(),
            trashed_path: item.trash_path.clone(),
            trashed_at_ms: session.timestamp_ms,
        };
        trash_mgr
            .restore_from_trash(&trash_item)
            .map_err(|e| e.to_string())?;
        restored.push(item.original_path.clone());
    }

    sessions.remove(pos);
    write_sessions(workspace_root, &sessions);
    Ok(restored)
}
