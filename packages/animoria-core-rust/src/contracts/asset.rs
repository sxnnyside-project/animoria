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
/// High-level categorization distinguishing Motion from Static visual assets.
pub enum AssetKind {
    /// Animated or time-based visual asset (e.g. Lottie, Rive, GIF).
    Motion,
    /// Still visual image or vector asset (e.g. SVG, PNG, WebP).
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
/// Canonical file format representation for supported visual asset types.
pub enum AssetFormat {
    // Motion Formats
    /// Bodymovin JSON animation format.
    Lottie,
    /// Bundled dotLottie ZIP container format.
    DotLottie,
    /// Binary interactive Rive runtime animation file.
    Rive,
    /// Graphics Interchange Format image or animation.
    Gif,
    /// Animated Portable Network Graphics format.
    Apng,
    /// Scalable Vector Graphics containing SMIL or CSS animations.
    AnimatedSvg,
    // Static Formats
    /// Scalable Vector Graphics XML document.
    Svg,
    /// Portable Network Graphics raster format.
    Png,
    /// Joint Photographic Experts Group raster image.
    Jpeg,
    /// WebP modern raster format (lossy or lossless).
    Webp,
    /// AV1 Image File Format container.
    Avif,
    /// Windows Bitmap image format.
    Bmp,
    /// Encapsulated PostScript vector document.
    Eps,
    /// Apple Icon Image format.
    Icns,
    /// Windows Icon graphic resource format.
    Ico,
    /// OpenDocument drawing image format.
    Odd,
    /// PostScript document format.
    Ps,
    /// Adobe Photoshop layered document.
    Psd,
    /// Tagged Image File Format raster container.
    Tiff,
}

impl AssetFormat {
    /// Returns whether this format belongs to the Motion or Static asset family.
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
            | AssetFormat::Avif
            | AssetFormat::Bmp
            | AssetFormat::Eps
            | AssetFormat::Icns
            | AssetFormat::Ico
            | AssetFormat::Odd
            | AssetFormat::Ps
            | AssetFormat::Psd
            | AssetFormat::Tiff => AssetKind::Static,
        }
    }

    /// Returns the standard canonical file extension for this format.
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
            AssetFormat::Bmp => "bmp",
            AssetFormat::Eps => "eps",
            AssetFormat::Icns => "icns",
            AssetFormat::Ico => "ico",
            AssetFormat::Odd => "odd",
            AssetFormat::Ps => "ps",
            AssetFormat::Psd => "psd",
            AssetFormat::Tiff => "tiff",
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
/// Width and height spatial pixel dimensions.
pub struct Dimensions {
    /// Width measurement in pixels or vector viewport units.
    pub width: u32,
    /// Height measurement in pixels or vector viewport units.
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
/// Deeply parsed structural metadata specific to animated motion graphics.
pub struct MotionMetadata {
    /// Playback framerate in frames per second.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub fps: Option<f64>,
    /// Total playback duration in fractional seconds.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub duration_secs: Option<f64>,
    /// Total frame count across the timeline.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub total_frames: Option<u32>,
    /// Number of top-level composition layers.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub layer_count: Option<u32>,
    /// Whether the graphic contains dynamic timeline animation.
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
/// Enriched image characteristics specific to raster or vector static assets.
pub struct StaticMetadata {
    /// Color bit depth per channel (e.g., 8, 16, 24, 32).
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub color_depth: Option<u8>,
    /// Whether the image contains an active alpha transparency channel.
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
/// Unified domain model representing any discovered visual asset in the workspace.
pub struct Asset {
    /// Unique identifier computed from asset path or contents.
    pub id: String,
    /// Absolute filesystem path to the asset on disk.
    pub path: String,
    /// Workspace-relative path to the asset.
    pub relative_path: String,
    /// Filename including file extension (e.g. `logo.svg`).
    pub name: String,
    /// Filename stem excluding file extension (e.g. `logo`).
    pub stem: String,
    /// Asset size on disk in raw bytes.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub size_bytes: u64,
    /// Unix modification timestamp in milliseconds.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub mtime_ms: u64,
    /// Asset categorization kind (`Motion` vs `Static`).
    pub kind: AssetKind,
    /// Specific file format representation.
    pub format: AssetFormat,
    /// Hex-encoded SHA-256 content hash of the asset bytes.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub content_hash: Option<String>,
    /// Pixel or viewport dimensions.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub dimensions: Option<Dimensions>,
    /// Motion animation metadata if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub motion: Option<MotionMetadata>,
    /// Static image metadata if applicable.
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
    /// Invariant: whether the asset parsed successfully. Corrupt assets are kept with `false`.
    pub is_valid: bool,
    /// Parser error message if validation failed.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub error: Option<String>,
}
