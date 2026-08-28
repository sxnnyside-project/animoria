use std::fs::File;
use std::io::Read;
use std::path::Path;
use serde::Deserialize;
use zip::ZipArchive;
use crate::contracts::asset::{Asset, Dimensions, MotionMetadata};

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct DotLottieAnimation {
    id: String,
    #[serde(default)]
    speed: Option<f64>,
    #[serde(default)]
    r#loop: Option<bool>,
    #[serde(default)]
    autoplay: Option<bool>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct DotLottieManifest {
    #[serde(default)]
    generator: Option<String>,
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    author: Option<String>,
    #[serde(default)]
    animations: Vec<DotLottieAnimation>,
}

pub fn parse_dotlottie(path: &Path, asset: &mut Asset) -> Result<(), String> {
    let file = File::open(path).map_err(|e| format!("Cannot open dotLottie file: {e}"))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Malformed dotLottie ZIP archive: {e}"))?;

    // 1. Read manifest.json in an isolated scope so archive borrow is released
    let manifest_str = {
        let mut manifest_file = archive
            .by_name("manifest.json")
            .map_err(|_| "dotLottie archive is missing required manifest.json".to_string())?;

        let mut s = String::new();
        manifest_file
            .read_to_string(&mut s)
            .map_err(|e| format!("Cannot read manifest.json: {e}"))?;
        s
    };

    let manifest: DotLottieManifest = serde_json::from_str(&manifest_str)
        .map_err(|e| format!("Invalid manifest.json schema in dotLottie: {e}"))?;

    if manifest.animations.is_empty() {
        return Err("dotLottie manifest declares no animations".to_string());
    }

    let first_anim_id = &manifest.animations[0].id;
    let anim_path = format!("animations/{first_anim_id}.json");

    // 2. Try reading the first animation JSON to extract dimensions and frame rates
    let anim_str_opt = {
        if let Ok(mut anim_file) = archive.by_name(&anim_path) {
            let mut s = String::new();
            if anim_file.read_to_string(&mut s).is_ok() {
                Some(s)
            } else {
                None
            }
        } else {
            None
        }
    };

    if let Some(anim_str) = anim_str_opt {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&anim_str) {
            let w = val.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0).round() as u32;
            let h = val.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0).round() as u32;
            if w > 0 && h > 0 {
                asset.dimensions = Some(Dimensions { width: w, height: h });
            }

            let fr = val.get("fr").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let ip = val.get("ip").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let op = val.get("op").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let layers_count = val
                .get("layers")
                .and_then(|v| v.as_array())
                .map(|a| a.len() as u32)
                .unwrap_or(0);

            let total_frames = if op > ip { (op - ip).round() as u32 } else { 0 };
            let duration_secs = if fr > 0.0 && total_frames > 0 {
                Some((total_frames as f64) / fr)
            } else {
                None
            };

            asset.motion = Some(MotionMetadata {
                fps: if fr > 0.0 { Some(fr) } else { None },
                duration_secs,
                total_frames: if total_frames > 0 { Some(total_frames) } else { None },
                layer_count: Some(layers_count),
                is_animated: true,
            });

            asset.is_valid = true;
            asset.error = None;
            return Ok(());
        }
    }

    // Fallback if animation JSON couldn't be parsed inside zip
    asset.motion = Some(MotionMetadata {
        fps: None,
        duration_secs: None,
        total_frames: None,
        layer_count: None,
        is_animated: true,
    });

    asset.is_valid = true;
    asset.error = None;
    Ok(())
}
