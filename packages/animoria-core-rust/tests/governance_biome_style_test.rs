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

#[test]
fn test_dynamic_template_interpolation_resolves_unreferenced() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Enable no-unreferenced-assets rule
    let config = r#"{
        "$schema": "https://animoria.dev/schema/animoriarc.json",
        "governance": {
            "rules": {
                "no-unreferenced-assets": "error"
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    // Create characters directory with webp assets
    let char_dir = root.join("public/characters");
    fs::create_dir_all(&char_dir).unwrap();
    // Valid 1x1 WEBP file bytes
    let webp_bytes = [
        0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
        0x4c, 0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ];
    fs::write(char_dir.join("alchemist.webp"), webp_bytes).unwrap();
    fs::write(char_dir.join("warrior.webp"), webp_bytes).unwrap();

    // Create a real orphan in another directory
    let items_dir = root.join("public/items");
    fs::create_dir_all(&items_dir).unwrap();
    fs::write(items_dir.join("orphan_sword.webp"), webp_bytes).unwrap();

    // Create a TypeScript source file referencing characters dynamically via template literal
    let src_dir = root.join("src/components");
    fs::create_dir_all(&src_dir).unwrap();
    fs::write(
        src_dir.join("Card.tsx"),
        r#"
import React from 'react';

export const Card = ({ character }: { character: { id: string } }) => {
    const avatarUrl = `/characters/${character.id}.webp`;
    return <img src={avatarUrl} alt="Avatar" />;
};
"#,
    )
    .unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let unreferenced: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    // Only orphan_sword.webp should be flagged as unreferenced!
    // alchemist.webp and warrior.webp should NOT be flagged because of `/characters/${character.id}.webp`
    assert_eq!(
        unreferenced.len(),
        1,
        "Only orphan_sword.webp should be unreferenced: {:?}",
        unreferenced
    );
    assert!(unreferenced[0]
        .target_asset_path
        .ends_with("orphan_sword.webp"));
}

#[test]
fn test_governance_max_dimensions_rule() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    let config = r#"{
        "governance": {
            "rules": {
                "max-dimensions": {
                    "severity": "error",
                    "maxWidth": 100,
                    "maxHeight": 100
                },
                "no-unreferenced-assets": "off"
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    // Valid 1x1 PNG
    let small_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82";
    fs::write(root.join("small.png"), small_png).unwrap();

    // 200x200 PNG (exceeds 100x100)
    let mut large_png = small_png.to_vec();
    // In PNG IHDR: width is bytes 16..20 (offset 16: \x00\x00\x00\xc8 = 200)
    large_png[16..20].copy_from_slice(&200u32.to_be_bytes());
    large_png[20..24].copy_from_slice(&200u32.to_be_bytes());
    fs::write(root.join("large.png"), &large_png).unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let dimension_diags: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "max-dimensions")
        .collect();

    assert_eq!(dimension_diags.len(), 1);
    assert!(dimension_diags[0].target_asset_path.ends_with("large.png"));
    assert!(dimension_diags[0].message.contains("200x200 px"));
}

#[test]
fn test_cli_ci_quality_gates_and_sarif_export() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    let config = r#"{
        "governance": {
            "ci": {
                "minScore": 90,
                "maxWarnings": 0
            },
            "rules": {
                "no-unreferenced-assets": "warning"
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    // Create an unreferenced asset that triggers a warning
    let png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82";
    fs::write(root.join("orphan.png"), png_bytes).unwrap();

    // Check SARIF generation
    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();
    let sarif = animoria_core::governance::SarifReport::from_analysis(&analysis, root);

    assert_eq!(sarif.version, "2.1.0");
    assert_eq!(sarif.runs.len(), 1);
    assert_eq!(sarif.runs[0].results.len(), 1);
    assert_eq!(sarif.runs[0].results[0].rule_id, "no-unreferenced-assets");
    assert_eq!(
        sarif.runs[0].results[0].locations[0]
            .physical_location
            .artifact_location
            .uri,
        "orphan.png"
    );

    // Test execute_check exit code with quality gates:
    // With minScore: 90 and health_score: 50, it must fail minScore with exit code 1
    let exit_code_score = animoria_core::cli::commands::check::execute_check(
        root,
        animoria_core::cli::commands::check::CheckArgs {
            json: true,
            sarif: false,
            format: None,
            strict: false,
            min_score: None,
            max_warnings: None,
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(
        exit_code_score, 1,
        "Quality gate minScore: 90 should trigger exit code 1"
    );

    // With minScore overridden to 0 and maxWarnings: 0, it must fail maxWarnings with exit code 2
    let exit_code_warn = animoria_core::cli::commands::check::execute_check(
        root,
        animoria_core::cli::commands::check::CheckArgs {
            json: true,
            sarif: false,
            format: None,
            strict: false,
            min_score: Some(0),
            max_warnings: Some(0),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(
        exit_code_warn, 2,
        "Quality gate maxWarnings: 0 should trigger exit code 2"
    );
}

#[test]
fn test_naming_convention_and_svg_sanitization_rules() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    let config = r#"{
        "governance": {
            "rules": {
                "naming-convention": {
                    "severity": "error",
                    "case": "kebab-case"
                },
                "svg-sanitization": "error",
                "no-unreferenced-assets": "off"
            }
        }
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    let small_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82";

    // Valid kebab-case PNG with density suffix
    fs::write(root.join("valid-hero-icon@2x.png"), small_png).unwrap();

    // Invalid PascalCase PNG
    fs::write(root.join("InvalidPascalName.png"), small_png).unwrap();

    // Dangerous SVG with <script>
    let malicious_svg = r#"<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect width="10" height="10"/></svg>"#;
    fs::write(root.join("malicious-chart.svg"), malicious_svg).unwrap();

    // Clean SVG
    let clean_svg = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>"#;
    fs::write(root.join("clean-chart.svg"), clean_svg).unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let naming_diags: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "naming-convention")
        .collect();

    assert_eq!(
        naming_diags.len(),
        1,
        "Only InvalidPascalName should fail naming convention: {:?}",
        naming_diags
    );
    assert!(naming_diags[0]
        .target_asset_path
        .ends_with("InvalidPascalName.png"));

    let svg_diags: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "svg-sanitization")
        .collect();

    assert_eq!(
        svg_diags.len(),
        1,
        "Only malicious-chart.svg should fail SVG sanitization: {:?}",
        svg_diags
    );
    assert!(svg_diags[0]
        .target_asset_path
        .ends_with("malicious-chart.svg"));
    assert!(svg_diags[0].message.contains("<script>"));
}

#[test]
fn test_monorepo_folder_overrides_and_extends_presets() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Base config uses "recommended" preset but adds folder override for marketing apps
    let config = r#"{
        "extends": "recommended",
        "overrides": [
            {
                "files": ["apps/marketing/**"],
                "rules": {
                    "max-file-size-kb": 10
                }
            }
        ]
    }"#;
    fs::write(root.join(".animoriarc.json"), config).unwrap();

    // 15 KB PNG in core package -> passes base preset limit (512 KB)
    let core_dir = root.join("packages/core");
    fs::create_dir_all(&core_dir).unwrap();
    let mut large_png = vec![0u8; 15 * 1024];
    large_png[..8].copy_from_slice(b"\x89PNG\r\n\x1a\n");
    large_png[8..12].copy_from_slice(&13u32.to_be_bytes()); // IHDR length
    large_png[12..16].copy_from_slice(b"IHDR");
    large_png[16..20].copy_from_slice(&1u32.to_be_bytes());
    large_png[20..24].copy_from_slice(&1u32.to_be_bytes());
    large_png[24] = 8;
    large_png[25] = 6;
    fs::write(core_dir.join("core-hero.png"), &large_png).unwrap();

    // Same 15 KB PNG in marketing app -> fails override limit (10 KB)
    let mkt_dir = root.join("apps/marketing");
    fs::create_dir_all(&mkt_dir).unwrap();
    fs::write(mkt_dir.join("marketing-hero.png"), &large_png).unwrap();

    let mut indexer = AssetIndex::new("root".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let size_diags: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "max-file-size-kb")
        .collect();

    assert_eq!(
        size_diags.len(),
        1,
        "Only marketing asset should trigger max-file-size: {:?}",
        size_diags
    );
    assert!(size_diags[0]
        .target_asset_path
        .ends_with("marketing-hero.png"));
}

#[test]
fn test_cli_explain_compact_and_agent_ergonomics() {
    use animoria_core::cli::commands::check::{execute_check, CheckArgs};
    use animoria_core::cli::commands::explain::{execute_explain, ALL_RULES};

    // Test explain all rules
    assert!(ALL_RULES.len() >= 8);
    let code_all = execute_explain(None).unwrap();
    assert_eq!(code_all, 0);

    // Test explain known rule
    let code_rule = execute_explain(Some("no-duplicate-content")).unwrap();
    assert_eq!(code_rule, 0);

    // Test explain unknown rule
    let code_unknown = execute_explain(Some("non-existent-rule")).unwrap();
    assert_eq!(code_unknown, 1);

    // Test compact check and only_violations execution
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path();

    // Create a dummy SVG with an issue
    let svg_content = r#"<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>"#;
    fs::write(root.join("bad.svg"), svg_content).unwrap();

    let check_args = CheckArgs {
        compact: true,
        only_violations: true,
        ..Default::default()
    };
    let exit_code = execute_check(root, check_args).unwrap();
    assert_eq!(exit_code, 1);
}
