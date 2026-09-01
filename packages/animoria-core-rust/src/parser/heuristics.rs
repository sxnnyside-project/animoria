use crate::contracts::asset::AssetFormat;
use std::fs::File;
use std::io::Read;
use std::path::Path;

/// Fast heuristic format detector based on file extensions, magic bytes, and structural signatures.
/// Returns `Some(Ok(format))` if recognized as a visual asset,
/// `Some(Err(reason))` if it matches a visual extension but is structurally corrupt,
/// or `None` if it's not a visual asset (e.g. `package.json` or `tsconfig.json`).
pub fn detect_format(path: &Path) -> Option<Result<AssetFormat, String>> {
    let ext = path.extension()?.to_str()?.to_lowercase();

    match ext.as_str() {
        "json" => detect_lottie_json(path),
        "lottie" => detect_dotlottie(path),
        "riv" => detect_rive(path),
        "gif" => detect_gif(path),
        "png" => detect_png_or_apng(path),
        "svg" => detect_svg(path),
        "jpg" | "jpeg" => detect_jpeg(path),
        "webp" => detect_webp(path),
        "avif" => detect_avif(path),
        _ => None,
    }
}

fn read_header(path: &Path, max_bytes: usize) -> std::io::Result<Vec<u8>> {
    let mut file = File::open(path)?;
    let mut buffer = vec![0u8; max_bytes];
    let n = file.read(&mut buffer)?;
    buffer.truncate(n);
    Ok(buffer)
}

fn detect_lottie_json(path: &Path) -> Option<Result<AssetFormat, String>> {
    let bytes = match read_header(path, 8192) {
        Ok(b) if !b.is_empty() => b,
        _ => return None,
    };

    let text = match std::str::from_utf8(&bytes) {
        Ok(t) => t,
        Err(_) => return None,
    };

    // Lottie JSON files must contain specific keys like "v", "fr", "layers", "op", "ip"
    // and must look like a JSON object starting with '{'
    let trimmed = text.trim_start();
    if !trimmed.starts_with('{') {
        return None;
    }

    let has_lottie_keys = (trimmed.contains("\"v\"") || trimmed.contains("'v'"))
        && (trimmed.contains("\"fr\"") || trimmed.contains("'fr'"))
        && (trimmed.contains("\"layers\"") || trimmed.contains("'layers'"));

    if has_lottie_keys {
        Some(Ok(AssetFormat::Lottie))
    } else {
        None
    }
}

fn detect_dotlottie(path: &Path) -> Option<Result<AssetFormat, String>> {
    let header = match read_header(path, 4) {
        Ok(h) => h,
        Err(e) => return Some(Err(format!("Cannot read .lottie file: {e}"))),
    };

    // ZIP magic bytes: PK\x03\x04
    if header.len() >= 4 && header[0..4] == [0x50, 0x4B, 0x03, 0x04] {
        Some(Ok(AssetFormat::DotLottie))
    } else {
        Some(Err(
            "Invalid dotLottie archive: missing ZIP magic bytes".to_string()
        ))
    }
}

fn detect_rive(path: &Path) -> Option<Result<AssetFormat, String>> {
    let header = match read_header(path, 4) {
        Ok(h) => h,
        Err(e) => return Some(Err(format!("Cannot read .riv file: {e}"))),
    };

    // Rive magic bytes: "RIVE"
    if header.len() >= 4 && &header[0..4] == b"RIVE" {
        Some(Ok(AssetFormat::Rive))
    } else {
        Some(Err(
            "Invalid Rive binary: missing RIVE header bytes".to_string()
        ))
    }
}

fn detect_gif(path: &Path) -> Option<Result<AssetFormat, String>> {
    let header = match read_header(path, 6) {
        Ok(h) => h,
        Err(e) => return Some(Err(format!("Cannot read .gif file: {e}"))),
    };

    if header.len() >= 6 && (&header[0..6] == b"GIF87a" || &header[0..6] == b"GIF89a") {
        Some(Ok(AssetFormat::Gif))
    } else {
        Some(Err("Invalid GIF header".to_string()))
    }
}

fn detect_png_or_apng(path: &Path) -> Option<Result<AssetFormat, String>> {
    // Read up to 2048 bytes to search for acTL chunk (Animated PNG indicator)
    let bytes = match read_header(path, 2048) {
        Ok(b) => b,
        Err(e) => return Some(Err(format!("Cannot read .png file: {e}"))),
    };

    let png_magic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    if bytes.len() < 8 || bytes[0..8] != png_magic {
        return Some(Err("Invalid PNG magic header".to_string()));
    }

    // Check if contains acTL chunk for animated PNG
    let is_apng = bytes.windows(4).any(|w| w == b"acTL");
    if is_apng {
        Some(Ok(AssetFormat::Apng))
    } else {
        Some(Ok(AssetFormat::Png))
    }
}

fn detect_svg(path: &Path) -> Option<Result<AssetFormat, String>> {
    let bytes = match read_header(path, 8192) {
        Ok(b) if !b.is_empty() => b,
        Err(e) => return Some(Err(format!("Cannot read .svg file: {e}"))),
        _ => return None,
    };

    let text = match std::str::from_utf8(&bytes) {
        Ok(t) => t.to_lowercase(),
        Err(_) => return Some(Err("Invalid UTF-8 in SVG file".to_string())),
    };

    if !text.contains("<svg") {
        return Some(Err("Missing <svg> root element".to_string()));
    }

    // Check for SMIL animation elements or CSS animation keyframes
    let is_animated = text.contains("<animate")
        || text.contains("<animatetransform")
        || text.contains("<animatemotion")
        || text.contains("<set")
        || text.contains("@keyframes")
        || text.contains("animation:");

    if is_animated {
        Some(Ok(AssetFormat::AnimatedSvg))
    } else {
        Some(Ok(AssetFormat::Svg))
    }
}

fn detect_jpeg(path: &Path) -> Option<Result<AssetFormat, String>> {
    let header = match read_header(path, 3) {
        Ok(h) => h,
        Err(e) => return Some(Err(format!("Cannot read JPEG file: {e}"))),
    };

    if header.len() >= 3 && header[0..3] == [0xFF, 0xD8, 0xFF] {
        Some(Ok(AssetFormat::Jpeg))
    } else {
        Some(Err("Invalid JPEG SOI marker".to_string()))
    }
}

fn detect_webp(path: &Path) -> Option<Result<AssetFormat, String>> {
    let header = match read_header(path, 12) {
        Ok(h) => h,
        Err(e) => return Some(Err(format!("Cannot read WebP file: {e}"))),
    };

    if header.len() >= 12 && &header[0..4] == b"RIFF" && &header[8..12] == b"WEBP" {
        Some(Ok(AssetFormat::Webp))
    } else {
        Some(Err("Invalid WebP RIFF header".to_string()))
    }
}

fn detect_avif(path: &Path) -> Option<Result<AssetFormat, String>> {
    let header = match read_header(path, 32) {
        Ok(h) => h,
        Err(e) => return Some(Err(format!("Cannot read AVIF file: {e}"))),
    };

    let is_avif = header
        .windows(8)
        .any(|w| w == b"ftypavif" || w == b"ftypavis");
    if is_avif {
        Some(Ok(AssetFormat::Avif))
    } else {
        Some(Err("Invalid AVIF ftyp box".to_string()))
    }
}
