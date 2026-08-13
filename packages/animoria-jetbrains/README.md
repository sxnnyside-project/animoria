# Animoria — Visual Asset Governance for JetBrains

![Animoria Banner](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/banner.png)

<p align="center">
  <strong>Trace ✦ Audit ✦ Deduplicate ✦ Clean Up</strong><br>
  <em>The visual asset memory and governance engine for IntelliJ IDEA, Android Studio, WebStorm, and the entire JetBrains IDE family.</em>
</p>

---

## Eliminate Silent Asset Bloat in Your Projects

Modern multi-module applications, mobile apps, and full-stack codebases constantly accumulate visual assets:
* **Duplicate Accumulation:** Multiple modules check in identical Lottie animations or SVG icons under slightly different names, silently inflating production APKs, iOS bundles, and web builds.
* **Orphaned Assets:** Deprecated onboarding screens, old feature animations, and legacy icons stay in the repository because developers aren't sure if other modules are still using them.
* **Refactoring Blindspots:** Text search across multi-language codebases (`.kt`, `.java`, `.ts`, `.swift`, `.dart`) is slow, error-prone, and misses indirect references.

**Animoria solves this seamlessly.** Open your project, click the **Animoria Tool Window**, and get instant visual discovery, multi-syntax usage tracing, SHA-256 duplicate grouping, and one-click cleanup right inside your IDE.

---

## Why Developers Choose Animoria

| Capability | Animoria | Android Studio Resource Manager | Standard IDE Project View |
| :--- | :---: | :---: | :---: |
| **All Visual & Motion Formats** *(Lottie, dotLottie, Rive, GIF, APNG, SVG, WebP)* |  **Yes** | ⚠️ XML / Drawables only | ❌ No preview/metadata |
| **Multi-Syntax Reference Tracing** *(Kotlin, Java, TS, Dart, Swift, Compose, etc.)* |  **Yes** | ❌ No | ❌ No |
| **SHA-256 Content Duplicate Detection** |  **Yes** | ❌ No | ❌ No |
| **Repository Health Score & Governance** |  **Yes** | ❌ No | ❌ No |
| **Safe Reversible Deletions** *(Staged `.animoria/trash/` with rollback)* |  **Yes** | ❌ Permanent delete | ❌ Permanent delete |
| **Works Across All JetBrains IDEs** *(IntelliJ, Android Studio, WebStorm, etc.)* |  **Yes** | ⚠️ Android Studio only |  Yes |
| **Standalone Native Daemon** *(Zero separate Node.js install required)* |  **Yes** | N/A | N/A |
| **100% Offline & Private** |  **Yes** |  Yes |  Yes |

---

## Key Features

### 1. Dedicated Tool Window & Embedded JCEF Dashboard
* **Visual Gallery:** Browse all visual assets in your workspace with vector thumbnails, FPS, duration, layer count, and dimension indicators.
* **Interactive Player:** Inspect timeline markers, animation layers, and frame-by-frame details directly inside your IDE tool window.

### 2. Multi-Syntax Code Reference Tracing
* Click any asset to immediately see all source code references across Kotlin, Java, TypeScript, JavaScript, Swift, Dart, and Markdown.
* Click any reference line to jump directly to the target statement in the editor.

### 3. SHA-256 Duplicate Grouping & Resolution
* Uses cryptographic binary hashing to identify identical files across directories and modules.
* Pick a canonical copy to keep — Animoria automatically rewrites referencing import paths across your codebase and moves redundant copies to trash.

### 4. Automated Governance & Health Scoring
* Enforces team rules (`no-unreferenced-assets`, `no-duplicate-content`, `max-file-size-kb`, `allowed-formats`, `no-gif`).
* Calculates an overall **Workspace Health Score** (0–100%) and surfaces findings with evidence and clear remediation steps.

### 5. Instant Framework Code Snippets
* Generate one-click, copy-paste boilerplate code for:
  * **Jetpack Compose** (Android)
  * **Flutter** (`Lottie.asset`, Rive)
  * **SwiftUI** (iOS)
  * **React / Next.js / Vue**

---

## Supported Formats

### 🎬 Animated Formats (Full Governance & Tracing)
* **Lottie** (`.json`)
* **dotLottie** (`.lottie` V2 binary archives)
* **Rive** (`.riv`)
* **GIF** (`.gif`)
* **APNG** (`.apng`)
* **Animated SVG** (`.svg`)

### 🖼️ Static Formats (Discovery & Inspection)
* **Vector:** SVG (`.svg`)
* **Raster:** PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WebP (`.webp`), AVIF (`.avif`)

---

## Zero Setup & Self-Contained

* **No Node.js install required on your machine:** The plugin bundles a self-contained, pre-compiled native background daemon executable for:
  * **macOS:** Apple Silicon (`darwin-arm64`) & Intel (`darwin-x64`)
  * **Linux:** x64 & ARM64 (`linux-x64`, `linux-arm64`)
  * **Windows:** x64 (`win32-x64`)
* Works the moment you open any project — no background servers to start and no cloud credentials needed.

---

## System Requirements

* **IDE Compatibility:** Any JetBrains IDE based on platform **2024.1 or later** (IntelliJ IDEA Ultimate/Community, Android Studio, WebStorm, PyCharm, GoLand, Rider, PhpStorm, CLion, DataGrip, RustRover).
* **Architecture:** macOS (ARM/Intel), Linux (x64/ARM64), Windows (x64).

---

## Configuration (Optional)

Animoria works with zero configuration. To enforce custom rules across your team, place a `.animoriarc.json` at the root of your project:

```json
{
  "rules": {
    "no-gif": "warning",
    "max-file-size-kb": ["warning", 512],
    "no-duplicate-content": "error",
    "no-unreferenced-assets": "warning",
    "allowed-formats": ["error", ["lottie", "dotlottie", "rive", "animated-svg"]]
  }
}
```

---

## Privacy & Security

Animoria is **100% offline-first**. All parsing, indexing, and governance audits run entirely on your local machine. No code, telemetry, or visual assets are ever transmitted to external servers.

---

## Resources & Community

* [Full Documentation](https://github.com/sxnnyside-project/animoria/blob/main/docs/ARCHITECTURE.md)
* [Configuration Guide](https://github.com/sxnnyside-project/animoria/blob/main/docs/CONFIGURATION.md)
* [GitHub Repository & Issues](https://github.com/sxnnyside-project/animoria)

---

<p align="center">
  <strong>Animoria</strong> — A Sxnnyside Project Tool<br>
  <em>&copy; 2026 Sxnnyside Project. Distributed under the MIT License.</em>
</p>
