use crate::cli::ui::{accent, brand, dim, error, title};

pub struct RuleDoc {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub default_severity: &'static str,
    pub summary: &'static str,
    pub why: &'static str,
    pub how_to_fix: &'static str,
    pub config_example: &'static str,
}

pub const ALL_RULES: &[RuleDoc] = &[
    RuleDoc {
        id: "no-duplicate-content",
        name: "No Duplicate Content",
        category: "Storage & Redundancy",
        default_severity: "error",
        summary: "Detects identical asset files with matching SHA-256 content hashes located across different paths.",
        why: "Duplicate files bloat client bundles, repository cloning times, and app binary sizes while creating maintenance confusion.",
        how_to_fix: "Consolidate imports to use the canonical asset and remove duplicates via `animoria clean --apply`.",
        config_example: r#""rules": { "no-duplicate-content": "error" }"#,
    },
    RuleDoc {
        id: "no-unreferenced-assets",
        name: "No Unreferenced Assets",
        category: "Code Health",
        default_severity: "warning",
        summary: "Identifies assets discovered on disk that are never referenced across any source files.",
        why: "Dead design assets accumulate over time as features evolve, contributing to technical and visual asset debt.",
        how_to_fix: "Import or use the asset in your components, or remove it from the workspace.",
        config_example: r#""rules": { "no-unreferenced-assets": "warning" }"#,
    },
    RuleDoc {
        id: "max-file-size",
        name: "Maximum File Size",
        category: "Performance",
        default_severity: "warning",
        summary: "Flags visual assets whose raw byte size exceeds a maximum allowable threshold (e.g. 2MB or 512KB).",
        why: "Excessively large assets degrade app startup speed, increase memory footprint, and slow down mobile network delivery.",
        how_to_fix: "Compress raster assets with modern encoders (WebP/AVIF) or optimize vector paths.",
        config_example: r#""rules": { "max-file-size": ["warn", "2MB"] }"#,
    },
    RuleDoc {
        id: "max-dimensions",
        name: "Maximum Dimensions",
        category: "Performance",
        default_severity: "warning",
        summary: "Checks that raster image dimensions (width x height in pixels) do not exceed display thresholds (e.g. 3840x2160).",
        why: "Images larger than standard device viewports consume excessive GPU/CPU decoding memory without perceptible visual gain.",
        how_to_fix: "Downscale images to the target rendering viewport size before committing them.",
        config_example: r#""rules": { "max-dimensions": ["warn", 3840, 2160] }"#,
    },
    RuleDoc {
        id: "naming-convention",
        name: "Naming Convention",
        category: "Consistency & Governance",
        default_severity: "warning",
        summary: "Enforces consistent asset naming conventions (kebab-case, snake_case, camelCase, PascalCase, or custom regex).",
        why: "Inconsistent file names cause cross-platform casing bugs on case-insensitive filesystems (macOS/Windows vs Linux).",
        how_to_fix: "Rename the asset file stem according to the configured casing standard.",
        config_example: r#""rules": { "naming-convention": ["warn", "kebab-case"] }"#,
    },
    RuleDoc {
        id: "svg-sanitization",
        name: "SVG Sanitization & Security",
        category: "Security",
        default_severity: "error",
        summary: "Scans SVG vector assets for dangerous scripts, XML external entities (XXE), and inline event handlers.",
        why: "SVGs are XML documents that can execute JavaScript (XSS) or trigger entity expansion attacks when rendered in web contexts.",
        how_to_fix: "Sanitize the SVG to remove `<script>`, `onload=`, and entity declarations.",
        config_example: r#""rules": { "svg-sanitization": "error" }"#,
    },
    RuleDoc {
        id: "allowed-formats",
        name: "Allowed Asset Formats",
        category: "Architecture",
        default_severity: "error",
        summary: "Restricts workspace assets to an approved whitelist of visual formats (e.g. webp, png, svg, lottie).",
        why: "Prevents legacy or unoptimized formats from entering modern production applications.",
        how_to_fix: "Convert unapproved asset formats into modern approved formats.",
        config_example: r#""rules": { "allowed-formats": ["error", "webp", "png", "svg", "lottie"] }"#,
    },
    RuleDoc {
        id: "no-gif",
        name: "No Legacy GIF",
        category: "Performance",
        default_severity: "warning",
        summary: "Discourages the use of legacy animated GIF files in favor of lightweight vector or modern video formats.",
        why: "GIF compression is highly inefficient compared to modern Lottie, dotLottie, or WebP/APNG alternatives.",
        how_to_fix: "Replace animated GIFs with Lottie or modern vector motion formats.",
        config_example: r#""rules": { "no-gif": "warning" }"#,
    },
];

pub fn execute_explain(rule_id: Option<&str>) -> anyhow::Result<i32> {
    match rule_id {
        Some(id) => {
            let normalized = id.trim().to_lowercase();
            if let Some(rule) = ALL_RULES.iter().find(|r| r.id == normalized) {
                println!("\n{} {}\n", brand("animoria explain"), title(rule.id));
                println!("  {}: {}", accent("Name"), rule.name);
                println!("  {}: {}", accent("Category"), rule.category);
                println!(
                    "  {}: {}",
                    accent("Default Severity"),
                    rule.default_severity
                );
                println!("\n  {}\n    {}", title("Summary:"), rule.summary);
                println!("\n  {}\n    {}", title("Why this matters:"), rule.why);
                println!("\n  {}\n    {}", title("How to fix:"), rule.how_to_fix);
                println!(
                    "\n  {}\n    {}\n",
                    title("Configuration in .animoriarc.json:"),
                    dim(rule.config_example)
                );
                Ok(0)
            } else {
                eprintln!(
                    "{} Unknown rule '{}'. Run {} to see all available governance rules.\n",
                    error("✖"),
                    id,
                    accent("animoria explain")
                );
                Ok(1)
            }
        }
        None => {
            println!("\n{} {}\n", brand("animoria"), title("Governance Rules"));
            println!(
                "  {:<26}  {:<24}  {:<10}  Description",
                "Rule ID", "Category", "Severity"
            );
            println!("  {}", "─".repeat(95));
            for r in ALL_RULES {
                println!(
                    "  {:<26}  {:<24}  {:<10}  {}",
                    accent(r.id),
                    dim(r.category),
                    r.default_severity,
                    r.summary
                );
            }
            println!(
                "\n  {}\n",
                dim("Run `animoria explain <rule-id>` for detailed explanation and fix guidance.")
            );
            Ok(0)
        }
    }
}
