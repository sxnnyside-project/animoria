use crate::contracts::analysis::{DiagnosticSeverity, RuleDiagnostic};
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

pub struct MaxFileSizeRule;

impl Rule for MaxFileSizeRule {
    fn id(&self) -> &str {
        "max-file-size-kb"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let max_kb = match ctx.policy.max_file_size_kb {
            Some(kb) => kb,
            None => return Vec::new(),
        };

        let max_bytes = max_kb * 1024;
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            if asset.size_bytes > max_bytes {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: DiagnosticSeverity::Warning,
                    message: format!(
                        "Asset '{}' ({:.1} KB) exceeds maximum configured size threshold of {} KB.",
                        asset.relative_path,
                        (asset.size_bytes as f64) / 1024.0,
                        max_kb
                    ),
                    target_asset_id: Some(asset.id.clone()),
                    target_asset_path: asset.path.clone(),
                    evidence_file: None,
                    evidence_line: None,
                    evidence_excerpt: None,
                });
            }
        }

        diagnostics
    }
}
