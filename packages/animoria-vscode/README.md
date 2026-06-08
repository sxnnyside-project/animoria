# Animoria — Visual Asset Memory for Developers

![Animoria Banner](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/banner.png)

**Browse, preview, and trace Lottie animations without leaving VS Code.**

![Animoria Demo](https://raw.githubusercontent.com/sxnnyside-project/animoria/main/docs/demo.gif)

Animoria scans your workspace for animated assets, shows them as a thumbnail gallery in the sidebar, traces every reference in source code, and flags unused, duplicate, or overused assets through a one-click Governance analysis.

## Supported Formats

| Format | Extension | Status |
| :--- | :--- | :---: |
| Lottie | `.json` | ✅ Supported |
| dotLottie | `.lottie` | ✅ Supported |
| Rive | `.riv` | 🔜 Planned |
| GIF | `.gif` | 🔜 Planned |
| APNG | `.apng` | 🔜 Planned |
| Animated SVG | `.svg` | 🔜 Planned |

## Commands

| Command | Description |
| :--- | :--- |
| `Animoria: Refresh Gallery` | Re-scan the workspace and rebuild the gallery |
| `Animoria: Open Preview` | Open the animation preview panel for the selected asset |
| `Animoria: Reveal in Explorer` | Reveal the asset file in the VS Code file explorer |
| `Animoria: Search Animations` | Open a quick-pick search across all gallery assets |
| `Animoria: Run Governance Analysis` | Classify assets as Unused, Duplicate, or Overused |
| `Animoria: Export Governance Report` | Save the governance report as Markdown or JSON |
| `Animoria: Delete Asset` | Permanently delete an asset file from disk (with confirmation) |

## Settings

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `animoria.chromiumPath` | `string` | `""` | Path to Chrome or Chromium for thumbnail generation. Leave empty for auto-detection. |
| `animoria.enableThumbnails` | `boolean` | `true` | Generate PNG thumbnails in the sidebar. Requires Chrome/Chromium. |
| `animoria.governance.overusedThreshold` | `number` | `10` | References at or above this count flag an asset as Overused. |

## Comparison

| Capability | Animoria | LottieFiles for VS Code | Standard IDE Explorer |
| :--- | :---: | :---: | :---: |
| Workspace Auto-Scanning | ✅ | ✅ | — |
| Inline Thumbnails | ✅ | ✅ | — |
| Code Usage Tracking | ✅ | — | — |
| Asset Governance | ✅ | — | — |
| dotLottie Support | ✅ | — | — |
| Multi-Format | 🔜 | Lottie only | — |
| Offline-First | ✅ | — | ✅ |
| Open Source Core | ✅ | — | — |

## Requirements

- VS Code 1.85 or later
- Chrome or Chromium for thumbnail generation (optional — the gallery works without it)

## How It Works

On activation, Animoria:

1. Scans the workspace for `.json` (validated as Lottie) and `.lottie` files.
2. Parses each file to extract fps, duration, dimensions, and layer metadata.
3. Populates the Gallery sidebar with asset items.
4. Lazily loads code usage references when you expand an asset.
5. In monorepos, scopes usage results to the nearest project boundary.
6. Generates PNG thumbnails in `.animoria/thumbnails/` using a headless Chromium page.

---

*Animoria is a Sxnnyside Project Tool. &copy; 2026 Sxnnyside Project.*

Animoria turns the animation files scattered across your codebase into a structured, searchable gallery — complete with live playback, technical metadata, usage references, and quick-copy actions.

---

## Features

### 🗂 Gallery Sidebar
A live tree of every Lottie (`.json`) animation in your workspace, auto-refreshed when files change.

- Thumbnail icons generated from the middle frame of each animation
- Per-asset description shows FPS, duration, and reference count
- Inline search to filter by name
- Collapse-free tree with usage references as child nodes

### ▶ Enhanced Preview Panel
Click any asset to open a full detail panel:

| Section | Contents |
|---|---|
| **Thumbnail Header** | Static PNG preview, asset name, format badge, quick summary |
| **Live Preview** | Lottie player with Play / Pause / Restart / Loop controls |
| **Metadata Grid** | Format, FPS, Duration, Frames, Dimensions, Layers, Markers, File Size |
| **Usage References** | Every file and line that imports or references the animation |
| **Quick Actions** | Copy absolute path, copy stem name, reveal in Explorer |

### 🔍 Usage Scanner
Pattern-based search across `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`, `.swift`, `.kt`, `.dart`, and more. Click any reference to jump directly to that line in the source file.

### 🖼 Thumbnail Generation
Headless Chrome renders a crisp PNG from the middle frame of each animation. Thumbnails appear in both the sidebar tree and the panel header.

---

## Requirements

- **VS Code** 1.85 or later
- **Chrome or Chromium** installed (for thumbnail generation — optional)

If Chrome is not found, thumbnails are disabled and a warning is shown with a link to the `animoria.chromiumPath` setting.

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `animoria.enableThumbnails` | `true` | Generate static thumbnail previews |
| `animoria.chromiumPath` | `""` | Path to Chrome/Chromium. Auto-detected if empty |

### Setting `chromiumPath` manually

Open **Settings → Animoria: Chromium Path** and paste the full path:

```
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome   # macOS
C:\Program Files\Google\Chrome\Application\chrome.exe           # Windows
/usr/bin/google-chrome                                           # Linux
```

---

## Commands

| Command | Description |
|---|---|
| `Animoria: Refresh Gallery` | Re-scan the workspace for animation assets |
| `Animoria: Search Animations` | Open quick-pick search over all found assets |
| `Animoria: Open Preview` | Open the detail panel for the selected asset |
| `Animoria: Reveal in Explorer` | Highlight the asset file in the VS Code Explorer |

---

## Known Limitations

- Only Lottie JSON format is supported in v0.1. Dotlottie (`.lottie`) and GIF support is planned.
- Thumbnail generation requires a Chromium-based browser.
- Usage search is pattern-based; dynamic `require()` calls with computed paths may not be detected.

---

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).

---

## About

Animoria is part of the **Sxnnyside Project** — tools built for developers who care about craft.

- GitHub: [github.com/sxnnyside-project/animoria](https://github.com/sxnnyside-project/animoria)
- Issues: [github.com/sxnnyside-project/animoria/issues](https://github.com/sxnnyside-project/animoria/issues)
