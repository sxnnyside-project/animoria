use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
#[serde(rename_all = "kebab-case")]
pub enum AssetKind {
    Motion,
    Static,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
#[serde(rename_all = "kebab-case")]
pub enum AssetFormat {
    // Motion Formats
    Lottie,
    DotLottie,
    Rive,
    Gif,
    Apng,
    AnimatedSvg,
    // Static Formats
    Svg,
    Png,
    Jpeg,
    Webp,
    Avif,
}

impl AssetFormat {
    pub fn kind(&self) -> AssetKind {
        match self {
            AssetFormat::Lottie
            | AssetFormat::DotLottie
            | AssetFormat::Rive
            | AssetFormat::Gif
            | AssetFormat::Apng
            | AssetFormat::AnimatedSvg => AssetKind::Motion,
            AssetFormat::Svg
            | AssetFormat::Png
            | AssetFormat::Jpeg
            | AssetFormat::Webp
            | AssetFormat::Avif => AssetKind::Static,
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            AssetFormat::Lottie => "json",
            AssetFormat::DotLottie => "lottie",
            AssetFormat::Rive => "riv",
            AssetFormat::Gif => "gif",
            AssetFormat::Apng => "png",
            AssetFormat::AnimatedSvg | AssetFormat::Svg => "svg",
            AssetFormat::Png => "png",
            AssetFormat::Jpeg => "jpg",
            AssetFormat::Webp => "webp",
            AssetFormat::Avif => "avif",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct Dimensions {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct MotionMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub fps: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub duration_secs: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub total_frames: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub layer_count: Option<u32>,
    pub is_animated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct StaticMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub color_depth: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub has_alpha: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct Asset {
    pub id: String,
    pub path: String,
    pub relative_path: String,
    pub name: String,
    pub stem: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub size_bytes: u64,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub mtime_ms: u64,
    pub kind: AssetKind,
    pub format: AssetFormat,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub content_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub dimensions: Option<Dimensions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub motion: Option<MotionMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub static_meta: Option<StaticMetadata>,
    /// Absolute path to a file the UI can render directly as a preview.
    /// For formats a browser/webview can already display natively (raster
    /// images, SVG, GIF, APNG, Animated SVG) this is the asset's own
    /// `path`. For formats with no natively-displayable file (Lottie,
    /// dotLottie, Rive) it points at a generated SVG placeholder under
    /// `.animoria/thumbnails/`. `None` only when generation itself failed.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub thumbnail_path: Option<String>,
    pub is_valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub error: Option<String>,
}
