//! Subcommand execution handlers for CLI operations.

/// Evaluates governance rules against workspace assets.
pub mod check;
/// Safely cleans up unreferenced duplicates to trash staging.
pub mod clean;
/// Explains rule rationale and remediation steps.
pub mod explain;
/// Scaffolds configuration file `.animoriarc.json`.
pub mod init;
/// Generates asset health and inventory reports.
pub mod report;
/// Restores previously trashed assets from session manifests.
pub mod restore;
/// Scans workspace directory and prints discovered assets.
pub mod scan;
