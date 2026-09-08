use crate::cli::ui::{accent, brand, success, title, warning};
use std::fs;
use std::path::Path;

pub fn execute_init(target_path: &Path, force: bool) -> anyhow::Result<i32> {
    let canonical = fs::canonicalize(target_path).unwrap_or_else(|_| target_path.to_path_buf());
    let config_path = canonical.join(".animoriarc.json");
    let ignore_path = canonical.join(".animoriaignore");

    println!(
        "\n{} {}\n",
        brand("animoria"),
        title("Initialize Workspace Configuration")
    );

    if config_path.is_file() && !force {
        println!(
            "  {} {} (Use --force to overwrite)",
            warning("▲"),
            warning(".animoriarc.json already exists.")
        );
    } else {
        let default_config = serde_json::json!({
            "$schema": "https://animoria.dev/schema/animoriarc.json",
            "rules": {
                "no-duplicate-content": "error",
                "no-unreferenced-assets": "warning",
                "max-file-size-kb": ["warning", 512],
                "no-gif": "off"
            }
        });
        fs::write(
            &config_path,
            serde_json::to_string_pretty(&default_config)? + "\n",
        )?;
        println!("  {} Created {}", success("✔"), success(".animoriarc.json"));
    }

    if ignore_path.is_file() && !force {
        println!(
            "  {} {}",
            warning("▲"),
            warning(".animoriaignore already exists.")
        );
    } else {
        let default_ignore = "# Animoria Asset Governance Ignore Rules\nnode_modules/\ndist/\nbuild/\ncoverage/\n.turbo/\n.cache/\n";
        fs::write(&ignore_path, default_ignore)?;
        println!("  {} Created {}", success("✔"), success(".animoriaignore"));
    }

    let gitignore_path = canonical.join(".gitignore");
    if gitignore_path.is_file() {
        if let Ok(content) = fs::read_to_string(&gitignore_path) {
            let already_ignored = content.lines().any(|l| {
                let trimmed = l.trim();
                trimmed == ".animoria"
                    || trimmed == ".animoria/"
                    || trimmed == "/.animoria"
                    || trimmed == "/.animoria/"
                    || trimmed == "**/.animoria"
                    || trimmed == "**/.animoria/**"
            });
            if !already_ignored {
                let entry = if content.ends_with('\n') || content.is_empty() {
                    "\n# Animoria cache & staged cleanup\n.animoria/\n"
                } else {
                    "\n\n# Animoria cache & staged cleanup\n.animoria/\n"
                };
                if let Ok(mut file) = fs::OpenOptions::new().append(true).open(&gitignore_path) {
                    use std::io::Write;
                    let _ = write!(file, "{}", entry);
                    println!(
                        "  {} Updated {} (added .animoria/)",
                        success("✔"),
                        success(".gitignore")
                    );
                }
            }
        }
    }

    println!(
        "\n  {} Run {} to audit visual assets.\n",
        success("Workspace initialized successfully!"),
        accent("animoria check")
    );

    Ok(0)
}
