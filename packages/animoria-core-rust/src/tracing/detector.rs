use aho_corasick::{AhoCorasickBuilder, MatchKind};
use ignore::WalkBuilder;
use rayon::prelude::*;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use super::patterns::{
    is_line_comment_or_url, is_source_file_extension, is_valid_exact_filename_reference,
    is_valid_stem_reference,
};
use crate::contracts::asset::Asset;
use crate::contracts::usage::UsageReference;
use crate::scanner::ignore_rules::IgnoreRules;

/// Finds where workspace assets are actually used, across every source
/// syntax `patterns::SOURCE_EXTENSIONS` covers, in one parallel pass.
///
/// The detector builds a single Aho-Corasick automaton over every asset's
/// filename and stem and runs it over every source file at once — an O(files
/// × patterns) naive search would be the alternative, and workspaces with a
/// few hundred assets and a few thousand source files make that difference
/// the one between sub-second and multi-second scans.
pub struct AssetReferenceDetector {
    root_path: PathBuf,
    ignore_rules: IgnoreRules,
}

impl AssetReferenceDetector {
    pub fn new(root_path: PathBuf, custom_ignore_patterns: &[String]) -> anyhow::Result<Self> {
        let ignore_rules = IgnoreRules::new(custom_ignore_patterns)?;
        Ok(Self {
            root_path,
            ignore_rules,
        })
    }

    /// Finds all source code files eligible for usage scanning in the workspace.
    pub fn find_source_files(&self) -> Vec<PathBuf> {
        let mut builder = WalkBuilder::new(&self.root_path);
        builder
            .hidden(true)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .parents(false);

        let mut sources = Vec::new();
        for result in builder.build() {
            let entry = match result {
                Ok(e) => e,
                Err(_) => continue,
            };
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            if self.ignore_rules.is_ignored(path) {
                continue;
            }
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if is_source_file_extension(ext) {
                    sources.push(path.to_path_buf());
                }
            }
        }
        sources
    }

    /// Scans source files in parallel and extracts all asset usage references.
    ///
    /// Two match kinds per asset, at different confidence: an *exact
    /// filename* match (`"hero.json"`) is high-confidence because filenames
    /// are close to unique, while a *stem* match (`"hero"`, from
    /// `Lottie.asset('hero')`-style native APIs that reference assets without
    /// their extension) is lower-confidence because a short common word could
    /// coincidentally collide with an asset's stem — which is also why stems
    /// under 3 characters are skipped entirely rather than flooding results
    /// with false positives on words like "ok" or "up".
    pub fn detect_references(&self, assets: &[Asset]) -> Vec<UsageReference> {
        if assets.is_empty() {
            return Vec::new();
        }

        // Build mapping: pattern string -> (AssetPath, is_exact_filename)
        let mut patterns = Vec::new();
        let mut pattern_to_asset: HashMap<usize, (String, String, bool)> = HashMap::new();

        for asset in assets {
            // Pattern 1: Exact filename (e.g. "hero.json", "logo.webp")
            let idx1 = patterns.len();
            patterns.push(asset.name.clone());
            pattern_to_asset.insert(idx1, (asset.path.clone(), asset.stem.clone(), true));

            // Pattern 2: Stem (e.g. "hero", "logo") if stem length >= 3
            if asset.stem.len() >= 3 && asset.stem != asset.name {
                let idx2 = patterns.len();
                patterns.push(asset.stem.clone());
                pattern_to_asset.insert(idx2, (asset.path.clone(), asset.stem.clone(), false));
            }
        }

        let ac = match AhoCorasickBuilder::new()
            .match_kind(MatchKind::Standard)
            .ascii_case_insensitive(true)
            .build(&patterns)
        {
            Ok(ac) => ac,
            Err(_) => return Vec::new(),
        };

        let source_files = self.find_source_files();
        let asset_paths: std::collections::HashSet<String> =
            assets.iter().map(|a| a.path.clone()).collect();

        // Scan files in parallel using Rayon
        let references: Vec<UsageReference> = source_files
            .par_iter()
            .filter(|p| !asset_paths.contains(&p.to_string_lossy().to_string()))
            .flat_map(|source_path| {
                let content = match fs::read_to_string(source_path) {
                    Ok(c) => c,
                    Err(_) => return Vec::new(),
                };

                let relative_source = source_path
                    .strip_prefix(&self.root_path)
                    .unwrap_or(source_path)
                    .to_string_lossy()
                    .to_string();

                let syntax_type = source_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("unknown")
                    .to_lowercase();

                let mut file_refs = Vec::new();

                for (line_idx, line) in content.lines().enumerate() {
                    let line_number = (line_idx + 1) as u32;

                    // Skip comment lines
                    if is_line_comment_or_url(line) {
                        continue;
                    }

                    let mut matched_assets_on_line = std::collections::HashSet::new();

                    // Aho-Corasick linear scan on line
                    for mat in ac.find_overlapping_iter(line) {
                        if let Some((asset_path, stem, is_exact_filename)) =
                            pattern_to_asset.get(&mat.pattern().as_usize())
                        {
                            if !matched_assets_on_line.insert(asset_path.clone()) {
                                continue;
                            }

                            // An asset file cannot reference itself
                            let source_str = source_path.to_string_lossy();
                            if source_str
                                .ends_with(&format!("/{}", &patterns[mat.pattern().as_usize()]))
                                || source_str == *asset_path
                            {
                                continue;
                            }

                            // Check negative filters: ignore remote URLs like http:// or https://
                            let match_start = mat.start();
                            let prefix = &line[..match_start];
                            if prefix.ends_with("http://")
                                || prefix.ends_with("https://")
                                || prefix.ends_with("//cdn.")
                            {
                                continue;
                            }

                            let line_lower = line.to_lowercase();

                            if *is_exact_filename {
                                let filename_lower =
                                    patterns[mat.pattern().as_usize()].to_lowercase();
                                if !is_valid_exact_filename_reference(&line_lower, &filename_lower)
                                {
                                    continue;
                                }
                            } else {
                                let stem_lower = stem.to_lowercase();
                                if !is_valid_stem_reference(&line_lower, &stem_lower) {
                                    continue;
                                }
                            }

                            let confidence = if *is_exact_filename { "high" } else { "medium" };

                            file_refs.push(UsageReference {
                                asset_id: asset_path.clone(),
                                file_path: source_path.to_string_lossy().to_string(),
                                relative_file_path: relative_source.clone(),
                                line_number,
                                line_content: line.trim().to_string(),
                                syntax_type: syntax_type.clone(),
                                confidence: confidence.to_string(),
                            });
                        }
                    }
                }

                file_refs
            })
            .collect();

        references
    }
}
