use crate::contracts::analysis::RuleDiagnostic;
use crate::contracts::asset::AssetFormat;
use crate::governance::context::AnalysisContext;
use crate::governance::rule::Rule;
use std::fs::File;
use std::io::Read;

pub struct SvgSanitizationRule;

impl Rule for SvgSanitizationRule {
    fn id(&self) -> &str {
        "svg-sanitization"
    }

    fn evaluate(&self, ctx: &AnalysisContext) -> Vec<RuleDiagnostic> {
        let mut diagnostics = Vec::new();

        for asset in ctx.assets {
            let policy = ctx.policy_for(&asset.relative_path);
            if !policy.svg_sanitization {
                continue;
            }

            if asset.format != AssetFormat::Svg && asset.format != AssetFormat::AnimatedSvg {
                continue;
            }

            let path = std::path::Path::new(&asset.path);
            let file = match File::open(path) {
                Ok(f) => f,
                Err(_) => continue,
            };

            let mut buffer = Vec::new();
            if file.take(2 * 1024 * 1024).read_to_end(&mut buffer).is_err() {
                continue;
            }

            let text = String::from_utf8_lossy(&buffer).to_lowercase();

            if let Some(finding) = detect_svg_vulnerability(&text) {
                diagnostics.push(RuleDiagnostic {
                    rule_id: self.id().to_string(),
                    severity: policy.svg_sanitization_severity,
                    message: format!(
                        "Security risk in SVG asset '{}': detected dangerous pattern '{}'.",
                        asset.relative_path, finding
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

pub fn detect_svg_vulnerability(raw_text: &str) -> Option<&'static str> {
    let text = raw_text.to_lowercase();
    if text.contains("<script") {
        return Some("<script> tag");
    }
    if text.contains("<!entity") {
        return Some("<!ENTITY> XML external entity (XXE)");
    }
    if text.contains("<foreignobject") {
        return Some("<foreignObject> element");
    }
    if text.contains("<iframe") {
        return Some("<iframe> element");
    }
    if text.contains("<embed") {
        return Some("<embed> element");
    }
    if text.contains("javascript:") {
        return Some("javascript: URI handler");
    }

    const EVENT_HANDLERS: &[&str] = &[
        "onload=",
        "onerror=",
        "onclick=",
        "onmouseover=",
        "onfocus=",
        "onblur=",
        "onresize=",
        "onunload=",
        "onbegin=",
        "onend=",
        "onrepeat=",
        "onloadend=",
    ];

    for handler in EVENT_HANDLERS {
        if text.contains(handler) {
            return Some("inline event handler (e.g. onload/onclick)");
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_svg_vulnerability() {
        assert_eq!(
            detect_svg_vulnerability("<svg><script>alert(1)</script></svg>"),
            Some("<script> tag")
        );
        assert_eq!(
            detect_svg_vulnerability(r#"<svg><rect onload="evil()"/></svg>"#),
            Some("inline event handler (e.g. onload/onclick)")
        );
        assert_eq!(
            detect_svg_vulnerability(r#"<svg><a href="javascript:alert(1)">link</a></svg>"#),
            Some("javascript: URI handler")
        );
        assert_eq!(
            detect_svg_vulnerability(r#"<!DOCTYPE svg [<!ENTITY xxe SYSTEM "http://evil.com">]>"#),
            Some("<!ENTITY> XML external entity (XXE)")
        );
        assert_eq!(
            detect_svg_vulnerability("<svg><path d=\"M0 0 L10 10\"/></svg>"),
            None
        );
    }
}
