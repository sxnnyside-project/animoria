use animoria_core::contracts::asset::{AssetFormat, AssetKind, Dimensions};
use animoria_core::indexer::AssetIndex;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

struct TestWorkspace {
    root: tempfile::TempDir,
}

impl TestWorkspace {
    fn new() -> Self {
        let root = tempfile::tempdir().expect("Failed to create tempdir");
        Self { root }
    }

    fn path(&self) -> &Path {
        self.root.path()
    }

    fn write_file(&self, relative_path: &str, content: &[u8]) {
        let full_path = self.root.path().join(relative_path);
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).expect("Failed to create parent directories");
        }
        let mut file = File::create(&full_path).expect("Failed to create file");
        file.write_all(content).expect("Failed to write content");
    }
}

#[test]
fn test_deep_parser_metadata_enrichment() {
    let ws = TestWorkspace::new();

    // 1. Lottie JSON with dimensions & layers
    ws.write_file(
        "assets/spinner.json",
        br#"{"v":"5.5.7","fr":60,"ip":0,"op":120,"w":400,"h":300,"layers":[{"ind":1},{"ind":2}]}"#,
    );

    // 2. GIF with dimensions 32x32
    ws.write_file(
        "assets/icon.gif",
        b"GIF89a\x20\x00\x20\x00\x80\x00\x00\x00\x00\x00\xFF\xFF\xFF!\xF9\x04\x00\x0A\x00\x00\x00,\x00\x00\x00\x00\x20\x00\x20\x00\x00\x02\x02D\x01\x00;",
    );

    // 3. PNG with IHDR dimensions 100x50
    let mut png_data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG signature
    png_data.extend_from_slice(&[0x00, 0x00, 0x00, 0x0D]); // IHDR length = 13
    png_data.extend_from_slice(b"IHDR");
    png_data.extend_from_slice(&100u32.to_be_bytes()); // Width = 100
    png_data.extend_from_slice(&50u32.to_be_bytes()); // Height = 50
    png_data.extend_from_slice(&[8, 6, 0, 0, 0]); // 8-bit RGBA
    png_data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // CRC
    ws.write_file("assets/logo.png", &png_data);

    // 4. SVG with viewBox 0 0 800 600
    ws.write_file(
        "assets/vector.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><path d="M0 0"/></svg>"#,
    );

    let mut index = AssetIndex::new("root-deep".to_string(), ws.path().to_path_buf());
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    assert_eq!(analysis.assets.len(), 4);

    // Verify Lottie enrichment
    let lottie = analysis
        .assets
        .iter()
        .find(|a| a.name == "spinner.json")
        .unwrap();
    assert!(lottie.is_valid);
    assert_eq!(
        lottie.dimensions,
        Some(Dimensions {
            width: 400,
            height: 300
        })
    );
    let motion = lottie.motion.as_ref().unwrap();
    assert_eq!(motion.fps, Some(60.0));
    assert_eq!(motion.total_frames, Some(120));
    assert_eq!(motion.duration_secs, Some(2.0));
    assert_eq!(motion.layer_count, Some(2));
    assert!(motion.is_animated);

    // Verify GIF enrichment
    let gif = analysis
        .assets
        .iter()
        .find(|a| a.name == "icon.gif")
        .unwrap();
    assert!(gif.is_valid);
    assert_eq!(
        gif.dimensions,
        Some(Dimensions {
            width: 32,
            height: 32
        })
    );

    // Verify PNG enrichment
    let png = analysis
        .assets
        .iter()
        .find(|a| a.name == "logo.png")
        .unwrap();
    assert!(png.is_valid);
    assert_eq!(
        png.dimensions,
        Some(Dimensions {
            width: 100,
            height: 50
        })
    );
    let static_meta = png.static_meta.as_ref().unwrap();
    assert_eq!(static_meta.color_depth, Some(8));
    assert_eq!(static_meta.has_alpha, Some(true));

    // Verify SVG enrichment
    let svg = analysis
        .assets
        .iter()
        .find(|a| a.name == "vector.svg")
        .unwrap();
    assert!(svg.is_valid);
    assert_eq!(
        svg.dimensions,
        Some(Dimensions {
            width: 800,
            height: 600
        })
    );
    assert_eq!(svg.kind, AssetKind::Static);
    assert_eq!(svg.format, AssetFormat::Svg);
}

#[test]
fn test_invariant_malformed_assets_are_never_dropped() {
    let ws = TestWorkspace::new();

    // 1. Valid asset
    ws.write_file(
        "assets/valid.json",
        br#"{"v":"5.5.7","fr":30,"ip":0,"op":60,"w":100,"h":100,"layers":[]}"#,
    );

    // 2. Corrupt Lottie (looks like Lottie in signature, but is truncated JSON)
    ws.write_file(
        "assets/corrupt-lottie.json",
        br#"{"v":"5.5.7","fr":60,"layers":[{"invalid"#,
    );

    // 3. Corrupt PNG (PNG magic present, but truncated IHDR)
    ws.write_file("assets/corrupt.png", b"\x89PNG\r\n\x1a\n\x00\x00");

    // 4. Corrupt SVG (no closing tags / malformed XML)
    ws.write_file("assets/corrupt.svg", b"<svg><circle cx=unquoted");

    // 5. Corrupt Rive (RIVE magic present, but 0 further bytes)
    ws.write_file("assets/corrupt.riv", b"RIVE");

    let mut index = AssetIndex::new("root-invariant".to_string(), ws.path().to_path_buf());
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    // Invariant: Exactly 5 assets discovered and indexed (1 valid + 4 corrupt)
    assert_eq!(
        analysis.assets.len(),
        5,
        "Invariant violated: Corrupted assets were dropped from the index!"
    );

    let valid_asset = analysis
        .assets
        .iter()
        .find(|a| a.name == "valid.json")
        .unwrap();
    assert!(valid_asset.is_valid);
    assert!(valid_asset.error.is_none());

    let corrupt_lottie = analysis
        .assets
        .iter()
        .find(|a| a.name == "corrupt-lottie.json")
        .unwrap();
    assert!(!corrupt_lottie.is_valid);
    assert!(corrupt_lottie.error.is_some());
    assert!(corrupt_lottie
        .error
        .as_ref()
        .unwrap()
        .contains("Malformed Lottie JSON"));

    let corrupt_png = analysis
        .assets
        .iter()
        .find(|a| a.name == "corrupt.png")
        .unwrap();
    assert!(!corrupt_png.is_valid);
    assert!(corrupt_png.error.is_some());

    let corrupt_svg = analysis
        .assets
        .iter()
        .find(|a| a.name == "corrupt.svg")
        .unwrap();
    assert!(!corrupt_svg.is_valid);
    assert!(corrupt_svg.error.is_some());

    // Health score properly penalizes 4 invalid assets + 1 unreferenced asset
    assert!(analysis.health_score.score <= 20);
    assert_eq!(analysis.health_score.grade, "F");
}
