use aho_corasick::{AhoCorasickBuilder, MatchKind};
use ignore::WalkBuilder;
use rayon::prelude::*;
use std::fs;
use std::path::PathBuf;

use super::patterns::{
    asset_matches_dynamic_pattern, asset_matches_path_token, extract_dynamic_patterns,
    extract_path_token, extract_quoted_tokens, is_line_comment_or_url, is_source_file_extension,
    is_valid_exact_filename_reference, is_valid_stem_reference,
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
    included_source_extensions: Vec<String>,
    ignored_source_extensions: Vec<String>,
    min_stem_length: usize,
    dynamic_collections: Vec<String>,
}

impl AssetReferenceDetector {
    pub fn new(root_path: PathBuf, custom_ignore_patterns: &[String]) -> anyhow::Result<Self> {
        Self::new_with_options(root_path, custom_ignore_patterns, &[], &[], None)
    }

    pub fn new_with_options(
        root_path: PathBuf,
        custom_ignore_patterns: &[String],
        included_source_extensions: &[String],
        ignored_source_extensions: &[String],
        min_stem_length: Option<usize>,
    ) -> anyhow::Result<Self> {
        Self::new_with_all_options(
            root_path,
            custom_ignore_patterns,
            included_source_extensions,
            ignored_source_extensions,
            min_stem_length,
            &[],
        )
    }

    pub fn new_with_all_options(
        root_path: PathBuf,
        custom_ignore_patterns: &[String],
        included_source_extensions: &[String],
        ignored_source_extensions: &[String],
        min_stem_length: Option<usize>,
        dynamic_collections: &[String],
    ) -> anyhow::Result<Self> {
        let ignore_rules = IgnoreRules::new(custom_ignore_patterns)?;
        Ok(Self {
            root_path,
            ignore_rules,
            included_source_extensions: included_source_extensions
                .iter()
                .map(|e| e.trim_start_matches('.').to_lowercase())
                .collect(),
            ignored_source_extensions: ignored_source_extensions
                .iter()
                .map(|e| e.trim_start_matches('.').to_lowercase())
                .collect(),
            min_stem_length: min_stem_length.unwrap_or(3),
            dynamic_collections: dynamic_collections.to_vec(),
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
            if self.ignore_rules.is_ignored(path)
                || self.ignore_rules.is_ignored_relative(path, &self.root_path)
            {
                continue;
            }
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if self
                    .ignored_source_extensions
                    .iter()
                    .any(|ignored| ignored == &ext_lower)
                {
                    continue;
                }
                let is_recognized = is_source_file_extension(&ext_lower)
                    || self
                        .included_source_extensions
                        .iter()
                        .any(|inc| inc == &ext_lower);
                if is_recognized {
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

        // Build mapping: pattern string -> (&Asset, is_exact_filename)
        let mut patterns = Vec::new();
        let mut pattern_to_asset: Vec<(&Asset, bool)> = Vec::new();

        for asset in assets {
            // Pattern 1: Exact filename (e.g. "hero.json", "logo.webp")
            patterns.push(asset.name.clone());
            pattern_to_asset.push((asset, true));

            // Pattern 2: Stem (e.g. "hero", "logo") if stem length >= min_stem_length
            if asset.stem.len() >= self.min_stem_length && asset.stem != asset.name {
                patterns.push(asset.stem.clone());
                pattern_to_asset.push((asset, false));
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
        let mut references: Vec<UsageReference> = source_files
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
                let mut in_block_comment = false;

                for (line_idx, line) in content.lines().enumerate() {
                    let line_number = (line_idx + 1) as u32;
                    let trimmed = line.trim();

                    if in_block_comment {
                        if trimmed.contains("*/") || trimmed.contains("-->") {
                            in_block_comment = false;
                        }
                        continue;
                    }

                    if (trimmed.starts_with("/*") && !trimmed.contains("*/"))
                        || (trimmed.starts_with("<!--") && !trimmed.contains("-->"))
                    {
                        in_block_comment = true;
                        continue;
                    }

                    // Skip comment lines
                    if is_line_comment_or_url(line) {
                        continue;
                    }

                    let mut matched_assets_on_line = std::collections::HashSet::new();

                    let path_tokens_on_line: Vec<&str> = extract_quoted_tokens(line)
                        .into_iter()
                        .filter(|t| t.contains('/'))
                        .collect();

                    // Aho-Corasick linear scan on line
                    for mat in ac.find_overlapping_iter(line) {
                        let pat_idx = mat.pattern().as_usize();
                        let (asset, is_exact_filename) = pattern_to_asset[pat_idx];

                        if !matched_assets_on_line.insert(asset.path.clone()) {
                            continue;
                        }

                        // An asset file cannot reference itself
                        let pat = &patterns[pat_idx];
                        let source_str = source_path.to_string_lossy();
                        let is_self = (source_str.ends_with(pat)
                            && (source_str.len() == pat.len()
                                || source_str.as_bytes()[source_str.len() - pat.len() - 1]
                                    == b'/'))
                            || source_str == asset.path;
                        if is_self {
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

                        // Multi-asset disambiguation: if the line contains explicit path specifiers with '/',
                        // the candidate asset MUST match at least one of those paths.
                        if !path_tokens_on_line.is_empty() {
                            let matches_any_path = path_tokens_on_line.iter().any(|token| {
                                asset_matches_path_token(&asset.path, source_path, token)
                            });
                            if !matches_any_path {
                                continue;
                            }
                        }

                        // Disambiguation for tokens enclosing the match
                        if let Some(token) = extract_path_token(line, match_start, mat.end()) {
                            if token.contains('/')
                                && !asset_matches_path_token(&asset.path, source_path, token)
                            {
                                continue;
                            }
                        }

                        let line_lower = line.to_lowercase();

                        if is_exact_filename {
                            let filename_lower = pat.to_lowercase();
                            if !is_valid_exact_filename_reference(&line_lower, &filename_lower) {
                                continue;
                            }
                        } else {
                            let stem_lower = asset.stem.to_lowercase();
                            if !is_valid_stem_reference(&line_lower, &stem_lower) {
                                continue;
                            }
                        }

                        // Documentation files (.md, .mdx) get low confidence so documentation mentions
                        // do not mask assets that are orphaned in production code
                        let confidence = if syntax_type == "md" || syntax_type == "mdx" {
                            "low"
                        } else if is_exact_filename {
                            "high"
                        } else {
                            "medium"
                        };

                        file_refs.push(UsageReference {
                            asset_id: asset.path.clone(),
                            file_path: source_path.to_string_lossy().to_string(),
                            relative_file_path: relative_source.clone(),
                            line_number,
                            line_content: line.trim().to_string(),
                            syntax_type: syntax_type.clone(),
                            confidence: confidence.to_string(),
                        });
                    }

                    // Dynamic template string and interpolation scan on line
                    let has_dynamic_candidate = line.contains("${")
                        || line.contains('`')
                        || line.contains("\\(")
                        || line.contains("{$")
                        || line.contains("#{")
                        || (line.contains('+')
                            && (line.contains("'.")
                                || line.contains("\".")
                                || line.contains("`.")));

                    if has_dynamic_candidate {
                        let dynamic_patterns = extract_dynamic_patterns(line);
                        for dyn_pattern in &dynamic_patterns {
                            for asset in assets {
                                if !asset_matches_dynamic_pattern(
                                    &asset.name,
                                    &asset.stem,
                                    &asset.relative_path,
                                    &asset.path,
                                    source_path,
                                    dyn_pattern,
                                ) {
                                    continue;
                                }

                                if !matched_assets_on_line.insert(asset.path.clone()) {
                                    continue;
                                }

                                let source_str = source_path.to_string_lossy();
                                let is_self = (source_str.ends_with(&asset.name)
                                    && (source_str.len() == asset.name.len()
                                        || source_str.as_bytes()
                                            [source_str.len() - asset.name.len() - 1]
                                            == b'/'))
                                    || source_str == asset.path;
                                if is_self {
                                    continue;
                                }

                                let confidence = if syntax_type == "md" || syntax_type == "mdx" {
                                    "low"
                                } else if dyn_pattern.dir_prefix.is_some()
                                    || dyn_pattern.stem_prefix.is_some()
                                {
                                    "medium"
                                } else {
                                    "low"
                                };

                                file_refs.push(UsageReference {
                                    asset_id: asset.path.clone(),
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
                }

                file_refs
            })
            .collect();

        if !self.dynamic_collections.is_empty() {
            for asset in assets {
                if crate::governance::asset_matcher::matches_any_pattern(
                    &asset.relative_path,
                    &self.dynamic_collections,
                ) && !references
                    .iter()
                    .any(|r| r.asset_id == asset.path || r.asset_id == asset.id)
                {
                    references.push(UsageReference {
                        asset_id: asset.path.clone(),
                        file_path: self
                            .root_path
                            .join(".animoriarc.json")
                            .to_string_lossy()
                            .to_string(),
                        relative_file_path: ".animoriarc.json".to_string(),
                        line_number: 1,
                        line_content: format!(
                            "dynamicCollections matched '{}'",
                            asset.relative_path
                        ),
                        syntax_type: "json".to_string(),
                        confidence: "high".to_string(),
                    });
                }
            }
        }

        references
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::asset::{AssetFormat, AssetKind};
    use tempfile::tempdir;

    fn make_test_asset(
        id: &str,
        abs_path: &str,
        rel_path: &str,
        filename: &str,
        stem: &str,
    ) -> Asset {
        Asset {
            id: id.to_string(),
            path: abs_path.to_string(),
            relative_path: rel_path.to_string(),
            name: filename.to_string(),
            stem: stem.to_string(),
            size_bytes: 1024,
            mtime_ms: 1000,
            kind: AssetKind::Static,
            format: AssetFormat::Png,
            content_hash: None,
            dimensions: None,
            motion: None,
            static_meta: None,
            thumbnail_path: None,
            is_valid: true,
            error: None,
        }
    }

    #[test]
    fn test_disambiguates_homonymous_assets_by_relative_path() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let web_icon_rel = "apps/web/public/icon.png";
        let ui_icon_rel = "packages/ui/assets/icon.png";

        let web_icon_abs = ws_root.join(web_icon_rel);
        let ui_icon_abs = ws_root.join(ui_icon_rel);

        fs::create_dir_all(web_icon_abs.parent().unwrap()).unwrap();
        fs::create_dir_all(ui_icon_abs.parent().unwrap()).unwrap();
        fs::write(&web_icon_abs, b"fake png").unwrap();
        fs::write(&ui_icon_abs, b"fake png").unwrap();

        // Source file in apps/web referencing its local icon
        let src_file = ws_root.join("apps/web/src/App.tsx");
        fs::create_dir_all(src_file.parent().unwrap()).unwrap();
        fs::write(&src_file, "import icon from '../public/icon.png';\n").unwrap();

        let asset1 = make_test_asset(
            &web_icon_abs.to_string_lossy(),
            &web_icon_abs.to_string_lossy(),
            web_icon_rel,
            "icon.png",
            "icon",
        );
        let asset2 = make_test_asset(
            &ui_icon_abs.to_string_lossy(),
            &ui_icon_abs.to_string_lossy(),
            ui_icon_rel,
            "icon.png",
            "icon",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[asset1, asset2]);

        // Only the web icon should be referenced, not the ui icon!
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].asset_id, web_icon_abs.to_string_lossy().to_string());
    }

    #[test]
    fn test_markdown_reference_has_low_confidence() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let icon_rel = "public/icon.png";
        let icon_abs = ws_root.join(icon_rel);
        fs::create_dir_all(icon_abs.parent().unwrap()).unwrap();
        fs::write(&icon_abs, b"fake png").unwrap();

        let md_file = ws_root.join("README.md");
        fs::write(&md_file, "See [our icon](public/icon.png)\n").unwrap();

        let asset = make_test_asset(
            &icon_abs.to_string_lossy(),
            &icon_abs.to_string_lossy(),
            icon_rel,
            "icon.png",
            "icon",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[asset]);

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].confidence, "low");
    }

    #[test]
    fn test_ignored_source_extensions_skips_files() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let icon_rel = "public/icon.png";
        let icon_abs = ws_root.join(icon_rel);
        fs::create_dir_all(icon_abs.parent().unwrap()).unwrap();
        fs::write(&icon_abs, b"fake png").unwrap();

        let md_file = ws_root.join("README.md");
        fs::write(&md_file, "See [our icon](public/icon.png)\n").unwrap();

        let vue_file = ws_root.join("Component.vue");
        fs::write(
            &vue_file,
            "<template><img src=\"public/icon.png\"></template>\n",
        )
        .unwrap();

        let asset = make_test_asset(
            &icon_abs.to_string_lossy(),
            &icon_abs.to_string_lossy(),
            icon_rel,
            "icon.png",
            "icon",
        );

        // Detector ignoring both md and vue
        let detector = AssetReferenceDetector::new_with_options(
            ws_root.to_path_buf(),
            &[],
            &[],
            &["md".to_string(), "vue".to_string()],
            None,
        )
        .unwrap();

        let refs = detector.detect_references(&[asset]);
        assert_eq!(refs.len(), 0);
    }

    #[test]
    fn test_included_source_extensions_traces_custom_framework() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let icon_rel = "public/icon.png";
        let icon_abs = ws_root.join(icon_rel);
        fs::create_dir_all(icon_abs.parent().unwrap()).unwrap();
        fs::write(&icon_abs, b"fake png").unwrap();

        let custom_file = ws_root.join("Template.myframework");
        fs::write(&custom_file, "load_asset('public/icon.png')\n").unwrap();

        let asset = make_test_asset(
            &icon_abs.to_string_lossy(),
            &icon_abs.to_string_lossy(),
            icon_rel,
            "icon.png",
            "icon",
        );

        let detector = AssetReferenceDetector::new_with_options(
            ws_root.to_path_buf(),
            &[],
            &["myframework".to_string()],
            &[],
            None,
        )
        .unwrap();

        let refs = detector.detect_references(&[asset]);
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].syntax_type, "myframework");
    }

    #[test]
    fn test_dynamic_template_literal_reference_with_directory() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let char_rel = "public/characters/alchemist.webp";
        let char_abs = ws_root.join(char_rel);
        fs::create_dir_all(char_abs.parent().unwrap()).unwrap();
        fs::write(&char_abs, b"fake webp").unwrap();

        let src_file = ws_root.join("src/components/Card.tsx");
        fs::create_dir_all(src_file.parent().unwrap()).unwrap();
        fs::write(&src_file, "const avatar = `/characters/${c.id}.webp`;\n").unwrap();

        let asset = make_test_asset(
            &char_abs.to_string_lossy(),
            &char_abs.to_string_lossy(),
            char_rel,
            "alchemist.webp",
            "alchemist",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[asset]);

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].asset_id, char_abs.to_string_lossy().to_string());
        assert_eq!(refs[0].confidence, "medium");
        assert_eq!(refs[0].line_number, 1);
        assert!(refs[0].line_content.contains("/characters/${c.id}.webp"));
    }

    #[test]
    fn test_dynamic_template_literal_bare_interpolation() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let char_rel = "public/characters/warrior.webp";
        let char_abs = ws_root.join(char_rel);
        fs::create_dir_all(char_abs.parent().unwrap()).unwrap();
        fs::write(&char_abs, b"fake webp").unwrap();

        let src_file = ws_root.join("src/components/Card.tsx");
        fs::create_dir_all(src_file.parent().unwrap()).unwrap();
        fs::write(&src_file, "const avatar = `${c.id}.webp`;\n").unwrap();

        let asset = make_test_asset(
            &char_abs.to_string_lossy(),
            &char_abs.to_string_lossy(),
            char_rel,
            "warrior.webp",
            "warrior",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[asset]);

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].asset_id, char_abs.to_string_lossy().to_string());
        assert_eq!(refs[0].confidence, "low");
        assert_eq!(refs[0].line_number, 1);
    }

    #[test]
    fn test_dynamic_collections_configuration() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let char_rel = "public/characters/mage.webp";
        let char_abs = ws_root.join(char_rel);
        fs::create_dir_all(char_abs.parent().unwrap()).unwrap();
        fs::write(&char_abs, b"fake webp").unwrap();

        let asset = make_test_asset(
            &char_abs.to_string_lossy(),
            &char_abs.to_string_lossy(),
            char_rel,
            "mage.webp",
            "mage",
        );

        let detector = AssetReferenceDetector::new_with_all_options(
            ws_root.to_path_buf(),
            &[],
            &[],
            &[],
            None,
            &["public/characters/**".to_string()],
        )
        .unwrap();

        let refs = detector.detect_references(&[asset]);

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].asset_id, char_abs.to_string_lossy().to_string());
        assert_eq!(refs[0].confidence, "high");
        assert!(refs[0].line_content.contains("dynamicCollections matched"));
    }
}
