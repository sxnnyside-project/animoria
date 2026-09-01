//! Rive (.riv) metadata extraction.
//!
//! The Rive runtime binary format is not published as a stable, versioned
//! wire spec — the only robust way to extract structural metadata without
//! bundling the full Rive runtime (a rendering engine, not a metadata
//! reader) is the same strategy the legacy TypeScript parser used:
//! recover printable ASCII strings embedded in the binary (artboard names,
//! state machine names, and animation names are stored as length-prefixed
//! strings) and classify them heuristically. This is honest about what it
//! knows — unlike a fabricated constant, it never claims an fps or duration
//! Rive does not expose this way, and `is_animated`/`layer_count` reflect
//! what was actually found in the file.

use std::fs;
use std::path::Path;

use crate::contracts::asset::{Asset, MotionMetadata};

const IGNORED_TOKENS: &[&str] = &["RIVE", "rive", "properties", "StateMachine", "Transition"];

const ARTBOARD_HINTS: &[&str] = &[
    "board", "main", "scene", "logo", "icon", "button", "hero", "avatar",
];
const STATE_MACHINE_HINTS: &[&str] = &["state", "machine", "hover", "click", "controller"];
const ANIMATION_HINTS: &[&str] = &[
    "idle", "play", "show", "hide", "open", "close", "run", "walk", "spin", "start",
];

pub fn parse_rive(path: &Path, asset: &mut Asset) -> Result<(), String> {
    let bytes = fs::read(path).map_err(|e| format!("Cannot read Rive file: {e}"))?;

    if bytes.len() < 6 || &bytes[0..4] != b"RIVE" {
        return Err("Invalid Rive binary: header is missing or truncated".to_string());
    }

    let candidates = extract_string_candidates(&bytes);

    let artboards: Vec<&String> = candidates
        .iter()
        .filter(|s| {
            let lower = s.to_lowercase();
            ARTBOARD_HINTS.iter().any(|hint| lower.contains(hint))
        })
        .collect();

    let state_machines: Vec<&String> = candidates
        .iter()
        .filter(|s| {
            let lower = s.to_lowercase();
            !artboards.contains(s) && STATE_MACHINE_HINTS.iter().any(|hint| lower.contains(hint))
        })
        .collect();

    let animations: Vec<&String> = candidates
        .iter()
        .filter(|s| {
            let lower = s.to_lowercase();
            !artboards.contains(s)
                && !state_machines.contains(s)
                && s.len() < 15
                && ANIMATION_HINTS.iter().any(|hint| lower.contains(hint))
        })
        .collect();

    // A well-formed .riv always has at least one (implicit) artboard, even
    // when no name string could be recovered from the byte stream.
    let artboard_count = artboards.len().max(1) as u32;
    let is_animated = !state_machines.is_empty() || !animations.is_empty();

    asset.motion = Some(MotionMetadata {
        // Rive does not store a single file-level frame rate the way Lottie
        // does — each animation/state machine can run at its own rate — so
        // this is deliberately left unset rather than guessed.
        fps: None,
        duration_secs: None,
        total_frames: None,
        layer_count: Some(artboard_count),
        is_animated,
    });

    asset.is_valid = true;
    asset.error = None;
    Ok(())
}

/// Recovers printable-ASCII runs of length >= 3, mirroring how Rive embeds
/// artboard/animation/state-machine names as raw strings in its object
/// stream.
fn extract_string_candidates(bytes: &[u8]) -> Vec<String> {
    let mut strings = Vec::new();
    let mut current = String::new();

    let flush = |current: &mut String, out: &mut Vec<String>| {
        if current.len() >= 3
            && current.len() < 40
            && current
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c.is_whitespace())
            && !IGNORED_TOKENS.contains(&current.as_str())
        {
            out.push(current.clone());
        }
        current.clear();
    };

    for &byte in bytes {
        if (32..=126).contains(&byte) {
            current.push(byte as char);
        } else {
            flush(&mut current, &mut strings);
        }
    }
    flush(&mut current, &mut strings);

    strings.sort();
    strings.dedup();
    strings
}
