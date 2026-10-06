use crate::contracts::analysis::RuleDiagnostic;
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

pub struct MaxDimensionsRule;

impl Rule for MaxDimensionsRule {
    fn id(&self) -> &str {
        "max-dimensions"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            let policy = ctx.policy_for(&asset.relative_path);
            let (max_w, max_h) = (policy.max_dimensions_width, policy.max_dimensions_height);

            if max_w.is_none() && max_h.is_none() {
                continue;
            }

            if let Some(dims) = &asset.dimensions {
                let width_exceeded = max_w.is_some_and(|w| dims.width > w);
                let height_exceeded = max_h.is_some_and(|h| dims.height > h);

                if width_exceeded || height_exceeded {
                    let mut limit_desc = Vec::new();
                    if let Some(w) = max_w {
                        limit_desc.push(format!("max width: {w}px"));
                    }
                    if let Some(h) = max_h {
                        limit_desc.push(format!("max height: {h}px"));
                    }

                    diagnostics.push(RuleDiagnostic {
                        rule_id: self.id().to_string(),
                        severity: policy.max_dimensions_severity,
                        message: format!(
                            "Asset '{}' has dimensions {}x{} px, exceeding configured limit ({}).",
                            asset.relative_path,
                            dims.width,
                            dims.height,
                            limit_desc.join(", ")
                        ),
                        target_asset_id: Some(asset.id.clone()),
                        target_asset_path: asset.path.clone(),
                        evidence_file: None,
                        evidence_line: None,
                        evidence_excerpt: None,
                    });
                }
            }
        }

        diagnostics
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::asset::{Asset, AssetFormat, AssetKind, Dimensions};
    use crate::governance::policy::GovernancePolicy;

    #[test]
    fn test_max_dimensions_flags_excessive_resolution() {
        let policy = GovernancePolicy {
            max_dimensions_width: Some(1920),
            max_dimensions_height: Some(1080),
            ..Default::default()
        };

        let asset_ok = Asset {
            id: "ok".into(),
            path: "/ws/ok.png".into(),
            relative_path: "ok.png".into(),
            name: "ok.png".into(),
            stem: "ok".into(),
            size_bytes: 100,
            mtime_ms: 0,
            kind: AssetKind::Static,
            format: AssetFormat::Png,
            content_hash: None,
            dimensions: Some(Dimensions {
                width: 800,
                height: 600,
            }),
            motion: None,
            static_meta: None,
            thumbnail_path: None,
            is_valid: true,
            error: None,
        };

        let asset_huge = Asset {
            id: "huge".into(),
            path: "/ws/huge.png".into(),
            relative_path: "huge.png".into(),
            name: "huge.png".into(),
            stem: "huge".into(),
            size_bytes: 1000,
            mtime_ms: 0,
            kind: AssetKind::Static,
            format: AssetFormat::Png,
            content_hash: None,
            dimensions: Some(Dimensions {
                width: 3840,
                height: 2160,
            }),
            motion: None,
            static_meta: None,
            thumbnail_path: None,
            is_valid: true,
            error: None,
        };

        let assets = vec![asset_ok, asset_huge];
        let dups = vec![];
        let refs = vec![];
        let ws_root = std::path::Path::new("/ws");
        let ctx = AnalysisContext::new(ws_root, &assets, &refs, &dups, &policy);

        let rule = MaxDimensionsRule;
        let diags = rule.evaluate(&ctx);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].target_asset_id.as_deref(), Some("huge"));
    }
}
