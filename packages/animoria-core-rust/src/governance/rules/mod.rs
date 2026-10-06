pub mod allowed_formats;
pub mod max_dimensions;
pub mod max_file_size;
pub mod naming_convention;
pub mod no_duplicates;
pub mod no_unreferenced;
pub mod svg_sanitization;

pub use allowed_formats::*;
pub use max_dimensions::*;
pub use max_file_size::*;
pub use naming_convention::*;
pub use no_duplicates::*;
pub use no_unreferenced::*;
pub use svg_sanitization::*;
