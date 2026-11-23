//! # Deep Format Parsers & Metadata Enrichment
//!
//! Provides deep binary and structured parsers for 11 visual asset formats:
//! - **Motion**: Lottie JSON, dotLottie (.lottie ZIP), Rive (.riv binary), GIF, APNG, Animated SVG
//! - **Static**: SVG, PNG, JPEG, WebP, AVIF
//!
//! ## Invariant: Parser Failures Do Not Delete Assets
//! If parsing fails due to malformed headers, invalid JSON, or corruption, the parser marks
//! the [`crate::contracts::Asset`] as `is_valid: false` with the exact failure message.
//! The asset remains in the workspace index so developers are alerted via governance diagnostics.

pub(crate) mod dotlottie;
pub(crate) mod heuristics;
pub(crate) mod lottie;
pub(crate) mod raster;
/// Universal parser registry mapping candidate assets to deep format parsers.
pub mod registry;
pub(crate) mod rive;
pub(crate) mod vector;

pub use dotlottie::parse_dotlottie;
pub use heuristics::detect_format;
pub use lottie::parse_lottie;
pub use raster::parse_raster;
pub use registry::ParserRegistry;
pub use rive::parse_rive;
pub use vector::parse_svg;
