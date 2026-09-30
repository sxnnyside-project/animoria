use animoria_core::indexer::AssetIndex;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_governance_ignores_app_icons_and_custom_patterns() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Setup .animoriarc.json with Biome-style configuration
    let config = r#"{
        "$schema": "https://animoria.dev/schema/animoriarc.json",
        "governance": {
            "rules": {
                "no-unreferenced-assets": {
                    "severity": "error",
                    "ignoreAppIcons": true,
                    "ignore": ["**/custom-ignored/**"]
                }
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    // Create an app icon (iOS asset catalog style)
    let app_icon_dir = root.join("ios/Runner/Assets.xcassets/AppIcon.appiconset");
    fs::create_dir_all(&app_icon_dir).unwrap();
    fs::write(app_icon_dir.join("AppIcon-60@2x.png"), b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82").unwrap();

    // Create a custom ignored asset
    let custom_dir = root.join("assets/custom-ignored");
    fs::create_dir_all(&custom_dir).unwrap();
    fs::write(custom_dir.join("pattern-ignored.png"), b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82").unwrap();

    // Create an unreferenced regular asset that SHOULD be flagged
    let regular_dir = root.join("assets");
    fs::write(regular_dir.join("orphan.png"), b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82").unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    // Diagnostics should only contain orphan.png, neither AppIcon nor pattern-ignored.png
    let unreferenced: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    assert_eq!(unreferenced.len(), 1);
    assert!(unreferenced[0].target_asset_path.ends_with("orphan.png"));
}

#[test]
fn test_governance_ignore_source_extensions() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Config ignores markdown and vue as reference sources
    let config = r#"{
        "$schema": "https://animoria.dev/schema/animoriarc.json",
        "tracing": {
            "ignoreSourceExtensions": ["md", "vue"]
        },
        "governance": {
            "rules": {
                "no-unreferenced-assets": "error"
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    let asset_dir = root.join("assets");
    fs::create_dir_all(&asset_dir).unwrap();
    fs::write(asset_dir.join("logo.png"), b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82").unwrap();

    // Reference ONLY in README.md and Component.vue
    fs::write(root.join("README.md"), "Here is our logo: assets/logo.png").unwrap();
    fs::write(
        root.join("Component.vue"),
        "<template><img src=\"assets/logo.png\"></template>",
    )
    .unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    // Because md and vue were ignored in tracing, logo.png must be flagged as unreferenced!
    let unreferenced: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    assert_eq!(unreferenced.len(), 1);
    assert!(unreferenced[0].target_asset_path.ends_with("logo.png"));
}

#[test]
fn test_framework_tracing_and_extended_static_formats() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Config allows custom source extensions (e.g. htmx, custom extension)
    let config = r#"{
        "$schema": "https://animoria.dev/schema/animoriarc.json",
        "tracing": {
            "includeSourceExtensions": ["customext"]
        },
        "governance": {
            "rules": {
                "no-unreferenced-assets": "error"
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    let asset_dir = root.join("assets");
    fs::create_dir_all(&asset_dir).unwrap();

    // 1. Create a minimal valid BMP file (1x1 24bpp)
    // BMP Header (14 bytes) + DIB Header (40 bytes) + 3 bytes pixel + 1 byte padding
    let bmp_data = vec![
        b'B', b'M', // Magic
        58, 0, 0, 0, // File size (58 bytes)
        0, 0, 0, 0, // Reserved
        54, 0, 0, 0, // Pixel data offset (54 bytes)
        // DIB Header (40 bytes)
        40, 0, 0, 0, // DIB header size
        1, 0, 0, 0, // Width: 1
        1, 0, 0, 0, // Height: 1
        1, 0, // Color planes
        24, 0, // Bits per pixel: 24
        0, 0, 0, 0, // Compression (none)
        4, 0, 0, 0, // Image size
        0, 0, 0, 0, // X pixels per meter
        0, 0, 0, 0, // Y pixels per meter
        0, 0, 0, 0, // Colors in table
        0, 0, 0, 0, // Important colors
        // Pixel data (BGR + pad to 4-byte boundary)
        255, 0, 0, 0,
    ];
    fs::write(asset_dir.join("banner.bmp"), &bmp_data).unwrap();

    // 2. Reference banner.bmp in a PHP file and an HTMX/custom template
    fs::write(
        root.join("index.php"),
        r#"<?php echo '<img src="assets/banner.bmp">'; ?>"#,
    )
    .unwrap();

    // 3. Create an ICO file and reference it in a custom extension file
    let ico_data = vec![
        0x00, 0x00, 0x01, 0x00, // ICO magic (type 1)
        0x01, 0x00, // 1 image
        // Directory entry 1
        16, 16, 0, 0, 1, 0, 32, 0, // 16x16, 32 bpp
        0, 0, 0, 0, // size
        22, 0, 0, 0, // offset
    ];
    fs::write(asset_dir.join("favicon.ico"), &ico_data).unwrap();
    fs::write(
        root.join("view.customext"),
        r#"<link rel="icon" href="assets/favicon.ico">"#,
    )
    .unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    // Verify both BMP and ICO assets were ingested as valid static assets
    let bmp_asset = analysis
        .assets
        .iter()
        .find(|a| a.name == "banner.bmp")
        .expect("banner.bmp should be indexed");
    assert_eq!(
        bmp_asset.format,
        animoria_core::contracts::asset::AssetFormat::Bmp
    );
    assert!(bmp_asset.is_valid);
    assert_eq!(
        bmp_asset.dimensions,
        Some(animoria_core::contracts::asset::Dimensions {
            width: 1,
            height: 1
        })
    );

    let ico_asset = analysis
        .assets
        .iter()
        .find(|a| a.name == "favicon.ico")
        .expect("favicon.ico should be indexed");
    assert_eq!(
        ico_asset.format,
        animoria_core::contracts::asset::AssetFormat::Ico
    );
    assert!(ico_asset.is_valid);

    // Verify both references were detected via PHP (built-in expanded source) and customext (configured included extension)
    let unreferenced: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();
    if !unreferenced.is_empty() {
        eprintln!("Unreferenced diagnostics: {:?}", unreferenced);
        eprintln!("References detected: {:?}", indexer.references());
        let detector = animoria_core::tracing::AssetReferenceDetector::new_with_options(
            root.to_path_buf(),
            &[],
            &["customext".to_string()],
            &[],
            None,
        )
        .unwrap();
        eprintln!("Source files found: {:?}", detector.find_source_files());
    }
    assert_eq!(
        unreferenced.len(),
        0,
        "No unreferenced diagnostics expected because PHP and customext traced them"
    );
}
