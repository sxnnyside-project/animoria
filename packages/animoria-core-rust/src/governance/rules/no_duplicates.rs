use crate::contracts::analysis::{DiagnosticSeverity, RuleDiagnostic};
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;

/// Flags every non-canonical copy in a duplicate group as an error.
///
/// The canonical asset (`DuplicateGroup::canonical_asset_id`, chosen by
/// `deduplication::cluster::find_duplicate_groups`) is deliberately exempt:
/// someone has to be "the original" for a diagnostic to make sense as
/// "delete this, keep that," and the alternative — flagging every copy
/// including the one meant to survive — would make `clean`'s own target
/// indistinguishable from what it's being asked to remove.
pub struct NoDuplicateContentRule;

impl Rule for NoDuplicateContentRule {
    fn id(&self) -> &str {
        "no-duplicate-content"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        if !ctx.policy.no_duplicate_content {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();

        for group in ctx.duplicate_groups {
            for asset_id in &group.asset_ids {
                // The canonical asset is not flagged; all duplicate copies are flagged
                if asset_id != &group.canonical_asset_id {
                    if let Some(asset) = ctx.assets.iter().find(|a| &a.id == asset_id) {
                        diagnostics.push(RuleDiagnostic {
                            rule_id: self.id().to_string(),
                            severity: DiagnosticSeverity::Error,
                            message: format!(
                                "Asset '{}' is a byte-identical duplicate of canonical asset '{}' (SHA-256: {}).",
                                asset.relative_path, group.canonical_asset_id, &group.content_hash[..8]
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
        }

        diagnostics
    }
}
