//! Property-based fuzzing for the format parsers.
//!
//! Every other parser test (`deep_parsers_test.rs`, `golden_corpus_parity_test.rs`)
//! writes hand-crafted, well-formed-or-deliberately-broken fixtures. None of
//! them generate arbitrary bytes — but the parsers' actual job is enriching
//! metadata for files nobody here wrote: real Lottie/Rive/raster assets a
//! developer dropped into their repo, any one of which could be truncated,
//! corrupted, or simply not what its extension claims. `ParserRegistry`'s own
//! invariant ("Parser failure NEVER drops the asset — it marks `is_valid:
//! false`") is a promise that arbitrary bytes never panic the scan; this is
//! what actually holds that promise to a large, varied input space rather
//! than the handful of cases a human thought to write.

use animoria_core::indexer::AssetIndex;
use proptest::prelude::*;
use std::fs::{self, File};
use std::io::Write;

fn scan_one_random_file(extension: &str, bytes: &[u8]) {
    let dir = tempfile::tempdir().expect("tempdir");
    let file_path = dir.path().join(format!("asset.{extension}"));
    {
        let mut f = File::create(&file_path).expect("create fixture file");
        f.write_all(bytes).expect("write fixture bytes");
    }

    let mut index = AssetIndex::new(
        dir.path().to_string_lossy().to_string(),
        dir.path().to_path_buf(),
    );

    // The only assertion that matters for a fuzz test: this must not panic,
    // regardless of how malformed `bytes` is. A parser that panics here would
    // take the whole daemon process down over one bad file in a real
    // workspace — every other asset's analysis lost with it.
    let analysis = index.scan_workspace(&[]).expect("scan must not error out");

    // Not asserting exactly one asset: for extensions like `.json`, format
    // *discovery* (`parser::heuristics::detect_format`) itself requires
    // Lottie-shaped content (valid UTF-8, starts with `{`) before something
    // is even considered a visual asset at all — correctly, since otherwise
    // every `package.json` in a repo would show up in the asset gallery.
    // Arbitrary bytes are almost never valid UTF-8, so 0 assets is the
    // *correct* outcome there, not a dropped asset. What every extension
    // must guarantee is "at most the one file present, never a panic."
    assert!(
        analysis.assets.len() <= 1,
        "scanning one file must never fabricate more than one asset"
    );
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn lottie_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("json", &bytes);
    }

    #[test]
    fn dotlottie_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("lottie", &bytes);
    }

    #[test]
    fn rive_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("riv", &bytes);
    }

    #[test]
    fn svg_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("svg", &bytes);
    }

    #[test]
    fn png_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("png", &bytes);
    }

    #[test]
    fn gif_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("gif", &bytes);
    }

    #[test]
    fn webp_parser_survives_arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        scan_one_random_file("webp", &bytes);
    }

    /// Bytes that start with each format's real magic number but are
    /// truncated or corrupted right after — the case a pure-random byte
    /// string almost never produces on its own (real magic bytes are a tiny
    /// fraction of the byte space) but that a real half-downloaded or
    /// git-merge-conflicted asset produces often.
    #[test]
    fn png_parser_survives_truncated_after_valid_signature(tail in prop::collection::vec(any::<u8>(), 0..256)) {
        let mut bytes = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        bytes.extend_from_slice(&tail);
        scan_one_random_file("png", &bytes);
    }

    #[test]
    fn gif_parser_survives_truncated_after_valid_signature(tail in prop::collection::vec(any::<u8>(), 0..256)) {
        let mut bytes = b"GIF89a".to_vec();
        bytes.extend_from_slice(&tail);
        scan_one_random_file("gif", &bytes);
    }

    #[test]
    fn rive_parser_survives_truncated_after_valid_signature(tail in prop::collection::vec(any::<u8>(), 0..256)) {
        let mut bytes = b"RIVE".to_vec();
        bytes.extend_from_slice(&tail);
        scan_one_random_file("riv", &bytes);
    }

    /// The random-bytes `.json` cases above almost never pass
    /// `detect_lottie_json`'s sniff (needs valid UTF-8 starting with `{` and
    /// the `v`/`fr`/`layers` keys), so they never actually reach
    /// `parse_lottie`. This wraps arbitrary garbage inside a shell that does
    /// pass the sniff, so the deep parser itself — not just discovery — gets
    /// fuzzed with malformed `layers`/`fr`/`ip`/`op` content.
    #[test]
    fn lottie_deep_parser_survives_malformed_content_past_discovery(garbage in "[^\"\\\\]{0,200}") {
        let bytes = format!(
            r#"{{"v":"5.5.7","fr":{garbage},"ip":0,"op":{garbage},"layers":{garbage}}}"#
        );
        let dir = tempfile::tempdir().expect("tempdir");
        let file_path = dir.path().join("asset.json");
        fs::write(&file_path, bytes.as_bytes()).expect("write fixture");

        let mut index = AssetIndex::new(
            dir.path().to_string_lossy().to_string(),
            dir.path().to_path_buf(),
        );
        let analysis = index.scan_workspace(&[]).expect("scan must not error out");
        // This one *should* be discovered — it passes the sniff — so unlike
        // the pure-random case, dropping it here would be the real invariant
        // violation the other cases can't observe.
        assert_eq!(analysis.assets.len(), 1);
    }
}

#[test]
fn empty_files_never_panic_any_parser() {
    for ext in ["json", "lottie", "riv", "svg", "png", "gif", "webp"] {
        scan_one_random_file(ext, &[]);
    }
}

#[test]
fn multiple_malformed_assets_in_one_workspace_all_survive() {
    // The single-asset case above proves each parser individually never
    // panics; this proves a workspace with several simultaneously-broken
    // assets of different formats scans to completion as one batch, which is
    // the shape a real corrupted-repo scan actually takes.
    let dir = tempfile::tempdir().expect("tempdir");
    let fixtures: &[(&str, &[u8])] = &[
        ("a.json", b"not json at all {{{"),
        ("b.lottie", b"PK\x03\x04garbage"),
        ("c.riv", b"RIVEbut-not-really"),
        ("d.png", &[0x89, 0x50, 0x4E, 0x47]),
        ("e.gif", b"GIF87a"),
        ("f.svg", b"<svg><unclosed"),
    ];
    for (name, bytes) in fixtures {
        let path = dir.path().join(name);
        fs::write(&path, bytes).expect("write fixture");
    }

    let mut index = AssetIndex::new(
        dir.path().to_string_lossy().to_string(),
        dir.path().to_path_buf(),
    );
    let analysis = index.scan_workspace(&[]).expect("scan must not error out");
    assert!(
        analysis.assets.len() <= fixtures.len(),
        "scanning must never fabricate more assets than files present"
    );
}
