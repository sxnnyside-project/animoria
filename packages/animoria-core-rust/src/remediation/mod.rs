//! Safe remediation, trash staging, and reference rewrite mechanisms.

pub(crate) mod atomic_write;
/// Resolution plan construction for duplicate asset groups.
pub mod plan;
/// Source code reference rewrite calculation and atomic replacement.
pub mod reference_rewrite;
/// Non-destructive trash staging and session journal management.
pub mod trash;

pub use atomic_write::{write_atomic, write_atomic_staged};
pub use plan::*;
pub use reference_rewrite::*;
pub use trash::*;
