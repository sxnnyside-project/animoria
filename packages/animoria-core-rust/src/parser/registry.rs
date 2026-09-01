use super::dotlottie::parse_dotlottie;
use super::lottie::parse_lottie;
use super::raster::parse_raster;
use super::rive::parse_rive;
use super::vector::parse_svg;
use crate::contracts::asset::{Asset, AssetFormat};
use std::path::Path;

#[derive(Default, Debug, Clone)]
pub struct ParserRegistry;

impl ParserRegistry {
    pub fn new() -> Self {
        Self
    }

    /// Enriches an already discovered `Asset` with deep format metadata.
    /// Invariant: Parser failure NEVER drops the asset — it marks `is_valid: false` with `error: Some(...)`.
    pub fn parse_asset(&self, path: &Path, asset: &mut Asset) {
        let result = match asset.format {
            AssetFormat::Lottie => parse_lottie(path, asset),
            AssetFormat::DotLottie => parse_dotlottie(path, asset),
            AssetFormat::Rive => parse_rive(path, asset),
            AssetFormat::Svg | AssetFormat::AnimatedSvg => parse_svg(path, asset),
            AssetFormat::Gif
            | AssetFormat::Apng
            | AssetFormat::Png
            | AssetFormat::Jpeg
            | AssetFormat::Webp
            | AssetFormat::Avif => parse_raster(path, asset),
        };

        if let Err(err_msg) = result {
            asset.is_valid = false;
            asset.error = Some(err_msg);
        }
    }
}
