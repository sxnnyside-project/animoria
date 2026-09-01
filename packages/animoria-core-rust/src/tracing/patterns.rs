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
