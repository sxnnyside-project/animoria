use crate::contracts::analysis::RuleDiagnostic;
use crate::governance::asset_matcher::{is_app_icon, matches_any_pattern};
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

pub struct NoUnreferencedAssetsRule;

impl Rule for NoUnreferencedAssetsRule {
    fn id(&self) -> &str {
        "no-unreferenced-assets"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            if !asset.is_valid {
                continue;
            }

            let policy = ctx.policy_for(&asset.relative_path);
            if !policy.no_unreferenced_assets {
                continue;
            }

            // Skip application icons if configured
            if policy.no_unreferenced_ignore_app_icons
                && is_app_icon(&asset.relative_path, &asset.name)
            {
                continue;
            }

            // Skip assets matching custom ignore patterns
            if !policy.no_unreferenced_ignore.is_empty()
                && matches_any_pattern(&asset.relative_path, &policy.no_unreferenced_ignore)
            {
                continue;
            }

            // Skip assets declared in dynamic collections
            if !policy.tracing_dynamic_collections.is_empty()
                && matches_any_pattern(&asset.relative_path, &policy.tracing_dynamic_collections)
            {
                continue;
            }

            if !ctx.is_asset_referenced(&asset.id) {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: policy.no_unreferenced_severity,
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
