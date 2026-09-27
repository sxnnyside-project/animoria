pub const SOURCE_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte", "astro", "kt", "kts", "java", "swift",
    "dart", "html", "htm", "css", "scss", "sass", "less", "md", "mdx", "json", "xml", "yml",
    "yaml",
];

pub fn is_source_file_extension(ext: &str) -> bool {
    SOURCE_EXTENSIONS.contains(&ext.to_lowercase().as_str())
}

pub fn is_line_comment_or_url(line: &str) -> bool {
    let trimmed = line.trim();
    // Line comments
    if trimmed.starts_with("//")
        || trimmed.starts_with('#')
        || trimmed.starts_with("/*")
        || trimmed.starts_with('*')
        || trimmed.starts_with("<!--")
    {
        return true;
    }

    false
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
    // 1. Android R.raw.<stem>
    if line_lower.contains(&format!("r.raw.{stem_lower}")) {
        return true;
    }
    // 2. Android setAnimation("stem") / setAnimation('stem')
    if line_lower.contains("setanimation(") && line_lower.contains(stem_lower) {
        return true;
    }
    // 3. React / React Native: source={require('./stem')} or require('.../stem')
    if (line_lower.contains("source=") || line_lower.contains("require("))
        && (line_lower.contains(&format!("/{stem_lower}"))
            || line_lower.contains(&format!(".{stem_lower}")))
    {
        return true;
    }
    // 4. Flutter / Lottie SDK: Lottie.asset('...stem...'), LottieBuilder
    if (line_lower.contains("lottie.") || line_lower.contains("lottiebuilder."))
        && line_lower.contains(stem_lower)
    {
        return true;
    }
    // 5. iOS / SwiftUI: LottieAnimationView(name: "stem"), AnimationView(name: "stem"), LottieAnimation.named("stem")
    if (line_lower.contains("lottieanimationview")
        || line_lower.contains("animationview")
        || line_lower.contains("lottieanimation.named"))
        && line_lower.contains(stem_lower)
    {
        return true;
    }
    // 6. Path / import reference: './stem', '../stem', '/stem.'
    if line_lower.contains(&format!("/{stem_lower}."))
        || line_lower.contains(&format!("./{stem_lower}"))
        || line_lower.contains(&format!("../{stem_lower}"))
        || line_lower.contains(&format!("\"{stem_lower}.json\""))
        || line_lower.contains(&format!("'{stem_lower}.json'"))
        || line_lower.contains(&format!("`{stem_lower}.json`"))
    {
        return true;
    }

    false
}

pub fn is_valid_exact_filename_reference(line_lower: &str, filename_lower: &str) -> bool {
    // Filename must appear inside quotes, import specifier, or path delimiter
    line_lower.contains(&format!("\"{filename_lower}\""))
        || line_lower.contains(&format!("'{filename_lower}'"))
        || line_lower.contains(&format!("`{filename_lower}`"))
        || line_lower.contains(&format!("/{filename_lower}"))
        || line_lower.contains(&format!("from '{filename_lower}'"))
        || line_lower.contains(&format!("from \"{filename_lower}\""))
        || line_lower.contains(&format!("require('{filename_lower}')"))
        || line_lower.contains(&format!("require(\"{filename_lower}\")"))
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
                tokens.push(&line[start..j]);
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
    let clean_suffix = token.trim_start_matches(['.', '/']);
    let asset_p = std::path::Path::new(asset_path);

    if token.starts_with("./") || token.starts_with("../") {
        if let Some(parent) = source_path.parent() {
            let resolved = parent.join(token);
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
            let norm_str = normalized.to_string_lossy();
            if norm_str == asset_path {
                return true;
            }
            if !clean_suffix.contains('/') {
                // e.g. "./icon.png": must reside in target directory
                return normalized.parent() == asset_p.parent() && asset_p.ends_with(clean_suffix);
            } else {
                return asset_p.ends_with(clean_suffix);
            }
        }
    } else {
        let trimmed = token.trim_start_matches('/');
        return asset_path.ends_with(trimmed);
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
