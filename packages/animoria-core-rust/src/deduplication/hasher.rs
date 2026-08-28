use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use crate::contracts::asset::Asset;

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

pub fn hash_assets_in_parallel(assets: &mut [Asset]) {
    assets.par_iter_mut().for_each(|asset| {
        let path = Path::new(&asset.path);
        if let Ok(hash) = compute_file_sha256(path) {
            asset.content_hash = Some(hash);
        }
    });
}
