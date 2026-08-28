use crate::contracts::analysis::{DiagnosticSeverity, RuleDiagnostic};
use crate::contracts::asset::AssetFormat;
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

pub struct AllowedFormatsRule;

impl Rule for AllowedFormatsRule {
    fn id(&self) -> &str {
        "allowed-formats"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let allowed = match &ctx.policy.allowed_formats {
            Some(fmts) if !fmts.is_empty() => fmts,
            _ => return Vec::new(),
        };

        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            if !allowed.contains(&asset.format) {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: DiagnosticSeverity::Error,
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
        if !ctx.policy.no_gif {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            if asset.format == AssetFormat::Gif {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: DiagnosticSeverity::Warning,
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
