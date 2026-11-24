use crate::scanner::walker::RECOGNIZED_EXTENSIONS;

/// Recognized source code file extensions inspected for asset references.
pub const SOURCE_EXTENSIONS: &[&str] = &[
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "cjs",
    "vue",
    "svelte",
    "astro",
    "kt",
    "kts",
    "java",
    "swift",
    "dart",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    "md",
    "mdx",
    "json",
    "xml",
    "yml",
    "yaml",
    "php",
    "phtml",
    "blade",
    "twig",
    "erb",
    "liquid",
    "njk",
    "nunjucks",
    "ejs",
    "hbs",
    "handlebars",
    "mustache",
    "jinja",
    "jinja2",
    "j2",
    "heex",
    "eex",
    "leex",
    "htmx",
    "gohtml",
    "gotmpl",
    "razor",
    "cshtml",
    "vbhtml",
    "py",
    "rb",
    "rs",
    "go",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "toml",
    // Godot: scripts, scenes, resources, shaders, project.godot
    "gd",
    "tscn",
    "tres",
    "gdshader",
    "godot",
    // Unity: serialized YAML that references assets by guid
    "prefab",
    "unity",
    "mat",
    "asset",
    "anim",
    "controller",
    "uxml",
    "uss",
    // iOS: interface files and Objective-C
    "storyboard",
    "xib",
    "m",
    "mm",
    // Roblox / Rojo: Luau and Lua scripts
    "luau",
    "lua",
    // Web manifest formats
    "webmanifest",
    // Database and configuration formats
    "sql",
    "properties",
];

/// Returns whether a given file extension corresponds to scannable source code.
pub fn is_source_file_extension(ext: &str) -> bool {
    SOURCE_EXTENSIONS.contains(&ext.to_lowercase().as_str())
}

/// Languages where a leading `#` starts a comment. In CSS/SCSS/HTML a leading `#` is an id
/// selector (`#hero { background: url(hero.png) }`), which is a real reference.
const HASH_COMMENT_EXTENSIONS: &[&str] =
    &["py", "rb", "toml", "yml", "yaml", "gd", "sh", "properties"];

/// Opening of a Lua long comment (`--[[`, `--[=[`, `--[==[` ...): the byte length of the opener
/// and the closing bracket with the same number of `=` signs.
pub fn lua_long_comment(trimmed: &str) -> Option<(usize, String)> {
    let after = trimmed.strip_prefix("--[")?;
    let level = after.bytes().take_while(|b| *b == b'=').count();
    if after.as_bytes().get(level) != Some(&b'[') {
        return None;
    }
    Some((3 + level + 1, format!("]{}]", "=".repeat(level))))
}

/// Whether the whole line is a comment in the language of a file with extension `ext`.
/// Lines inside a `/* ... */` block are handled by the caller, so a leading `*` is not
/// treated as a comment here (`* { background: url(bg.png) }` is a CSS rule).
pub fn is_line_comment_or_url(line: &str, ext: &str) -> bool {
    let trimmed = line.trim();
    // Only Lua/Luau/SQL: in CSS a leading `--` is a custom property (`--logo: url(logo.png)`).
    (trimmed.starts_with("--") && matches!(ext, "lua" | "luau" | "sql"))
        || trimmed.starts_with("//")
        || trimmed.starts_with("/*")
        || trimmed.starts_with("<!--")
        || (trimmed.starts_with('#') && HASH_COMMENT_EXTENSIONS.contains(&ext))
        || (trimmed.starts_with('!') && ext == "properties")
}

/// Whether a line containing an asset's *stem* (name without extension) is a
/// plausible reference rather than a coincidental substring match.
///
/// A stem match alone (unlike an exact filename match) is too weak to trust
/// on its own — "hero" as a bare word appears constantly in code that has
/// nothing to do with `hero.json`. Each branch below is a syntax this engine
/// has seen actually reference an asset by stem across the platforms
/// Animoria traces (see `tracing/mod.rs`): Android resource IDs, native
/// `setAnimation` calls, React/React Native `require`, Flutter's Lottie SDK,
/// iOS/SwiftUI Lottie APIs, and bare path-like references. A line matching
/// none of these is treated as a false positive and dropped, even though the
/// stem technically appeared in it.
pub fn is_valid_stem_reference(line_lower: &str, stem_lower: &str) -> bool {
    if !line_lower.contains(stem_lower) {
        return false;
    }

    // Fast zero-allocation delimiter check via byte slice inspection
    for (pos, _) in line_lower.match_indices(stem_lower) {
        let before = &line_lower[..pos];
        let after = &line_lower[pos + stem_lower.len()..];

        // 1. Android R.raw.<stem>
        if ["r.raw.", "r.drawable.", "r.mipmap."]
            .iter()
            .any(|p| before.ends_with(p))
        {
            return true;
        }

        // 1a. Unity runtime load by name: Resources.Load("UI/hero") has no GUID and no extension
        if line_lower.contains("resources.load") {
            return true;
        }

        // 1b. Android XML resource: @drawable/stem, @mipmap/stem, @raw/stem
        if ["@raw/", "@drawable/", "@mipmap/"]
            .iter()
            .any(|p| before.ends_with(p))
        {
            return true;
        }

        // 1c. iOS: Image("stem"), UIImage(named: "stem"), #imageLiteral(resourceName: "stem")
        if (before.ends_with('"') && after.starts_with('"'))
            && ["image(", "image(named:", "resourcename:"]
                .iter()
                .any(|k| line_lower.contains(k))
        {
            return true;
        }

        // 3. React / React Native: source={require('./stem')} or require('.../stem')
        if (line_lower.contains("source=") || line_lower.contains("require("))
            && (before.ends_with('/') || before.ends_with('.'))
        {
            return true;
        }

        // 6. Path / import reference: './stem', '../stem', '@/stem', '~/stem', '/stem'
        if before.ends_with("./")
            || before.ends_with("../")
            || before.ends_with("@/")
            || before.ends_with("~/")
            || (before.ends_with('/')
                && (after.starts_with('.')
                    || after.starts_with('"')
                    || after.starts_with('\'')
                    || after.starts_with('`')))
            || ((before.ends_with('"') || before.ends_with('\'') || before.ends_with('`'))
                && (after.starts_with(".json\"")
                    || after.starts_with(".json'")
                    || after.starts_with(".json`")))
        {
            return true;
        }
    }

    // 7. Roblox / Rojo: instances are looked up by name (`:WaitForChild("stem")`)
    if line_lower.contains("waitforchild(") || line_lower.contains("findfirstchild(") {
        return true;
    }

    // 2. Android setAnimation("stem") / setAnimation('stem')
    if line_lower.contains("setanimation(") {
        return true;
    }
    // 4. Flutter / Lottie SDK: Lottie.asset('...stem...'), LottieBuilder
    if line_lower.contains("lottie.") || line_lower.contains("lottiebuilder.") {
        return true;
    }
    // 5. iOS / SwiftUI: LottieAnimationView(name: "stem"), AnimationView(name: "stem"), LottieAnimation.named("stem")
    if line_lower.contains("lottieanimationview")
        || line_lower.contains("animationview")
        || line_lower.contains("lottieanimation.named")
    {
        return true;
    }

    false
}

/// Validates whether a token match represents a legitimate asset reference.
pub fn is_valid_exact_filename_reference(line_lower: &str, filename_lower: &str) -> bool {
    // Filename must appear inside quotes, import specifier, or path delimiter
    for (pos, _) in line_lower.match_indices(filename_lower) {
        let before = &line_lower[..pos];
        let after = &line_lower[pos + filename_lower.len()..];

        let before_quote = before.ends_with('"') || before.ends_with('\'') || before.ends_with('`');
        let after_quote = after.starts_with('"')
            || after.starts_with('\'')
            || after.starts_with('`')
            || after.starts_with('?');

        if (before_quote && after_quote)
            || before.ends_with('/')
            || before.ends_with('\\')
            || before.ends_with("from '")
            || before.ends_with("from \"")
            || before.ends_with("require('")
            || before.ends_with("require(\"")
        {
            return true;
        }
    }
    false
}

/// Extracts the path-like token around a matched substring (e.g. within quotes or delimiters).
pub fn extract_path_token(line: &str, match_start: usize, match_end: usize) -> Option<&str> {
    if match_start > line.len() || match_end > line.len() || match_start > match_end {
        return None;
    }

    let bytes = line.as_bytes();
    let mut start = match_start;
    let mut end = match_end;

    // Expand backwards until quote, whitespace, comma, paren, or delimiter
    while start > 0 {
        let b = bytes[start - 1];
        if b == b'"'
            || b == b'\''
            || b == b'`'
            || b == b'('
            || b == b'['
            || b == b'{'
            || b == b' '
            || b == b'\t'
            || b == b'='
        {
            break;
        }
        start -= 1;
    }

    // Expand forwards until quote, whitespace, comma, paren, semicolon, query string, etc.
    while end < bytes.len() {
        let b = bytes[end];
        if b == b'"'
            || b == b'\''
            || b == b'`'
            || b == b')'
            || b == b']'
            || b == b'}'
            || b == b' '
            || b == b'\t'
            || b == b';'
            || b == b','
            || b == b'?'
        {
            break;
        }
        end += 1;
    }

    if start < end {
        Some(&line[start..end])
    } else {
        None
    }
}

/// Extracts all quoted string literals or url(...) arguments from a line.
pub fn extract_quoted_tokens(line: &str) -> Vec<&str> {
    let mut tokens = Vec::new();
    let bytes = line.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let quote = bytes[i];
        if quote == b'"' || quote == b'\'' || quote == b'`' {
            let start = i + 1;
            let mut j = start;
            while j < bytes.len() && bytes[j] != quote {
                if bytes[j] == b'\\' && j + 1 < bytes.len() {
                    j += 2;
                } else {
                    j += 1;
                }
            }
            if j <= bytes.len() {
                let inner = &line[start..j];
                tokens.push(inner);
                if inner.contains('"') || inner.contains('\'') || inner.contains('`') {
                    tokens.extend(extract_quoted_tokens(inner));
                }
            }
            i = j + 1;
        } else {
            i += 1;
        }
    }
    tokens
}

/// Checks whether an asset at `asset_path` is a legitimate target for a path `token`
/// referenced inside `source_path`.
pub fn asset_matches_path_token(
    asset_path: &str,
    source_path: &std::path::Path,
    token: &str,
) -> bool {
    // Strip query parameters (e.g. `?url`, `?raw`)
    let clean_token_raw = token.split('?').next().unwrap_or(token);
    // Godot's `res://` is the project root, so the rest is a workspace-relative suffix.
    let clean_token = clean_token_raw.replace('\\', "/");
    let clean_token = clean_token
        .strip_prefix("res://")
        .unwrap_or(&clean_token)
        .to_string();
    let asset_clean = asset_path.replace('\\', "/");
    // Android `@drawable/name` has no directory or extension: match the resource folder and stem.
    if let Some((kind, name)) = clean_token
        .strip_prefix('@')
        .and_then(|t| t.split_once('/'))
    {
        if !kind.is_empty()
            && !name.contains('/')
            && matches!(
                kind,
                "drawable" | "mipmap" | "raw" | "color" | "anim" | "animator" | "layout" | "string"
            )
        {
            let asset_p = std::path::Path::new(&asset_clean);
            return asset_p.file_stem().and_then(|s| s.to_str()) == Some(name)
                && asset_p
                    .components()
                    .any(|c| c.as_os_str().to_string_lossy().starts_with(kind));
        }
    }

    let clean_suffix = clean_token.trim_start_matches(['.', '/']);
    let asset_p = std::path::Path::new(&asset_clean);

    // Path alias support (e.g. "@/assets/lottie/clock.json", "~/assets/image.png")
    if clean_token.starts_with("@/") || clean_token.starts_with("~/") {
        let remainder = clean_token.trim_start_matches(['@', '~', '/']);
        let asset_clean_no_ext = asset_p
            .with_extension("")
            .to_string_lossy()
            .replace('\\', "/");
        return asset_clean.ends_with(remainder) || asset_clean_no_ext.ends_with(remainder);
    }

    if clean_token.starts_with("./") || clean_token.starts_with("../") {
        let source_clean = source_path.to_string_lossy().replace('\\', "/");
        let source_p = std::path::Path::new(&source_clean);
        if let Some(parent) = source_p.parent() {
            let resolved = parent.join(&clean_token);
            let mut normalized = std::path::PathBuf::new();
            for comp in resolved.components() {
                match comp {
                    std::path::Component::CurDir => {}
                    std::path::Component::ParentDir => {
                        normalized.pop();
                    }
                    other => normalized.push(other.as_os_str()),
                }
            }
            let norm_str = normalized.to_string_lossy().replace('\\', "/");
            let asset_clean_no_ext = asset_p
                .with_extension("")
                .to_string_lossy()
                .replace('\\', "/");

            if norm_str == asset_clean || norm_str == asset_clean_no_ext {
                return true;
            }
            if !clean_suffix.contains('/') {
                // e.g. "./icon.png": must reside in target directory
                return normalized.parent() == asset_p.parent()
                    && (asset_clean.ends_with(clean_suffix)
                        || asset_clean_no_ext.ends_with(clean_suffix));
            } else {
                return asset_clean.ends_with(clean_suffix)
                    || asset_clean_no_ext.ends_with(clean_suffix);
            }
        }
    } else if clean_token.starts_with("http://") || clean_token.starts_with("https://") {
        if let Some(pos) = clean_token.find("://") {
            let after_proto = &clean_token[pos + 3..];
            if let Some(slash_idx) = after_proto.find('/') {
                let url_path = &after_proto[slash_idx..];
                let path_tokens: Vec<&str> =
                    url_path.split('/').filter(|s| !s.is_empty()).collect();
                for i in 0..path_tokens.len() {
                    let candidate_suffix = path_tokens[i..].join("/");
                    if asset_clean.ends_with(&candidate_suffix) {
                        return true;
                    }
                }
            }
        }
        return false;
    } else {
        let trimmed = clean_token.trim_start_matches('/');
        // Also without the extension: `Resources.Load("UI/hero")` names `UI/hero.png`.
        return asset_clean.ends_with(trimmed)
            || asset_p
                .with_extension("")
                .to_string_lossy()
                .ends_with(trimmed);
    }
    false
}

/// Matches an asset against a glob pattern (e.g. from `import.meta.glob` or Spring `classpath:`).
pub fn matches_glob(
    pattern: &str,
    source_path: &std::path::Path,
    asset_path: &str,
    asset_rel_path: &str,
) -> bool {
    let clean_pat = pattern
        .split('?')
        .next()
        .unwrap_or(pattern)
        .replace('\\', "/");
    let clean_pat = clean_pat
        .trim_matches(['"', '\'', '`'])
        .trim()
        .replace('…', "..");

    if clean_pat.is_empty() {
        return false;
    }

    let norm_asset_path = asset_path.replace('\\', "/");
    let norm_asset_rel = asset_rel_path.replace('\\', "/");

    // 1. If pattern is relative to source file (starts with ./ or ../)
    if clean_pat.starts_with("./") || clean_pat.starts_with("../") {
        if let Some(parent) = source_path.parent() {
            let joined = parent.join(&clean_pat);
            let mut normalized = std::path::PathBuf::new();
            for comp in joined.components() {
                match comp {
                    std::path::Component::CurDir => {}
                    std::path::Component::ParentDir => {
                        normalized.pop();
                    }
                    other => normalized.push(other.as_os_str()),
                }
            }
            let norm_str = normalized.to_string_lossy().replace('\\', "/");
            if let Ok(glob) = globset::Glob::new(&norm_str) {
                let matcher = glob.compile_matcher();
                if matcher.is_match(&norm_asset_path) || matcher.is_match(&norm_asset_rel) {
                    return true;
                }
            }
        }
    }

    // 2. Direct glob match on relative path or full path
    let pat_trimmed = clean_pat.trim_start_matches(['/', '.']);
    if let Ok(glob) = globset::Glob::new(pat_trimmed) {
        let matcher = glob.compile_matcher();
        if matcher.is_match(&norm_asset_rel) || matcher.is_match(&norm_asset_path) {
            return true;
        }
    }

    // 3. Match with **/ prefix for subtrees (e.g. static/images/icons/svg/*.svg)
    let wildcard_pat = format!("**/{}", pat_trimmed.trim_start_matches('/'));
    if let Ok(glob) = globset::Glob::new(&wildcard_pat) {
        let matcher = glob.compile_matcher();
        if matcher.is_match(&norm_asset_rel) || matcher.is_match(&norm_asset_path) {
            return true;
        }
    }

    false
}

/// Represents a parsed dynamic reference pattern extracted from an interpolated
/// string (e.g. `${c.id}.webp`, `/characters/${c.id}.webp`, or `'icons/' + id + '.png'`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct DynamicPattern {
    pub(crate) dir_prefix: Option<String>,
    pub(crate) stem_exact: Option<String>,
    pub(crate) stem_prefix: Option<String>,
    pub(crate) stem_suffix: Option<String>,
    pub(crate) extension: Option<String>,
    pub(crate) glob_pattern: Option<String>,
}

fn has_dart_style_interpolation(token: &str) -> bool {
    let bytes = token.as_bytes();
    for (i, &b) in bytes.iter().enumerate() {
        if b == b'$' && i + 1 < bytes.len() {
            let next = bytes[i + 1];
            if next.is_ascii_alphabetic() || next == b'_' {
                return true;
            }
        }
    }
    false
}

fn parse_dynamic_pattern_from_token(
    token: &str,
    vars: &std::collections::HashMap<String, String>,
) -> Option<DynamicPattern> {
    let clean = token.trim_matches(['"', '\'', '`', ';', ',']).trim();
    if clean.is_empty() {
        return None;
    }

    let is_interpolation = clean.contains("${")
        || clean.contains("\\(")
        || clean.contains("#{")
        || clean.contains("{$")
        || (clean.contains('{') && clean.contains('}'))
        || has_dart_style_interpolation(clean);

    if !is_interpolation {
        return None;
    }

    // Find first dynamic marker start
    let mut first_marker_start: Option<usize> = None;
    let bytes = clean.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if (bytes[i] == b'$'
            && i + 1 < bytes.len()
            && (bytes[i + 1] == b'{' || bytes[i + 1].is_ascii_alphabetic() || bytes[i + 1] == b'_'))
            || (bytes[i] == b'\\' && i + 1 < bytes.len() && bytes[i + 1] == b'(')
            || (bytes[i] == b'#' && i + 1 < bytes.len() && bytes[i + 1] == b'{')
            || (bytes[i] == b'{' && i + 1 < bytes.len() && bytes[i + 1] == b'$')
            || (bytes[i] == b'{')
        {
            first_marker_start = Some(i);
            break;
        }
        i += 1;
    }

    let start_idx = first_marker_start?;

    // Find the last dynamic marker end
    let mut last_marker_end: Option<usize> = None;
    if let Some(r_close) = clean.rfind('}').or_else(|| clean.rfind(')')) {
        last_marker_end = Some(r_close + 1);
    } else if let Some(last_dollar) = clean.rfind('$') {
        let mut j = last_dollar + 1;
        while j < bytes.len() && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'_') {
            j += 1;
        }
        last_marker_end = Some(j);
    }

    let end_idx = last_marker_end.unwrap_or(start_idx);

    let before = &clean[..start_idx];
    let after = if end_idx <= clean.len() {
        &clean[end_idx..]
    } else {
        ""
    };

    // Check extension and stem suffix/exact in `after`
    let mut extension: Option<String> = None;
    let mut stem_suffix: Option<String> = None;
    let mut stem_exact: Option<String> = None;

    if let Some(last_dot) = after.rfind('.') {
        let ext_candidate = after[last_dot + 1..]
            .trim_matches(['"', '\'', '`', '}', ')', ';', ',', ' '])
            .to_lowercase();
        if RECOGNIZED_EXTENSIONS.contains(&ext_candidate.as_str()) {
            extension = Some(ext_candidate);
            let suffix = after[..last_dot].trim();
            if !suffix.is_empty() {
                if suffix.starts_with('/') {
                    let stem = suffix.trim_start_matches('/');
                    if !stem.is_empty() {
                        stem_exact = Some(stem.to_string());
                    }
                } else {
                    stem_suffix = Some(suffix.to_string());
                }
            }
        }
    }

    // Directory prefix and stem prefix from `before`
    let mut dir_prefix: Option<String> = None;
    let mut stem_prefix: Option<String> = None;

    if before.contains('/') {
        if let Some(last_slash) = before.rfind('/') {
            let dir_part = &before[..last_slash];
            let clean_dir = dir_part.trim_matches(['/', '.', '`', '"', '\'']).trim();
            if !clean_dir.is_empty() {
                dir_prefix = Some(clean_dir.to_string());
            }

            let stem_pre = before[last_slash + 1..].trim();
            if !stem_pre.is_empty() {
                stem_prefix = Some(stem_pre.to_string());
            }
        }
    } else {
        let clean_before = before.trim_matches(['`', '"', '\'']).trim();
        if !clean_before.is_empty() {
            stem_prefix = Some(clean_before.to_string());
        }
    }

    // If dir_prefix is None and variable was at the start (e.g. `$_imagePath/foo.png`),
    // resolve against `vars`
    if dir_prefix.is_none() && start_idx == 0 {
        let var_text = &clean[1..end_idx];
        let var_name = var_text.trim_matches(['{', '}']);
        if let Some(val) = vars.get(var_name).or_else(|| vars.get(&clean[..end_idx])) {
            let clean_val = val.trim_matches(['/', '.', '"', '\'', '`']).trim();
            if !clean_val.is_empty() {
                dir_prefix = Some(clean_val.to_string());
            }
        }
    }

    if dir_prefix.is_none()
        && stem_exact.is_none()
        && stem_prefix.is_none()
        && stem_suffix.is_none()
        && extension.is_none()
    {
        return None;
    }

    Some(DynamicPattern {
        dir_prefix,
        stem_exact,
        stem_prefix,
        stem_suffix,
        extension,
        glob_pattern: None,
    })
}

/// Extracts all dynamic asset template patterns from a source code line with variable resolution and context.
pub(crate) fn extract_dynamic_patterns_with_context(
    line: &str,
    vars: &std::collections::HashMap<String, String>,
    relative_source: &str,
) -> Vec<DynamicPattern> {
    let mut patterns = Vec::new();
    let tokens = extract_quoted_tokens(line);

    for token in &tokens {
        if let Some(pat) = parse_dynamic_pattern_from_token(token, vars) {
            if !patterns.contains(&pat) {
                patterns.push(pat);
            }
        }
    }

    // Support string concatenation (e.g. 'res/icons/overlay/' + n + '.png' or dir + i + '.jpg')
    if line.contains('+') {
        let mut dir_prefix: Option<String> = None;
        let mut target_ext: Option<String> = None;

        for token in &tokens {
            let t = token.trim();
            if t.contains('/') && !t.contains('.') {
                let clean = t.trim_matches(['/', '.', '"', '\'', '`']);
                if !clean.is_empty() {
                    dir_prefix = Some(clean.to_string());
                }
            } else if t.starts_with('.') && t.len() <= 6 {
                let ext = t.trim_start_matches('.').to_lowercase();
                if RECOGNIZED_EXTENSIONS.contains(&ext.as_str()) {
                    target_ext = Some(ext);
                }
            }
        }

        // If dir_prefix was not a quoted literal, check if any identifier in line is in `vars`
        if dir_prefix.is_none() {
            for word in line.split(|c: char| !c.is_alphanumeric() && c != '_' && c != '$') {
                if let Some(val) = vars.get(word) {
                    let clean = val.trim_matches(['/', '.', '"', '\'', '`']).trim();
                    if !clean.is_empty() {
                        dir_prefix = Some(clean.to_string());
                        break;
                    }
                }
            }
        }

        if let (Some(dir), Some(ext)) = (dir_prefix, target_ext) {
            let pat = DynamicPattern {
                dir_prefix: Some(dir),
                stem_exact: None,
                stem_prefix: None,
                stem_suffix: None,
                extension: Some(ext),
                glob_pattern: None,
            };
            if !patterns.contains(&pat) {
                patterns.push(pat);
            }
        }
    }

    // Support Vite / SvelteKit / Astro `import.meta.glob('…/*.svg', ...)`
    if line.contains("import.meta.glob") {
        for token in &tokens {
            let clean = token.split('?').next().unwrap_or(token).trim();
            if clean.contains('*') || RECOGNIZED_EXTENSIONS.iter().any(|ext| clean.ends_with(ext)) {
                let pat = DynamicPattern {
                    dir_prefix: None,
                    stem_exact: None,
                    stem_prefix: None,
                    stem_suffix: None,
                    extension: None,
                    glob_pattern: Some(clean.to_string()),
                };
                if !patterns.contains(&pat) {
                    patterns.push(pat);
                }
            }
        }
    }

    // Support Spring Boot `classpath:static/.../*.svg` or `classpath*:...`
    if line.contains("classpath:") || line.contains("classpath*:") {
        for token in &tokens {
            if let Some(pos) = token.find("classpath:") {
                let after_cp = &token[pos + "classpath:".len()..];
                let pat = DynamicPattern {
                    dir_prefix: None,
                    stem_exact: None,
                    stem_prefix: None,
                    stem_suffix: None,
                    extension: None,
                    glob_pattern: Some(after_cp.to_string()),
                };
                if !patterns.contains(&pat) {
                    patterns.push(pat);
                }
            } else if let Some(pos) = token.find("classpath*:") {
                let after_cp = &token[pos + "classpath*:".len()..];
                let pat = DynamicPattern {
                    dir_prefix: None,
                    stem_exact: None,
                    stem_prefix: None,
                    stem_suffix: None,
                    extension: None,
                    glob_pattern: Some(after_cp.to_string()),
                };
                if !patterns.contains(&pat) {
                    patterns.push(pat);
                }
            }
        }
    }

    // Support Flutter pubspec.yaml asset directory declarations: `- assets/icons/`
    if relative_source.ends_with("pubspec.yaml") {
        let trimmed = line.trim();
        if let Some(stripped) = trimmed.strip_prefix("- ") {
            let entry = stripped.trim().trim_matches(['"', '\'', '`']);
            if entry.ends_with('/') || entry.contains('/') {
                let clean = entry.trim_matches(['/', '.']);
                if !clean.is_empty() {
                    let pat = DynamicPattern {
                        dir_prefix: Some(clean.to_string()),
                        stem_exact: None,
                        stem_prefix: None,
                        stem_suffix: None,
                        extension: None,
                        glob_pattern: None,
                    };
                    if !patterns.contains(&pat) {
                        patterns.push(pat);
                    }
                }
            }
        }
    }

    patterns
}

/// Extracts all dynamic asset template patterns from a source code line.
/// Backward-compatible wrapper calling `extract_dynamic_patterns_with_context`.
#[allow(dead_code)]
pub(crate) fn extract_dynamic_patterns(line: &str) -> Vec<DynamicPattern> {
    extract_dynamic_patterns_with_context(line, &std::collections::HashMap::new(), "")
}

/// Evaluates whether an indexed asset satisfies a dynamic reference pattern.
pub(crate) fn asset_matches_dynamic_pattern(
    asset_name: &str,
    asset_stem: &str,
    asset_relative_path: &str,
    asset_path: &str,
    source_path: &std::path::Path,
    pattern: &DynamicPattern,
) -> bool {
    let asset_name_lower = asset_name.to_lowercase();
    let asset_stem_lower = asset_stem.to_lowercase();
    let rel_lower = asset_relative_path.to_lowercase().replace('\\', "/");
    let path_lower = asset_path.to_lowercase().replace('\\', "/");

    // 0. Glob pattern check (e.g. import.meta.glob or Spring classpath:)
    if let Some(ref glob_pat) = pattern.glob_pattern {
        return matches_glob(glob_pat, source_path, &path_lower, &rel_lower);
    }

    // 1. Extension must match if specified
    if let Some(ref ext) = pattern.extension {
        let expected_ext = format!(".{}", ext.to_lowercase());
        if !asset_name_lower.ends_with(&expected_ext) {
            return false;
        }
    }

    // 2. Exact stem check if present (e.g. `$_imagePath/foo.png`)
    if let Some(ref exact) = pattern.stem_exact {
        if !asset_stem_lower.eq_ignore_ascii_case(exact) {
            return false;
        }
    }

    // 3. Directory prefix check if present
    if let Some(ref dir) = pattern.dir_prefix {
        let dir_lower = dir.to_lowercase().replace('\\', "/");
        let dir_trimmed = dir_lower.trim_matches(['/', '.']);

        let matches_dir = rel_lower.contains(&format!("{}/", dir_trimmed))
            || rel_lower.starts_with(dir_trimmed)
            || path_lower.contains(&format!("{}/", dir_trimmed))
            || asset_matches_path_token(asset_path, source_path, dir);

        if !matches_dir {
            return false;
        }
    } else if pattern.extension.is_none()
        && pattern.stem_exact.is_none()
        && pattern.stem_prefix.is_none()
        && pattern.stem_suffix.is_none()
        && pattern.glob_pattern.is_none()
    {
        return false;
    }

    // 4. Stem prefix check if present
    if let Some(ref sp) = pattern.stem_prefix {
        if !asset_stem_lower.starts_with(&sp.to_lowercase()) {
            return false;
        }
    }

    // 5. Stem suffix check if present
    if let Some(ref ss) = pattern.stem_suffix {
        if !asset_stem_lower.ends_with(&ss.to_lowercase()) {
            return false;
        }
    }

    true
}

/// Checks whether a character range in `text` is bounded by word boundaries.
pub fn is_word_boundary(text: &str, start: usize, end: usize) -> bool {
    let bytes = text.as_bytes();
    let before_ok = if start == 0 {
        true
    } else {
        let b = bytes[start - 1];
        !b.is_ascii_alphanumeric() && b != b'_' && b != b'$'
    };
    let after_ok = if end >= bytes.len() {
        true
    } else {
        let b = bytes[end];
        !b.is_ascii_alphanumeric() && b != b'_' && b != b'$'
    };
    before_ok && after_ok
}

/// Extracts an exported symbol identifier from a source line if the line is an export declaration.
/// Supports `export const/let/var x = ...`, `export { default as x }`, `export { x }`,
/// `exports.x = ...`, and `module.exports.x = ...`.
pub fn extract_exported_identifier(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if let Some(rest) = trimmed
        .strip_prefix("export const ")
        .or_else(|| trimmed.strip_prefix("export let "))
        .or_else(|| trimmed.strip_prefix("export var "))
    {
        let id: String = rest
            .chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
            .collect();
        if !id.is_empty() {
            return Some(id);
        }
    }
    if let Some(rest) = trimmed.strip_prefix("exports.") {
        let id: String = rest
            .chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
            .collect();
        if !id.is_empty() {
            return Some(id);
        }
    }
    if let Some(rest) = trimmed.strip_prefix("module.exports.") {
        let id: String = rest
            .chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
            .collect();
        if !id.is_empty() {
            return Some(id);
        }
    }
    if trimmed.starts_with("export {") {
        if let Some(as_pos) = trimmed.find(" as ") {
            let after_as = trimmed[as_pos + 4..].trim_start();
            let id: String = after_as
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
                .collect();
            if !id.is_empty() {
                return Some(id);
            }
        } else if let Some(open) = trimmed.find('{') {
            if let Some(close) = trimmed.find('}') {
                let inside = trimmed[open + 1..close].trim();
                let id: String = inside
                    .chars()
                    .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
                    .collect();
                if !id.is_empty() {
                    return Some(id);
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lua_long_comment_openers() {
        assert_eq!(lua_long_comment("--[[ x"), Some((4, "]]".to_string())));
        assert_eq!(lua_long_comment("--[==[ x"), Some((6, "]==]".to_string())));
        assert_eq!(lua_long_comment("--[= not an opener"), None);
        assert_eq!(lua_long_comment("-- plain"), None);
    }

    #[test]
    fn css_rules_starting_with_hash_or_star_are_not_comments() {
        assert!(!is_line_comment_or_url(
            "#hero { background: url(hero.png) }",
            "css"
        ));
        assert!(!is_line_comment_or_url(
            "* { background: url(bg.png) }",
            "css"
        ));
        assert!(is_line_comment_or_url("# logo.png is unused", "py"));
        assert!(is_line_comment_or_url("# logo.png is unused", "gd"));
        assert!(is_line_comment_or_url("// logo.png", "ts"));
        assert!(is_line_comment_or_url("-- local i = 'logo.png'", "luau"));
        assert!(!is_line_comment_or_url("--logo: url(logo.png);", "css"));
        assert!(is_line_comment_or_url("<!-- logo.png -->", "html"));
    }

    #[test]
    fn unity_resources_load_matches_asset_without_extension() {
        let src = std::path::Path::new("Assets/Scripts/Ui.cs");
        assert!(asset_matches_path_token(
            "Assets/Resources/UI/hero.png",
            src,
            "UI/hero"
        ));
        assert!(!asset_matches_path_token(
            "Assets/Resources/UI/other.png",
            src,
            "UI/hero"
        ));
        assert!(is_valid_stem_reference(
            "var s = resources.load<sprite>(\"ui/hero\");",
            "hero"
        ));
    }

    #[test]
    fn godot_res_path_matches_asset() {
        let src = std::path::Path::new("scenes/main.tscn");
        assert!(asset_matches_path_token(
            "assets/ui/icon.png",
            src,
            "res://assets/ui/icon.png"
        ));
        assert!(!asset_matches_path_token(
            "assets/ui/other.png",
            src,
            "res://assets/ui/icon.png"
        ));
        assert!(is_source_file_extension("tscn") && is_source_file_extension("luau"));
    }

    #[test]
    fn android_resource_refs_match_by_stem_and_folder() {
        let src = std::path::Path::new("app/src/main/res/layout/a.xml");
        assert!(asset_matches_path_token(
            "app/src/main/res/drawable-hdpi/logo.png",
            src,
            "@drawable/logo"
        ));
        assert!(!asset_matches_path_token(
            "app/src/main/res/drawable-hdpi/other.png",
            src,
            "@drawable/logo"
        ));
        assert!(is_valid_stem_reference(
            "painterresource(r.drawable.logo)",
            "logo"
        ));
        assert!(is_valid_stem_reference(
            "android:src=\"@mipmap/logo\"",
            "logo"
        ));
    }

    #[test]
    fn ios_image_refs_need_quoted_stem() {
        assert!(is_valid_stem_reference("image(\"logo\")", "logo"));
        assert!(is_valid_stem_reference("uiimage(named: \"logo\")", "logo"));
        assert!(!is_valid_stem_reference("let logo = 1", "logo"));
    }

    #[test]
    fn roblox_waitforchild_is_stem_reference() {
        assert!(is_valid_stem_reference(
            "local i = gui:waitforchild(\"coin\")",
            "coin"
        ));
    }

    #[test]
    fn test_extract_path_token() {
        let line = r#"import icon from "./icons/logo.png";"#;
        let match_start = line.find("logo.png").unwrap();
        let match_end = match_start + "logo.png".len();
        let token = extract_path_token(line, match_start, match_end);
        assert_eq!(token, Some("./icons/logo.png"));
    }

    #[test]
    fn test_extract_quoted_tokens() {
        let line = r#"import icon from "../public/icon.png"; const alt = './alt.svg';"#;
        let tokens = extract_quoted_tokens(line);
        assert_eq!(tokens, vec!["../public/icon.png", "./alt.svg"]);
    }

    #[test]
    fn test_extract_dynamic_patterns_template_literal() {
        let line = r#"const img = `/characters/${c.id}.webp`;"#;
        let patterns = extract_dynamic_patterns(line);
        assert_eq!(patterns.len(), 1);
        assert_eq!(
            patterns[0],
            DynamicPattern {
                dir_prefix: Some("characters".to_string()),
                stem_exact: None,
                stem_prefix: None,
                stem_suffix: None,
                extension: Some("webp".to_string()),
                glob_pattern: None,
            }
        );
    }

    #[test]
    fn test_extract_dynamic_patterns_bare_interpolation() {
        let line = r#"const img = `${c.id}.webp`;"#;
        let patterns = extract_dynamic_patterns(line);
        assert_eq!(patterns.len(), 1);
        assert_eq!(
            patterns[0],
            DynamicPattern {
                dir_prefix: None,
                stem_exact: None,
                stem_prefix: None,
                stem_suffix: None,
                extension: Some("webp".to_string()),
                glob_pattern: None,
            }
        );
    }

    #[test]
    fn test_extract_dynamic_patterns_stem_prefix_and_suffix() {
        let line = r#"const icon = `./icons/btn-${type}_active.png`;"#;
        let patterns = extract_dynamic_patterns(line);
        assert_eq!(patterns.len(), 1);
        assert_eq!(
            patterns[0],
            DynamicPattern {
                dir_prefix: Some("icons".to_string()),
                stem_exact: None,
                stem_prefix: Some("btn-".to_string()),
                stem_suffix: Some("_active".to_string()),
                extension: Some("png".to_string()),
                glob_pattern: None,
            }
        );
    }

    #[test]
    fn test_extract_dynamic_patterns_concatenation() {
        let line = r#"const img = '/characters/' + c.id + '.webp';"#;
        let patterns = extract_dynamic_patterns(line);
        assert_eq!(patterns.len(), 1);
        assert_eq!(
            patterns[0],
            DynamicPattern {
                dir_prefix: Some("characters".to_string()),
                stem_exact: None,
                stem_prefix: None,
                stem_suffix: None,
                extension: Some("webp".to_string()),
                glob_pattern: None,
            }
        );
    }

    #[test]
    fn test_extract_dynamic_patterns_dart_interpolations() {
        // Dart multi-scope interpolation (Monekin)
        let line1 = r#"final path = 'assets/icons/supported_selectable_icons/$scope/$id.svg';"#;
        let patterns1 = extract_dynamic_patterns(line1);
        assert_eq!(patterns1.len(), 1);
        assert_eq!(
            patterns1[0],
            DynamicPattern {
                dir_prefix: Some("assets/icons/supported_selectable_icons".to_string()),
                stem_exact: None,
                stem_prefix: None,
                stem_suffix: None,
                extension: Some("svg".to_string()),
                glob_pattern: None,
            }
        );

        // Dart avatars
        let line2 = r#"final avatarPath = 'assets/icons/avatars/$avatar.svg';"#;
        let patterns2 = extract_dynamic_patterns(line2);
        assert_eq!(patterns2.len(), 1);
        assert_eq!(
            patterns2[0].dir_prefix,
            Some("assets/icons/avatars".to_string())
        );
        assert_eq!(patterns2[0].extension, Some("svg".to_string()));

        // Dart constant variable prefix (Hacki)
        let mut vars = std::collections::HashMap::new();
        vars.insert("_imagePath".to_string(), "assets/images".to_string());
        let line3 = r#"final img = '$_imagePath/foo.png';"#;
        let patterns3 = extract_dynamic_patterns_with_context(line3, &vars, "lib/constants.dart");
        assert_eq!(patterns3.len(), 1);
        assert_eq!(patterns3[0].dir_prefix, Some("assets/images".to_string()));
        assert_eq!(patterns3[0].stem_exact, Some("foo".to_string()));
        assert_eq!(patterns3[0].extension, Some("png".to_string()));
    }

    #[test]
    fn test_extract_dynamic_patterns_js_concatenation_with_var() {
        let mut vars = std::collections::HashMap::new();
        vars.insert("dir".to_string(), "assets/images/gallery/".to_string());
        let line = r#"photos.push({ src: dir + i + '.jpg' });"#;
        let patterns = extract_dynamic_patterns_with_context(line, &vars, "gallery.ts");
        assert_eq!(patterns.len(), 1);
        assert_eq!(
            patterns[0],
            DynamicPattern {
                dir_prefix: Some("assets/images/gallery".to_string()),
                stem_exact: None,
                stem_prefix: None,
                stem_suffix: None,
                extension: Some("jpg".to_string()),
                glob_pattern: None,
            }
        );
    }

    #[test]
    fn test_extract_dynamic_patterns_template_literal_no_extension() {
        let line = r#"const p = `/assets/projects/${slug}/${image}`;"#;
        let patterns = extract_dynamic_patterns(line);
        assert_eq!(patterns.len(), 1);
        assert_eq!(patterns[0].dir_prefix, Some("assets/projects".to_string()));
        assert_eq!(patterns[0].extension, None);
    }

    #[test]
    fn test_extract_dynamic_patterns_import_meta_glob_and_classpath() {
        // import.meta.glob with query
        let line_glob = r#"const stickers = import.meta.glob('../stickers/*.svg', { eager: true, as: 'url' });"#;
        let patterns_glob = extract_dynamic_patterns(line_glob);
        assert_eq!(patterns_glob.len(), 1);
        assert_eq!(
            patterns_glob[0].glob_pattern,
            Some("../stickers/*.svg".to_string())
        );

        // Spring Boot classpath in SQL migration
        let line_cp =
            r#"INSERT INTO icons (path) VALUES ('classpath:static/images/icons/svg/*.svg');"#;
        let patterns_cp = extract_dynamic_patterns(line_cp);
        assert_eq!(patterns_cp.len(), 1);
        assert_eq!(
            patterns_cp[0].glob_pattern,
            Some("static/images/icons/svg/*.svg".to_string())
        );

        // Flutter pubspec.yaml assets directory declaration
        let line_pubspec = r#"    - assets/icons/supported_selectable_icons/"#;
        let patterns_pub = extract_dynamic_patterns_with_context(
            line_pubspec,
            &std::collections::HashMap::new(),
            "pubspec.yaml",
        );
        assert_eq!(patterns_pub.len(), 1);
        assert_eq!(
            patterns_pub[0].dir_prefix,
            Some("assets/icons/supported_selectable_icons".to_string())
        );
    }

    #[test]
    fn test_asset_matches_dynamic_pattern() {
        let pat = DynamicPattern {
            dir_prefix: Some("characters".to_string()),
            stem_exact: None,
            stem_prefix: None,
            stem_suffix: None,
            extension: Some("webp".to_string()),
            glob_pattern: None,
        };
        let src_path = std::path::Path::new("/workspace/src/App.tsx");

        assert!(asset_matches_dynamic_pattern(
            "alchemist.webp",
            "alchemist",
            "public/characters/alchemist.webp",
            "/workspace/public/characters/alchemist.webp",
            src_path,
            &pat,
        ));

        // Different extension
        assert!(!asset_matches_dynamic_pattern(
            "alchemist.png",
            "alchemist",
            "public/characters/alchemist.png",
            "/workspace/public/characters/alchemist.png",
            src_path,
            &pat,
        ));

        // Different directory
        assert!(!asset_matches_dynamic_pattern(
            "alchemist.webp",
            "alchemist",
            "public/monsters/alchemist.webp",
            "/workspace/public/monsters/alchemist.webp",
            src_path,
            &pat,
        ));
    }
}
