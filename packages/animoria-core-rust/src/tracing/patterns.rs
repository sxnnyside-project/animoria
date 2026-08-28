pub const SOURCE_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "vue", "svelte", "astro",
    "kt", "kts", "java",
    "swift", "dart",
    "html", "htm", "css", "scss", "sass", "less",
    "md", "mdx", "json", "xml", "yml", "yaml",
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
