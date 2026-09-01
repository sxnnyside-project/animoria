//! Framework integration snippet generation.
//!
//! Single source of truth for "paste-ready" code snippets offered to a
//! developer for a given asset, shared by every host (VS Code, JetBrains)
//! through the daemon's `generateSnippet` method — no host reimplements
//! this template logic natively.

pub mod snippets;

pub use snippets::{generate_snippets_for_asset, PackageManager, SnippetOption};
