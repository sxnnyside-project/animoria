use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn resolve_binary() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let debug_bin = manifest_dir.join("target/debug/animoria");
    if debug_bin.exists() {
        return debug_bin;
    }
    // Alternatively look in workspace target
    let ws_bin = manifest_dir
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("target/debug/animoria");
    if ws_bin.exists() {
        return ws_bin;
    }
    // Fallback to cargo-built binary under CARGO_BIN_EXE_animoria
    if let Ok(exe) = std::env::var("CARGO_BIN_EXE_animoria") {
        return PathBuf::from(exe);
    }
    debug_bin
}

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("fixtures")
}

#[test]
fn test_daemon_subprocess_real_pipes_lifecycle() {
    let bin = resolve_binary();
    if !bin.exists() {
        // If binary hasn't been built yet in this target, skip or assert
        eprintln!(
            "Binary not found at {}, building or skipping",
            bin.display()
        );
    }

    let mut child = Command::new(&bin)
        .arg("daemon")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("Failed to spawn animoria daemon subprocess");

    let mut stdin = child.stdin.take().expect("Child stdin pipe");
    let stdout = child.stdout.take().expect("Child stdout pipe");
    let mut reader = BufReader::new(stdout);

    // 1. Initial ready event on startup
    let mut line = String::new();
    reader.read_line(&mut line).expect("Read ready event");
    let ready_val: serde_json::Value = serde_json::from_str(line.trim()).expect("Parse ready JSON");
    assert_eq!(ready_val["protocol"], 1);
    assert_eq!(ready_val["event"], "ready");

    // 2. Hello request
    writeln!(
        stdin,
        "{{\"protocol\":1,\"id\":\"req-hello\",\"method\":\"hello\",\"params\":{{}}}}"
    )
    .expect("Write hello");
    line.clear();
    reader.read_line(&mut line).expect("Read hello response");
    let hello_resp: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse hello response");
    assert_eq!(hello_resp["protocol"], 1);
    assert_eq!(hello_resp["id"], "req-hello");
    assert_eq!(hello_resp["result"]["engine"], "animoria-core-rust");
    assert_eq!(hello_resp["result"]["protocol_version"], 1);

    // 3. Ping request
    writeln!(
        stdin,
        "{{\"protocol\":1,\"id\":\"req-ping\",\"method\":\"ping\",\"params\":{{}}}}"
    )
    .expect("Write ping");
    line.clear();
    reader.read_line(&mut line).expect("Read ping response");
    let ping_resp: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse ping response");
    assert_eq!(ping_resp["protocol"], 1);
    assert_eq!(ping_resp["id"], "req-ping");
    assert_eq!(ping_resp["result"]["ready"], true);

    // 4. Scan clean-workspace fixture
    let clean_ws = fixtures_root().join("clean-workspace");
    let ws_path = clean_ws.to_string_lossy().to_string();
    writeln!(
        stdin,
        "{{\"protocol\":1,\"id\":\"req-scan\",\"method\":\"scan\",\"params\":{{\"workspace_path\":\"{}\"}}}}",
        ws_path
    )
    .expect("Write scan");

    // Expect analysis-started event
    line.clear();
    reader
        .read_line(&mut line)
        .expect("Read analysis-started event");
    let started_val: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse started event");
    assert_eq!(started_val["protocol"], 1);
    assert_eq!(started_val["event"], "analysis-started");

    // Expect scan response
    line.clear();
    reader.read_line(&mut line).expect("Read scan response");
    let scan_resp: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse scan response");
    assert_eq!(scan_resp["protocol"], 1);
    assert_eq!(scan_resp["id"], "req-scan");
    assert!(scan_resp["error"].is_null());
    let assets = scan_resp["result"]["analysis"]["assets"]
        .as_array()
        .expect("Assets array");
    assert!(!assets.is_empty());

    // Expect analysis-completed event
    line.clear();
    reader
        .read_line(&mut line)
        .expect("Read analysis-completed event");
    let completed_val: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse completed event");
    assert_eq!(completed_val["protocol"], 1);
    assert_eq!(completed_val["event"], "analysis-completed");

    // 5. Malformed request resilience (must return error, not crash)
    writeln!(stdin, "{{not-valid-json}}").expect("Write malformed json");
    line.clear();
    reader
        .read_line(&mut line)
        .expect("Read malformed response");
    let malformed_resp: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse malformed response");
    assert_eq!(malformed_resp["error"]["code"], "invalid-request");

    // 6. Unsupported version resilience
    writeln!(
        stdin,
        "{{\"protocol\":999,\"id\":\"req-v999\",\"method\":\"ping\",\"params\":{{}}}}"
    )
    .expect("Write v999");
    line.clear();
    reader.read_line(&mut line).expect("Read v999 response");
    let v999_resp: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse v999 response");
    assert_eq!(v999_resp["error"]["code"], "unsupported-version");

    // 7. Graceful shutdown
    writeln!(
        stdin,
        "{{\"protocol\":1,\"id\":\"req-exit\",\"method\":\"shutdown\",\"params\":{{}}}}"
    )
    .expect("Write shutdown");
    line.clear();
    reader.read_line(&mut line).expect("Read shutdown response");
    let shutdown_resp: serde_json::Value =
        serde_json::from_str(line.trim()).expect("Parse shutdown response");
    assert_eq!(shutdown_resp["result"]["shutdown"], true);

    let status = child.wait().expect("Child process exit");
    assert!(
        status.success(),
        "Daemon process should exit cleanly with code 0"
    );
}
