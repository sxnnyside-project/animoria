//! Thumbnail resolution for the asset gallery.
//!
//! Two tiers only, chosen by whether a browser/webview can already render
//! the asset's own file natively:
//!
//! 1. **Self** — raster images, SVG, GIF, APNG, and Animated SVG are already
//!    a displayable file; `thumbnail_path` is simply the asset's own path.
//! 2. **Generated SVG placeholder** — Lottie, dotLottie, and Rive have no
//!    natively-displayable file, so a small deterministic SVG badge (format
//!    label + asset name) is written under `.animoria/thumbnails/` and
//!    referenced instead.
//!
//! No external process, no headless browser, no rendering of actual
//! animation content — this exists to guarantee every valid asset has
//! *something* to show, not to preview frame content.

use std::fs;
use std::path::{Path, PathBuf};

use crate::contracts::asset::{Asset, AssetFormat};

fn needs_generated_thumbnail(format: AssetFormat) -> bool {
    matches!(
        format,
        AssetFormat::Lottie | AssetFormat::DotLottie | AssetFormat::Rive
    )
}

/// Resolves (and, if necessary, generates) the thumbnail path for `asset`.
/// Returns `None` only if SVG generation itself fails (e.g. an unwritable
/// `.animoria/thumbnails/` directory).
pub fn resolve_thumbnail(workspace_root: &Path, asset: &Asset) -> Option<String> {
    if !asset.is_valid {
        return None;
    }

    if !needs_generated_thumbnail(asset.format) {
        return Some(asset.path.clone());
    }

    let thumb_dir = workspace_root.join(".animoria").join("thumbnails");
    if fs::create_dir_all(&thumb_dir).is_err() {
        return None;
    }

    let filename = format!("{}-{}.svg", asset.stem, &asset.id);
    let target: PathBuf = thumb_dir.join(&filename);

    if !target.exists() {
        let svg = render_badge_svg(asset);
        if fs::write(&target, svg).is_err() {
            return None;
        }
    }

    Some(target.to_string_lossy().to_string())
}

fn format_label(format: AssetFormat) -> &'static str {
    match format {
        AssetFormat::Lottie => "Lottie",
        AssetFormat::DotLottie => "dotLottie",
        AssetFormat::Rive => "Rive",
        _ => "",
    }
}

fn format_color(format: AssetFormat) -> &'static str {
    match format {
        AssetFormat::Lottie => "#7C3AED",
        AssetFormat::DotLottie => "#059669",
        AssetFormat::Rive => "#DC2626",
        _ => "#6B7280",
    }
}

fn render_badge_svg(asset: &Asset) -> String {
    let label = format_label(asset.format);
    let color = format_color(asset.format);
    let name = escape_xml(&asset.name);

    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" fill="{color}" opacity="0.12"/>
  <rect x="0" y="0" width="256" height="8" fill="{color}"/>
  <text x="128" y="118" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="{color}">{label}</text>
  <text x="128" y="148" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="{color}" opacity="0.75">{name}</text>
</svg>"#
    )
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_asset(format: AssetFormat, is_valid: bool) -> Asset {
        Asset {
            id: "abc123".to_string(),
            path: "/workspace/assets/my-anim.json".to_string(),
            relative_path: "assets/my-anim.json".to_string(),
            name: "my-anim.json".to_string(),
            stem: "my-anim".to_string(),
            size_bytes: 1024,
            mtime_ms: 0,
            kind: format.kind(),
            format,
            content_hash: None,
            dimensions: None,
            motion: None,
            static_meta: None,
            thumbnail_path: None,
            is_valid,
            error: None,
        }
    }

    #[test]
    fn self_displayable_formats_reuse_the_asset_own_path() {
        let dir = tempfile::tempdir().unwrap();
        for format in [
            AssetFormat::Svg,
            AssetFormat::Png,
            AssetFormat::Jpeg,
            AssetFormat::Webp,
            AssetFormat::Avif,
            AssetFormat::Gif,
            AssetFormat::Apng,
            AssetFormat::AnimatedSvg,
        ] {
            let asset = make_asset(format, true);
            let thumb = resolve_thumbnail(dir.path(), &asset).expect("thumbnail resolved");
            assert_eq!(
                thumb, asset.path,
                "format {format:?} should reuse its own path"
            );
        }
    }

    #[test]
    fn motion_formats_needing_generation_get_a_written_svg_badge() {
        let dir = tempfile::tempdir().unwrap();
        for format in [
            AssetFormat::Lottie,
            AssetFormat::DotLottie,
            AssetFormat::Rive,
        ] {
            let mut asset = make_asset(format, true);
            asset.id = format!("{format:?}-id");
            let thumb = resolve_thumbnail(dir.path(), &asset).expect("thumbnail resolved");

            assert_ne!(thumb, asset.path);
            assert!(thumb.ends_with(".svg"));

            let contents = fs::read_to_string(&thumb).expect("badge file exists");
            assert!(contents.contains("<svg"));
            assert!(contents.contains(format_label(format)));
        }
    }

    #[test]
    fn invalid_assets_never_get_a_thumbnail() {
        let dir = tempfile::tempdir().unwrap();
        let asset = make_asset(AssetFormat::Lottie, false);
        assert_eq!(resolve_thumbnail(dir.path(), &asset), None);
    }

    #[test]
    fn generated_badge_is_written_once_and_reused_on_subsequent_calls() {
        let dir = tempfile::tempdir().unwrap();
        let asset = make_asset(AssetFormat::Rive, true);

        let first = resolve_thumbnail(dir.path(), &asset).unwrap();
        let written_at = fs::metadata(&first).unwrap().modified().unwrap();

        std::thread::sleep(std::time::Duration::from_millis(10));
        let second = resolve_thumbnail(dir.path(), &asset).unwrap();

        assert_eq!(first, second);
        assert_eq!(
            fs::metadata(&second).unwrap().modified().unwrap(),
            written_at
        );
    }

    #[test]
    fn badge_svg_escapes_xml_special_characters_in_the_asset_name() {
        let mut asset = make_asset(AssetFormat::Lottie, true);
        asset.name = "<tag> & \"quote\"".to_string();
        let svg = render_badge_svg(&asset);
        assert!(!svg.contains("<tag>"));
        assert!(svg.contains("&lt;tag&gt; &amp; &quot;quote&quot;"));
    }

    #[test]
    fn every_kind_gets_a_distinct_color_and_label() {
        assert_ne!(
            format_color(AssetFormat::Lottie),
            format_color(AssetFormat::Rive)
        );
        assert_ne!(
            format_label(AssetFormat::Lottie),
            format_label(AssetFormat::DotLottie)
        );
        assert_eq!(format_label(AssetFormat::Png), "");
    }
}
