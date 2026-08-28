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
    assert!(scan_val["analysis"]["assets"].as_array().unwrap().len() > 0);

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
    assert!(plan_val["target_assets_to_delete"].as_array().unwrap().len() > 0);

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
