use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(
    name = "animoria",
    author = "Sxnnyside Project <contact@sxnnyside.com>",
    version = env!("CARGO_PKG_VERSION"),
    about = "High-performance visual asset governance & quality engine",
    long_about = "Animoria discovers, audits, deduplicates, and traces visual assets across your codebase with sub-millisecond native speed.",
    after_help = "EXAMPLES:\n    animoria check .                    Audit the current directory, human-readable\n    animoria check . --json | jq .      Audit and pipe machine-readable output to jq\n    animoria check . --strict           Also fail (exit 2) on warnings, for CI gates\n    animoria clean .                    Preview what a cleanup would move (no changes made)\n    animoria clean . --apply            Actually stage duplicates into .animoria/trash\n    animoria restore . --list           List trash sessions recorded by --apply\n    animoria restore . --session <id>   Undo one recorded session"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,

    /// Disable ANSI colors in output, regardless of terminal detection
    #[arg(long, global = true)]
    pub no_color: bool,

    /// Suppress non-essential output (only the final result is printed)
    #[arg(short, long, global = true)]
    pub quiet: bool,

    /// Increase output detail (repeat for more, e.g. -vv)
    #[arg(short, long, global = true, action = clap::ArgAction::Count)]
    pub verbose: u8,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Discover and display visual asset inventory in the workspace
    #[command(after_help = "EXAMPLE:\n    animoria scan . --json | jq '.assets | length'")]
    Scan {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Output results as raw formatted JSON
        #[arg(long)]
        json: bool,
    },

    /// Audit visual assets against governance rules (exits with non-zero on violations)
    #[command(
        after_help = "EXIT CODES:\n    0  no violations\n    1  at least one error-level violation\n    2  only warnings, and --strict was passed\n\nEXAMPLE:\n    animoria check . --strict"
    )]
    Check {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Output results as raw formatted JSON
        #[arg(long)]
        json: bool,

        /// Treat warnings as failures (exit code 2)
        #[arg(long)]
        strict: bool,
    },

    /// Generate an in-depth visual asset health score and audit report
    Report {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Output results as raw formatted JSON
        #[arg(long)]
        json: bool,
    },

    /// Preview or stage duplicate assets into .animoria/trash (previews by default)
    #[command(
        after_help = "Without --apply this only prints what would move; nothing on disk changes.\nEvery --apply run can be undone with `animoria restore`.\n\nEXAMPLE:\n    animoria clean . --apply"
    )]
    Clean {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Actually move files. Without this flag, clean only previews what would move.
        #[arg(long)]
        apply: bool,
    },

    /// List or restore a trash session recorded by `clean --apply`
    #[command(
        after_help = "EXAMPLES:\n    animoria restore .                        List sessions (default with no flags)\n    animoria restore . --session session-123  Restore one session\n    animoria restore . --all                  Restore every recorded session"
    )]
    Restore {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// List recorded trash sessions instead of restoring one
        #[arg(long)]
        list: bool,

        /// Restore this specific trash session
        #[arg(long)]
        session: Option<String>,

        /// Restore every recorded trash session
        #[arg(long)]
        all: bool,
    },

    /// Initialize .animoriarc.json policy and .animoriaignore in workspace
    Init {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Overwrite existing configuration files
        #[arg(long)]
        force: bool,
    },

    /// Start Protocol v1 NDJSON server over standard I/O (for IDE hosts)
    #[command(
        after_help = "Not meant to be run interactively — VS Code and JetBrains spawn this as a\nsubprocess and speak newline-delimited JSON (Protocol v1) over stdin/stdout.\nEach request/event carries a \"protocol\" field; a mismatched version is\nrefused with an \"unsupported-version\" error rather than misinterpreted.\n\nEXAMPLE (manual handshake):\n    echo '{\"protocol\":1,\"id\":\"1\",\"method\":\"hello\"}' | animoria daemon"
    )]
    Daemon,
}
