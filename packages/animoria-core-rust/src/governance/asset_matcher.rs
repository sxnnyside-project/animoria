use globset::{Glob, GlobSetBuilder};

/// Determines whether an asset is an application or platform icon (iOS, Android, PWA, Web favicon)
/// that usually exists in multiple resolutions and is referenced through manifests or platform
/// descriptors rather than standard source code imports.
pub fn is_app_icon(asset_rel_path: &str, asset_name: &str) -> bool {
    let path_lower = asset_rel_path.to_lowercase().replace('\\', "/");
    let name_lower = asset_name.to_lowercase();

    // 1. Directory hints for platform asset catalogs, IDE plugins, density buckets, store metadata, test goldens
    if path_lower.contains(".appiconset/")
        || path_lower.contains("appicon.appiconset")
        || path_lower.contains("/mipmap-")
        || path_lower.contains("/drawable-")
        || path_lower.contains("android/app/src/main/res/")
        || path_lower.contains("ios/runner/assets.xcassets/")
        || path_lower.contains("/res/mipmap")
        || path_lower.contains("resources/icons/")
        || path_lower.contains("meta-inf/icons/")
        || path_lower.contains("favicon_io/")
        || path_lower.contains("/favicon_io")
        // Fastlane metadata store screenshots
        || path_lower.contains("fastlane/metadata/")
        || path_lower.contains("/phonescreenshots")
        || path_lower.contains("/tabletscreenshots")
        // Flutter test goldens
        || path_lower.contains("/goldens/")
        || path_lower.starts_with("goldens/")
        || path_lower.ends_with("/goldens")
        // Flutter web splash and icons
        || path_lower.starts_with("web/icons/")
        || path_lower.contains("/web/icons/")
        || path_lower.starts_with("web/splash/")
        || path_lower.contains("/web/splash/")
        || path_lower == "web/favicon.png"
        || path_lower.ends_with("/web/favicon.png")
        || path_lower == "web/splash.png"
        || path_lower.ends_with("/web/splash.png")
    {
        return true;
    }

    // 2. Specific icon naming conventions (mobile, web, IDE plugins, Windows/Tauri store assets)
    if name_lower.starts_with("ic_launcher")
        || name_lower.starts_with("appicon")
        || name_lower.starts_with("app-icon")
        || name_lower.starts_with("app_icon")
        || name_lower.starts_with("android-icon")
        || name_lower.starts_with("android-chrome")
        || name_lower.starts_with("pluginicon")
        || name_lower.starts_with("plugin_icon")
        || name_lower.starts_with("apple-touch-icon")
        || name_lower.starts_with("apple-icon")
        || name_lower.starts_with("favicon")
        || name_lower.starts_with("maskable_icon")
        || name_lower.starts_with("mstile-")
        // Windows / Tauri packaging and store logos
        || (name_lower.starts_with("square") && name_lower.contains("logo"))
        || name_lower.starts_with("storelogo")
        || name_lower.starts_with("badgelogo")
        || name_lower.starts_with("splashscreen")
        // Flutter test golden files (e.g. login_screen_test.dart.0.png)
        || (name_lower.contains(".dart.") && name_lower.ends_with(".png"))
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

        // Standard extension/app root icon (e.g. assets/icon.png, assets/icon.svg, public/icon.png)
        if (name_lower == "icon.png"
            || name_lower == "icon.svg"
            || name_lower == "icon.ico"
            || name_lower == "icon.icns")
            && (path_lower.contains("/assets/")
                || path_lower.contains("/icons/")
                || path_lower.contains("/public/")
                || path_lower.contains("/res/")
                || !path_lower.contains('/'))
        {
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
        assert!(is_app_icon(
            "ios/SpendSmart/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png",
            "App-Icon-1024x1024@1x.png"
        ));
    }

    #[test]
    fn detects_android_mipmap() {
        assert!(is_app_icon(
            "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
            "ic_launcher.png"
        ));
        assert!(is_app_icon(
            "android/app/src/main/res/drawable/android-icon-48x48.png",
            "android-icon-48x48.png"
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
        assert!(is_app_icon(
            "public/favicon_io/android-chrome-192x192.png",
            "android-chrome-192x192.png"
        ));
        assert!(is_app_icon(
            "website/favicon_io/apple-touch-icon.png",
            "apple-touch-icon.png"
        ));
    }

    #[test]
    fn detects_packaging_conventions_and_store_metadata() {
        // Fastlane screenshots
        assert!(is_app_icon(
            "fastlane/metadata/android/en-US/images/phoneScreenshots/1.png",
            "1.png"
        ));
        assert!(is_app_icon(
            "fastlane/metadata/ios/en-US/images/tabletScreenshots/2.png",
            "2.png"
        ));

        // Flutter test goldens
        assert!(is_app_icon(
            "test/goldens/login_screen.png",
            "login_screen.png"
        ));
        assert!(is_app_icon(
            "test/screens/home_test.dart.0.png",
            "home_test.dart.0.png"
        ));

        // Windows / Tauri packaging logos
        assert!(is_app_icon(
            "src-tauri/icons/Square310x310Logo.png",
            "Square310x310Logo.png"
        ));
        assert!(is_app_icon("windows/StoreLogo.png", "StoreLogo.png"));
        assert!(is_app_icon("windows/BadgeLogo.png", "BadgeLogo.png"));

        // Flutter web
        assert!(is_app_icon("web/icons/Icon-192.png", "Icon-192.png"));
        assert!(is_app_icon("web/favicon.png", "favicon.png"));
        assert!(is_app_icon("web/splash.png", "splash.png"));
        assert!(is_app_icon("web/splash/img/dark-1x.png", "dark-1x.png"));
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
