# Configuration

Animoria is **zero-config by default** — it discovers animated and static visual assets the moment a workspace is opened.

Two configuration files allow teams to customize policies and asset indexing behavior:
* **`.animoriarc`** (or `.animoriarc.json` / `.animoriarc.yaml`): Governs asset policies, format restrictions, duplicate thresholds, and file-size constraints.
* **`.animoriaignore`**: Excludes specific directories and file globs from scanning, indexing, gallery presentation, and governance audits.

Both configuration files reside at the workspace root and are parsed by `@animoria/core`, applying identically across the **VS Code Extension**, the **JetBrains Plugin**, and the **CLI**.

---

## 1. Governance Policy (`.animoriarc`)

Animoria resolves governance configuration by searching the workspace root in the following deterministic order:
1. `.animoriarc.json`
2. `.animoriarc.yaml`
3. `.animoriarc.yml`
4. `.animoriarc` (content-sniffed as JSON, falling back to YAML)

### Example Configuration

```json
{
  "$schema": "https://raw.githubusercontent.com/sxnnyside-project/animoria/main/packages/animoria-vscode/schemas/animoriarc.schema.json",
  "rules": {
    "no-gif": "warning",
    "max-file-size-kb": ["warning", 512],
    "no-duplicate-names": "error",
    "no-duplicate-content": "error",
    "no-unreferenced-assets": "warning",
    "allowed-formats": ["error", ["lottie", "dotlottie", "rive", "animated-svg"]]
  }
}
```

> [!NOTE]
> The repository's own [.animoriarc.json](../.animoriarc.json) serves as a live, tested reference for governance configuration.

---

### Built-in Governance Rules

Every rule is optional. Any rule omitted from the `rules` map is disabled (`off`).

| Rule Identifier | Allowed Options | Default Behavior & Description |
| :--- | :--- | :--- |
| `no-gif` | `"error" \| "warning" \| "off"` | Flags all legacy `.gif` files to encourage vector Lottie or Rive formats. |
| `max-file-size-kb` | `number` *(implies error)*<br>`["error" \| "warning", number]` | Flags assets exceeding the specified limit in kibibytes (e.g. `["warning", 512]`). |
| `allowed-formats` | `Format[]` *(implies error)*<br>`["error" \| "warning", Format[]]` | Restricts permitted animated formats. Allowed values: `lottie`, `dotlottie`, `rive`, `gif`, `apng`, `animated-svg`. |
| `no-duplicate-content` | `"error" \| "warning" \| "off"` | Detects byte-identical asset duplicates using SHA-256 binary content hashing. |
| `no-duplicate-names` | `"error" \| "warning" \| "off"` | Flags distinct assets sharing the same base name (case-insensitive, ignoring extension). |
| `no-unreferenced-assets` | `"error" \| "warning" \| "off"` | Flags visual assets with zero detected usage references across workspace source code. |

---

### Health Score Impact

Configured governance rules feed directly into the **Animoria Health Score** (0–100%):
* **Errors** apply severe penalties to the overall score.
* **Warnings** apply moderate penalties to highlight cleanup opportunities.
* Rules set to **`off`** or omitted produce no penalty and do not generate problem diagnostics in the editor.

---

## 2. Ignoring Files (`.animoriaignore`)

Place an `.animoriaignore` file at your workspace root to exclude specific paths from discovery entirely. Ignored assets will not be indexed, previewed in the Gallery, checked for references, or analyzed in governance audits.

### Syntax & Patterns

* One glob pattern per line.
* Lines starting with `#` are treated as comments.
* Trailing slashes match directories recursively (e.g., `legacy-assets/`).
* Standard glob wildcards (`*`, `**`) match nested directory trees.

```gitignore
# Exclude build output and test fixtures
dist/
build/
**/tests/fixtures/

# Exclude work-in-progress design files
**/*.draft.json
private-assets/
```

> [!TIP]
> This repository uses [.animoriaignore](../.animoriaignore) to exclude synthetic test fixtures in `packages/animoria-core/tests/fixtures/` from appearing in the live development gallery.

---

## 3. Inline Source Ignores

To prevent a source code comment or test string from triggering a false reference match in `no-unreferenced-assets`, append `// animoria-ignore` to that source line:

```typescript
// animoria-ignore - Reference mentioned in comment only:
const legacyAssetName = "old_animation.json";
```

Lines with `// animoria-ignore` are bypassed by the reference scanner during workspace AST parsing.

---

## 4. IDE Schema Validation

The VS Code extension automatically provides schema validation, auto-completion, and hover tooltips for `.animoriarc.json` files via the embedded schema located at [packages/animoria-vscode/schemas/animoriarc.schema.json](../packages/animoria-vscode/schemas/animoriarc.schema.json).
