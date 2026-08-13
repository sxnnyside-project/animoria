## One pass, every reference

Source files are read once per scan — not once per asset — so reference
tracing stays fast even in large repositories. Every reference-bearing
format Animoria can read is disclosed; formats it cannot (like `.json`
itself, which is also Lottie's own extension) are disclosed too, never
silently skipped.
