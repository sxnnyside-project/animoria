pub mod args;
pub mod commands;
pub mod ui;
pub mod workspace;

pub use args::{Cli, Commands};
use clap::Parser;

pub fn run_cli() -> anyhow::Result<i32> {
    let cli = Cli::parse();
    ui::configure(cli.no_color, cli.quiet, cli.verbose);

    match cli.command {
        Commands::Scan { path, json } => commands::scan::execute_scan(&path, json),
        Commands::Check { path, json, strict } => {
            commands::check::execute_check(&path, json, strict)
        }
        Commands::Report { path, json } => commands::report::execute_report(&path, json),
        Commands::Clean { path, apply } => commands::clean::execute_clean(&path, apply),
        Commands::Restore {
            path,
            list,
            session,
            all,
        } => commands::restore::execute_restore(&path, list, session.as_deref(), all),
        Commands::Init { path, force } => commands::init::execute_init(&path, force),
        Commands::Daemon => {
            let mut server = crate::daemon::DaemonServer::new();
            server.run()?;
            Ok(0)
        }
    }
}
