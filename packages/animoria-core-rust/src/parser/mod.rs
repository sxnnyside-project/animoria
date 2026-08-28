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

pub mod dotlottie;
pub mod heuristics;
pub mod lottie;
pub mod raster;
pub mod registry;
pub mod rive;
pub mod vector;

pub use heuristics::detect_format;
pub use registry::ParserRegistry;
