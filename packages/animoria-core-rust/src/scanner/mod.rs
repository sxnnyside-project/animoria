//! # Workspace Asset Scanner & Ignore Engine
//!
//! Handles recursive directory traversal, ignoring patterns (.gitignore, .animoriaignore,
//! custom excludes), and initial format detection.
//!
//! ## Invariant
//! Format detection is heuristic and fast; deep validation is delegated to [`crate::parser::ParserRegistry`].

pub(crate) mod ignore_rules;
pub(crate) mod walker;

pub use ignore_rules::IgnoreRules;
pub use walker::WorkspaceScanner;
