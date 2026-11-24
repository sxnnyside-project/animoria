use animoria_core::indexer::AssetIndex;
use std::fs;
use tempfile::tempdir;

const MINIMAL_PNG: &[u8] = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82";
const MINIMAL_SVG: &[u8] =
    br#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>"#;

#[test]
fn test_monekin_dart_interpolation_and_catalog() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // 1. Catalog SVGs in supported_selectable_icons
    let catalog_dir = root.join("assets/icons/supported_selectable_icons/finance");
    fs::create_dir_all(&catalog_dir).unwrap();
    fs::write(catalog_dir.join("bank.svg"), MINIMAL_SVG).unwrap();
    fs::write(catalog_dir.join("wallet.svg"), MINIMAL_SVG).unwrap();

    // 2. 3 unreferenced SVGs OUTSIDE the catalog (Monekin closing criterion)
    let outside_dir = root.join("assets/icons/unused_outside");
    fs::create_dir_all(&outside_dir).unwrap();
    fs::write(outside_dir.join("orphan1.svg"), MINIMAL_SVG).unwrap();
    fs::write(outside_dir.join("orphan2.svg"), MINIMAL_SVG).unwrap();
    fs::write(outside_dir.join("orphan3.svg"), MINIMAL_SVG).unwrap();

    // 3. Dart file referencing catalog with interpolation
    let lib_dir = root.join("lib/screens");
    fs::create_dir_all(&lib_dir).unwrap();
    fs::write(
        lib_dir.join("icon_picker.dart"),
        r#"
String getIconPath(String scope, String id) {
  return 'assets/icons/supported_selectable_icons/$scope/$id.svg';
}
"#,
    )
    .unwrap();

    // 4. pubspec.yaml declaring the folder
    fs::write(
        root.join("pubspec.yaml"),
        r#"
name: monekin
flutter:
  assets:
    - assets/icons/supported_selectable_icons/
"#,
    )
    .unwrap();

    let mut indexer = AssetIndex::new("monekin".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let unref: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    // The 2 catalog SVGs MUST NOT be flagged as unreferenced
    assert!(
        !unref
            .iter()
            .any(|d| d.target_asset_path.ends_with("bank.svg")),
        "bank.svg in catalog should be recognized as referenced"
    );
    assert!(
        !unref
            .iter()
            .any(|d| d.target_asset_path.ends_with("wallet.svg")),
        "wallet.svg in catalog should be recognized as referenced"
    );

    // Closing criterion: Exactly the 3 outside SVGs remain unreferenced
    assert_eq!(
        unref.len(),
        3,
        "Exactly the 3 SVGs outside the catalog must remain unreferenced"
    );
    assert!(unref
        .iter()
        .any(|d| d.target_asset_path.ends_with("orphan1.svg")));
    assert!(unref
        .iter()
        .any(|d| d.target_asset_path.ends_with("orphan2.svg")));
    assert!(unref
        .iter()
        .any(|d| d.target_asset_path.ends_with("orphan3.svg")));
}

#[test]
fn test_hacki_and_dart_avatars() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // 1. Hacki constants.dart: $_imagePath/foo.png
    let img_dir = root.join("assets/images");
    fs::create_dir_all(&img_dir).unwrap();
    fs::write(img_dir.join("foo.png"), MINIMAL_PNG).unwrap();

    // 2. Avatars: assets/icons/avatars/$avatar.svg
    let avatar_dir = root.join("assets/icons/avatars");
    fs::create_dir_all(&avatar_dir).unwrap();
    fs::write(avatar_dir.join("user.svg"), MINIMAL_SVG).unwrap();

    let lib_dir = root.join("lib/config");
    fs::create_dir_all(&lib_dir).unwrap();
    fs::write(
        lib_dir.join("constants.dart"),
        r#"
const _imagePath = 'assets/images';
const fooImg = '$_imagePath/foo.png';
final avatarIcon = 'assets/icons/avatars/$avatar.svg';
"#,
    )
    .unwrap();

    let mut indexer = AssetIndex::new("hacki".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let unref: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    assert!(
        unref.is_empty(),
        "Both foo.png and user.svg must be referenced, but found: {:?}",
        unref
    );
}

#[test]
fn test_js_concatenation_wnr_and_ng_matero() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // 1. RoderickQiu/wnr: 'res/icons/overlay/' + n + '.png'
    let overlay_dir = root.join("res/icons/overlay");
    fs::create_dir_all(&overlay_dir).unwrap();
    for i in 0..5 {
        fs::write(overlay_dir.join(format!("{}.png", i)), MINIMAL_PNG).unwrap();
    }

    // 2. ng-matero: dir + i + '.jpg'
    let gallery_dir = root.join("assets/images/gallery");
    fs::create_dir_all(&gallery_dir).unwrap();
    for i in 1..=3 {
        fs::write(
            gallery_dir.join(format!("{}.jpg", i)),
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9",
        )
        .unwrap();
    }

    let src_dir = root.join("src");
    fs::create_dir_all(&src_dir).unwrap();
    fs::write(
        src_dir.join("wnr.js"),
        r#"
function getOverlay(n) {
  return 'res/icons/overlay/' + n + '.png';
}
"#,
    )
    .unwrap();

    fs::write(
        src_dir.join("gallery.ts"),
        r#"
const dir = 'assets/images/gallery/';
const photos = [];
for (let i = 1; i <= 3; i++) {
  photos.push({ src: dir + i + '.jpg' });
}
"#,
    )
    .unwrap();

    let mut indexer = AssetIndex::new("concatenation".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let unref: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    assert!(
        unref.is_empty(),
        "Overlay and gallery photos must be resolved, but found unreferenced: {:?}",
        unref
    );
}

#[test]
fn test_template_literals_and_glob_imports() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // 1. Template literal: /lab/lottie/assets/${cfg.dir}/${kind}.lottie
    let lottie_dir = root.join("lab/lottie/assets/animations");
    fs::create_dir_all(&lottie_dir).unwrap();
    fs::write(
        lottie_dir.join("loading.lottie"),
        br#"{"v":"5.5.7","fr":60,"ip":0,"op":60,"w":100,"h":100,"layers":[]}"#,
    )
    .unwrap();

    // 2. Template literal without extension: /assets/projects/${slug}/${image}
    let proj_dir = root.join("assets/projects/alpha");
    fs::create_dir_all(&proj_dir).unwrap();
    fs::write(proj_dir.join("cover.png"), MINIMAL_PNG).unwrap();

    // 3. significa.co: import.meta.glob with query params
    let stickers_dir = root.join("src/stickers");
    fs::create_dir_all(&stickers_dir).unwrap();
    fs::write(stickers_dir.join("egg.svg"), MINIMAL_SVG).unwrap();
    fs::write(stickers_dir.join("plant.svg"), MINIMAL_SVG).unwrap();

    let src_dir = root.join("src/routes");
    fs::create_dir_all(&src_dir).unwrap();
    fs::write(
        src_dir.join("+page.svelte"),
        r#"
<script>
  const stickers = import.meta.glob('../stickers/*.svg', { eager: true, as: 'url' });
  const lottiePath = `/lab/lottie/assets/${cfg.dir}/${kind}.lottie`;
  const projectImg = `/assets/projects/${slug}/${image}`;
</script>
"#,
    )
    .unwrap();

    let mut indexer = AssetIndex::new("templates".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    let unref: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.rule_id == "no-unreferenced-assets")
        .collect();

    assert!(
        unref.is_empty(),
        "All template literal and glob assets must be resolved, but found: {:?}",
        unref
    );
}

#[test]
fn test_spring_classpath_and_oversized_demo_gif() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // 1. Spring Boot classpath migration in SQL
    let icons_dir = root.join("booklore-api/src/main/resources/static/images/icons/svg");
    fs::create_dir_all(&icons_dir).unwrap();
    fs::write(icons_dir.join("book.svg"), MINIMAL_SVG).unwrap();

    let db_dir = root.join("booklore-api/src/main/resources/db/migration");
    fs::create_dir_all(&db_dir).unwrap();
    fs::write(
        db_dir.join("V1__init.sql"),
        "INSERT INTO icons (pattern) VALUES ('classpath:static/images/icons/svg/*.svg');\n",
    )
    .unwrap();

    // 2. Real finding (closing criterion): demo.gif is oversized (e.g. 1.2 MB > 1024 KB default)
    let assets_dir = root.join("assets");
    fs::create_dir_all(&assets_dir).unwrap();
    let oversized_gif = vec![0u8; 1_200_000];
    fs::write(assets_dir.join("demo.gif"), &oversized_gif).unwrap();

    let mut indexer = AssetIndex::new("booklore".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    // Verify book.svg is recognized as referenced via classpath glob
    let unref_book = analysis.diagnostics.iter().any(|d| {
        d.rule_id == "no-unreferenced-assets" && d.target_asset_path.ends_with("book.svg")
    });
    assert!(
        !unref_book,
        "book.svg should be referenced via classpath: glob"
    );

    // Verify demo.gif is STILL flagged as a violation (format or sizing)
    let demo_violations: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| d.target_asset_path.ends_with("demo.gif"))
        .collect();
    assert!(
        !demo_violations.is_empty(),
        "demo.gif must STILL be detected as a finding (e.g. max-file-size-kb or no-gif)"
    );
}

#[test]
fn test_packaging_conventions_and_oversized_svg() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Fastlane screenshots
    let fastlane_dir = root.join("fastlane/metadata/android/en-US/images/phoneScreenshots");
    fs::create_dir_all(&fastlane_dir).unwrap();
    fs::write(fastlane_dir.join("1.png"), MINIMAL_PNG).unwrap();

    // Flutter test golden
    let test_dir = root.join("test/goldens");
    fs::create_dir_all(&test_dir).unwrap();
    fs::write(test_dir.join("home_screen_test.dart.0.png"), MINIMAL_PNG).unwrap();

    // Windows / Tauri packaging logos
    let win_dir = root.join("src-tauri/icons");
    fs::create_dir_all(&win_dir).unwrap();
    fs::write(win_dir.join("Square150x150Logo.png"), MINIMAL_PNG).unwrap();
    fs::write(win_dir.join("StoreLogo.png"), MINIMAL_PNG).unwrap();

    // Flutter web splash and icons
    let web_dir = root.join("web/icons");
    fs::create_dir_all(&web_dir).unwrap();
    fs::write(web_dir.join("Icon-192.png"), MINIMAL_PNG).unwrap();
    fs::write(root.join("web/splash.png"), MINIMAL_PNG).unwrap();

    // Real finding (closing criterion): vibetype smartphone.svg (oversized SVG > 1024 KB)
    let vibetype_dir = root.join("assets");
    fs::create_dir_all(&vibetype_dir).unwrap();
    let mut large_svg = Vec::new();
    large_svg.extend_from_slice(
        br#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><!--"#,
    );
    large_svg.resize(1_200_000, b'x');
    large_svg.extend_from_slice(br#"--><path d="M0 0"/></g></svg>"#);
    fs::write(vibetype_dir.join("smartphone.svg"), &large_svg).unwrap();

    let mut indexer = AssetIndex::new("vibetype".to_string(), root.to_path_buf());
    let analysis = indexer.scan_workspace(&[]).unwrap();

    // Verify packaging conventions are ignored from unreferenced assets
    let unref_packaging: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| {
            d.rule_id == "no-unreferenced-assets"
                && !d.target_asset_path.ends_with("smartphone.svg")
        })
        .collect();
    assert!(
        unref_packaging.is_empty(),
        "Packaging conventions should not be flagged as unreferenced: {:?}",
        unref_packaging
    );

    // Verify smartphone.svg is STILL flagged for sizing
    let size_violations: Vec<_> = analysis
        .diagnostics
        .iter()
        .filter(|d| {
            d.target_asset_path.ends_with("smartphone.svg") && d.rule_id == "max-file-size-kb"
        })
        .collect();
    assert!(
        !size_violations.is_empty(),
        "smartphone.svg must STILL be flagged as oversized"
    );

    // Verify overall score is mathematically bounded by category scores and not 0 F!
    assert!(analysis.health_score.score > 0);
    let min_cat = analysis
        .health_score
        .categories
        .iter()
        .map(|c| c.score)
        .min()
        .unwrap();
    let max_cat = analysis
        .health_score
        .categories
        .iter()
        .map(|c| c.score)
        .max()
        .unwrap();
    assert!(analysis.health_score.score >= min_cat);
    assert!(analysis.health_score.score <= max_cat);
}
