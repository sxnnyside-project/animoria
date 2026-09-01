use animoria_core::daemon::server::{DaemonRequest, DaemonServer, PROTOCOL_VERSION};
use std::path::PathBuf;

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("fixtures")
}

#[test]
fn test_daemon_protocol_lifecycle() {
    let mut server = DaemonServer::new();

    // 1. Hello Handshake (Protocol v1)
    let hello_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-1".to_string(),
        method: "hello".to_string(),
        params: serde_json::json!({}),
    };
    let (hello_resp, should_exit) = server.handle_request(hello_req);
    assert_eq!(hello_resp.protocol, 1);
    assert_eq!(hello_resp.id, "req-1");
    assert!(hello_resp.error.is_none());
    assert!(!should_exit);
    let hello_val = hello_resp.result.expect("Result expected");
    assert_eq!(hello_val["engine"], "animoria-core-rust");
    assert_eq!(hello_val["protocol_version"], 1);
    assert_eq!(hello_val["version"], env!("CARGO_PKG_VERSION"));

    // 1.5 Ping — liveness, independent of any scan having run
    let ping_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-ping".to_string(),
        method: "ping".to_string(),
        params: serde_json::json!({}),
    };
    let (ping_resp, should_exit) = server.handle_request(ping_req);
    assert!(ping_resp.error.is_none());
    assert!(!should_exit);
    let ping_val = ping_resp.result.expect("Result expected");
    assert_eq!(ping_val["ready"], true);
    assert!(ping_val["uptime_ms"].as_u64().is_some());

    // 1.6 Aggregate health scores across simulated multi-root results — the
    // daemon does this weighting so no host has to reimplement it.
    let aggregate_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-aggregate".to_string(),
        method: "aggregateHealthScores".to_string(),
        params: serde_json::json!({
            "roots": [
                { "report": { "score": 40, "grade": "F", "categories": [], "summary": "" }, "asset_count": 5 },
                { "report": { "score": 95, "grade": "A", "categories": [], "summary": "" }, "asset_count": 500 }
            ]
        }),
    };
    let (aggregate_resp, should_exit) = server.handle_request(aggregate_req);
    assert!(aggregate_resp.error.is_none());
    assert!(!should_exit);
    let aggregate_val = aggregate_resp.result.expect("Result expected");
    assert_eq!(aggregate_val["score"], 94);
    assert_eq!(aggregate_val["grade"], "A");

    // 2. Scan Workspace Request (clean-workspace)
    let clean_ws = fixtures_root().join("clean-workspace");
    let scan_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-2".to_string(),
        method: "scan".to_string(),
        params: serde_json::json!({
            "workspace_path": clean_ws.to_string_lossy().to_string()
        }),
    };
    let (scan_resp, should_exit) = server.handle_request(scan_req);
    assert_eq!(scan_resp.protocol, 1);
    assert_eq!(scan_resp.id, "req-2");
    assert!(scan_resp.error.is_none());
    assert!(!should_exit);
    let scan_val = scan_resp.result.expect("Scan result expected");
    assert!(!scan_val["analysis"]["assets"]
        .as_array()
        .unwrap()
        .is_empty());

    // 2.5 A completed scan must produce a real AnalysisSnapshot and a
    // ScanCompleted AuditEvent, both retrievable afterward — not just
    // contract types with no producer.
    let snapshots_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-snapshots".to_string(),
        method: "listAnalysisSnapshots".to_string(),
        params: serde_json::json!({ "workspace_path": clean_ws.to_string_lossy().to_string() }),
    };
    let (snapshots_resp, _) = server.handle_request(snapshots_req);
    let snapshots_val = snapshots_resp.result.expect("snapshots result expected");
    let snapshots = snapshots_val.as_array().expect("snapshots array");
    assert!(
        !snapshots.is_empty(),
        "scan must record at least one AnalysisSnapshot"
    );

    let audit_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-audit".to_string(),
        method: "listAuditEvents".to_string(),
        params: serde_json::json!({ "workspace_path": clean_ws.to_string_lossy().to_string() }),
    };
    let (audit_resp, _) = server.handle_request(audit_req);
    let audit_val = audit_resp.result.expect("audit result expected");
    let audit_events = audit_val.as_array().expect("audit events array");
    assert!(
        audit_events.iter().any(|e| e["kind"] == "scan-completed"),
        "scan must record a ScanCompleted audit event"
    );

    // 3. Scan Duplicates Workspace (same alive server instance)
    let dup_ws = fixtures_root().join("duplicates");
    let dup_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-3".to_string(),
        method: "scan".to_string(),
        params: serde_json::json!({
            "workspace_path": dup_ws.to_string_lossy().to_string()
        }),
    };
    let (dup_resp, should_exit) = server.handle_request(dup_req);
    assert_eq!(dup_resp.protocol, 1);
    assert_eq!(dup_resp.id, "req-3");
    assert!(dup_resp.error.is_none());
    assert!(!should_exit);
    let dup_val = dup_resp.result.expect("Dup result expected");
    let dup_groups = dup_val["duplicate_groups"].as_array().unwrap();
    assert!(!dup_groups.is_empty());

    // 4. Remediate Plan Generation on Duplicate Group
    let plan_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-4".to_string(),
        method: "remediate_plan".to_string(),
        params: serde_json::json!({
            "duplicate_group": dup_groups[0]
        }),
    };
    let (plan_resp, should_exit) = server.handle_request(plan_req);
    assert_eq!(plan_resp.protocol, 1);
    assert_eq!(plan_resp.id, "req-4");
    assert!(plan_resp.error.is_none());
    assert!(!should_exit);
    let plan_val = plan_resp.result.expect("Plan result expected");
    assert!(!plan_val["target_assets_to_delete"]
        .as_array()
        .unwrap()
        .is_empty());

    // 4.5 `remediate_plan` — VS Code's only path to a resolution plan, which
    // takes no `workspace_path` — must still compute reference-rewrite
    // proposals when exactly one root is scanned, by falling back to that
    // sole index rather than staying in the old context-free, always-empty
    // path now that a second root (`dup_ws`) isn't in the mix here.
    let mut single_root_server = DaemonServer::new();
    let single_scan_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-single-scan".to_string(),
        method: "scan".to_string(),
        params: serde_json::json!({
            "workspace_path": dup_ws.to_string_lossy().to_string()
        }),
    };
    let (single_scan_resp, _) = single_root_server.handle_request(single_scan_req);
    let single_scan_val = single_scan_resp.result.expect("scan result expected");
    let single_dup_groups = single_scan_val["duplicate_groups"].as_array().unwrap();
    assert!(!single_dup_groups.is_empty());

    let mut any_rewrites = false;
    for (i, group) in single_dup_groups.iter().enumerate() {
        let single_plan_req = DaemonRequest {
            protocol: PROTOCOL_VERSION,
            id: format!("req-single-plan-{i}"),
            method: "remediate_plan".to_string(),
            params: serde_json::json!({ "duplicate_group": group }),
        };
        let (single_plan_resp, _) = single_root_server.handle_request(single_plan_req);
        let single_plan_val = single_plan_resp.result.expect("plan result expected");
        let rewrites = single_plan_val["proposed_reference_rewrites"]
            .as_array()
            .expect("proposed_reference_rewrites array");
        if !rewrites.is_empty() {
            any_rewrites = true;
        }
    }
    assert!(
        any_rewrites,
        "remediate_plan should propose reference rewrites for at least one duplicate group when exactly one root is scanned"
    );

    // 5. Unsupported Method Error Handling
    let bad_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-5".to_string(),
        method: "unknown_command".to_string(),
        params: serde_json::json!({}),
    };
    let (bad_resp, should_exit) = server.handle_request(bad_req);
    assert_eq!(bad_resp.id, "req-5");
    let err = bad_resp.error.expect("Error expected");
    assert_eq!(err.code, "unsupported-method");
    assert!(!should_exit);

    // 6. Unsupported Protocol Version Error Handling
    let bad_ver_req = DaemonRequest {
        protocol: 999,
        id: "req-6".to_string(),
        method: "hello".to_string(),
        params: serde_json::json!({}),
    };
    let (bad_ver_resp, should_exit) = server.handle_request(bad_ver_req);
    assert_eq!(bad_ver_resp.id, "req-6");
    let ver_err = bad_ver_resp.error.expect("Version error expected");
    assert_eq!(ver_err.code, "unsupported-version");
    assert!(!should_exit);

    // 7. Graceful Shutdown
    let shutdown_req = DaemonRequest {
        protocol: PROTOCOL_VERSION,
        id: "req-7".to_string(),
        method: "shutdown".to_string(),
        params: serde_json::json!({}),
    };
    let (shutdown_resp, should_exit) = server.handle_request(shutdown_req);
    assert_eq!(shutdown_resp.id, "req-7");
    assert!(shutdown_resp.error.is_none());
    assert!(should_exit);
}
