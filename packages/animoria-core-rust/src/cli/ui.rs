use crate::contracts::asset::AssetFormat;

pub const RESET: &str = "\x1b[0m";
pub const BOLD: &str = "\x1b[1m";
pub const DIM: &str = "\x1b[2m";
pub const RED: &str = "\x1b[31m";
pub const GREEN: &str = "\x1b[32m";
pub const YELLOW: &str = "\x1b[33m";
pub const BLUE: &str = "\x1b[34m";
pub const MAGENTA: &str = "\x1b[35m";
pub const CYAN: &str = "\x1b[36m";
pub const WHITE: &str = "\x1b[37m";

pub fn brand(text: &str) -> String {
    format!("{BOLD}{CYAN}{text}{RESET}")
}

pub fn title(text: &str) -> String {
    format!("{BOLD}{WHITE}{text}{RESET}")
}

pub fn dim(text: &str) -> String {
    format!("{DIM}{text}{RESET}")
}

pub fn success(text: &str) -> String {
    format!("{GREEN}{text}{RESET}")
}

pub fn warning(text: &str) -> String {
    format!("{YELLOW}{text}{RESET}")
}

pub fn error(text: &str) -> String {
    format!("{RED}{text}{RESET}")
}

pub fn accent(text: &str) -> String {
    format!("{CYAN}{text}{RESET}")
}

pub fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }
    const K: f64 = 1024.0;
    let b = bytes as f64;
    if b < K {
        format!("{bytes} B")
    } else if b < K * K {
        format!("{:.1} KB", b / K)
    } else if b < K * K * K {
        format!("{:.1} MB", b / (K * K))
    } else {
        format!("{:.1} GB", b / (K * K * K))
    }
}

pub fn format_duration(secs: Option<f64>) -> String {
    match secs {
        Some(s) if s > 0.0 => {
            if s < 1.0 {
                format!("{}ms", (s * 1000.0).round() as u64)
            } else {
                format!("{s:.2}s")
            }
        }
        _ => "-".to_string(),
    }
}

pub fn format_badge(format: AssetFormat) -> String {
    match format {
        AssetFormat::Lottie => format!("{MAGENTA}[Lottie]{RESET}"),
        AssetFormat::DotLottie => format!("{MAGENTA}[dotLottie]{RESET}"),
        AssetFormat::Rive => format!("{CYAN}[Rive]{RESET}"),
        AssetFormat::AnimatedSvg => format!("{BLUE}[AnimSVG]{RESET}"),
        AssetFormat::Svg => format!("{BLUE}[SVG]{RESET}"),
        AssetFormat::Gif => format!("{YELLOW}[GIF]{RESET}"),
        AssetFormat::Apng => format!("{GREEN}[APNG]{RESET}"),
        AssetFormat::Png => format!("{GREEN}[PNG]{RESET}"),
        AssetFormat::Jpeg => format!("{YELLOW}[JPEG]{RESET}"),
        AssetFormat::Webp => format!("{CYAN}[WebP]{RESET}"),
        AssetFormat::Avif => format!("{MAGENTA}[AVIF]{RESET}"),
    }
}

pub fn grade_badge(grade: &str) -> String {
    match grade.to_uppercase().as_str() {
        "A" => format!("{BOLD}{GREEN} Grade A {RESET}"),
        "B" => format!("{BOLD}{CYAN} Grade B {RESET}"),
        "C" => format!("{BOLD}{YELLOW} Grade C {RESET}"),
        "D" => format!("{BOLD}{MAGENTA} Grade D {RESET}"),
        "F" => format!("{BOLD}{RED} Grade F {RESET}"),
        _ => format!("{BOLD}{DIM} Grade {grade} {RESET}"),
    }
}
