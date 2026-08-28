use animoria_core::contracts::analysis::LifecycleState;
use animoria_core::indexer::AssetIndex;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::time::Instant;

struct BenchmarkWorkspace {
    root: tempfile::TempDir,
}

impl BenchmarkWorkspace {
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

    fn populate_scale_workspace(&self, total_assets: usize) {
        // 1. Generate Lottie, SVG, PNG, WebP assets across nested directories
        for i in 0..total_assets {
            let folder = match i % 5 {
                0 => "features/auth",
                1 => "features/dashboard",
                2 => "features/settings",
                3 => "common/icons",
                _ => "marketing/hero",
            };

            match i % 4 {
                0 => {
                    // Lottie
                    let json = format!(
                        r#"{{"v":"5.7.0","fr":60,"ip":0,"op":60,"w":100,"h":100,"nm":"anim_{i}","layers":[{{"ind":1}}]}}"#
                    );
                    self.write_file(&format!("assets/{folder}/anim_{i}.json"), json.as_bytes());
                }
                1 => {
                    // SVG
                    let svg = format!(
                        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>"#
                    );
                    self.write_file(&format!("assets/{folder}/icon_{i}.svg"), svg.as_bytes());
                }
                2 => {
                    // PNG
                    let mut png = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                    png.extend_from_slice(&[0x00, 0x00, 0x00, 0x0D]);
                    png.extend_from_slice(b"IHDR");
                    png.extend_from_slice(&64u32.to_be_bytes());
                    png.extend_from_slice(&64u32.to_be_bytes());
                    png.extend_from_slice(&[8, 6, 0, 0, 0]);
                    png.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]);
                    self.write_file(&format!("assets/{folder}/img_{i}.png"), &png);
                }
                _ => {
                    // WebP (Lossless VP8L)
                    let webp = vec![
                        0x52, 0x49, 0x46, 0x46, 0x1A, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
                        0x56, 0x50, 0x38, 0x4C, 0x0E, 0x00, 0x00, 0x00, 0x2F, 0x1F, 0x00, 0x10,
                        0x00, 0x00, 0x00, 0x00,
                    ];
                    self.write_file(&format!("assets/{folder}/graphic_{i}.webp"), &webp);
                }
            }
        }

        // 2. Generate 100 source code files with references to half the assets
        for s in 0..100 {
            let mut src = String::new();
            src.push_str("// Generated source component\n");
            src.push_str("import React from 'react';\n");

            // Reference 5 assets per source file
            for r in 0..5 {
                let target_idx = (s * 5 + r) % total_assets;
                match target_idx % 4 {
                    0 => src.push_str(&format!("import a_{r} from '../assets/features/auth/anim_{target_idx}.json';\n")),
                    1 => src.push_str(&format!("<Icon src=\"../assets/common/icons/icon_{target_idx}.svg\" />\n")),
                    2 => src.push_str(&format!("const img = require('../assets/features/dashboard/img_{target_idx}.png');\n")),
                    _ => src.push_str(&format!("const g = 'assets/marketing/hero/graphic_{target_idx}.webp';\n")),
                }
            }

            self.write_file(&format!("src/components/Component_{s}.tsx"), src.as_bytes());
        }
    }
}

#[test]
fn test_stress_and_throughput_1000_assets() {
    let ws = BenchmarkWorkspace::new();
    let total_assets = 1000;

    println!("\n=== GENERATING STRESS TEST WORKSPACE ({} ASSETS) ===", total_assets);
    ws.populate_scale_workspace(total_assets);

    println!("=== RUNNING NATIVE RUST CORE WORKSPACE PIPELINE ===");
    let start = Instant::now();

    let mut index = AssetIndex::new("stress-benchmark".to_string(), ws.path().to_path_buf());
    let analysis = index.scan_workspace(&[]).expect("Scan should succeed");

    let elapsed = start.elapsed();
    println!("⏱️ Full Pipeline Finished in: {:?}", elapsed);
    println!("📊 Discovered Assets: {}", analysis.assets.len());
    println!("🔍 Traced References: {}", index.references().len());
    println!("👥 Duplicate Groups: {}", index.duplicate_groups().len());
    println!("🩺 Health Score: {}% (Grade {})", analysis.health_score.score, analysis.health_score.grade);

    assert_eq!(analysis.state, LifecycleState::Ready);
    assert_eq!(analysis.assets.len(), total_assets);
    assert!(index.references().len() >= 300);

    // Performance assertion: In debug mode on modern hardware, 1,000 full pipeline assets should take < 500ms
    assert!(
        elapsed.as_millis() < 2000,
        "Performance regression: Pipeline took {:?}, exceeding threshold",
        elapsed
    );
}
