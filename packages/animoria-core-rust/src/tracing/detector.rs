use aho_corasick::{AhoCorasickBuilder, MatchKind};
use ignore::WalkBuilder;
use rayon::prelude::*;
use std::fs;
use std::path::PathBuf;

use super::patterns::{
    asset_matches_dynamic_pattern, asset_matches_path_token, extract_dynamic_patterns_with_context,
    extract_exported_identifier, extract_path_token, extract_quoted_tokens, is_line_comment_or_url,
    is_source_file_extension, is_valid_exact_filename_reference, is_valid_stem_reference,
    is_word_boundary, lua_long_comment,
};
use crate::contracts::asset::Asset;
use crate::contracts::usage::UsageReference;
use crate::scanner::ignore_rules::IgnoreRules;

/// Unity scenes and prefabs can be saved as binary, which this tracer cannot search.
const UNITY_SERIALIZED_EXTENSIONS: &[&str] =
    &["unity", "prefab", "asset", "mat", "anim", "controller"];

#[derive(Clone, Copy, PartialEq, Eq)]
enum PatternKind {
    Filename,
    Stem,
    /// Unity references assets by the `guid:` stored in `<asset>.meta`, never by path.
    Guid,
}

/// iOS asset catalogs reference an image by its `.imageset` folder name, not its file name.
fn imageset_name(asset_path: &str) -> Option<String> {
    let parent = std::path::Path::new(asset_path)
        .parent()?
        .file_name()?
        .to_str()?;
    parent.strip_suffix(".imageset").map(str::to_string)
}

fn read_unity_guid(asset_path: &str) -> Option<String> {
    let meta = fs::read_to_string(format!("{asset_path}.meta")).ok()?;
    meta.lines()
        .find_map(|l| l.trim().strip_prefix("guid:"))
        .map(|g| g.trim().to_string())
        .filter(|g| g.len() == 32 && g.bytes().all(|b| b.is_ascii_hexdigit()))
}

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
    /// Creates a reference detector with default source scanning heuristics.
    pub fn new(root_path: PathBuf, custom_ignore_patterns: &[String]) -> anyhow::Result<Self> {
        Self::new_with_options(root_path, custom_ignore_patterns, &[], &[], None)
    }

    /// Creates a reference detector with custom ignored file extensions.
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

    /// Creates a reference detector with full control over extension filtering and token lengths.
    pub fn new_with_all_options(
        root_path: PathBuf,
        custom_ignore_patterns: &[String],
        included_source_extensions: &[String],
        ignored_source_extensions: &[String],
        min_stem_length: Option<usize>,
        dynamic_collections: &[String],
    ) -> anyhow::Result<Self> {
        let mut patterns = crate::scanner::ignore_rules::unity_generated_patterns(&root_path);
        patterns.extend_from_slice(custom_ignore_patterns);
        // Same file the asset scanner reads: an ignored folder is ignored as source too.
        patterns.extend(crate::scanner::ignore_rules::read_animoriaignore(
            &root_path,
        ));
        let ignore_rules = IgnoreRules::new(&patterns)?;
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
            // An asset catalog's Contents.json lists its own images; it is not a usage.
            if path
                .to_string_lossy()
                .replace('\\', "/")
                .contains(".xcassets/")
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
        let mut pattern_to_asset: Vec<(&Asset, PatternKind)> = Vec::new();

        for asset in assets {
            // Pattern 1: Exact filename (e.g. "hero.json", "logo.webp")
            patterns.push(asset.name.clone());
            pattern_to_asset.push((asset, PatternKind::Filename));

            // Pattern 2: Stem (e.g. "hero", "logo") if stem length >= min_stem_length
            if asset.stem.len() >= self.min_stem_length && asset.stem != asset.name {
                patterns.push(asset.stem.clone());
                pattern_to_asset.push((asset, PatternKind::Stem));
            }

            if let Some(name) = imageset_name(&asset.path) {
                if name.len() >= self.min_stem_length && name != asset.stem {
                    patterns.push(name);
                    pattern_to_asset.push((asset, PatternKind::Stem));
                }
            }

            if let Some(guid) = read_unity_guid(&asset.path) {
                patterns.push(guid);
                pattern_to_asset.push((asset, PatternKind::Guid));
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
                    Err(e) => {
                        // A binary-serialized Unity scene/prefab cannot be searched; say so,
                        // otherwise its assets would silently look unreferenced.
                        if e.kind() == std::io::ErrorKind::InvalidData
                            && UNITY_SERIALIZED_EXTENSIONS.contains(
                                &source_path
                                    .extension()
                                    .and_then(|x| x.to_str())
                                    .unwrap_or(""),
                            )
                        {
                            eprintln!(
                                "[Tracing] Skipped '{}': not UTF-8 text (binary-serialized?), \
                                 its asset references are not counted.",
                                source_path.display()
                            );
                        }
                        return Vec::new();
                    }
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
                let is_lua = matches!(syntax_type.as_str(), "lua" | "luau");
                let mut lua_close: Option<String> = None;
                let mut local_vars = std::collections::HashMap::new();

                for (line_idx, line) in content.lines().enumerate() {
                    let line_number = (line_idx + 1) as u32;
                    let trimmed = line.trim();

                    // Track local string variable assignments (e.g. const dir = '...', final _imagePath = '...')
                    if line.contains('=')
                        && (line.contains('\'') || line.contains('"') || line.contains('`'))
                    {
                        if let Some(eq_idx) = line.find('=') {
                            let left = line[..eq_idx].trim();
                            let right = line[eq_idx + 1..].trim();
                            if let Some(var_name) = left.split_whitespace().last() {
                                let clean_var = var_name.trim_start_matches(['$', '_']);
                                if let Some(quoted) = extract_quoted_tokens(right).first() {
                                    if !quoted.is_empty() {
                                        local_vars.insert(var_name.to_string(), quoted.to_string());
                                        if !clean_var.is_empty() {
                                            local_vars
                                                .insert(clean_var.to_string(), quoted.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if in_block_comment {
                        let ended = match &lua_close {
                            Some(close) => trimmed.contains(close.as_str()),
                            None => trimmed.contains("*/") || trimmed.contains("-->"),
                        };
                        if ended {
                            in_block_comment = false;
                            lua_close = None;
                        }
                        continue;
                    }

                    if is_lua {
                        if let Some((open_len, close)) = lua_long_comment(trimmed) {
                            if !trimmed[open_len..].contains(close.as_str()) {
                                in_block_comment = true;
                                lua_close = Some(close);
                            }
                            continue;
                        }
                    }

                    if (trimmed.starts_with("/*") && !trimmed.contains("*/"))
                        || (trimmed.starts_with("<!--") && !trimmed.contains("-->"))
                    {
                        in_block_comment = true;
                        continue;
                    }

                    // Skip comment lines
                    if is_line_comment_or_url(line, &syntax_type) {
                        continue;
                    }

                    let mut matched_assets_on_line = std::collections::HashSet::new();
                    let line_lower = line.to_lowercase();

                    let path_tokens_on_line: Vec<&str> = extract_quoted_tokens(line)
                        .into_iter()
                        .filter(|t| t.contains('/'))
                        .collect();

                    // Aho-Corasick linear scan on line
                    for mat in ac.find_overlapping_iter(line) {
                        let pat_idx = mat.pattern().as_usize();
                        let (asset, kind) = pattern_to_asset[pat_idx];

                        // Marked as seen only once a pattern validates: the stem of `logo.png` matches
                        // first, and failing its stricter check must not hide the filename match.
                        if matched_assets_on_line.contains(&asset.path) {
                            continue;
                        }

                        // An asset file cannot reference itself
                        let pat = &patterns[pat_idx];
                        let source_str = source_path.to_string_lossy();
                        let is_self = (source_str.ends_with(pat)
                            && (source_str.len() == pat.len()
                                || source_str.as_bytes()[source_str.len() - pat.len() - 1]
                                    == b'/'
                                || source_str.as_bytes()[source_str.len() - pat.len() - 1]
                                    == b'\\'))
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
                        if kind != PatternKind::Guid && !path_tokens_on_line.is_empty() {
                            let matches_any_path = path_tokens_on_line.iter().any(|token| {
                                asset_matches_path_token(&asset.path, source_path, token)
                            });
                            if !matches_any_path {
                                continue;
                            }
                        }

                        // Disambiguation for tokens enclosing the match
                        if let Some(token) = extract_path_token(line, match_start, mat.end())
                            .filter(|_| kind != PatternKind::Guid)
                        {
                            if token.contains('/')
                                && !asset_matches_path_token(&asset.path, source_path, token)
                            {
                                continue;
                            }
                        }

                        match kind {
                            PatternKind::Filename => {
                                let filename_lower = pat.to_lowercase();
                                if !is_valid_exact_filename_reference(&line_lower, &filename_lower)
                                {
                                    continue;
                                }
                            }
                            PatternKind::Stem => {
                                if !is_valid_stem_reference(&line_lower, &pat.to_lowercase()) {
                                    continue;
                                }
                            }
                            PatternKind::Guid => {}
                        }

                        // Documentation files (.md, .mdx) get low confidence so documentation mentions
                        // do not mask assets that are orphaned in production code
                        let confidence = if syntax_type == "md" || syntax_type == "mdx" {
                            "low"
                        } else if kind != PatternKind::Stem {
                            "high"
                        } else {
                            "medium"
                        };

                        matched_assets_on_line.insert(asset.path.clone());
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

                    // Dynamic template string, interpolation, glob, and external declaration scan on line
                    let has_dynamic_candidate = line.contains("${")
                        || line.contains('`')
                        || line.contains("\\(")
                        || line.contains("{$")
                        || line.contains("#{")
                        || line.contains('$')
                        || line.contains("import.meta.glob")
                        || line.contains("classpath:")
                        || line.contains("classpath*:")
                        || (relative_source.ends_with("pubspec.yaml")
                            && (line.contains("- ") || line.contains("assets/")))
                        || (line.contains('+')
                            && (line.contains("'.")
                                || line.contains("\".")
                                || line.contains("`.")
                                || line.contains('/')
                                || !local_vars.is_empty()));

                    if has_dynamic_candidate {
                        let dynamic_patterns = extract_dynamic_patterns_with_context(
                            line,
                            &local_vars,
                            &relative_source,
                        );
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
                                            == b'/'
                                        || source_str.as_bytes()
                                            [source_str.len() - asset.name.len() - 1]
                                            == b'\\'))
                                    || source_str == asset.path;
                                if is_self {
                                    continue;
                                }

                                let confidence = if syntax_type == "md" || syntax_type == "mdx" {
                                    "low"
                                } else if dyn_pattern.dir_prefix.is_some()
                                    || dyn_pattern.stem_exact.is_some()
                                    || dyn_pattern.stem_prefix.is_some()
                                    || dyn_pattern.glob_pattern.is_some()
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

        self.prune_dead_barrel_exports(assets, references, &source_files)
    }

    /// Prunes references where an asset is ONLY referenced inside export statements
    /// (e.g. `export const adoreAnimation = require('./adore.json')` in barrel files)
    /// and the exported identifier is never imported or used anywhere else in the workspace.
    fn prune_dead_barrel_exports(
        &self,
        _assets: &[Asset],
        references: Vec<UsageReference>,
        source_files: &[PathBuf],
    ) -> Vec<UsageReference> {
        if references.is_empty() || source_files.is_empty() {
            return references;
        }

        // Map: asset key -> references
        let mut refs_by_asset: std::collections::HashMap<String, Vec<&UsageReference>> =
            std::collections::HashMap::new();
        for r in &references {
            refs_by_asset.entry(r.asset_id.clone()).or_default().push(r);
        }

        // Only consider assets whose EVERY reference in the workspace is an export statement
        let mut candidate_symbols: std::collections::HashMap<
            String,
            (std::collections::HashSet<String>, Vec<&UsageReference>),
        > = std::collections::HashMap::new();

        for (_asset_key, asset_refs) in refs_by_asset {
            let all_are_exports = asset_refs
                .iter()
                .all(|r| extract_exported_identifier(&r.line_content).is_some());

            if all_are_exports {
                for r in asset_refs {
                    if let Some(id) = extract_exported_identifier(&r.line_content) {
                        if id.len() >= 2 {
                            let entry = candidate_symbols.entry(id).or_default();
                            entry.0.insert(r.file_path.clone());
                            entry.0.insert(r.relative_file_path.clone());
                            entry.1.push(r);
                        }
                    }
                }
            }
        }

        if candidate_symbols.is_empty() {
            return references;
        }

        let symbol_names: Vec<String> = candidate_symbols.keys().cloned().collect();
        let ac = match AhoCorasickBuilder::new()
            .match_kind(MatchKind::Standard)
            .build(&symbol_names)
        {
            Ok(ac) => ac,
            Err(_) => return references,
        };

        use std::sync::atomic::{AtomicBool, Ordering};
        let symbol_used: Vec<AtomicBool> = (0..symbol_names.len())
            .map(|_| AtomicBool::new(false))
            .collect();

        source_files.par_iter().for_each(|source_path| {
            let content = match fs::read_to_string(source_path) {
                Ok(c) => c,
                Err(_) => return,
            };
            let source_str = source_path.to_string_lossy();

            for (line_idx, line) in content.lines().enumerate() {
                let line_num = (line_idx + 1) as u32;
                for mat in ac.find_overlapping_iter(line) {
                    let sym_idx = mat.pattern().as_usize();
                    if symbol_used[sym_idx].load(Ordering::Relaxed) {
                        continue;
                    }
                    if !is_word_boundary(line, mat.start(), mat.end()) {
                        continue;
                    }

                    let sym_name = &symbol_names[sym_idx];
                    if let Some((defining_files, defining_refs)) = candidate_symbols.get(sym_name) {
                        let is_in_defining_file = defining_files.iter().any(|df| {
                            source_str == *df
                                || source_str.ends_with(df)
                                || source_path
                                    .strip_prefix(&self.root_path)
                                    .map(|p| p.to_string_lossy() == *df)
                                    .unwrap_or(false)
                        });

                        if !is_in_defining_file {
                            symbol_used[sym_idx].store(true, Ordering::Relaxed);
                        } else {
                            // In defining file: used if it appears on a line other than the export line
                            let is_on_export_line =
                                defining_refs.iter().any(|r| r.line_number == line_num);
                            if !is_on_export_line {
                                symbol_used[sym_idx].store(true, Ordering::Relaxed);
                            }
                        }
                    }
                }
            }
        });

        // Filter out dead references
        let mut dead_refs: std::collections::HashSet<(String, String, u32)> =
            std::collections::HashSet::new();

        for (sym_idx, sym_name) in symbol_names.iter().enumerate() {
            let is_used = symbol_used[sym_idx].load(Ordering::Relaxed);
            if !is_used {
                if let Some((_, refs)) = candidate_symbols.get(sym_name) {
                    for r in refs {
                        dead_refs.insert((r.asset_id.clone(), r.file_path.clone(), r.line_number));
                    }
                }
            }
        }

        if dead_refs.is_empty() {
            references
        } else {
            references
                .into_iter()
                .filter(|r| {
                    !dead_refs.contains(&(r.asset_id.clone(), r.file_path.clone(), r.line_number))
                })
                .collect()
        }
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

    fn detect_in(files: &[(&str, &str)], asset_rel: &str) -> Vec<UsageReference> {
        let dir = tempdir().unwrap();
        let root = dir.path();
        for (rel, body) in files {
            let abs = root.join(rel);
            fs::create_dir_all(abs.parent().unwrap()).unwrap();
            fs::write(abs, body).unwrap();
        }
        let abs = root.join(asset_rel).to_string_lossy().to_string();
        let name = asset_rel.rsplit('/').next().unwrap();
        let stem = name.rsplit_once('.').unwrap().0;
        let asset = make_test_asset(&abs, &abs, asset_rel, name, stem);
        AssetReferenceDetector::new(root.to_path_buf(), &[])
            .unwrap()
            .detect_references(&[asset])
    }

    #[test]
    fn unity_guid_in_prefab_is_a_high_confidence_reference() {
        let guid = "0123456789abcdef0123456789abcdef";
        let refs = detect_in(
            &[
                ("Assets/hero.png", "png"),
                (
                    "Assets/hero.png.meta",
                    &format!("fileFormatVersion: 2\nguid: {guid}\n"),
                ),
                (
                    "Assets/Hero.prefab",
                    &format!("  m_Sprite: {{fileID: 21300000, guid: {guid}, type: 3}}\n"),
                ),
            ],
            "Assets/hero.png",
        );
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].confidence, "high");
    }

    #[test]
    fn unity_project_ignores_library_and_flags_binary_scenes_without_failing() {
        let guid = "fedcba9876543210fedcba9876543210";
        let dir = tempdir().unwrap();
        let root = dir.path();
        for (rel, body) in [
            (
                "ProjectSettings/ProjectVersion.txt",
                "m_EditorVersion: 6000",
            ),
            ("Assets/hero.png", "png"),
            ("Assets/hero.png.meta", &format!("guid: {guid}\n")),
            ("Library/Cache.prefab", &format!("guid: {guid}\n")),
        ] {
            let abs = root.join(rel);
            fs::create_dir_all(abs.parent().unwrap()).unwrap();
            fs::write(abs, body).unwrap();
        }
        fs::write(root.join("Assets/Binary.unity"), [0xff, 0xfe, 0x00, 0x80]).unwrap();
        let abs = root.join("Assets/hero.png").to_string_lossy().to_string();
        let asset = make_test_asset(&abs, &abs, "Assets/hero.png", "hero.png", "hero");

        let refs = AssetReferenceDetector::new(root.to_path_buf(), &[])
            .unwrap()
            .detect_references(&[asset]);
        // The only guid mention is inside generated Library/, and the binary scene is skipped.
        assert!(refs.is_empty());
    }

    #[test]
    fn lua_leveled_long_comments_are_skipped() {
        let src = "--[==[\nlocal a = 'coin.png'\n]]\nlocal b = 'coin.png'\n]==]\nlocal c = 'coin.png'\n--[=[ one line 'coin.png' ]=]\nlocal d = 'coin.png'\n";
        let refs = detect_in(
            &[("art/coin.png", "png"), ("src/main.lua", src)],
            "art/coin.png",
        );
        let lines: Vec<u32> = refs.iter().map(|r| r.line_number).collect();
        assert_eq!(lines, vec![6, 8]);
    }

    #[test]
    fn lua_comments_are_skipped_but_code_is_traced() {
        let src = "-- local a = 'coin.png'\n--[[\nlocal b = 'coin.png'\n]]\nlocal c = 'coin.png'\n";
        let refs = detect_in(
            &[("art/coin.png", "png"), ("src/main.luau", src)],
            "art/coin.png",
        );
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].line_number, 5);
    }

    #[test]
    fn bare_quoted_filename_without_a_directory_is_a_reference() {
        let refs = detect_in(
            &[
                ("public/logo.png", "png"),
                ("src/App.tsx", "<img src=\"logo.png\" />\n"),
            ],
            "public/logo.png",
        );
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].confidence, "high");
    }

    #[test]
    fn unity_resources_load_by_name_is_a_reference() {
        let refs = detect_in(
            &[
                ("Assets/Resources/UI/hero.png", "png"),
                (
                    "Assets/Scripts/Ui.cs",
                    "var s = Resources.Load<Sprite>(\"UI/hero\");\n",
                ),
            ],
            "Assets/Resources/UI/hero.png",
        );
        assert_eq!(refs.len(), 1);
    }

    #[test]
    fn single_line_css_rule_starting_with_hash_counts_as_a_reference() {
        let refs = detect_in(
            &[
                ("public/hero.png", "png"),
                (
                    "styles/main.css",
                    "#hero { background: url(../public/hero.png) }\n",
                ),
            ],
            "public/hero.png",
        );
        assert_eq!(refs.len(), 1);
    }

    #[test]
    fn animoriaignore_hides_source_files_from_reference_tracing() {
        let files = [
            ("public/logo.png", "png"),
            ("generated/use.ts", "import l from '../public/logo.png';\n"),
        ];
        assert_eq!(detect_in(&files, "public/logo.png").len(), 1);

        let mut with_ignore = files.to_vec();
        with_ignore.push((".animoriaignore", "# generated code\ngenerated/\n"));
        assert!(detect_in(&with_ignore, "public/logo.png").is_empty());
    }

    #[test]
    fn ios_imageset_name_is_referenced_and_catalog_json_is_not() {
        let refs = detect_in(
            &[
                ("A.xcassets/logo.imageset/logo@2x.png", "png"),
                (
                    "A.xcassets/logo.imageset/Contents.json",
                    "{\"filename\": \"logo@2x.png\"}",
                ),
                ("App/View.swift", "Image(\"logo\")\n"),
            ],
            "A.xcassets/logo.imageset/logo@2x.png",
        );
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].syntax_type, "swift");
    }

    #[test]
    fn android_xml_drawable_reference() {
        let refs = detect_in(
            &[
                ("res/drawable-hdpi/ic_logo.png", "png"),
                (
                    "res/layout/main.xml",
                    "<ImageView android:src=\"@drawable/ic_logo\" />\n",
                ),
            ],
            "res/drawable-hdpi/ic_logo.png",
        );
        assert_eq!(refs.len(), 1);
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

    #[test]
    fn test_alias_at_slash_import_nexo_finance() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let clock_rel = "client/src/assets/lottie/clock.json";
        let clock_abs = ws_root.join(clock_rel);
        fs::create_dir_all(clock_abs.parent().unwrap()).unwrap();
        fs::write(&clock_abs, b"{}").unwrap();

        let dead_rel = "client/src/assets/lottie/dead.json";
        let dead_abs = ws_root.join(dead_rel);
        fs::create_dir_all(dead_abs.parent().unwrap()).unwrap();
        fs::write(&dead_abs, b"{}").unwrap();

        let src_file = ws_root.join("client/src/lib/lottieAnimations.ts");
        fs::create_dir_all(src_file.parent().unwrap()).unwrap();
        fs::write(
            &src_file,
            "import clockAnim from '@/assets/lottie/clock.json';\n",
        )
        .unwrap();

        let clock_asset = make_test_asset(
            &clock_abs.to_string_lossy(),
            &clock_abs.to_string_lossy(),
            clock_rel,
            "clock.json",
            "clock",
        );
        let dead_asset = make_test_asset(
            &dead_abs.to_string_lossy(),
            &dead_abs.to_string_lossy(),
            dead_rel,
            "dead.json",
            "dead",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[clock_asset, dead_asset]);

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].asset_id, clock_abs.to_string_lossy().to_string());
    }

    #[test]
    fn test_import_without_json_extension_scholarly_admin() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let loading_rel = "src/assets/lottie/loading.json";
        let loading_abs = ws_root.join(loading_rel);
        fs::create_dir_all(loading_abs.parent().unwrap()).unwrap();
        fs::write(&loading_abs, b"{}").unwrap();

        let src_file = ws_root.join("src/App.jsx");
        fs::create_dir_all(src_file.parent().unwrap()).unwrap();
        fs::write(
            &src_file,
            "import loadingAnim from './assets/lottie/loading';\n",
        )
        .unwrap();

        let loading_asset = make_test_asset(
            &loading_abs.to_string_lossy(),
            &loading_abs.to_string_lossy(),
            loading_rel,
            "loading.json",
            "loading",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[loading_asset]);

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].asset_id, loading_abs.to_string_lossy().to_string());
    }

    #[test]
    fn test_barrel_dead_exports_sticknet() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        let adore_rel = "assets/lottie/adore.json";
        let adore_abs = ws_root.join(adore_rel);
        fs::create_dir_all(adore_abs.parent().unwrap()).unwrap();
        fs::write(&adore_abs, b"{}").unwrap();

        let like_rel = "assets/lottie/like.json";
        let like_abs = ws_root.join(like_rel);
        fs::create_dir_all(like_abs.parent().unwrap()).unwrap();
        fs::write(&like_abs, b"{}").unwrap();

        let used_rel = "assets/lottie/used.json";
        let used_abs = ws_root.join(used_rel);
        fs::create_dir_all(used_abs.parent().unwrap()).unwrap();
        fs::write(&used_abs, b"{}").unwrap();

        // Barrel index.ts exports all three
        let index_file = ws_root.join("assets/lottie/index.ts");
        fs::create_dir_all(index_file.parent().unwrap()).unwrap();
        fs::write(
            &index_file,
            r#"export const adoreAnimation = require('./adore.json');
export const likeAnimation = require('./like.json');
export const usedAnimation = require('./used.json');
"#,
        )
        .unwrap();

        // Another file only imports and uses `usedAnimation`
        let app_file = ws_root.join("src/App.tsx");
        fs::create_dir_all(app_file.parent().unwrap()).unwrap();
        fs::write(
            &app_file,
            r#"import { usedAnimation } from '../assets/lottie';
export function Component() {
    return <Lottie source={usedAnimation} />;
}
"#,
        )
        .unwrap();

        let adore_asset = make_test_asset(
            &adore_abs.to_string_lossy(),
            &adore_abs.to_string_lossy(),
            adore_rel,
            "adore.json",
            "adore",
        );
        let like_asset = make_test_asset(
            &like_abs.to_string_lossy(),
            &like_abs.to_string_lossy(),
            like_rel,
            "like.json",
            "like",
        );
        let used_asset = make_test_asset(
            &used_abs.to_string_lossy(),
            &used_abs.to_string_lossy(),
            used_rel,
            "used.json",
            "used",
        );

        let detector = AssetReferenceDetector::new(ws_root.to_path_buf(), &[]).unwrap();
        let refs = detector.detect_references(&[adore_asset, like_asset, used_asset]);

        // Only used.json should have references surviving dead export pruning
        // (adore.json and like.json are pruned because their exports are never consumed)
        assert_eq!(refs.len(), 1); // 1 surviving reference in index.ts
        assert_eq!(refs[0].asset_id, used_abs.to_string_lossy().to_string());
    }
}
