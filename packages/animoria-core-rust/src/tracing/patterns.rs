use crate::scanner::walker::RECOGNIZED_EXTENSIONS;

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
];

pub fn is_source_file_extension(ext: &str) -> bool {
    SOURCE_EXTENSIONS.contains(&ext.to_lowercase().as_str())
}

/// Languages where a leading `#` starts a comment. In CSS/SCSS/HTML a leading `#` is an id
/// selector (`#hero { background: url(hero.png) }`), which is a real reference.
const HASH_COMMENT_EXTENSIONS: &[&str] = &["py", "rb", "toml", "yml", "yaml", "gd", "sh"];

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
    // Only Lua/Luau: in CSS a leading `--` is a custom property (`--logo: url(logo.png)`).
    (trimmed.starts_with("--") && matches!(ext, "lua" | "luau"))
        || trimmed.starts_with("//")
        || trimmed.starts_with("/*")
        || trimmed.starts_with("<!--")
        || (trimmed.starts_with('#') && HASH_COMMENT_EXTENSIONS.contains(&ext))
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

        // 6. Path / import reference: './stem', '../stem', '/stem.'
        if before.ends_with("./")
            || before.ends_with("../")
            || (before.ends_with('/') && after.starts_with('.'))
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

pub fn is_valid_exact_filename_reference(line_lower: &str, filename_lower: &str) -> bool {
    // Filename must appear inside quotes, import specifier, or path delimiter
    for (pos, _) in line_lower.match_indices(filename_lower) {
        let before = &line_lower[..pos];
        let after = &line_lower[pos + filename_lower.len()..];

        let before_quote = before.ends_with('"') || before.ends_with('\'') || before.ends_with('`');
        let after_quote =
            after.starts_with('"') || after.starts_with('\'') || after.starts_with('`');

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

    // Expand forwards until quote, whitespace, comma, paren, semicolon, etc.
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
    // Godot's `res://` is the project root, so the rest is a workspace-relative suffix.
    let clean_token = token.replace('\\', "/");
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
        let asset_p = std::path::Path::new(&asset_clean);
        return asset_p.file_stem().and_then(|s| s.to_str()) == Some(name)
            && asset_p
                .components()
                .any(|c| c.as_os_str().to_string_lossy().starts_with(kind));
    }
    let clean_suffix = clean_token.trim_start_matches(['.', '/']);
    let asset_p = std::path::Path::new(&asset_clean);

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
            if norm_str == asset_clean {
                return true;
            }
            if !clean_suffix.contains('/') {
                // e.g. "./icon.png": must reside in target directory
                return normalized.parent() == asset_p.parent()
                    && asset_clean.ends_with(clean_suffix);
            } else {
                return asset_clean.ends_with(clean_suffix);
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

/// Represents a parsed dynamic reference pattern extracted from an interpolated
/// string (e.g. `${c.id}.webp`, `/characters/${c.id}.webp`, or `'icons/' + id + '.png'`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DynamicPattern {
    pub dir_prefix: Option<String>,
    pub stem_prefix: Option<String>,
    pub stem_suffix: Option<String>,
    pub extension: String,
}

fn parse_dynamic_pattern_from_token(token: &str) -> Option<DynamicPattern> {
    let is_interpolation = token.contains("${")
        || token.contains("\\(")
        || token.contains("#{")
        || token.contains("{$")
        || (token.contains('{') && token.contains('}'));

    if !is_interpolation {
        return None;
    }

    let last_dot = token.rfind('.')?;
    let ext_str = &token[last_dot + 1..];
    let ext_lower = ext_str
        .trim_matches(['"', '\'', '`', '}', ')', ';', ',', ' '])
        .to_lowercase();

    if !RECOGNIZED_EXTENSIONS.contains(&ext_lower.as_str()) {
        return None;
    }

    let start_marker = token
        .find("${")
        .or_else(|| token.find("\\("))
        .or_else(|| token.find("#{"))
        .or_else(|| token.find("{$"))
        .or_else(|| token.find('{'))?;

    let end_marker = token[..last_dot]
        .rfind('}')
        .or_else(|| token[..last_dot].rfind(')'))
        .map(|pos| pos + 1)?;

    if start_marker >= end_marker || end_marker > last_dot {
        return None;
    }

    let before = &token[..start_marker];
    let (dir_prefix, stem_prefix) = if before.contains('/') {
        let last_slash = before.rfind('/').unwrap();
        let dir_part = &before[..last_slash];
        let clean_dir = dir_part.trim_matches(['/', '.', '`', '"', '\'']).trim();
        let dir = if clean_dir.is_empty() {
            None
        } else {
            Some(clean_dir.to_string())
        };

        let stem_prefix_part = before[last_slash + 1..].trim();
        let stem_pre = if stem_prefix_part.is_empty() {
            None
        } else {
            Some(stem_prefix_part.to_string())
        };
        (dir, stem_pre)
    } else {
        let clean_before = before.trim_matches(['`', '"', '\'']).trim();
        let stem_pre = if clean_before.is_empty() {
            None
        } else {
            Some(clean_before.to_string())
        };
        (None, stem_pre)
    };

    let suffix_part = token[end_marker..last_dot].trim();
    let stem_suffix = if suffix_part.is_empty() {
        None
    } else {
        Some(suffix_part.to_string())
    };

    Some(DynamicPattern {
        dir_prefix,
        stem_prefix,
        stem_suffix,
        extension: ext_lower,
    })
}

/// Extracts all dynamic asset template patterns from a source code line.
///
/// Detects JavaScript/TypeScript/Kotlin template literals (`` `${c.id}.webp` ``),
/// Swift interpolations (`"\(id).png"`), and dynamic concatenations (`'/characters/' + id + '.webp'`).
pub fn extract_dynamic_patterns(line: &str) -> Vec<DynamicPattern> {
    let mut patterns = Vec::new();
    let tokens = extract_quoted_tokens(line);

    for token in &tokens {
        if let Some(pat) = parse_dynamic_pattern_from_token(token) {
            if !patterns.contains(&pat) {
                patterns.push(pat);
            }
        }
    }

    // Also support string concatenation (e.g. '/characters/' + c.id + '.webp')
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

        if let (Some(dir), Some(ext)) = (dir_prefix, target_ext) {
            let pat = DynamicPattern {
                dir_prefix: Some(dir),
                stem_prefix: None,
                stem_suffix: None,
                extension: ext,
            };
            if !patterns.contains(&pat) {
                patterns.push(pat);
            }
        }
    }

    patterns
}

/// Evaluates whether an indexed asset satisfies a dynamic reference pattern.
pub fn asset_matches_dynamic_pattern(
    asset_name: &str,
    asset_stem: &str,
    asset_relative_path: &str,
    asset_path: &str,
    source_path: &std::path::Path,
    pattern: &DynamicPattern,
) -> bool {
    // 1. Extension must match
    if !asset_name
        .to_lowercase()
        .ends_with(&format!(".{}", pattern.extension.to_lowercase()))
    {
        return false;
    }

    // 2. Directory prefix check if present
    if let Some(ref dir) = pattern.dir_prefix {
        let dir_lower = dir.to_lowercase();
        let rel_lower = asset_relative_path.to_lowercase();
        let path_lower = asset_path.to_lowercase();

        let matches_dir = rel_lower.contains(&format!("{}/", dir_lower))
            || rel_lower.starts_with(&dir_lower)
            || rel_lower.contains(&dir_lower)
            || path_lower.contains(&format!("{}/", dir_lower))
            || asset_matches_path_token(asset_path, source_path, dir);

        if !matches_dir {
            return false;
        }
    }

    // 3. Stem prefix check if present
    if let Some(ref sp) = pattern.stem_prefix {
        if !asset_stem.to_lowercase().starts_with(&sp.to_lowercase()) {
            return false;
        }
    }

    // 4. Stem suffix check if present
    if let Some(ref ss) = pattern.stem_suffix {
        if !asset_stem.to_lowercase().ends_with(&ss.to_lowercase()) {
            return false;
        }
    }

    true
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
                stem_prefix: None,
                stem_suffix: None,
                extension: "webp".to_string(),
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
                stem_prefix: None,
                stem_suffix: None,
                extension: "webp".to_string(),
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
                stem_prefix: Some("btn-".to_string()),
                stem_suffix: Some("_active".to_string()),
                extension: "png".to_string(),
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
                stem_prefix: None,
                stem_suffix: None,
                extension: "webp".to_string(),
            }
        );
    }

    #[test]
    fn test_asset_matches_dynamic_pattern() {
        let pat = DynamicPattern {
            dir_prefix: Some("characters".to_string()),
            stem_prefix: None,
            stem_suffix: None,
            extension: "webp".to_string(),
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
