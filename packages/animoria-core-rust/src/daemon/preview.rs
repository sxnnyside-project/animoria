//! On-demand preview data for the inspector: a thumbnail as a data URI, and
//! a Lottie document's raw JSON for interactive playback. Both hosts read
//! `Asset.thumbnail_path`/parse Lottie JSON themselves where they can (VS
//! Code, the sandbox); JetBrains has no such fallback and needs the daemon
//! to answer these directly.

use base64::Engine;
use serde::Deserialize;
use std::fs;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "application/octet-stream",
    }
}

/// Reads `thumbnail_path` and returns it as a `data:` URI, or `None` if it
/// cannot be read — never a fabricated placeholder image.
pub fn thumbnail_data_uri(thumbnail_path: &str) -> Option<String> {
    let path = Path::new(thumbnail_path);
    let bytes = fs::read(path).ok()?;
    let mime = mime_for(path);
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Some(format!("data:{mime};base64,{encoded}"))
}

pub struct LottieDocument {
    pub animation: serde_json::Value,
    pub total_frames: f64,
    pub frame_rate: f64,
}

#[derive(Deserialize)]
struct DotLottieManifestAnimationRef {
    id: String,
}

#[derive(Deserialize)]
struct DotLottieManifestRef {
    #[serde(default)]
    animations: Vec<DotLottieManifestAnimationRef>,
}

/// Extracts the first animation's raw Lottie JSON from a dotLottie (`.lottie`)
/// ZIP archive — the same `manifest.json` → `animations/<id>.json` lookup
/// `parser::dotlottie::parse_dotlottie` uses to populate metadata, reused
/// here so preview can return the actual document instead of nothing.
fn read_dotlottie_inner_document(path: &Path) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;

    let manifest_str = {
        let mut manifest_file = archive.by_name("manifest.json").ok()?;
        let mut s = String::new();
        manifest_file.read_to_string(&mut s).ok()?;
        s
    };
    let manifest: DotLottieManifestRef = serde_json::from_str(&manifest_str).ok()?;
    let first_anim_id = &manifest.animations.first()?.id;
    let anim_path = format!("animations/{first_anim_id}.json");

    let mut anim_file = archive.by_name(&anim_path).ok()?;
    let mut s = String::new();
    anim_file.read_to_string(&mut s).ok()?;
    Some(s)
}

/// Parses a Lottie/dotLottie-adjacent JSON document for interactive
/// playback — the same `ip`/`op`/`fr` fields the parser reads for metadata,
/// but here the whole document is returned so a player can render it.
///
/// A `.lottie` path is a ZIP archive, not JSON text — `read_to_string` on
/// one fails UTF-8 decoding and this used to return `None` for every real
/// dotLottie asset, even though the ZIP unpacker to fix that already existed
/// in `parser::dotlottie` for metadata extraction. This unpacks the same way
/// before falling back to reading the path as plain Lottie JSON.
pub fn read_lottie_document(asset_path: &str) -> Option<LottieDocument> {
    let path = Path::new(asset_path);
    let is_dotlottie = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("lottie"))
        .unwrap_or(false);

    let raw = if is_dotlottie {
        read_dotlottie_inner_document(path)?
    } else {
        fs::read_to_string(path).ok()?
    };

    let animation: serde_json::Value = serde_json::from_str(&raw).ok()?;
    let ip = animation.get("ip").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let op = animation.get("op").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let fr = animation.get("fr").and_then(|v| v.as_f64()).unwrap_or(30.0);
    Some(LottieDocument {
        total_frames: (op - ip).max(0.0),
        frame_rate: fr,
        animation,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    /// A real dotLottie archive (manifest.json + one animation), written to
    /// a temp file — the fixture `read_dotlottie_inner_document` is meant to
    /// actually unpack, not a `.lottie`-named plain-text stand-in.
    fn write_dotlottie_fixture(path: &Path, animation_json: &str) {
        let file = fs::File::create(path).expect("create fixture file");
        let mut zip = ZipWriter::new(file);
        let options = SimpleFileOptions::default();

        zip.start_file("manifest.json", options).unwrap();
        zip.write_all(br#"{"animations":[{"id":"anim1"}]}"#)
            .unwrap();

        zip.start_file("animations/anim1.json", options).unwrap();
        zip.write_all(animation_json.as_bytes()).unwrap();

        zip.finish().unwrap();
    }

    #[test]
    fn read_lottie_document_unpacks_a_real_dotlottie_archive() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("asset.lottie");
        write_dotlottie_fixture(
            &path,
            r#"{"v":"5.7.0","fr":30,"ip":0,"op":90,"w":100,"h":100}"#,
        );

        let doc = read_lottie_document(path.to_str().unwrap())
            .expect("a real dotLottie archive must yield a document, not None");

        assert_eq!(doc.frame_rate, 30.0);
        assert_eq!(doc.total_frames, 90.0);
        assert_eq!(doc.animation["w"], 100);
    }

    #[test]
    fn read_lottie_document_still_reads_plain_lottie_json() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("asset.json");
        fs::write(&path, r#"{"v":"5.7.0","fr":60,"ip":0,"op":60}"#).unwrap();

        let doc =
            read_lottie_document(path.to_str().unwrap()).expect("plain Lottie JSON must parse");
        assert_eq!(doc.frame_rate, 60.0);
        assert_eq!(doc.total_frames, 60.0);
    }

    #[test]
    fn read_lottie_document_returns_none_for_a_lottie_extension_with_garbage_bytes() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("asset.lottie");
        fs::write(&path, b"not a zip archive at all").unwrap();

        assert!(read_lottie_document(path.to_str().unwrap()).is_none());
    }
}
