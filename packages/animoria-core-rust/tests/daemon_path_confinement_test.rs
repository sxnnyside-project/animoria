use animoria_core::daemon::server::{DaemonRequest, DaemonServer, PROTOCOL_VERSION};
use std::fs;

fn call(
    server: &mut DaemonServer,
    method: &str,
    params: serde_json::Value,
) -> animoria_core::daemon::server::DaemonResponse {
    server
        .handle_request(DaemonRequest {
            protocol: PROTOCOL_VERSION,
            id: format!("req-{method}"),
            method: method.to_string(),
            params,
        })
        .0
}

fn scanned_workspace() -> (tempfile::TempDir, DaemonServer) {
    let ws = tempfile::tempdir().unwrap();
    fs::write(
        ws.path().join("anim.json"),
        r#"{"v":"5.7.0","fr":30,"ip":0,"op":60,"w":10,"h":10,"layers":[]}"#,
    )
    .unwrap();
    let mut server = DaemonServer::new();
    let scan = call(
        &mut server,
        "scan",
        serde_json::json!({ "workspace_path": ws.path() }),
    );
    assert!(scan.error.is_none());
    (ws, server)
}

#[test]
fn trash_and_restore_refuse_workspaces_the_daemon_has_not_scanned() {
    let (ws, mut server) = scanned_workspace();
    let outside = tempfile::tempdir().unwrap();
    let victim = outside.path().join("secret.txt");
    fs::write(&victim, "keep me").unwrap();

    // Naming a parent (or `/`-like) root must not widen the boundary.
    let trash = call(
        &mut server,
        "trash_asset",
        serde_json::json!({
            "workspace_path": outside.path(),
            "asset_id": "x",
            "file_path": victim,
        }),
    );
    assert_eq!(trash.error.as_ref().unwrap().code, "mutation-refused");
    assert!(victim.exists());
    assert!(!outside.path().join(".animoria").exists());

    let restore = call(
        &mut server,
        "restore_asset",
        serde_json::json!({
            "workspace_path": outside.path(),
            "trash_item": { "asset_id": "x", "original_path": victim, "trashed_path": victim, "trashed_at_ms": 0 },
        }),
    );
    assert_eq!(restore.error.as_ref().unwrap().code, "mutation-refused");

    // The scanned workspace still works.
    let ok = call(
        &mut server,
        "trash_asset",
        serde_json::json!({
            "workspace_path": ws.path(),
            "asset_id": "a",
            "file_path": ws.path().join("anim.json"),
        }),
    );
    assert!(ok.error.is_none(), "{:?}", ok.error);
    assert!(!ws.path().join("anim.json").exists());
}

#[test]
fn get_lottie_document_only_reads_indexed_assets() {
    let (ws, mut server) = scanned_workspace();
    let outside = tempfile::tempdir().unwrap();
    let other = outside.path().join("other.json");
    fs::write(&other, r#"{"fr":30,"ip":0,"op":60,"layers":[]}"#).unwrap();

    let refused = call(
        &mut server,
        "getLottieDocument",
        serde_json::json!({ "workspacePath": ws.path(), "assetPath": other }),
    );
    assert!(refused.result.unwrap()["animation"].is_null());

    let anim = fs::canonicalize(ws.path().join("anim.json")).unwrap();
    let allowed = call(
        &mut server,
        "getLottieDocument",
        serde_json::json!({ "workspacePath": ws.path(), "assetPath": anim }),
    );
    assert!(!allowed.result.unwrap()["animation"].is_null());
}

#[test]
fn get_lottie_document_without_workspace_path_works_across_several_scanned_roots() {
    let (ws_a, mut server) = scanned_workspace();
    let (ws_b, _) = scanned_workspace();
    let scan = call(
        &mut server,
        "scan",
        serde_json::json!({ "workspace_path": ws_b.path() }),
    );
    assert!(scan.error.is_none());

    let anim = fs::canonicalize(ws_a.path().join("anim.json")).unwrap();
    let doc = call(
        &mut server,
        "getLottieDocument",
        serde_json::json!({ "assetPath": anim }),
    );
    assert!(!doc.result.unwrap()["animation"].is_null());
}

#[test]
fn restore_asset_works_on_a_fresh_daemon_that_has_not_scanned() {
    let (ws, mut first) = scanned_workspace();
    let file = ws.path().join("anim.json");
    let trashed = call(
        &mut first,
        "trash_asset",
        serde_json::json!({ "workspace_path": ws.path(), "asset_id": "a", "file_path": file }),
    );
    let item = trashed.result.unwrap();
    assert!(!file.exists());

    // A restarted daemon has scanned nothing, yet Undo must still work.
    let mut restarted = DaemonServer::new();
    let restored = call(
        &mut restarted,
        "restore_asset",
        serde_json::json!({ "workspace_path": ws.path(), "trash_item": item }),
    );
    assert!(restored.error.is_none(), "{:?}", restored.error);
    assert!(file.exists());
}

#[test]
fn apply_reference_rewrite_only_touches_scanned_workspaces_and_traced_lines() {
    let ws = tempfile::tempdir().unwrap();
    fs::create_dir_all(ws.path().join("src")).unwrap();
    fs::write(ws.path().join("old.png"), b"png").unwrap();
    let source = ws.path().join("src/App.tsx");
    fs::write(&source, "import a from '../old.png';\nconst other = 1;\n").unwrap();

    let mut server = DaemonServer::new();
    let refused_unscanned = call(
        &mut server,
        "applyReferenceRewrite",
        serde_json::json!({
            "workspace_path": ws.path(),
            "proposal": { "file_path": source, "line_number": 2,
                "original_line": "const other = 1;", "proposed_line": "const other = 2;" },
        }),
    );
    assert_eq!(refused_unscanned.error.unwrap().code, "invalid-params");

    assert!(call(
        &mut server,
        "scan",
        serde_json::json!({ "workspace_path": ws.path() })
    )
    .error
    .is_none());

    // The line exists and matches, but the scan never traced it as an asset reference.
    let refused_untraced = call(
        &mut server,
        "applyReferenceRewrite",
        serde_json::json!({
            "workspace_path": ws.path(),
            "proposal": { "file_path": source, "line_number": 2,
                "original_line": "const other = 1;", "proposed_line": "const other = 2;" },
        }),
    );
    assert_eq!(refused_untraced.error.unwrap().code, "mutation-refused");
    assert!(fs::read_to_string(&source)
        .unwrap()
        .contains("const other = 1;"));

    let traced_file = fs::canonicalize(&source).unwrap();
    let applied = call(
        &mut server,
        "applyReferenceRewrite",
        serde_json::json!({
            "workspace_path": ws.path(),
            "proposal": { "file_path": traced_file, "line_number": 1,
                "original_line": "import a from '../old.png';",
                "proposed_line": "import a from '../new.png';" },
        }),
    );
    assert!(applied.error.is_none(), "{:?}", applied.error);
    assert!(fs::read_to_string(&source)
        .unwrap()
        .starts_with("import a from '../new.png';"));
}
