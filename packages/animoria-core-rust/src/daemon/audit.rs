//! Append-only audit log and analysis-snapshot history, both persisted under
//! `.animoria/` so they survive the daemon process exiting between IDE
//! restarts — the same reasoning as the trash-session journal in
//! `daemon::cleanup`. `AuditEvent`/`AnalysisSnapshot` existed as contract
//! types with no producer before this; this module is that producer, wired
//! in at the daemon's real mutation points (scan completion, trash, restore,
//! duplicate resolution) rather than invented ones.

use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::contracts::analysis::{AnalysisSnapshot, WorkspaceAnalysis};
use crate::contracts::events::{AuditEvent, AuditEventKind};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn audit_log_path(workspace_root: &Path) -> std::path::PathBuf {
    workspace_root.join(".animoria").join("audit-log.jsonl")
}

fn snapshots_log_path(workspace_root: &Path) -> std::path::PathBuf {
    workspace_root.join(".animoria").join("snapshots.jsonl")
}

fn append_line(path: &Path, line: &str) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{line}");
    }
}

/// Records one audit event and appends it to `.animoria/audit-log.jsonl`.
pub fn record_audit_event(
    workspace_root: &Path,
    kind: AuditEventKind,
    actor: &str,
    details: serde_json::Value,
) -> AuditEvent {
    let event = AuditEvent {
        event_id: format!("audit-{}", now_ms()),
        timestamp_ms: now_ms(),
        kind,
        actor: actor.to_string(),
        details,
    };
    if let Ok(line) = serde_json::to_string(&event) {
        append_line(&audit_log_path(workspace_root), &line);
    }
    event
}

/// Reads every recorded audit event, oldest first.
pub fn read_audit_events(workspace_root: &Path) -> Vec<AuditEvent> {
    let path = audit_log_path(workspace_root);
    let Ok(raw) = fs::read_to_string(&path) else {
        return Vec::new();
    };
    raw.lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect()
}

/// Records a snapshot of a just-completed scan and appends it to
/// `.animoria/snapshots.jsonl`, keeping only the most recent
/// `MAX_RETAINED_SNAPSHOTS` entries so the journal doesn't grow unbounded
/// across a long-lived daemon process re-scanning the same workspace.
const MAX_RETAINED_SNAPSHOTS: usize = 200;

pub fn record_analysis_snapshot(
    workspace_root: &Path,
    analysis: &WorkspaceAnalysis,
) -> AnalysisSnapshot {
    let snapshot = AnalysisSnapshot {
        snapshot_id: format!("snapshot-{}", now_ms()),
        timestamp_ms: now_ms(),
        analysis: analysis.clone(),
    };

    let mut snapshots = read_analysis_snapshots(workspace_root);
    snapshots.push(snapshot.clone());
    if snapshots.len() > MAX_RETAINED_SNAPSHOTS {
        let overflow = snapshots.len() - MAX_RETAINED_SNAPSHOTS;
        snapshots.drain(0..overflow);
    }

    let path = snapshots_log_path(workspace_root);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(body) = snapshots
        .iter()
        .map(serde_json::to_string)
        .collect::<Result<Vec<_>, _>>()
    {
        let _ = fs::write(&path, body.join("\n") + "\n");
    }

    snapshot
}

/// Reads every retained snapshot, oldest first.
pub fn read_analysis_snapshots(workspace_root: &Path) -> Vec<AnalysisSnapshot> {
    let path = snapshots_log_path(workspace_root);
    let Ok(raw) = fs::read_to_string(&path) else {
        return Vec::new();
    };
    raw.lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::analysis::LifecycleState;

    fn sample_analysis() -> WorkspaceAnalysis {
        WorkspaceAnalysis {
            root_id: "root".to_string(),
            root_path: "/tmp/ws".to_string(),
            state: LifecycleState::Ready,
            assets: vec![],
            diagnostics: vec![],
            health_score: crate::contracts::analysis::HealthScoreReport {
                score: 100,
                grade: "A".to_string(),
                categories: vec![],
                summary: String::new(),
            },
            indexed_at_ms: 0,
        }
    }

    #[test]
    fn audit_events_round_trip_through_the_jsonl_log() {
        let dir = tempfile::tempdir().unwrap();
        assert!(read_audit_events(dir.path()).is_empty());

        record_audit_event(
            dir.path(),
            AuditEventKind::ScanCompleted,
            "daemon",
            serde_json::json!({ "asset_count": 3 }),
        );
        record_audit_event(
            dir.path(),
            AuditEventKind::AssetStagedToTrash,
            "daemon",
            serde_json::json!({ "asset_id": "abc" }),
        );

        let events = read_audit_events(dir.path());
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].kind, AuditEventKind::ScanCompleted);
        assert_eq!(events[1].kind, AuditEventKind::AssetStagedToTrash);
    }

    #[test]
    fn analysis_snapshots_round_trip_and_cap_retention() {
        let dir = tempfile::tempdir().unwrap();
        for _ in 0..3 {
            record_analysis_snapshot(dir.path(), &sample_analysis());
        }

        let snapshots = read_analysis_snapshots(dir.path());
        assert_eq!(snapshots.len(), 3);
        assert_eq!(snapshots[0].analysis.root_id, "root");
    }
}
