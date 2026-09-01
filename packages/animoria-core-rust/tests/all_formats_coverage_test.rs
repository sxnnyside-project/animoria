//! Proves the engine actually detects every asset format it claims to
//! support, against real fixture files — not just the 3/11 formats
//! (Lottie/GIF/SVG) the rest of the fixture set happened to cover.

use animoria_core::contracts::asset::AssetFormat;
use animoria_core::indexer::AssetIndex;
use std::path::PathBuf;

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("fixtures")
}

#[test]
fn scan_detects_every_supported_asset_format_as_valid() {
    let root = fixtures_root().join("all-formats");
    let mut index = AssetIndex::new("root".to_string(), root.clone());
    let analysis = index.scan_workspace(&[]).expect("scan should succeed");

    assert_eq!(
        analysis.state,
        animoria_core::contracts::analysis::LifecycleState::Ready
    );

    let by_format: std::collections::HashMap<AssetFormat, animoria_core::contracts::asset::Asset> =
        index.assets().into_iter().map(|a| (a.format, a)).collect();

    for format in [
        AssetFormat::Png,
        AssetFormat::Apng,
        AssetFormat::Jpeg,
        AssetFormat::Webp,
        AssetFormat::Avif,
        AssetFormat::Rive,
        AssetFormat::DotLottie,
        AssetFormat::AnimatedSvg,
    ] {
        let asset = by_format.get(&format).unwrap_or_else(|| {
            panic!("no asset detected as {format:?} in the all-formats fixture")
        });
        assert!(
            asset.is_valid,
            "{format:?} asset should parse as valid: {:?}",
            asset.error
        );
    }

    // The two dimension-bearing raster formats should have real dimensions,
    // not just a format label — the fixtures embed a real VP8/ispe payload
    // specifically so this isn't a rubber-stamp pass.
    let webp = &by_format[&AssetFormat::Webp];
    assert_eq!(
        webp.dimensions,
        Some(animoria_core::contracts::asset::Dimensions {
            width: 64,
            height: 64
        })
    );
    let avif = &by_format[&AssetFormat::Avif];
    assert_eq!(
        avif.dimensions,
        Some(animoria_core::contracts::asset::Dimensions {
            width: 128,
            height: 96
        })
    );

    // References into these newly-covered formats must trace too, not just
    // the assets themselves.
    let dotlottie_ref = index
        .references()
        .iter()
        .find(|r| r.asset_id == by_format[&AssetFormat::DotLottie].path);
    assert!(
        dotlottie_ref.is_some(),
        "App.tsx's dotLottie import should be traced"
    );

    let rive_ref = index
        .references()
        .iter()
        .find(|r| r.asset_id == by_format[&AssetFormat::Rive].path);
    assert!(rive_ref.is_some(), "App.tsx's Rive import should be traced");
}
