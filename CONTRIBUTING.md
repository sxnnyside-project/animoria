# Contributing to Animoria

Contributions are welcome — bugs, fixes, features, or documentation.  
This document covers how to work with the project as a contributor.

---

## Before You Start

- Search existing issues before opening a new one.
- For significant changes, open an issue first to discuss the direction before writing code.
- Read the Code of Conduct. It applies to all interactions in this project.

---

## Reporting a Bug

Open a GitHub Issue using the bug report template.

Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment details (OS, Node.js version, VS Code version, relevant config)

---

## Proposing a Feature

Open a GitHub Issue using the feature request template, or submit a PR directly if the change is small and self-contained.

For larger features, an issue discussion first avoids wasted effort on both sides.

---

## Workflow

1. Fork the repository and create a branch from `main`.
2. Name your branch descriptively — `fix/crash-on-empty-input`, `feat/rive-support`.
3. Make your changes.
4. Open a pull request against `main` with a clear description of what changed and why.

---

## Pull Request Checklist

Before submitting:

- [ ] The project builds without errors (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] Changes are described in `CHANGELOG.md` under `[Unreleased]`
- [ ] The PR description explains what changed and why
- [ ] New behavior is covered by tests where applicable
- [ ] New public core APIs, classes, and properties are documented with JSDoc comments
- [ ] No VS Code API imports were added to `packages/animoria-core`

---

## Commit Style

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow the format:

```
<type>: <description>

[optional body]
[optional footer]
```

Accepted types:

| Type       | Use for                                   |
| ---------- | ----------------------------------------- |
| `feat`     | New functionality                         |
| `fix`      | Bug fixes                                 |
| `docs`     | Documentation only                        |
| `style`    | Formatting, whitespace — no logic changes |
| `refactor` | Code restructure without behavior change  |
| `test`     | Adding or updating tests                  |
| `chore`    | Build process, tooling, dependencies      |
| `perf`     | Performance improvements                  |

Examples:

```
feat: add Rive format support to FileScanner
fix: prevent thumbnail cache collision for same-named assets in different dirs
docs: document GovernanceAnalyzer public API
chore: bump @dotlottie/dotlottie-js to latest
```

Commits that don't follow this format will be flagged during review.

---

## Running & Debugging in Development

### VS Code Extension
To run the VS Code extension in development:
1. Open the workspace root directory in VS Code.
2. Press `F5` (or go to Run and Debug → **Launch VS Code Extension**).
3. This opens a new Extension Development Host window with the local extension loaded.

### JetBrains Plugin (IntelliJ / Android Studio)
To run and debug the JetBrains plugin in a sandbox instance:
1. Navigate to the plugin directory:
   ```bash
   cd packages/animoria-jetbrains
   ```
2. Run the Gradle IntelliJ sandbox task:
   ```bash
   ./gradlew runIde
   ```
3. This will launch a sandbox IntelliJ IDEA instance with the Animoria plugin installed. You can set breakpoints inside your Kotlin source files directly in your main IDE window.

---

## Package Boundaries

`packages/animoria-core` is pure TypeScript with zero IDE dependencies. This constraint is intentional and must be preserved:

- Do not import `vscode` or any VS Code API into `animoria-core`.
- Do not spawn Node.js subprocesses from the JetBrains plugin.
- All changes to `animoria-core` must be additive — existing tests must continue to pass.

---

## Questions

If something in the codebase is unclear, open an issue with the `question` label before assuming it's a bug.

---

_Animoria is a Sxnnyside Project Tool. Part of the Sxnnyside Project._
