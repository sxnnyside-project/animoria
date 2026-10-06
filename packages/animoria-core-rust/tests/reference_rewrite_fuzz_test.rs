//! Property-based fuzzing for reference rewriting and safe AST/string replacement.
//!
//! Asserts that arbitrary strings (unbalanced quotes, exotic unicode, backslashes,
//! regex metas, control characters, and truncated tokens) NEVER panic the rewriter,
//! and that the safety invariant ("a line that does not strictly match original_line is never modified")
//! holds under any input space.

use animoria_core::contracts::asset::{Asset, AssetFormat, AssetKind};
use animoria_core::contracts::remediation::ReferenceRewriteProposal;
use animoria_core::contracts::usage::UsageReference;
use animoria_core::remediation::{apply_reference_rewrite, propose_reference_rewrites};
use proptest::prelude::*;
use std::fs;
use tempfile::tempdir;

fn sample_asset(id: &str, path: &str, name: &str) -> Asset {
    Asset {
        id: id.to_string(),
        path: path.to_string(),
        relative_path: name.to_string(),
        name: name.to_string(),
        stem: name.split('.').next().unwrap_or(name).to_string(),
        size_bytes: 100,
        mtime_ms: 1000,
        kind: AssetKind::Static,
        format: AssetFormat::Svg,
        content_hash: Some("deadbeef".to_string()),
        dimensions: None,
        motion: None,
        static_meta: None,
        thumbnail_path: None,
        is_valid: true,
        error: None,
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn propose_reference_rewrites_survives_arbitrary_line_content(
        line_content in "\\PC*",
        asset_name in "[a-zA-Z0-9_-]{1,16}\\.(svg|png|json)"
    ) {
        let old_path = format!("/ws/src/assets/{asset_name}");
        let canonical_path = "/ws/src/assets/canonical-icon.svg";

        let assets = vec![
            sample_asset("old-1", &old_path, &asset_name),
            sample_asset("canonical-1", canonical_path, "canonical-icon.svg"),
        ];

        let usage = UsageReference {
            asset_id: old_path.clone(),
            file_path: "/ws/src/App.tsx".to_string(),
            relative_file_path: "src/App.tsx".to_string(),
            line_number: 1,
            line_content: line_content.clone(),
            syntax_type: "jsx-attribute".to_string(),
            confidence: "high".to_string(),
        };

        // Must never panic regardless of arbitrary characters in line_content
        let proposals = propose_reference_rewrites(&[usage], &assets, &["old-1".to_string()], "canonical-1");

        // If a proposal was generated, verify structural sanity
        for p in proposals {
            prop_assert_eq!(&p.original_line, &line_content);
            prop_assert!(!p.proposed_line.is_empty());
        }
    }

    #[test]
    fn apply_reference_rewrite_safely_refuses_mismatched_lines_on_arbitrary_input(
        file_body in prop::collection::vec("\\PC*", 1..10),
        mismatched_query in "\\PC*"
    ) {
        let dir = tempdir().unwrap();
        let target_file = dir.path().join("source.tsx");
        fs::write(&target_file, file_body.join("\n")).unwrap();

        let proposal = ReferenceRewriteProposal {
            file_path: target_file.to_string_lossy().to_string(),
            line_number: 1,
            original_line: format!("{mismatched_query}__definitely_different_salt_1234"),
            proposed_line: "import canonical from './canonical.svg';".to_string(),
        };

        // Invariant: If original_line does not match line 1, apply_reference_rewrite MUST return Err
        // and NEVER panic or write partial data.
        let result = apply_reference_rewrite(&proposal, dir.path());
        prop_assert!(result.is_err());
    }

    #[test]
    fn apply_reference_rewrite_strictly_updates_matching_line(
        prefix in "[a-zA-Z0-9_ ]{0,20}",
        suffix in "[a-zA-Z0-9_ ]{0,20}"
    ) {
        let dir = tempdir().unwrap();
        let target_file = dir.path().join("source.tsx");
        let orig_line = format!("{prefix}import icon from './old.svg';{suffix}");
        let proposed = format!("{prefix}import icon from './canonical.svg';{suffix}");

        let initial_content = format!("// header\n{}\n// footer\n", orig_line);
        fs::write(&target_file, &initial_content).unwrap();

        let proposal = ReferenceRewriteProposal {
            file_path: target_file.to_string_lossy().to_string(),
            line_number: 2,
            original_line: orig_line.clone(),
            proposed_line: proposed.clone(),
        };

        let result = apply_reference_rewrite(&proposal, dir.path());
        prop_assert!(result.is_ok());

        let updated_content = fs::read_to_string(&target_file).unwrap();
        let lines: Vec<&str> = updated_content.lines().collect();
        prop_assert_eq!(lines[0], "// header");
        prop_assert_eq!(lines[1], proposed.as_str());
        prop_assert_eq!(lines[2], "// footer");
    }
}
