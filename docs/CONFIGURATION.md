# Configuration

Animoria is zero-config by default — it works the moment it discovers animated assets in a workspace. Two files let a team customize that behavior: `.animoriarc` for governance policy, and `.animoriaignore` for excluding paths from discovery entirely. Both are workspace-root files read by `@animoria/core`, so they apply identically across the VS Code extension, the JetBrains plugin, and the CLI.

## `.animoriarc`

Defines governance rules enforced across the workspace. Animoria looks for one of the following, in this fixed order, and uses the first one found: `.animoriarc.json`, `.animoriarc.yaml`, `.animoriarc.yml`, `.animoriarc` (content-sniffed as JSON, then YAML).

```json
{
  "rules": {
    "no-gif": "warning",
    "max-file-size-kb": ["warning", 512],
    "no-duplicate-names": "error",
    "no-unreferenced-assets": "warning"
  }
}
```

This repository's own [.animoriarc.json](../.animoriarc.json) is exactly this example — a live, working reference rather than a documentation-only snippet. A stricter policy can add `allowed-formats` (an array of formats, or `[severity, formats]`) to restrict which formats the workspace permits, e.g. `"allowed-formats": ["lottie", "dotlottie", "rive"]`.

### Built-in rules

| Rule                       | Configuration                                          | Flags                                                                 |
| :-------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------------- |
| `no-gif`                   | severity only — `"error" \| "warning" \| "off"`         | Every GIF asset, in favor of Lottie or Rive.                          |
| `max-file-size-kb`         | a number, or `[severity, limitKb]`                     | Assets larger than the configured size.                               |
| `allowed-formats`          | an array of formats, or `[severity, formats]`          | Assets whose format isn't in the allow-list.                          |
| `no-duplicate-names`       | severity only                                          | Assets sharing a name (case-insensitive, extension ignored) elsewhere in the workspace. |
| `no-unreferenced-assets`   | severity only                                          | Assets with zero detected source-code references.                     |

A rule omitted from `rules` is not enforced. Each rule's violations contribute to the workspace Health Score alongside the Unused/Duplicate/Overused governance categories.

## `.animoriaignore`

A workspace-root file, one glob pattern per line (`#` starts a comment), excluding matching assets from discovery entirely — they never appear in the gallery, governance analysis, cleanup, or duplicate detection.

```
# .animoriaignore
legacy-assets/
**/*.draft.json
```

A bare name like `legacy-assets` matches both a file anywhere and a directory (everything under it); patterns containing `*` or `**` are used as-is.

This repository's own [.animoriaignore](../.animoriaignore) excludes `packages/animoria-core/tests/fixtures/` — synthetic assets that exist purely to exercise parsing and governance logic deterministically, not real production assets (see [tests/fixtures/README.md](../packages/animoria-core/tests/fixtures/README.md)).

### Inline ignores

For a single source-code line that mentions an asset's name without actually using it (a comment, a test fixture), add `// animoria-ignore` to that line to exclude it from usage-reference counting — this doesn't require `.animoriaignore` and doesn't affect discovery.
