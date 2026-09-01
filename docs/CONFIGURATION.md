# Configuration

Animoria is **zero-config by default** — it discovers animated and static visual assets the moment a workspace is opened.

Two configuration files allow teams to customize policies and asset indexing behavior:
* **`.animoriarc.json`**: Governs governance rule policies (allowed formats, duplicate/size/reference checks).
* **`.animoriaignore`**: Excludes specific directories and file globs from scanning, indexing, gallery presentation, and governance audits.

Both configuration files reside at the workspace root and are parsed by the Rust engine (`animoria-core-rust`), applying identically across the **VS Code Extension**, the **JetBrains Plugin**, and the **CLI** — all three talk to the same compiled `animoria` binary, so there is exactly one implementation of config loading and rule evaluation (see `docs/ARCHITECTURE.md` §2.E, §3).

The Rust config loader (`GovernancePolicy::load_from_workspace` in `packages/animoria-core-rust/src/governance/policy.rs`) recognizes exactly two file names, checked in this order: `.animoriarc.json` first, then `.animoriarc` (extensionless) as a fallback if the former is absent. Both are parsed identically as JSON — the extensionless fallback is not a YAML file, it is simply an alternate filename for the same JSON schema. YAML variants (`.animoriarc.yaml`, `.animoriarc.yml`) are not supported by the loader; no code path in `animoria-core-rust` parses YAML for this config file.

---

## 1. Governance Policy (`.animoriarc.json`)

### Example Configuration

```json
{
  "$schema": "https://raw.githubusercontent.com/sxnnyside-project/animoria/main/packages/animoria-vscode/schemas/animoriarc.schema.json",
  "rules": {
    "no-gif": "warning",
    "max-file-size-kb": ["warning", 512],
    "no-duplicate-content": "error",
    "no-unreferenced-assets": "warning",
    "allowed-formats": ["error", ["lottie", "dotlottie", "rive", "animated-svg"]]
  }
}
```

> [!NOTE]
> The repository's own [.animoriarc.json](../.animoriarc.json) currently includes a `no-duplicate-names` entry. That rule id does not exist in the current governance engine (only the five rules listed below are implemented — see `packages/animoria-core-rust/src/governance/rules/`), so it is silently ignored per the schema's own "unrecognized rule ids are still accepted" contract.

---

### Built-in Governance Rules

Every rule is optional. Any rule omitted from the `rules` map is disabled (`off`). There are exactly **five** built-in rules, each implemented as its own type in `packages/animoria-core-rust/src/governance/rules/`:

| Rule Identifier | Allowed Options | Description |
| :--- | :--- | :--- |
| `allowed-formats` | `Format[]` *(implies error)*<br>`["error" \| "warning", Format[]]`<br>`"off"` | Restricts which animated formats are permitted. Allowed values: `lottie`, `dotlottie`, `rive`, `gif`, `apng`, `animated-svg`. |
| `no-gif` | `"error" \| "warning" \| "off"` | Flags legacy `.gif` assets, suggesting a more efficient animated format (WebP, APNG, Lottie). |
| `max-file-size-kb` | `number` *(implies error)*<br>`["error" \| "warning", number]`<br>`"off"` | Flags assets exceeding the specified limit in kibibytes (e.g. `["warning", 512]`). |
| `no-unreferenced-assets` | `"error" \| "warning" \| "off"` | Flags valid assets with zero detected usage references across workspace source code. |
| `no-duplicate-content` | `"error" \| "warning" \| "off"` | Detects byte-identical asset duplicates via SHA-256 content hashing, flagging every non-canonical member of a `DuplicateGroup`. |

There is no `no-duplicate-names` rule — filename-based duplicate detection does not exist in the current engine; only byte-identical content matching (`no-duplicate-content`) is implemented.

---

### Health Score Impact

Configured governance rules feed into the **Animoria Health Score** (0–100%, see `HealthScoreReport` / `CategoryScore` in `packages/animoria-contracts/src/generated/`):
* **Errors** apply severe penalties to the overall score.
* **Warnings** apply moderate penalties to highlight cleanup opportunities.
* Rules set to **`off`** or omitted produce no penalty and do not generate diagnostics in the editor.

The exact weighting is implemented in `GovernanceEngine::evaluate` (`packages/animoria-core-rust/src/governance/engine.rs`). Each error-level diagnostic subtracts 15 penalty points, each warning-level diagnostic subtracts 5, and each invalid (unparseable) asset subtracts 20. The summed penalty is normalized by workspace size and rescaled onto the 0–100 range:

```
penalty     = error_count * 15 + warning_count * 5 + invalid_count * 20
base_score  = 100 - (penalty / total_assets * 10)
score       = clamp(round(base_score), 0, 100)
```

The `/ total_assets` normalization means the same absolute number of violations produces a much lower score in a small workspace than in a large one. The resulting `score` is then mapped to a letter grade using fixed cutoffs (A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F otherwise), the single source of truth referenced by both `cli/ui.rs::grade_badge` and the VS Code host's `describeHealthState`.

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
> This repository's own [.animoriaignore](../.animoriaignore) is a live reference for the syntax above.

The parser lives in `packages/animoria-core-rust/src/scanner/ignore_rules.rs` and is backed by the `globset` crate. Each non-empty, non-`#`-comment line compiles into an ordered rule; rules are evaluated in file order and the **last matching rule wins**, matching `.gitignore` semantics. A line starting with `!` re-includes any path matched by an earlier pattern — including the default excluded directories (`node_modules`, `.git`, `dist`, etc.), which are seeded as ordinary rules before your custom patterns run.

---

## 3. Inline Source Ignores

No inline ignore marker exists in the engine today. A repository-wide search of `packages/animoria-core-rust/` for `animoria-ignore` returns zero matches, and the usage-reference scanner (`packages/animoria-core-rust/src/tracing/detector.rs`) contains no per-line comment-marker check of any kind — it only consults the workspace-level `IgnoreRules` (`.animoriaignore` / config custom patterns) and standard `.gitignore` handling (via the `ignore` crate's `WalkBuilder`) to decide which *files* to walk. There is no mechanism, in any comment style, to suppress a false reference match on an individual source line; the only way to prevent a false positive today is to exclude the whole file or directory via `.animoriaignore`.

---

## 4. IDE Schema Validation

The VS Code extension provides schema validation, auto-completion, and hover tooltips for `.animoriarc.json` files via the embedded schema located at [packages/animoria-vscode/schemas/animoriarc.schema.json](../packages/animoria-vscode/schemas/animoriarc.schema.json). This schema is the authoritative reference for the shape of `rules` entries; unrecognized rule ids are accepted by the schema (future-proofing) but are validated for real by the Rust engine itself, not by the editor.
