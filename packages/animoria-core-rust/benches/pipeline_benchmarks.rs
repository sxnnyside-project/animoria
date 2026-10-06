//! # Performance & Throughput Benchmarks for Animoria Core Engine
//!
//! Measures latency, throughput, and scaling behavior for:
//! 1. Multi-format asset parsing (Lottie, SVG, PNG, WebP)
//! 2. Aho-Corasick reference detection across source files
//! 3. Rayon-parallel SHA-256 deduplication hashing
//! 4. Full end-to-end workspace governance audit

use animoria_core::indexer::AssetIndex;
use std::fs::{self, File};
use std::hint::black_box;
use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant};

struct BenchmarkFixture {
    root: tempfile::TempDir,
}

impl BenchmarkFixture {
    fn new() -> Self {
        let root = tempfile::tempdir().expect("Failed to create benchmark tempdir");
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

    fn populate(&self, total_assets: usize, total_sources: usize) {
        for i in 0..total_assets {
            let folder = match i % 4 {
                0 => "ui/icons",
                1 => "illustrations",
                2 => "animations",
                _ => "marketing",
            };

            match i % 4 {
                0 => {
                    let svg = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>"#;
                    self.write_file(&format!("assets/{folder}/icon_{i}.svg"), svg.as_bytes());
                }
                1 => {
                    let json = format!(
                        r#"{{"v":"5.7.0","fr":60,"ip":0,"op":60,"w":200,"h":200,"nm":"anim_{i}","layers":[{{"ind":1}}]}}"#
                    );
                    self.write_file(&format!("assets/{folder}/anim_{i}.json"), json.as_bytes());
                }
                2 => {
                    let mut png = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                    png.extend_from_slice(&[0x00, 0x00, 0x00, 0x0D]);
                    png.extend_from_slice(b"IHDR");
                    png.extend_from_slice(&128u32.to_be_bytes());
                    png.extend_from_slice(&128u32.to_be_bytes());
                    png.extend_from_slice(&[8, 6, 0, 0, 0]);
                    png.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]);
                    self.write_file(&format!("assets/{folder}/img_{i}.png"), &png);
                }
                _ => {
                    let webp = vec![
                        0x52, 0x49, 0x46, 0x46, 0x1A, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
                        0x56, 0x50, 0x38, 0x4C, 0x0E, 0x00, 0x00, 0x00, 0x2F, 0x1F, 0x00, 0x10,
                        0x00, 0x00, 0x00, 0x00,
                    ];
                    self.write_file(&format!("assets/{folder}/banner_{i}.webp"), &webp);
                }
            }
        }

        for s in 0..total_sources {
            let mut src = String::new();
            src.push_str("// Benchmark source component\n");
            src.push_str("import React from 'react';\n");

            for r in 0..4 {
                let target_idx = (s * 4 + r) % total_assets;
                let folder = match target_idx % 4 {
                    0 => "ui/icons",
                    1 => "illustrations",
                    2 => "animations",
                    _ => "marketing",
                };
                match target_idx % 4 {
                    0 => src.push_str(&format!(
                        "import Icon{r} from '../assets/{folder}/icon_{target_idx}.svg';\n"
                    )),
                    1 => src.push_str(&format!(
                        "const anim = require('../assets/{folder}/anim_{target_idx}.json');\n"
                    )),
                    2 => src.push_str(&format!(
                        "<Image src=\"../assets/{folder}/img_{target_idx}.png\" />\n"
                    )),
                    _ => src.push_str(&format!(
                        "const b = 'assets/{folder}/banner_{target_idx}.webp';\n"
                    )),
                }
            }
            self.write_file(&format!("src/components/View_{s}.tsx"), src.as_bytes());
        }
    }
}

fn measure_stage<F, R>(name: &str, iterations: usize, mut func: F) -> (Duration, R)
where
    F: FnMut() -> R,
{
    // Warmup
    let warmup_res = func();
    black_box(&warmup_res);

    let start = Instant::now();
    let mut last_res = warmup_res;
    for _ in 0..iterations {
        last_res = func();
        black_box(&last_res);
    }
    let elapsed = start.elapsed() / (iterations as u32);
    println!(
        "  {:<42} : {:>8.2} ms (avg of {} runs)",
        name,
        elapsed.as_secs_f64() * 1000.0,
        iterations
    );
    (elapsed, last_res)
}

fn main() {
    println!("\n╔════════════════════════════════════════════════════════════════════════╗");
    println!("║              ANIMORIA NATIVE ENGINE PERFORMANCE BENCHMARKS             ║");
    println!("╚════════════════════════════════════════════════════════════════════════╝\n");

    // Benchmark 1: Medium Workspace (250 assets, 50 source files)
    {
        println!("▶ Suite 1: Medium Workspace (250 assets, 50 source files)");
        let fixture = BenchmarkFixture::new();
        fixture.populate(250, 50);

        measure_stage("Full Pipeline (Discover + Parse + Tracing)", 5, || {
            let mut index = AssetIndex::new("medium-ws".to_string(), fixture.path().to_path_buf());
            index.scan_workspace(&[]).expect("Scan should succeed")
        });
        println!();
    }

    // Benchmark 2: Large Enterprise Scale (1,000 assets, 200 source files)
    {
        println!("▶ Suite 2: Enterprise Workspace (1,000 assets, 200 source files)");
        let fixture = BenchmarkFixture::new();
        fixture.populate(1000, 200);

        let (elapsed, analysis) = measure_stage("Full Enterprise Pipeline Audit", 3, || {
            let mut index = AssetIndex::new("large-ws".to_string(), fixture.path().to_path_buf());
            index.scan_workspace(&[]).expect("Scan should succeed")
        });

        println!("    • Processed Assets   : {}", analysis.assets.len());
        println!(
            "    • Asset Throughput   : {:.0} assets/sec",
            (analysis.assets.len() as f64) / elapsed.as_secs_f64()
        );
        println!(
            "    • Health Score Report: {}% (Grade {})",
            analysis.health_score.score, analysis.health_score.grade
        );
        println!();
    }

    println!("✔ Benchmark suite execution completed successfully.\n");
}
