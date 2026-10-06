use crate::contracts::analysis::RuleDiagnostic;
use crate::contracts::asset::AssetFormat;
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

pub struct AllowedFormatsRule;

impl Rule for AllowedFormatsRule {
    fn id(&self) -> &str {
        "allowed-formats"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            let policy = ctx.policy_for(&asset.relative_path);
            let allowed = match &policy.allowed_formats {
                Some(fmts) if !fmts.is_empty() => fmts,
                _ => continue,
            };

            if !allowed.contains(&asset.format) {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: policy.allowed_formats_severity,
                    message: format!(
                        "Format '{:?}' of asset '{}' is disallowed by workspace policy.",
                        asset.format, asset.relative_path
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

pub struct NoGifRule;

impl Rule for NoGifRule {
    fn id(&self) -> &str {
        "no-gif"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            let policy = ctx.policy_for(&asset.relative_path);
            if !policy.no_gif {
                continue;
            }

            if asset.format == AssetFormat::Gif {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: policy.no_gif_severity,
                    message: format!(
                        "Legacy GIF asset '{}' detected. Consider converting to WebP, APNG, or Lottie.",
                        asset.relative_path
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
