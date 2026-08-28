//! # Workspace Asset Scanner & Ignore Engine
//!
//! Handles recursive directory traversal, ignoring patterns (.gitignore, .animoriaignore,
//! custom excludes), and initial format detection.
//!
//! ## Invariant
//! Format detection is heuristic and fast; deep validation is delegated to [`crate::parser::ParserRegistry`].

pub mod ignore_rules;
pub mod walker;

pub use ignore_rules::*;
pub use walker::*;
