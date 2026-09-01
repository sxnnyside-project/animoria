use crate::contracts::asset::{
    Asset, AssetFormat, AssetKind, Dimensions, MotionMetadata, StaticMetadata,
};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

pub fn parse_svg(path: &Path, asset: &mut Asset) -> Result<(), String> {
    let file = File::open(path).map_err(|e| format!("Cannot open SVG file: {e}"))?;
    let mut reader = Reader::from_reader(BufReader::new(file));
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut is_animated = false;
    let mut width: Option<u32> = None;
    let mut height: Option<u32> = None;
    let mut found_svg = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let name = e.name();
                let name_str = String::from_utf8_lossy(name.as_ref()).to_lowercase();

                if name_str == "svg" && !found_svg {
                    found_svg = true;
                    // Extract width, height, viewBox
                    let mut viewbox_dims: Option<(u32, u32)> = None;

                    for attr in e.attributes().flatten() {
                        let key = String::from_utf8_lossy(attr.key.as_ref()).to_lowercase();
                        let val = String::from_utf8_lossy(&attr.value).to_string();

                        if key == "width" {
                            width = parse_dimension(&val);
                        } else if key == "height" {
                            height = parse_dimension(&val);
                        } else if key == "viewbox" {
                            viewbox_dims = parse_viewbox(&val);
                        }
                    }

                    if width.is_none() || height.is_none() {
                        if let Some((vw, vh)) = viewbox_dims {
                            if width.is_none() {
                                width = Some(vw);
                            }
                            if height.is_none() {
                                height = Some(vh);
                            }
                        }
                    }
                }

                // Check for SMIL animation elements
                if name_str == "animate"
                    || name_str == "animatetransform"
                    || name_str == "animatemotion"
                    || name_str == "set"
                {
                    is_animated = true;
                }
            }
            Ok(Event::Text(ref e)) => {
                let text = String::from_utf8_lossy(e.as_ref()).to_lowercase();
                if text.contains("@keyframes") || text.contains("animation:") {
                    is_animated = true;
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("SVG XML parsing error: {e}")),
            _ => {}
        }
        buf.clear();
    }

    if !found_svg {
        return Err("No <svg> root element found in document".to_string());
    }

    if let (Some(w), Some(h)) = (width, height) {
        asset.dimensions = Some(Dimensions {
            width: w,
            height: h,
        });
    }

    if is_animated {
        asset.kind = AssetKind::Motion;
        asset.format = AssetFormat::AnimatedSvg;
        asset.motion = Some(MotionMetadata {
            fps: None,
            duration_secs: None,
            total_frames: None,
            layer_count: None,
            is_animated: true,
        });
        asset.static_meta = None;
    } else {
        asset.kind = AssetKind::Static;
        asset.format = AssetFormat::Svg;
        asset.static_meta = Some(StaticMetadata {
            color_depth: None,
            has_alpha: Some(true),
        });
        asset.motion = None;
    }

    asset.is_valid = true;
    asset.error = None;
    Ok(())
}

fn parse_dimension(val: &str) -> Option<u32> {
    let clean: String = val
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    clean.parse::<f64>().ok().map(|n| n.round() as u32)
}

fn parse_viewbox(val: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = val
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|s| !s.is_empty())
        .collect();

    if parts.len() == 4 {
        let w = parts[2].parse::<f64>().ok()?.round() as u32;
        let h = parts[3].parse::<f64>().ok()?.round() as u32;
        if w > 0 && h > 0 {
            return Some((w, h));
        }
    }
    None
}
