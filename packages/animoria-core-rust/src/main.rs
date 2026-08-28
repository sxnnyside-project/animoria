fn main() {
    let exit_code = match animoria_core::cli::run_cli() {
        Ok(code) => code,
        Err(err) => {
            eprintln!("\x1b[31m✖ Error:\x1b[0m {err}");
            1
        }
    };
    std::process::exit(exit_code);
}
