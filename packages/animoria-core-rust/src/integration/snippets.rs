use std::path::Path;

use crate::contracts::asset::AssetFormat;
pub use crate::contracts::snippet::SnippetOption;

/// A JavaScript/TypeScript package manager, detected from the workspace's
/// lockfile rather than assumed — an install hint naming the wrong tool is
/// worse than none, since copying it verbatim mixes lockfiles.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackageManager {
    Npm,
    Pnpm,
    Yarn,
    Bun,
}

impl PackageManager {
    /// Inspects `workspace_root` for the lockfile each package manager
    /// leaves behind. Falls back to npm — not because it's assumed to be in
    /// use, but because `npm install` is the one command guaranteed to work
    /// with no prior setup.
    pub fn detect(workspace_root: &Path) -> Self {
        if workspace_root.join("bun.lockb").exists() || workspace_root.join("bun.lock").exists() {
            PackageManager::Bun
        } else if workspace_root.join("pnpm-lock.yaml").exists() {
            PackageManager::Pnpm
        } else if workspace_root.join("yarn.lock").exists() {
            PackageManager::Yarn
        } else {
            PackageManager::Npm
        }
    }

    fn install(self, package: &str) -> String {
        match self {
            PackageManager::Npm => format!("npm install {package}"),
            PackageManager::Pnpm => format!("pnpm add {package}"),
            PackageManager::Yarn => format!("yarn add {package}"),
            PackageManager::Bun => format!("bun add {package}"),
        }
    }
}

fn snippet(
    label: &str,
    language: &str,
    code: String,
    imports: Option<String>,
    install_hint: Option<String>,
) -> SnippetOption {
    SnippetOption {
        label: label.to_string(),
        language: language.to_string(),
        code,
        imports,
        install_hint,
    }
}

/// Converts a filename stem (`my-cool_animation`) into `myCoolAnimation`.
fn to_camel_case(stem: &str) -> String {
    let pascal = to_pascal_case(stem);
    let mut chars = pascal.chars();
    match chars.next() {
        Some(c) => c.to_lowercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

/// Converts a filename stem (`my-cool_animation`) into `MyCoolAnimation`.
fn to_pascal_case(stem: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = true;
    for ch in stem.chars() {
        if ch == '-' || ch == '_' || ch == '.' || ch.is_whitespace() {
            capitalize_next = true;
            continue;
        }
        if !(ch.is_ascii_alphanumeric() || ch == '$' || ch == '_') {
            continue;
        }
        if capitalize_next {
            result.extend(ch.to_uppercase());
            capitalize_next = false;
        } else {
            result.push(ch);
        }
    }
    result
}

/// Generates every applicable framework snippet for an asset.
///
/// `stem` is the asset's filename stem (no extension), `format` its detected
/// [`AssetFormat`], and `import_path` a best-effort relative path a snippet
/// can `import`/`require`/reference — callers resolve this against the
/// active editor or workspace root when that context is available, and fall
/// back to `./<filename>` otherwise.
pub fn generate_snippets_for_asset(
    stem: &str,
    format: AssetFormat,
    import_path: &str,
    pkg_manager: PackageManager,
) -> Vec<SnippetOption> {
    let var_name = to_camel_case(stem);
    let comp_name = to_pascal_case(stem);
    let npm = |package: &str| Some(pkg_manager.install(package));

    match format {
        AssetFormat::Lottie | AssetFormat::DotLottie => {
            let is_dotlottie = matches!(format, AssetFormat::DotLottie);
            let mut snippets = vec![
                snippet(
                    "React (lottie-react)",
                    "tsx",
                    format!(
                        "<Lottie\n  animationData={{{var_name}Data}}\n  loop={{true}}\n  autoplay={{true}}\n/>"
                    ),
                    Some(format!(
                        "import Lottie from 'lottie-react';\nimport {var_name}Data from '{import_path}';"
                    )),
                    npm("lottie-react"),
                ),
                snippet(
                    "React Native (lottie-react-native)",
                    "tsx",
                    format!(
                        "<LottieView\n  source={{{var_name}Data}}\n  autoPlay\n  loop\n  style={{{{ width: 200, height: 200 }}}}\n/>"
                    ),
                    Some(format!(
                        "import LottieView from 'lottie-react-native';\nimport {var_name}Data from '{import_path}';"
                    )),
                    npm("lottie-react-native"),
                ),
            ];

            if is_dotlottie {
                snippets.push(snippet(
                    "Astro / dotLottie Web Component",
                    "astro",
                    format!(
                        "<dotlottie-player\n  src=\"{import_path}\"\n  autoplay\n  loop\n  style=\"width: 250px; height: 250px;\"\n></dotlottie-player>"
                    ),
                    Some("import '@lottiefiles/dotlottie-wc';".to_string()),
                    npm("@lottiefiles/dotlottie-wc"),
                ));
            } else {
                snippets.push(snippet(
                    "Astro (lottie-web)",
                    "astro",
                    format!(
                        "<div id=\"lottie-{var_name}\" style=\"width: 250px; height: 250px;\"></div>\n<script>\n  import lottie from 'lottie-web';\n  import animationData from '{import_path}';\n  lottie.loadAnimation({{\n    container: document.getElementById('lottie-{var_name}')!,\n    renderer: 'svg',\n    loop: true,\n    autoplay: true,\n    animationData,\n  }});\n</script>"
                    ),
                    Some(format!(
                        "---\n// Astro Frontmatter\nimport {var_name}Data from '{import_path}';\n---"
                    )),
                    npm("lottie-web"),
                ));
            }

            snippets.push(snippet(
                "Vue 3 (vue3-lottie)",
                "vue",
                format!(
                    "<template>\n  <Vue3Lottie\n    :animationData=\"{var_name}Data\"\n    :loop=\"true\"\n    :autoPlay=\"true\"\n  />\n</template>"
                ),
                Some(format!(
                    "<script setup>\nimport Vue3Lottie from 'vue3-lottie';\nimport {var_name}Data from '{import_path}';\n</script>"
                )),
                npm("vue3-lottie"),
            ));

            snippets.push(snippet(
                "SwiftUI (Lottie)",
                "swift",
                format!(
                    "LottieView(animation: .named(\"{stem}\"))\n    .playbackMode(.playing(.toProgress(1, loopMode: .loop)))\n    .frame(width: 200, height: 200)"
                ),
                Some("import SwiftUI\nimport Lottie".to_string()),
                Some("Swift Package Manager: lottie-spm".to_string()),
            ));

            snippets.push(snippet(
                "Flutter (lottie)",
                "dart",
                format!(
                    "Lottie.asset(\n  '{}',\n  repeat: true,\n  animate: true,\n)",
                    import_path.trim_start_matches("./")
                ),
                Some("import 'package:lottie/lottie.dart';".to_string()),
                Some("flutter pub add lottie".to_string()),
            ));

            snippets.push(snippet(
                "Jetpack Compose (lottie-compose)",
                "kotlin",
                format!(
                    "@Composable\nfun {comp_name}Animation() {{\n    val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(R.raw.{var_name}))\n    LottieAnimation(composition = composition, iterations = Int.MAX_VALUE)\n}}"
                ),
                Some(
                    "import com.airbnb.lottie.compose.LottieAnimation\nimport com.airbnb.lottie.compose.LottieCompositionSpec\nimport com.airbnb.lottie.compose.rememberLottieComposition"
                        .to_string(),
                ),
                Some("implementation(\"com.airbnb.android:lottie-compose:6.4.0\")".to_string()),
            ));

            snippets
        }

        AssetFormat::Rive => vec![snippet(
            "React (@rive-app/react-canvas)",
            "tsx",
            format!(
                "const {{ RiveComponent }} = useRive({{\n  src: '{import_path}',\n  autoplay: true,\n}});\nreturn <RiveComponent style={{{{ width: 300, height: 300 }}}} />;"
            ),
            Some("import { useRive } from '@rive-app/react-canvas';".to_string()),
            npm("@rive-app/react-canvas"),
        )],

        // Static/raster formats: SVG, PNG, JPEG, WebP, AVIF, GIF, APNG.
        _ => vec![
            snippet(
                "React / Next.js Image",
                "tsx",
                format!("<img src={{{var_name}Img}} alt=\"{stem}\" loading=\"lazy\" />"),
                Some(format!("import {var_name}Img from '{import_path}';")),
                None,
            ),
            snippet(
                "React Native Image",
                "tsx",
                format!("<Image source={{{var_name}Img}} style={{{{ width: 100, height: 100 }}}} />"),
                Some(format!(
                    "import {{ Image }} from 'react-native';\nimport {var_name}Img from '{import_path}';"
                )),
                None,
            ),
            snippet(
                "HTML / Astro <img>",
                "html",
                format!("<img src=\"{import_path}\" alt=\"{stem}\" width=\"200\" height=\"200\" />"),
                None,
                None,
            ),
            snippet(
                "Vue 3 <img>",
                "vue",
                format!("<template>\n  <img :src=\"{var_name}Img\" alt=\"{stem}\" />\n</template>"),
                Some(format!(
                    "<script setup>\nimport {var_name}Img from '{import_path}';\n</script>"
                )),
                None,
            ),
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn to_camel_case_and_to_pascal_case_split_on_separators() {
        assert_eq!(to_camel_case("my-cool_animation"), "myCoolAnimation");
        assert_eq!(to_pascal_case("my-cool_animation"), "MyCoolAnimation");
        assert_eq!(to_camel_case("loading.spinner"), "loadingSpinner");
        assert_eq!(to_pascal_case(""), "");
    }

    #[test]
    fn package_manager_detects_from_lockfile_and_falls_back_to_npm() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(PackageManager::detect(dir.path()), PackageManager::Npm);

        std::fs::write(dir.path().join("pnpm-lock.yaml"), "").unwrap();
        assert_eq!(PackageManager::detect(dir.path()), PackageManager::Pnpm);
    }

    #[test]
    fn package_manager_install_uses_the_right_command() {
        assert_eq!(
            PackageManager::Npm.install("lottie-web"),
            "npm install lottie-web"
        );
        assert_eq!(
            PackageManager::Pnpm.install("lottie-web"),
            "pnpm add lottie-web"
        );
        assert_eq!(
            PackageManager::Yarn.install("lottie-web"),
            "yarn add lottie-web"
        );
        assert_eq!(
            PackageManager::Bun.install("lottie-web"),
            "bun add lottie-web"
        );
    }

    #[test]
    fn lottie_generates_web_component_snippet_only_for_dotlottie() {
        let lottie = generate_snippets_for_asset(
            "my-anim",
            AssetFormat::Lottie,
            "./my-anim.json",
            PackageManager::Npm,
        );
        assert!(!lottie
            .iter()
            .any(|s| s.label.contains("dotLottie Web Component")));
        assert!(lottie.iter().any(|s| s.label == "Astro (lottie-web)"));

        let dotlottie = generate_snippets_for_asset(
            "my-anim",
            AssetFormat::DotLottie,
            "./my-anim.lottie",
            PackageManager::Npm,
        );
        assert!(dotlottie
            .iter()
            .any(|s| s.label.contains("dotLottie Web Component")));
        assert!(!dotlottie.iter().any(|s| s.label == "Astro (lottie-web)"));
    }

    #[test]
    fn lottie_snippets_reference_the_camel_case_variable_and_import_path() {
        let snippets = generate_snippets_for_asset(
            "my-cool-anim",
            AssetFormat::Lottie,
            "./assets/my-cool-anim.json",
            PackageManager::Pnpm,
        );
        let react = snippets
            .iter()
            .find(|s| s.label == "React (lottie-react)")
            .expect("react snippet present");

        assert!(react.code.contains("myCoolAnimData"));
        assert!(react
            .imports
            .as_deref()
            .unwrap()
            .contains("./assets/my-cool-anim.json"));
        assert_eq!(react.install_hint.as_deref(), Some("pnpm add lottie-react"));
    }

    #[test]
    fn rive_generates_exactly_one_react_snippet() {
        let snippets = generate_snippets_for_asset(
            "loader",
            AssetFormat::Rive,
            "./loader.riv",
            PackageManager::Npm,
        );
        assert_eq!(snippets.len(), 1);
        assert_eq!(snippets[0].label, "React (@rive-app/react-canvas)");
        assert_eq!(
            snippets[0].install_hint.as_deref(),
            Some("npm install @rive-app/react-canvas")
        );
    }

    #[test]
    fn static_formats_generate_image_snippets_with_no_install_hint() {
        for format in [
            AssetFormat::Svg,
            AssetFormat::Png,
            AssetFormat::Jpeg,
            AssetFormat::Webp,
            AssetFormat::Avif,
            AssetFormat::Gif,
        ] {
            let snippets =
                generate_snippets_for_asset("icon", format, "./icon.png", PackageManager::Npm);
            assert_eq!(snippets.len(), 4, "format {format:?}");
            assert!(snippets.iter().all(|s| s.install_hint.is_none()));
            assert!(snippets.iter().any(|s| s.label == "HTML / Astro <img>"));
        }
    }
}
