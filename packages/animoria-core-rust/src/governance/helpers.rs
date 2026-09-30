use globset::{Glob, GlobSetBuilder};

/// Determines whether an asset is an application or platform icon (iOS, Android, PWA, Web favicon)
/// that usually exists in multiple resolutions and is referenced through manifests or platform
/// descriptors rather than standard source code imports.
pub fn is_app_icon(asset_rel_path: &str, asset_name: &str) -> bool {
    let path_lower = asset_rel_path.to_lowercase().replace('\\', "/");
    let name_lower = asset_name.to_lowercase();

    // 1. Directory hints for platform asset catalogs and density buckets
    if path_lower.contains(".appiconset/")
        || path_lower.contains("/mipmap-")
        || path_lower.contains("/drawable-")
        || path_lower.contains("android/app/src/main/res/")
        || path_lower.contains("ios/runner/assets.xcassets/")
        || path_lower.contains("/res/mipmap")
    {
        return true;
    }

    // 2. Specific icon naming conventions
    if name_lower.starts_with("ic_launcher")
        || name_lower.starts_with("appicon")
        || name_lower.starts_with("apple-touch-icon")
        || name_lower.starts_with("favicon")
        || name_lower.starts_with("maskable_icon")
    {
        return true;
    }

    // 3. Size-variant icon naming (e.g. icon-16x16.png, icon_512x512.png, icon@2x.png)
    if name_lower.starts_with("icon") {
        let is_size_variant = [
            "16x16", "24x24", "32x32", "48x48", "64x64", "72x72", "96x96", "128x128", "144x144",
            "152x152", "180x180", "192x192", "384x384", "512x512", "@2x", "@3x",
        ]
        .iter()
        .any(|pattern| name_lower.contains(pattern));

        if is_size_variant {
            return true;
        }
    }

    false
}

/// Matches a relative path against an array of glob patterns.
pub fn matches_any_pattern(path: &str, patterns: &[String]) -> bool {
    if patterns.is_empty() {
        return false;
    }

    let mut builder = GlobSetBuilder::new();
    for p in patterns {
        if let Ok(glob) = Glob::new(p) {
            builder.add(glob);
        }
    }

    if let Ok(set) = builder.build() {
        let normalized = path.replace('\\', "/");
        let stripped = normalized.trim_start_matches("./");
        return set.is_match(&normalized) || set.is_match(stripped);
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_ios_appiconset() {
        assert!(is_app_icon(
            "ios/AppIcon.appiconset/icon-60@2x.png",
            "icon-60@2x.png"
        ));
    }

    #[test]
    fn detects_android_mipmap() {
        assert!(is_app_icon(
            "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
            "ic_launcher.png"
        ));
    }

    #[test]
    fn detects_favicons_and_pwa_icons() {
        assert!(is_app_icon("public/favicon-32x32.png", "favicon-32x32.png"));
        assert!(is_app_icon("public/favicon.ico", "favicon.ico"));
        assert!(is_app_icon(
            "public/apple-touch-icon.png",
            "apple-touch-icon.png"
        ));
        assert!(is_app_icon("public/icon-192x192.png", "icon-192x192.png"));
    }

    #[test]
    fn does_not_flag_regular_assets() {
        assert!(!is_app_icon("src/assets/hero.png", "hero.png"));
        assert!(!is_app_icon("src/components/banner.svg", "banner.svg"));
    }

    #[test]
    fn test_pattern_matching() {
        let patterns = vec!["**/icons/**".to_string(), "*.ico".to_string()];
        assert!(matches_any_pattern(
            "src/assets/icons/custom.png",
            &patterns
        ));
        assert!(matches_any_pattern("public/test.ico", &patterns));
        assert!(!matches_any_pattern("src/assets/hero.png", &patterns));
    }
}
