use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(
    name = "animoria",
    author = "Sxnnyside Project <contact@sxnnyside.com>",
    version = "0.1.0",
    about = "High-performance visual asset governance & quality engine",
    long_about = "Animoria discovers, audits, deduplicates, and traces visual assets across your codebase with sub-millisecond native speed."
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Discover and display visual asset inventory in the workspace
    Scan {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Output results as raw formatted JSON
        #[arg(long)]
        json: bool,
    },

    /// Audit visual assets against governance rules (exits with non-zero on violations)
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

    /// Safely stage unreferenced and duplicate assets into .animoria/trash
    Clean {
        /// Target workspace path (defaults to current directory)
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Preview changes without modifying filesystem
        #[arg(long)]
        dry_run: bool,
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
    Daemon,
}
