use crate::contracts::asset::AssetFormat;
use std::io::IsTerminal;
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};

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

/// Set once from `--no-color` at startup. `colors_enabled` also checks
/// `NO_COLOR` and whether stdout is a terminal on every call — this flag only
/// covers the case neither of those can: the user asking explicitly, even on
/// a terminal, with `NO_COLOR` unset.
static FORCE_NO_COLOR: AtomicBool = AtomicBool::new(false);
static QUIET: AtomicBool = AtomicBool::new(false);
static VERBOSITY: AtomicU8 = AtomicU8::new(0);

pub fn configure(no_color: bool, quiet: bool, verbosity: u8) {
    FORCE_NO_COLOR.store(no_color, Ordering::Relaxed);
    QUIET.store(quiet, Ordering::Relaxed);
    VERBOSITY.store(verbosity, Ordering::Relaxed);
}

pub fn is_quiet() -> bool {
    QUIET.load(Ordering::Relaxed)
}

pub fn verbosity() -> u8 {
    VERBOSITY.load(Ordering::Relaxed)
}

/// Every color helper below used to wrap text in ANSI codes unconditionally,
/// so `NO_COLOR=1 animoria check .` and `animoria check . | cat` both still
/// printed raw escape sequences into whatever consumed the output. Piping to
/// a non-terminal is the same signal `NO_COLOR` is, so both are checked here
/// rather than only the explicit flag.
fn colors_enabled() -> bool {
    if FORCE_NO_COLOR.load(Ordering::Relaxed) {
        return false;
    }
    if std::env::var_os("NO_COLOR").is_some() {
        return false;
    }
    std::io::stdout().is_terminal()
}

fn colorize(code: &str, text: &str) -> String {
    if colors_enabled() {
        format!("{code}{text}{RESET}")
    } else {
        text.to_string()
    }
}

pub fn brand(text: &str) -> String {
    colorize(&format!("{BOLD}{CYAN}"), text)
}

pub fn title(text: &str) -> String {
    colorize(&format!("{BOLD}{WHITE}"), text)
}

pub fn dim(text: &str) -> String {
    colorize(DIM, text)
}

pub fn success(text: &str) -> String {
    colorize(GREEN, text)
}

pub fn warning(text: &str) -> String {
    colorize(YELLOW, text)
}

pub fn error(text: &str) -> String {
    colorize(RED, text)
}

pub fn accent(text: &str) -> String {
    colorize(CYAN, text)
}

/// `BOLD`/`RESET` used directly in a `println!` (rather than through one of
/// the helpers above) so callers can build up a styled line piece by piece.
/// Those still need to disappear under `NO_COLOR`/a non-terminal, so callers
/// needing that should prefer the helpers; this pair is exported as
/// empty-string stand-ins when colors are off.
pub fn bold_start() -> &'static str {
    if colors_enabled() {
        BOLD
    } else {
        ""
    }
}

pub fn reset() -> &'static str {
    if colors_enabled() {
        RESET
    } else {
        ""
    }
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
        AssetFormat::Lottie => colorize(MAGENTA, "[Lottie]"),
        AssetFormat::DotLottie => colorize(MAGENTA, "[dotLottie]"),
        AssetFormat::Rive => colorize(CYAN, "[Rive]"),
        AssetFormat::AnimatedSvg => colorize(BLUE, "[AnimSVG]"),
        AssetFormat::Svg => colorize(BLUE, "[SVG]"),
        AssetFormat::Gif => colorize(YELLOW, "[GIF]"),
        AssetFormat::Apng => colorize(GREEN, "[APNG]"),
        AssetFormat::Png => colorize(GREEN, "[PNG]"),
        AssetFormat::Jpeg => colorize(YELLOW, "[JPEG]"),
        AssetFormat::Webp => colorize(CYAN, "[WebP]"),
        AssetFormat::Avif => colorize(MAGENTA, "[AVIF]"),
    }
}

pub fn grade_badge(grade: &str) -> String {
    let upper = grade.to_uppercase();
    let code = match upper.as_str() {
        "A" => format!("{BOLD}{GREEN}"),
        "B" => format!("{BOLD}{CYAN}"),
        "C" => format!("{BOLD}{YELLOW}"),
        "D" => format!("{BOLD}{MAGENTA}"),
        "F" => format!("{BOLD}{RED}"),
        _ => format!("{BOLD}{DIM}"),
    };
    colorize(&code, &format!(" Grade {upper} "))
}
