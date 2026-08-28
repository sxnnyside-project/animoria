use crate::contracts::analysis::{DiagnosticSeverity, RuleDiagnostic};
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

pub struct NoUnreferencedAssetsRule;

impl Rule for NoUnreferencedAssetsRule {
    fn id(&self) -> &str {
        "no-unreferenced-assets"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        if !ctx.policy.no_unreferenced_assets {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            if !asset.is_valid {
                continue;
            }
            if !ctx.is_asset_referenced(&asset.id) {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: DiagnosticSeverity::Warning,
                    message: format!(
                        "Asset '{}' ({}) has no detected source code references in the workspace.",
                        asset.name, asset.relative_path
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
