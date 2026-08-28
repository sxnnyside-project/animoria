use std::fs::File;
use std::io::Read;
use std::path::Path;
use crate::contracts::asset::{Asset, MotionMetadata};

pub fn parse_rive(path: &Path, asset: &mut Asset) -> Result<(), String> {
    let mut file = File::open(path).map_err(|e| format!("Cannot open Rive file: {e}"))?;
    let mut buffer = [0u8; 16];
    let n = file.read(&mut buffer).map_err(|e| format!("Cannot read Rive header: {e}"))?;

    // A valid Rive binary needs at least "RIVE" magic bytes + major version + minor version (6 bytes)
    if n < 6 || &buffer[0..4] != b"RIVE" {
        return Err("Invalid Rive binary: header is missing or truncated".to_string());
    }

    let major = buffer[4];
    let minor = buffer[5];

    asset.motion = Some(MotionMetadata {
        fps: Some(60.0), // Standard Rive runtime default
        duration_secs: None,
        total_frames: None,
        layer_count: None,
        is_animated: true,
    });

    asset.is_valid = true;
    asset.error = None;
    let _ = (major, minor);
    Ok(())
}
