//! # Content Hashing & Duplicate Asset Detection
//!
//! Identifies byte-identical and structural duplicates across the workspace using Rayon-parallel
//! SHA-256 computation.
//!
//! Groups matching assets into [`crate::contracts::DuplicateGroup`] instances and computes
//! wasted storage bytes to guide remediation.

pub mod cluster;
pub mod hasher;

pub use cluster::find_duplicate_groups;
pub use hasher::{compute_file_sha256, hash_assets_in_parallel};
