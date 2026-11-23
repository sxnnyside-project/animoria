//! Command-line interface definitions, parsing, and execution handlers.

/// Command-line arguments specification and Clap derivations.
pub mod args;
/// Subcommand execution handlers.
pub mod commands;
/// Terminal UI styling, color configuration, and formatting helpers.
pub mod ui;
/// Workspace root discovery and validation utilities.
pub mod workspace;

pub use args::{Cli, Commands};
use clap::Parser;
pub use commands::check::{execute_check, CheckArgs};
pub use commands::clean::execute_clean;
pub use commands::explain::{execute_explain, ALL_RULES};
pub use commands::init::execute_init;
pub use commands::report::execute_report;
pub use commands::restore::execute_restore;
pub use commands::scan::execute_scan;

/// Parses command-line arguments and dispatches to the corresponding execution handler.
pub fn run_cli() -> anyhow::Result<i32> {
    let cli = Cli::parse();
    ui::configure(cli.is_no_color, cli.is_quiet, cli.verbose);

    match cli.command {
        Commands::Scan { path, is_json } => commands::scan::execute_scan(&path, is_json),
        Commands::Check {
            path,
            is_json,
            is_sarif,
            format,
            is_compact,
            has_only_violations,
            is_strict,
            min_score,
            max_warnings,
        } => commands::check::execute_check(
            &path,
            commands::check::CheckArgs {
                is_json,
                is_sarif,
                format: format.as_deref(),
                is_compact,
                has_only_violations,
                is_strict,
                min_score,
                max_warnings,
            },
        ),
        Commands::Report { path, is_json } => commands::report::execute_report(&path, is_json),
        Commands::Clean {
            path,
            should_apply,
            is_dry_run,
        } => {
            let effective_apply = should_apply && !is_dry_run;
            commands::clean::execute_clean(&path, effective_apply)
        }
        Commands::Restore {
            path,
            should_list,
            session,
            should_restore_all,
        } => commands::restore::execute_restore(
            &path,
            should_list,
            session.as_deref(),
            should_restore_all,
        ),
        Commands::Init { path, should_force } => commands::init::execute_init(&path, should_force),
        Commands::Explain { rule_id } => commands::explain::execute_explain(rule_id.as_deref()),
        Commands::Daemon => {
            let mut server = crate::daemon::DaemonServer::new();
            server.run()?;
            Ok(0)
        }
    }
}
