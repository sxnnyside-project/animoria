use animoria_core::contracts::analysis::{DiagnosticSeverity, LifecycleState};
use animoria_core::indexer::AssetIndex;
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
fn test_golden_1_clean_workspace() {
    let root = fixtures_root().join("clean-workspace");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("clean-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert!(!analysis.assets.is_empty());

    let error_diagnostics: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.severity == DiagnosticSeverity::Error)
        .collect();

    assert_eq!(error_diagnostics.len(), 0);
    assert!(analysis.health_score.score >= 90);
}

#[test]
fn test_golden_2_duplicates_workspace() {
    let root = fixtures_root().join("duplicates");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("duplicates-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert!(!index.duplicate_groups().is_empty());

    let dup_diagnostics: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-duplicate-content")
        .collect();

    assert!(!dup_diagnostics.is_empty());
}

#[test]
fn test_golden_3_empty_workspace() {
    let root = fixtures_root().join("empty-workspace");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("empty-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert_eq!(analysis.assets.len(), 0);
    assert_eq!(analysis.health_score.grade, "N/A");
}

#[test]
fn test_golden_4_malformed_assets_workspace() {
    let root = fixtures_root().join("malformed-assets");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("malformed-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);

    let invalid_assets: Vec<_> = analysis.assets.iter().filter(|a| !a.is_valid).collect();
    assert!(!invalid_assets.is_empty());
}

#[test]
fn test_golden_5_mixed_governance_workspace() {
    let root = fixtures_root().join("mixed-governance");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("mixed-gov-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert!(!analysis.assets.is_empty());

    // Should evaluate multiple rules concurrently (no-gif, max-file-size, no-unreferenced)
    assert!(!analysis.diagnostics.is_empty());
}

#[test]
fn test_golden_6_monorepo_scoped_workspace() {
    let root = fixtures_root().join("monorepo-scoped");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("monorepo-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert!(!analysis.assets.is_empty());
}

#[test]
fn test_golden_7_multi_root_workspace() {
    let root = fixtures_root().join("multi-root-workspace");
    if !root.exists() { return; }

    // Test multi-root isolation: root-a, root-b, root-c
    let roots = ["root-a", "root-b", "root-c"];
    for sub in &roots {
        let sub_path = root.join(sub);
        if sub_path.is_dir() {
            let mut index = AssetIndex::new(format!("multi-{}", sub), sub_path);
            let analysis = index.scan_workspace(&[]).expect("Scan should succeed");
            assert_eq!(analysis.state, LifecycleState::Ready);
        }
    }
}

#[test]
fn test_golden_8_reference_edge_cases_workspace() {
    let root = fixtures_root().join("reference-edge-cases");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("edge-cases-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert!(!analysis.assets.is_empty());
}

#[test]
fn test_golden_9_reference_formats_workspace() {
    let root = fixtures_root().join("reference-formats");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("ref-formats-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert!(!index.references().is_empty());
}

#[test]
fn test_golden_10_unreferenced_assets_workspace() {
    let root = fixtures_root().join("unreferenced-assets");
    if !root.exists() { return; }

    let mut index = AssetIndex::new("unref-ws".to_string(), root);
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);

    let unref_diagnostics: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    assert!(!unref_diagnostics.is_empty());
}
