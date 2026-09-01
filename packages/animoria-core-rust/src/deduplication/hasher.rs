use crate::contracts::asset::Asset;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;

/// Hashes a file in 16 KiB chunks rather than reading it whole into memory —
/// visual assets in a workspace can run into the hundreds of megabytes
/// (video-backed Lottie exports, large sprite sheets), and duplicate
/// detection runs across every asset on every scan, so this is on the hot
/// path for scan time and peak memory both.
pub fn compute_file_sha256(path: &Path) -> std::io::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 16384];

    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    let hash = hasher.finalize();
    Ok(format!("{:x}", hash))
}

/// Hashes every asset's content in parallel via Rayon.
///
/// An asset whose file can't be read (permissions, a symlink that broke
/// between discovery and hashing) is left with `content_hash: None` rather
/// than failing the batch — it simply never joins a duplicate group, which
/// matches "never drop malformed assets": the asset itself is still reported,
/// just without a hash to group it by.
pub fn hash_assets_in_parallel(assets: &mut [Asset]) {
    assets.par_iter_mut().for_each(|asset| {
        let path = Path::new(&asset.path);
        if let Ok(hash) = compute_file_sha256(path) {
            asset.content_hash = Some(hash);
        }
    });
}
