# @animoria/core

A zero-dependency, pure TypeScript library designed to orchestrate **Asset Governance, reference tracking, and workspace deduplication** for codebases with high densities of animated assets.

This core package is completely decoupled from any IDE runtime (VS Code or JetBrains), making it ideal for integration into CI/CD pipelines, custom code quality scanners, build-time bundler plugins, and command-line interfaces (CLIs).

---

## Architecture & Modules

The library is structured into four main governance and analysis layers:

| Module           | Core Class           | Role in Governance & Parsing                                                                                                                                            |
| :--------------- | :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`scanner`**    | `FileScanner`        | Scans directories recursively, performs fast-pass structural audits, and yields typed `AnimoriaAsset` objects.                                                          |
| **`parsers`**    | `ParserRegistry`     | A Singleton strategy registry implementing the Épica 5 plugin architecture. Matches file extensions and magic bytes to structural parsers.                              |
| **`usage`**      | `UsageScanner`       | Traces references of animated assets in source code files using pattern matches. Supports project boundary scoping for monorepos.                                       |
| **`governance`** | `GovernanceAnalyzer` | Processes the workspace assets to classify them as **Unused** (0 references), **Duplicate** (matching MD5 checksums), or **Overused** (references exceeding threshold). |

---

## Programmatic Integration

### 1. Initializing the Parser Pipeline (Strategy Pattern)

The core routes files dynamically using registered strategy parsers that implement the `IAssetParser` interface. By default, it registers support for **Lottie**, **dotLottie**, **Rive**, **GIF**, **APNG**, and **Animated SVG**.

You can retrieve the central registry, verify registered formats, or register custom parsers:

```typescript
import { ParserRegistry } from '@animoria/core/parsers';

const registry = ParserRegistry.getInstance();

// Inspect currently supported formats
const formats = registry.getRegisteredFormats();
// -> ['lottie', 'dotlottie', 'rive', 'gif', 'apng', 'animated-svg']
```

### 2. Workspace Scanning and Parsing

To audit a codebase, instantiating `Animoria` orchestrates the `FileScanner` and the `ParserRegistry` in a single pass:

```typescript
import { Animoria } from '@animoria/core';

const engine = new Animoria({
  workspacePath: '/Users/ti/IdeaProjects/Animoria',
  onScanComplete: (count) => console.log(`Discovered ${count} candidate files`),
  onAssetParsed: (asset, index, total) => {
    console.log(`[${index + 1}/${total}] Audited: ${asset.name} (${asset.status})`);
  },
});

const result = await engine.run();
// result.assets   -> Array of AnimoriaAsset
// result.parsed   -> Number of successfully parsed assets
// result.duration -> Scan duration in milliseconds
```

### 3. Running Governance Analysis (Deduplication & References)

The `GovernanceAnalyzer` aggregates results to produce a comprehensive technical debt report. It uses MD5 content hashing for byte-perfect duplicate checking and runs the reference tracer across assets:

```typescript
import { GovernanceAnalyzer } from '@animoria/core/governance';

const analyzer = new GovernanceAnalyzer({
  workspacePath: '/Users/ti/IdeaProjects/Animoria',
  assets: result.assets,
  overusedThreshold: 8, // Triggers warning if referenced in 8 or more locations
  scopeResolver: (asset) => {
    // Optional: Resolve local monorepo boundary (e.g., packages/animoria-vscode)
    // to prevent cross-package reference pollution
    return '/Users/ti/IdeaProjects/Animoria/packages/animoria-vscode';
  },
});

const report = await analyzer.analyze();

console.log(`Unused assets (deletable): ${report.unused.length}`);
console.log(`Duplicate files (identical MD5): ${report.duplicates.length}`);
console.log(`Overused assets (refactoring candidates): ${report.overused.length}`);

// Access details:
report.duplicates.forEach((issue) => {
  console.log(`Asset: ${issue.asset.path} is a byte-duplicate of:`);
  issue.duplicateOf.forEach((dup) => console.log(`  - ${dup.path}`));
});
```

### 4. Code Reference Tracing

To search for references to a specific asset in code files (supporting `.ts`, `.tsx`, `.js`, `.jsx`, `.swift`, `.kt`, `.dart`, etc.):

```typescript
import { UsageScanner } from '@animoria/core/usage';

const usageScanner = new UsageScanner({
  workspacePath: '/Users/ti/IdeaProjects/Animoria',
  asset: targetAsset,
  strategy: 'pattern',
  scopePath: '/Users/ti/IdeaProjects/Animoria/packages/animoria-vscode', // Scope to active workspace package
});

const searchResult = await usageScanner.search();
// searchResult.references -> Array of { uri: string, line: number, preview: string }
// searchResult.durationMs  -> Time taken to search code files
```

---

## Technical Constraints & Standards

- **Absolute Paths Only**: The core performs all file-system actions (`fast-glob`, `readdir`) using absolute paths to avoid resolution ambiguity in complex directories.
- **Magic Bytes Validation**: Asset formats are checked by magic byte signatures (e.g., Lottie JSON structures, APNG `acTL` control chunks, Rive bin signatures), preventing parser collisions on standard JSON or static images.
- **Batched Concurrency**: Scopes and analyzers execute asynchronous file operations in parallel using batched queues to prevent resource/file-descriptor exhaustion in large workspaces.
