use crate::cli::ui::{self, brand, dim, error, grade_badge, success, title, warning};
use crate::cli::workspace::resolve_workspace_path;
use crate::contracts::analysis::DiagnosticSeverity;
use crate::governance::policy::GovernancePolicy;
use crate::governance::sarif::SarifReport;
use crate::indexer::AssetIndex;
use std::path::Path;

#[derive(Debug, Clone, Default)]
pub struct CheckArgs<'a> {
    pub json: bool,
    pub sarif: bool,
    pub format: Option<&'a str>,
    pub compact: bool,
    pub only_violations: bool,
    pub strict: bool,
    pub min_score: Option<u32>,
    pub max_warnings: Option<usize>,
}

pub fn execute_check(target_path: &Path, args: CheckArgs<'_>) -> anyhow::Result<i32> {
    let canonical = resolve_workspace_path(target_path)?;
    let mut index = AssetIndex::new(canonical.to_string_lossy().to_string(), canonical.clone());
    let analysis = index.scan_workspace(&[])?;

    let policy = GovernancePolicy::load_from_workspace(&canonical);
    let effective_min_score = args.min_score.or(policy.ci_min_score);
    let effective_max_warnings = if args.strict {
        Some(0)
    } else {
        args.max_warnings.or(policy.ci_max_warnings)
    };

    let is_sarif = args.sarif || args.format == Some("sarif");
    let is_json = args.json || args.format == Some("json");
    let is_compact = args.compact || args.format == Some("compact");

    let diagnostics = &analysis.diagnostics;
    let errors: Vec<_> = diagnostics
        .iter()
        .filter(|d| d.severity == DiagnosticSeverity::Error)
        .collect();
    let warnings: Vec<_> = diagnostics
        .iter()
        .filter(|d| d.severity == DiagnosticSeverity::Warning)
        .collect();

    // Determine exit code based on errors and quality gates
    let mut exit_code = 0;
    if !errors.is_empty() {
        exit_code = 1;
    } else if let Some(min_score) = effective_min_score {
        if analysis.health_score.score < min_score {
            exit_code = 1;
        }
    }

    if exit_code == 0 {
        if let Some(max_warn) = effective_max_warnings {
            if warnings.len() > max_warn {
                exit_code = 2;
            }
        }
    }

    if is_sarif {
        let sarif_report = SarifReport::from_analysis(&analysis, &canonical);
        println!("{}", serde_json::to_string_pretty(&sarif_report)?);
        return Ok(exit_code);
    }

    if is_json {
        if args.only_violations {
            let payload = serde_json::json!({
                "health_score": analysis.health_score,
                "diagnostics": analysis.diagnostics,
                "total_diagnostics": analysis.diagnostics.len(),
                "errors_count": errors.len(),
                "warnings_count": warnings.len(),
            });
            println!("{}", serde_json::to_string_pretty(&payload)?);
        } else {
            println!("{}", serde_json::to_string_pretty(&analysis)?);
        }
        return Ok(exit_code);
    }

    // AI Agent & CI Compact format: single-line per violation (path:line:col [rule] msg (sev))
    if is_compact {
        for d in diagnostics {
            let sev_str = match d.severity {
                DiagnosticSeverity::Error => "error",
                DiagnosticSeverity::Warning => "warning",
                DiagnosticSeverity::Info => "info",
            };
            let (target_file, target_line) = match (&d.evidence_file, d.evidence_line) {
                (Some(file), Some(line)) => (file.as_str(), line),
                (Some(file), None) => (file.as_str(), 1),
                (None, _) => (d.target_asset_path.as_str(), 1),
            };
            let rel_target = target_file
                .strip_prefix(&format!("{}/", canonical.display()))
                .unwrap_or(target_file);
            println!(
                "./{}:{}:1: [{}] {} ({})",
                rel_target, target_line, d.rule_id, d.message, sev_str
            );
        }
        return Ok(exit_code);
    }

    let quiet = ui::is_quiet();

    if !quiet {
        println!(
            "\n{} {} {}\n",
            brand("animoria"),
            title("Governance Check"),
            dim(&format!("({} assets evaluated)", analysis.assets.len()))
        );
    }

    if diagnostics.is_empty() {
        if quiet {
            println!(
                "OK: {}% ({})",
                analysis.health_score.score, analysis.health_score.grade
            );
        } else {
            println!(
                "  {} {}",
                success("✔"),
                success("All visual asset governance checks passed!")
            );
            println!(
                "  {}\n",
                dim(&format!(
                    "Overall Health: {}% ({})",
                    analysis.health_score.score, analysis.health_score.grade
                ))
            );
        }
    } else if !quiet {
        for err in &errors {
            let (target_file, target_line) = match (&err.evidence_file, err.evidence_line) {
                (Some(f), Some(l)) => (f.as_str(), l),
                (Some(f), None) => (f.as_str(), 1),
                (None, _) => (err.target_asset_path.as_str(), 1),
            };
            let rel = target_file
                .strip_prefix(&format!("{}/", canonical.display()))
                .unwrap_or(target_file);
            println!("  {} {}", error("✖"), error(&err.rule_id));
            println!("    {}", err.message);
            println!("    {}\n", dim(&format!("at ./{}:{}:1", rel, target_line)));
        }

        for warn in &warnings {
            let (target_file, target_line) = match (&warn.evidence_file, warn.evidence_line) {
                (Some(f), Some(l)) => (f.as_str(), l),
                (Some(f), None) => (f.as_str(), 1),
                (None, _) => (warn.target_asset_path.as_str(), 1),
            };
            let rel = target_file
                .strip_prefix(&format!("{}/", canonical.display()))
                .unwrap_or(target_file);
            println!("  {} {}", warning("▲"), warning(&warn.rule_id));
            println!("    {}", warn.message);
            println!("    {}\n", dim(&format!("at ./{}:{}:1", rel, target_line)));
        }
    }

    let mut summary = Vec::new();
    if !errors.is_empty() {
        summary.push(format!("{} error(s)", errors.len()));
    }
    if !warnings.is_empty() {
        summary.push(format!("{} warning(s)", warnings.len()));
    }

    if !diagnostics.is_empty() {
        if quiet {
            println!(
                "{}: {}% ({})",
                summary.join(", "),
                analysis.health_score.score,
                analysis.health_score.grade
            );
        } else {
            let colored_summary: Vec<String> = {
                let mut v = Vec::new();
                if !errors.is_empty() {
                    v.push(error(&format!("{} error(s)", errors.len())));
                }
                if !warnings.is_empty() {
                    v.push(warning(&format!("{} warning(s)", warnings.len())));
                }
                v
            };
            let (bold, reset) = (ui::bold_start(), ui::reset());
            println!(
                "  {bold}Result:{reset} {} | {bold}Health Score:{reset} {}% ({})\n",
                colored_summary.join(", "),
                analysis.health_score.score,
                grade_badge(&analysis.health_score.grade)
            );
        }
    }

    // Report Quality Gate failure details in human mode
    if !quiet {
        if let Some(min_score) = effective_min_score {
            if analysis.health_score.score < min_score {
                println!(
                    "  {} {}\n",
                    error("✖ Quality Gate Failed:"),
                    error(&format!(
                        "Health Score {}% is below required minimum threshold ({}%).",
                        analysis.health_score.score, min_score
                    ))
                );
            }
        }

        if let Some(max_warn) = effective_max_warnings {
            if warnings.len() > max_warn {
                println!(
                    "  {} {}\n",
                    warning("▲ Quality Gate Failed:"),
                    warning(&format!(
                        "Warning count ({}) exceeds maximum allowed warnings ({}).",
                        warnings.len(),
                        max_warn
                    ))
                );
            }
        }
    }

    Ok(exit_code)
}
