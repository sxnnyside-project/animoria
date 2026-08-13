# @animoria/core

The core scanning, parsing, usage-tracing, governance, and daemon engine for **Animoria**.

`@animoria/core` is a pure TypeScript library designed to analyze, audit, and deduplicate animated (Lottie, dotLottie, Rive, GIF, APNG, animated SVG) and static (SVG, PNG, JPEG, WebP, AVIF) visual assets across codebases. It is completely decoupled from any IDE API, making it suitable for programmatic use, CI/CD linters, CLI tools, and background daemons.

---

## Architectural Subsystems

```
packages/animoria-core/src/
├── scanner/           # Linear directory traversal & fast header sniffing guards
├── parsers/           # Pluggable parser registry (Lottie, dotLottie, Rive, SVG, Image)
├── governance/        # Rules engine, duplicate detector, health score pipeline
├── usage/             # Multi-syntax usage reference indexer (20+ file extensions)
├── cleanup/           # Safe cleanup planner, staged trash, and manifest restore
├── daemon/            # JSON-RPC Protocol v1 server & WorkspaceSession orchestrator
├── cli/               # CLI entry point, formatters, and terminal reports
└── types/             # Shared TypeScript schemas and contract types
```

---

## Programmatic API Usage

### 1. Workspace Analysis & Governance

The primary entry point is `WorkspaceIndexer`. It coordinates scanning, reference tracing, and duplicate hashing into a single `WorkspaceAnalysis` aggregate:

```typescript
import { WorkspaceIndexer } from '@animoria/core';

const indexer = new WorkspaceIndexer({
  workspacePath: '/path/to/project',
});

// analyzeComplete() waits for full reference resolution before returning
const analysis = await indexer.analyzeComplete();

console.log(`Discovered Assets: ${analysis.assets.length}`);
console.log(`Governance Findings: ${analysis.diagnostics.length}`);

if (analysis.health.status === 'computed') {
  console.log(`Health Score: ${analysis.health.report.score}/100`);
} else {
  console.log(`Health Unavailable: ${analysis.health.reason}`);
}

// Access structured findings
for (const diagnostic of analysis.diagnostics) {
  console.log(`[${diagnostic.severity.toUpperCase()}] ${diagnostic.ruleId}: ${diagnostic.message}`);
  console.log(`  Evidence: ${diagnostic.evidence.summary}`);
  console.log(`  Remediation: ${diagnostic.remediation.description}`);
}

indexer.dispose();
```

### 2. Multi-Root Workspace Sessions

For multi-root workspaces or IDE daemon sessions, use `WorkspaceSession`:

```typescript
import { WorkspaceSession } from '@animoria/core';

const session = new WorkspaceSession({
  roots: [
    { id: 'client-app', path: '/path/to/client' },
    { id: 'admin-app', path: '/path/to/admin' },
  ],
});

await session.initialize();
const multiAnalysis = await session.getMultiRootAnalysis();

// Inspect per-root and aggregated results
console.log(`Total Assets across roots: ${multiAnalysis.aggregated.assets.length}`);
```

### 3. Safe Reversible Cleanup Execution

Animoria enforces safe staging to prevent permanent data loss:

```typescript
import { buildCleanupPlan, executeCleanupPlan } from '@animoria/core';

// 1. Build an immutable plan from current analysis
const plan = buildCleanupPlan(analysis, {
  selectedAssetPaths: ['assets/unused_hero.json'],
});

if (plan.safety === 'safe') {
  // 2. Execute plan — moves files to .animoria/trash/ with a session manifest
  const result = await executeCleanupPlan(plan, { workspacePath: '/path/to/project' });
  console.log(`Moved ${result.movedCount} files to trash session ${result.sessionId}`);
}
```

---

## Command-Line Interface (CLI)

`@animoria/core` ships with an executable binary (`animoria`):

```bash
# Audit a workspace directory
animoria check /path/to/project

# Output machine-readable JSON report
animoria check /path/to/project --format=json

# Run in background daemon mode (for IDE IPC)
animoria daemon /path/to/project
```

### CLI Exit Codes

| Exit Code | Meaning |
| :---: | :--- |
| `0` | Clean workspace (no errors, all governance rules passed). |
| `1` | Governance rule violation detected with `error` severity. |
| `2` | Configuration parsing error in `.animoriarc`. |
| `6` | Analysis incomplete or workspace unreadable. |

---

## Technical Constraints & Design Principles

* **Absolute Paths on Disk:** All internal paths are normalized and resolved absolutely to avoid symlink/working-directory ambiguity.
* **Single-Pass Reference Indexing:** Source files are globbed once, read once, and matched against compiled regex trees, guaranteeing linear scaling $O(\text{files})$.
* **Zero Fabricated Confidence:** Findings never report arbitrary confidence numbers; confidence is strictly derived from scan coverage and AST matching precision.

---

## Development & Testing

```bash
# Run all core unit and integration tests
pnpm --filter @animoria/core test

# Run performance benchmark suite
pnpm --filter @animoria/core test tests/perf/

# Build TypeScript output
pnpm --filter @animoria/core build
```

---

*Part of the [Sxnnyside Project](https://sxnnysideproject.com).*
