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
/// Returns `None` only if generation itself fails.
pub fn resolve_thumbnail(workspace_root: &Path, asset: &Asset) -> Option<String> {
    if !asset.is_valid {
        return None;
    }

    if needs_generated_thumbnail(asset.format) {
        let thumb_dir = workspace_root.join(".animoria/thumbnails");
        if fs::create_dir_all(&thumb_dir).is_err() {
            return None;
        }

        let filename = format!("{}-{}.svg", asset.stem, asset.id);
        let target: PathBuf = thumb_dir.join(&filename);

        if !target.exists() {
            let svg = render_badge_svg(asset);
            if fs::write(&target, svg).is_err() {
                return None;
            }
        }

        return Some(target.to_string_lossy().to_string());
    }

    // Downscale large raster images (PNG, JPEG) if dimensions exceed 256px
    if should_downscale_raster(asset) {
        if let Some(downscaled_path) = downscale_raster_thumbnail(workspace_root, asset) {
            return Some(downscaled_path);
        }
    }

    Some(asset.path.clone())
}

fn should_downscale_raster(asset: &Asset) -> bool {
    if !matches!(asset.format, AssetFormat::Png | AssetFormat::Jpeg) {
        return false;
    }

    if let Some(dims) = asset.dimensions {
        dims.width > 256 || dims.height > 256
    } else {
        asset.size_bytes > 500_000
    }
}

fn downscale_raster_thumbnail(workspace_root: &Path, asset: &Asset) -> Option<String> {
    let thumb_dir = workspace_root.join(".animoria/thumbnails");
    if fs::create_dir_all(&thumb_dir).is_err() {
        return None;
    }

    let ext = if asset.format == AssetFormat::Jpeg {
        "jpg"
    } else {
        "png"
    };
    let filename = format!("{}-{}-thumb.{}", asset.stem, asset.id, ext);
    let target: PathBuf = thumb_dir.join(&filename);

    if target.exists() {
        return Some(target.to_string_lossy().to_string());
    }

    let img = image::open(&asset.path).ok()?;
    let thumb = img.thumbnail(256, 256);
    thumb.save(&target).ok()?;

    Some(target.to_string_lossy().to_string())
}

/// Checks if the `.animoria` directory (or its subdirectories) is empty, and deletes it if so.
pub fn clean_empty_animoria_dir(workspace_root: &Path) {
    let animoria_dir = workspace_root.join(".animoria");
    if !animoria_dir.is_dir() {
        return;
    }

    // Attempt to remove empty subdirectories first
    let subdirs = ["thumbnails", "trash", "audit"];
    for sub in &subdirs {
        let sub_path = animoria_dir.join(sub);
        if sub_path.is_dir() {
            if let Ok(mut entries) = fs::read_dir(&sub_path) {
                if entries.next().is_none() {
                    let _ = fs::remove_dir(&sub_path);
                }
            }
        }
    }

    // Now check if .animoria itself has any entries
    if let Ok(mut entries) = fs::read_dir(&animoria_dir) {
        if entries.next().is_none() {
            let _ = fs::remove_dir(&animoria_dir);
        }
    }
}

/// Prunes orphaned or stale thumbnail files in `.animoria/thumbnails/` whose
/// corresponding asset is no longer present in `active_assets`.
///
/// Returns the number of orphaned thumbnail files deleted.
pub fn prune_stale_thumbnails(workspace_root: &Path, active_assets: &[Asset]) -> usize {
    let thumb_dir = workspace_root.join(".animoria/thumbnails");
    if !thumb_dir.is_dir() {
        return 0;
    }

    let mut valid_filenames = std::collections::HashSet::new();
    for asset in active_assets {
        if !asset.is_valid {
            continue;
        }
        if needs_generated_thumbnail(asset.format) {
            valid_filenames.insert(format!("{}-{}.svg", asset.stem, asset.id));
        } else if should_downscale_raster(asset) {
            let ext = if asset.format == AssetFormat::Jpeg {
                "jpg"
            } else {
                "png"
            };
            valid_filenames.insert(format!("{}-{}-thumb.{}", asset.stem, asset.id, ext));
        }
    }

    let mut pruned_count = 0;
    if let Ok(entries) = fs::read_dir(&thumb_dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !valid_filenames.contains(name) && fs::remove_file(&path).is_ok() {
                        pruned_count += 1;
                    }
                }
            }
        }
    }

    clean_empty_animoria_dir(workspace_root);
    pruned_count
}

/// Purges all generated thumbnails in `.animoria/thumbnails/`.
///
/// Returns `(purged_file_count, bytes_reclaimed)`.
pub fn purge_all_thumbnails(workspace_root: &Path) -> std::io::Result<(usize, u64)> {
    let thumb_dir = workspace_root.join(".animoria/thumbnails");
    if !thumb_dir.is_dir() {
        return Ok((0, 0));
    }

    let mut count = 0;
    let mut bytes = 0;

    if let Ok(entries) = fs::read_dir(&thumb_dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                bytes += entry.metadata().map(|m| m.len()).unwrap_or(0);
                count += 1;
            }
        }
    }

    let _ = fs::remove_dir_all(&thumb_dir);
    clean_empty_animoria_dir(workspace_root);
    Ok((count, bytes))
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

    #[test]
    fn downscales_large_raster_images() {
        let dir = tempfile::tempdir().unwrap();
        let ws_root = dir.path();

        // Create a 512x512 PNG file using image crate
        let img = image::RgbaImage::new(512, 512);
        let img_path = ws_root.join("huge.png");
        img.save(&img_path).unwrap();

        let mut asset = make_asset(AssetFormat::Png, true);
        asset.id = "huge123".to_string();
        asset.path = img_path.to_string_lossy().to_string();
        asset.stem = "huge".to_string();
        asset.name = "huge.png".to_string();
        asset.dimensions = Some(crate::contracts::asset::Dimensions {
            width: 512,
            height: 512,
        });

        let thumb = resolve_thumbnail(ws_root, &asset).expect("thumbnail resolved");
        assert_ne!(thumb, asset.path);
        assert!(thumb.ends_with(".png"));
        assert!(thumb.contains(".animoria/thumbnails"));

        // Verify that the generated thumbnail is indeed <= 256x256
        let generated_img = image::open(&thumb).expect("thumbnail opens");
        assert!(generated_img.width() <= 256);
        assert!(generated_img.height() <= 256);
    }

    #[test]
    fn prunes_stale_thumbnails_and_removes_empty_animoria_directory() {
        let dir = tempfile::tempdir().unwrap();
        let ws = dir.path();

        let mut asset1 = make_asset(AssetFormat::Lottie, true);
        asset1.id = "asset-1".to_string();
        asset1.stem = "anim1".to_string();

        let mut asset2 = make_asset(AssetFormat::Rive, true);
        asset2.id = "asset-2".to_string();
        asset2.stem = "anim2".to_string();

        let thumb1 = resolve_thumbnail(ws, &asset1).unwrap();
        let thumb2 = resolve_thumbnail(ws, &asset2).unwrap();
        assert!(Path::new(&thumb1).exists());
        assert!(Path::new(&thumb2).exists());

        // When both assets are active, pruning removes 0 files
        let pruned = prune_stale_thumbnails(ws, &[asset1.clone(), asset2.clone()]);
        assert_eq!(pruned, 0);
        assert!(Path::new(&thumb1).exists());
        assert!(Path::new(&thumb2).exists());

        // When asset2 is deleted from workspace, pruning removes its thumbnail
        let pruned = prune_stale_thumbnails(ws, &[asset1.clone()]);
        assert_eq!(pruned, 1);
        assert!(Path::new(&thumb1).exists());
        assert!(!Path::new(&thumb2).exists());

        // When all assets are deleted, pruning removes remaining thumbnail and cleans .animoria/
        let pruned = prune_stale_thumbnails(ws, &[]);
        assert_eq!(pruned, 1);
        assert!(!Path::new(&thumb1).exists());
        assert!(!ws.join(".animoria").exists());
    }

    #[test]
    fn purge_all_thumbnails_reclaims_bytes_and_removes_cache() {
        let dir = tempfile::tempdir().unwrap();
        let ws = dir.path();

        let mut asset = make_asset(AssetFormat::Lottie, true);
        asset.id = "lottie-xyz".to_string();
        let thumb = resolve_thumbnail(ws, &asset).unwrap();
        assert!(Path::new(&thumb).exists());

        let (count, bytes) = purge_all_thumbnails(ws).unwrap();
        assert_eq!(count, 1);
        assert!(bytes > 0);
        assert!(!Path::new(&thumb).exists());
        assert!(!ws.join(".animoria").exists());
    }
}
