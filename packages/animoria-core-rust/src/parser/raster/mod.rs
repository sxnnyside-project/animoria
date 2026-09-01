use crate::contracts::asset::{
    Asset, AssetFormat, AssetKind, Dimensions, MotionMetadata, StaticMetadata,
};
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub fn parse_raster(path: &Path, asset: &mut Asset) -> Result<(), String> {
    let mut file = File::open(path).map_err(|e| format!("Cannot open raster file: {e}"))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Cannot read raster file: {e}"))?;

    if buffer.is_empty() {
        return Err("File is empty (0 bytes)".to_string());
    }

    match asset.format {
        AssetFormat::Gif => parse_gif(&buffer, asset),
        AssetFormat::Png | AssetFormat::Apng => parse_png_apng(&buffer, asset),
        AssetFormat::Jpeg => parse_jpeg(&buffer, asset),
        AssetFormat::Webp => parse_webp(&buffer, asset),
        AssetFormat::Avif => parse_avif(&buffer, asset),
        _ => Err(format!("Unsupported raster format: {:?}", asset.format)),
    }
}

fn parse_gif(data: &[u8], asset: &mut Asset) -> Result<(), String> {
    if data.len() < 13 || (&data[0..6] != b"GIF87a" && &data[0..6] != b"GIF89a") {
        return Err("Invalid GIF header".to_string());
    }

    let width = u16::from_le_bytes([data[6], data[7]]) as u32;
    let height = u16::from_le_bytes([data[8], data[9]]) as u32;
    asset.dimensions = Some(Dimensions { width, height });

    // Count frame descriptors (0x2C) and accumulate delay from Graphic Control Extensions (0x21 0xF9)
    let mut frames = 0u32;
    let mut total_delay_centisecs = 0u32;
    let mut i = 13;

    // Skip global color table if present
    let packed = data[10];
    if (packed & 0x80) != 0 {
        let gct_size = 3 * (1 << ((packed & 0x07) + 1));
        i += gct_size;
    }

    while i < data.len() {
        let b = data[i];
        if b == 0x3B {
            // Trailer
            break;
        } else if b == 0x2C {
            // Image Descriptor
            frames += 1;
            i += 10;
            if i < data.len() && (data[i - 1] & 0x80) != 0 {
                let lct_size = 3 * (1 << ((data[i - 1] & 0x07) + 1));
                i += lct_size;
            }
            i += 1; // LZW minimum code size
            while i < data.len() && data[i] != 0 {
                i += (data[i] as usize) + 1;
            }
            i += 1;
        } else if b == 0x21 {
            // Extension
            if i + 1 < data.len() && data[i + 1] == 0xF9 && i + 7 < data.len() {
                // Graphic Control Extension: delay time is at i+4..i+6 in 1/100ths of second
                let delay = u16::from_le_bytes([data[i + 4], data[i + 5]]) as u32;
                total_delay_centisecs += delay;
            }
            i += 2;
            while i < data.len() && data[i] != 0 {
                i += (data[i] as usize) + 1;
            }
            i += 1;
        } else {
            i += 1;
        }
    }

    let is_animated = frames > 1;
    let duration_secs = if total_delay_centisecs > 0 {
        Some((total_delay_centisecs as f64) / 100.0)
    } else if frames > 1 {
        Some((frames as f64) * 0.1) // Default 10fps if no delay declared
    } else {
        None
    };

    let fps = if let Some(dur) = duration_secs {
        if dur > 0.0 && frames > 0 {
            Some((frames as f64) / dur)
        } else {
            None
        }
    } else {
        None
    };

    asset.kind = AssetKind::Motion;
    asset.format = AssetFormat::Gif;
    asset.motion = Some(MotionMetadata {
        fps,
        duration_secs,
        total_frames: if frames > 0 { Some(frames) } else { None },
        layer_count: None,
        is_animated,
    });
    asset.static_meta = None;
    asset.is_valid = true;
    asset.error = None;
    Ok(())
}

fn parse_png_apng(data: &[u8], asset: &mut Asset) -> Result<(), String> {
    let png_magic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    if data.len() < 24 || data[0..8] != png_magic {
        return Err("Invalid PNG magic header".to_string());
    }

    // Read IHDR (starts at byte 8)
    let chunk_type = &data[12..16];
    if chunk_type != b"IHDR" {
        return Err("First chunk is not IHDR".to_string());
    }

    let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
    let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
    let bit_depth = data[24];
    let color_type = data[25];
    let has_alpha = color_type == 4 || color_type == 6;

    asset.dimensions = Some(Dimensions { width, height });

    // Check for acTL chunk (APNG)
    let mut is_apng = false;
    let mut num_frames = 1u32;
    let mut offset = 8;

    while offset + 8 <= data.len() {
        let length = u32::from_be_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;
        let ctype = &data[offset + 4..offset + 8];

        if ctype == b"acTL" && offset + 16 <= data.len() {
            is_apng = true;
            num_frames = u32::from_be_bytes([
                data[offset + 8],
                data[offset + 9],
                data[offset + 10],
                data[offset + 11],
            ]);
            break;
        }

        offset += 12 + length;
    }

    if is_apng {
        asset.kind = AssetKind::Motion;
        asset.format = AssetFormat::Apng;
        asset.motion = Some(MotionMetadata {
            fps: Some(30.0),
            duration_secs: None,
            total_frames: Some(num_frames),
            layer_count: None,
            is_animated: true,
        });
        asset.static_meta = None;
    } else {
        asset.kind = AssetKind::Static;
        asset.format = AssetFormat::Png;
        asset.static_meta = Some(StaticMetadata {
            color_depth: Some(bit_depth),
            has_alpha: Some(has_alpha),
        });
        asset.motion = None;
    }

    asset.is_valid = true;
    asset.error = None;
    Ok(())
}

fn parse_jpeg(data: &[u8], asset: &mut Asset) -> Result<(), String> {
    if data.len() < 4 || data[0..2] != [0xFF, 0xD8] {
        return Err("Invalid JPEG SOI marker".to_string());
    }

    let mut i = 2;
    while i + 4 <= data.len() {
        if data[i] != 0xFF {
            i += 1;
            continue;
        }

        let marker = data[i + 1];
        let len = u16::from_be_bytes([data[i + 2], data[i + 3]]) as usize;

        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker == 0xC0 || marker == 0xC1 || marker == 0xC2) && i + 9 <= data.len() {
            let height = u16::from_be_bytes([data[i + 5], data[i + 6]]) as u32;
            let width = u16::from_be_bytes([data[i + 7], data[i + 8]]) as u32;
            asset.dimensions = Some(Dimensions { width, height });
            asset.kind = AssetKind::Static;
            asset.format = AssetFormat::Jpeg;
            asset.static_meta = Some(StaticMetadata {
                color_depth: Some(8),
                has_alpha: Some(false),
            });
            asset.is_valid = true;
            asset.error = None;
            return Ok(());
        }

        if len < 2 {
            break;
        }
        i += 2 + len;
    }

    // Fallback if SOF was not found
    asset.kind = AssetKind::Static;
    asset.format = AssetFormat::Jpeg;
    asset.is_valid = true;
    asset.error = None;
    Ok(())
}

fn parse_webp(data: &[u8], asset: &mut Asset) -> Result<(), String> {
    if data.len() < 12 || &data[0..4] != b"RIFF" || &data[8..12] != b"WEBP" {
        return Err("Invalid WebP header".to_string());
    }

    let chunk_header = if data.len() >= 16 { &data[12..16] } else { b"" };

    if chunk_header == b"VP8 " && data.len() >= 30 {
        // Lossy VP8
        let w = u16::from_le_bytes([data[26], data[27] & 0x3F]) as u32;
        let h = u16::from_le_bytes([data[28], data[29] & 0x3F]) as u32;
        asset.dimensions = Some(Dimensions {
            width: w,
            height: h,
        });
    } else if chunk_header == b"VP8L" && data.len() >= 25 {
        // Lossless VP8L: signature byte 0x2F followed by 14 bits width, 14 bits height
        let b1 = data[21];
        let b2 = data[22];
        let b3 = data[23];
        let b4 = data[24];
        let w = 1 + (((b2 as u32 & 0x3F) << 8) | (b1 as u32));
        let h = 1 + (((b4 as u32 & 0x0F) << 10) | ((b3 as u32) << 2) | ((b2 as u32) >> 6));
        asset.dimensions = Some(Dimensions {
            width: w,
            height: h,
        });
    } else if chunk_header == b"VP8X" && data.len() >= 30 {
        // Extended VP8X: canvas width 24-bit (bytes 24-26) + 1, canvas height 24-bit (bytes 27-29) + 1
        let w = 1 + (data[24] as u32 | ((data[25] as u32) << 8) | ((data[26] as u32) << 16));
        let h = 1 + (data[27] as u32 | ((data[28] as u32) << 8) | ((data[29] as u32) << 16));
        asset.dimensions = Some(Dimensions {
            width: w,
            height: h,
        });
    }

    asset.kind = AssetKind::Static;
    asset.format = AssetFormat::Webp;
    asset.static_meta = Some(StaticMetadata {
        color_depth: Some(8),
        has_alpha: Some(true),
    });
    asset.is_valid = true;
    asset.error = None;
    Ok(())
}

fn parse_avif(data: &[u8], asset: &mut Asset) -> Result<(), String> {
    if data.len() < 32 {
        return Err("AVIF file too small".to_string());
    }

    // Search for ispe box (Image Spatial Extents)
    if let Some(pos) = data.windows(4).position(|w| w == b"ispe") {
        if pos + 12 <= data.len() {
            let width =
                u32::from_be_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]]);
            let height =
                u32::from_be_bytes([data[pos + 8], data[pos + 9], data[pos + 10], data[pos + 11]]);
            if width > 0 && height > 0 {
                asset.dimensions = Some(Dimensions { width, height });
            }
        }
    }

    asset.kind = AssetKind::Static;
    asset.format = AssetFormat::Avif;
    asset.static_meta = Some(StaticMetadata {
        color_depth: Some(8),
        has_alpha: Some(true),
    });
    asset.is_valid = true;
    asset.error = None;
    Ok(())
}
