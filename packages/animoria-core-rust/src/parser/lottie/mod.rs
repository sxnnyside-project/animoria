use crate::contracts::asset::{Asset, Dimensions, MotionMetadata};
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

#[derive(Deserialize, Debug)]
struct LottieDocument {
    v: Option<String>,
    #[serde(default)]
    w: Option<f64>,
    #[serde(default)]
    h: Option<f64>,
    #[serde(default)]
    fr: Option<f64>,
    #[serde(default)]
    ip: Option<f64>,
    #[serde(default)]
    op: Option<f64>,
    #[serde(default)]
    layers: Option<Vec<serde_json::Value>>,
}

pub fn parse_lottie(path: &Path, asset: &mut Asset) -> Result<(), String> {
    let file = File::open(path).map_err(|e| format!("Cannot open Lottie file: {e}"))?;
    let reader = BufReader::new(file);

    let doc: LottieDocument =
        serde_json::from_reader(reader).map_err(|e| format!("Malformed Lottie JSON: {e}"))?;

    let fr = doc.fr.unwrap_or(0.0);
    let ip = doc.ip.unwrap_or(0.0);
    let op = doc.op.unwrap_or(0.0);
    let layers = doc.layers.unwrap_or_default();

    if doc.v.is_none() && layers.is_empty() {
        return Err("Missing Lottie structural signature (no version or layers)".to_string());
    }

    let width = doc.w.unwrap_or(0.0).round() as u32;
    let height = doc.h.unwrap_or(0.0).round() as u32;

    if width > 0 && height > 0 {
        asset.dimensions = Some(Dimensions { width, height });
    }

    let total_frames = if op > ip { (op - ip).round() as u32 } else { 0 };

    let duration_secs = if fr > 0.0 && total_frames > 0 {
        Some((total_frames as f64) / fr)
    } else {
        None
    };

    let layer_count = layers.len() as u32;

    asset.motion = Some(MotionMetadata {
        fps: if fr > 0.0 { Some(fr) } else { None },
        duration_secs,
        total_frames: if total_frames > 0 {
            Some(total_frames)
        } else {
            None
        },
        layer_count: Some(layer_count),
        is_animated: total_frames > 1,
    });

    asset.is_valid = true;
    asset.error = None;
    Ok(())
}
