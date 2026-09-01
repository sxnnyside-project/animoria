use animoria_core::contracts::analysis::LifecycleState;
use animoria_core::contracts::asset::{AssetFormat, AssetKind};
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
fn test_vertical_slice_1_unified_asset_discovery() {
    let ws = TestWorkspace::new();

    // 1. Motion assets
    // Lottie JSON
    ws.write_file(
        "src/assets/spinner.json",
        br#"{"v":"5.5.7","fr":60,"ip":0,"op":180,"w":500,"h":500,"layers":[]}"#,
    );
    // dotLottie (ZIP header)
    ws.write_file(
        "src/assets/success.lottie",
        &[0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00],
    );
    // Rive (RIVE binary header)
    ws.write_file(
        "src/assets/hero.riv",
        b"RIVE\x07\x00\x00\x00\x00\x00\x00\x00",
    );
    // GIF (GIF89a)
    ws.write_file(
        "src/assets/banner.gif",
        b"GIF89a\x20\x00\x20\x00\x80\x00\x00",
    );
    // APNG (PNG magic + acTL chunk)
    ws.write_file(
        "src/assets/badge.png",
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\x08acTL\x00\x00\x00\n\x00\x00\x00\x00",
    );
    // Animated SVG
    ws.write_file(
        "src/assets/loader.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"><animate attributeName="r" from="40" to="20" dur="1s" repeatCount="indefinite"/></circle></svg>"#,
    );

    // 2. Static assets
    // Static SVG
    ws.write_file(
        "src/assets/icons/arrow.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>"#,
    );
    // Static PNG
    ws.write_file(
        "src/assets/icons/logo.png",
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x01\x00",
    );
    // JPEG
    ws.write_file(
        "src/assets/photos/avatar.jpg",
        b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01",
    );
    // WebP
    ws.write_file(
        "src/assets/photos/card.webp",
        b"RIFF\x20\x00\x00\x00WEBPVP8 \x14\x00\x00\x00",
    );
    // AVIF
    ws.write_file(
        "src/assets/photos/hero.avif",
        b"\x00\x00\x00\x20ftypavif\x00\x00\x00\x00mif1miaf",
    );

    // 3. Non-asset files (MUST be ignored)
    ws.write_file(
        "package.json",
        br#"{"name":"my-app","version":"1.0.0","scripts":{"test":"vitest"}}"#,
    );
    ws.write_file("README.md", b"# My App\nDocumentation here.");
    ws.write_file("src/main.rs", b"fn main() { println!(\"Hello\"); }");

    // 4. Ignored files (node_modules & .animoriaignore)
    ws.write_file(
        "node_modules/pkg/icon.png",
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
    );
    ws.write_file(".animoriaignore", b"**/ignored-dir/**\n*.ignored.svg\n");
    ws.write_file(
        "ignored-dir/hidden.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>"#,
    );
    ws.write_file(
        "src/assets/temp.ignored.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>"#,
    );

    // 5. Run AssetIndex scan
    let mut index = AssetIndex::new("root-1".to_string(), ws.path().to_path_buf());
    let analysis = index
        .scan_workspace(&[])
        .expect("Workspace scan should succeed");

    assert_eq!(analysis.state, LifecycleState::Ready);

    let assets = &analysis.assets;
    assert_eq!(
        assets.len(),
        11,
        "Should discover exactly 11 visual assets (6 motion + 5 static)"
    );

    // Verify format and kind classification
    let motion_assets: Vec<_> = assets
        .iter()
        .filter(|a| a.kind == AssetKind::Motion)
        .collect();
    let static_assets: Vec<_> = assets
        .iter()
        .filter(|a| a.kind == AssetKind::Static)
        .collect();

    assert_eq!(motion_assets.len(), 6, "Expected 6 motion assets");
    assert_eq!(static_assets.len(), 5, "Expected 5 static assets");

    // Verify individual format recognition
    let format_map: std::collections::HashSet<AssetFormat> =
        assets.iter().map(|a| a.format).collect();
    assert!(format_map.contains(&AssetFormat::Lottie));
    assert!(format_map.contains(&AssetFormat::DotLottie));
    assert!(format_map.contains(&AssetFormat::Rive));
    assert!(format_map.contains(&AssetFormat::Gif));
    assert!(format_map.contains(&AssetFormat::Apng));
    assert!(format_map.contains(&AssetFormat::AnimatedSvg));
    assert!(format_map.contains(&AssetFormat::Svg));
    assert!(format_map.contains(&AssetFormat::Png));
    assert!(format_map.contains(&AssetFormat::Jpeg));
    assert!(format_map.contains(&AssetFormat::Webp));
    assert!(format_map.contains(&AssetFormat::Avif));

    // Verify JSON serialization matching TypeScript contract
    let json = serde_json::to_string_pretty(&analysis).expect("Should serialize WorkspaceAnalysis");
    assert!(json.contains("\"root_id\": \"root-1\""));
    assert!(json.contains("\"state\": \"ready\""));
    assert!(json.contains("\"kind\": \"motion\""));
    assert!(json.contains("\"kind\": \"static\""));
}
