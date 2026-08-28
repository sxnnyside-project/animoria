//! # Cross-Syntax Asset Reference Tracing
//!
//! Scans source code across modern web and native frameworks (TypeScript, JavaScript,
//! React, Astro, Svelte, Vue, Kotlin, Swift, Dart, CSS, SCSS, HTML, Markdown) to detect
//! usage of visual assets.
//!
//! ## Multi-Syntax Aho-Corasick Algorithm
//! Builds an Aho-Corasick automaton from discovered asset filenames and stems, performing
//! a single-pass parallel search over all source files.

pub mod detector;
pub mod patterns;

pub use detector::AssetReferenceDetector;
pub use patterns::{is_line_comment_or_url, is_source_file_extension, SOURCE_EXTENSIONS};
