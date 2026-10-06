# Animoria JetBrains Plugin — CLAUDE.md (JVM/Kotlin Boundary)

## Boundary Overview
`packages/animoria-jetbrains` is the IntelliJ Platform plugin embedding `@animoria/ui` via JCEF and orchestrating the native `animoria` daemon.

## Tooling & Commands
- **Build**: `./gradlew buildPlugin -x buildSearchableOptions`
- **Test**: `./gradlew test` (JUnit 5 protocol parity and unit suites)
- **Lint**: `./gradlew detekt ktlintCheck`
- **Format**: `./gradlew ktlintFormat`
- **Run IDE**: `./gradlew runIde`

## Conventions & Rules
- **Files**: `PascalCase.kt` mirroring package directories (`com.sxnnyside.animoria...`).
- **Tests**: Mirror `src/main/kotlin/` inside `src/test/kotlin/`.
- **Daemon Integration**: Communication with `animoria daemon` uses standard I/O NDJSON lines via `CoreProcessManager`.
- **Daemon Packaging**: Native daemon binary is copied into plugin resources before building.
