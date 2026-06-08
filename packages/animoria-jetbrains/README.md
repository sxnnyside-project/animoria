# Animoria for JetBrains

Visual asset browser for animated files. IntelliJ Platform plugin — currently in development.

## Status

This plugin is not yet released. It will provide the same gallery, preview, usage tracking, and governance capabilities as the VS Code extension, implemented natively for the IntelliJ Platform.

## Architecture Notes

- Written in Kotlin using the IntelliJ Platform SDK.
- Lottie and dotLottie parsing is reimplemented natively in Kotlin — the plugin does **not** spawn Node.js as a subprocess. This avoids Node dependency issues on end-user machines where Node may not be on `PATH` or may not be installed at all.
- The WebView preview panel (rendered in JCEF) reuses the Lit Web Components from `animoria-vscode`. The same component code runs in both VS Code WebViews and JetBrains JCEF.
- Supported IDEs: IntelliJ IDEA, Android Studio, WebStorm, and any IntelliJ Platform IDE that supports plugin installation.

## Building

```bash
cd packages/animoria-jetbrains
./gradlew buildPlugin
```

---

*Animoria is a Sxnnyside Project Tool. &copy; 2026 Sxnnyside Project.*
