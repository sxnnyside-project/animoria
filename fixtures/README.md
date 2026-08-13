# Animoria Golden Test Fixtures

A curated suite of self-contained, deterministic test workspaces used to enforce cross-client behavioral parity and prevent semantic regressions across `@animoria/core`, `animoria-vscode`, `animoria-jetbrains`, and `animoria-sandbox`.

---

## Why Golden Fixtures Exist

Visual asset governance relies on heuristics, binary structural checks, regex extractions, and syntax-aware usage tracing. Synthetic unit mocks often fail to capture real-world filesystem edge cases (e.g. nested relative imports, multi-root configuration overrides, case sensitivity, malformed ZIP chunks).

These fixtures represent ground truth:
* **Deterministic Guarantees:** Every fixture has a known, mathematically expected diagnostic set, reference count, and Health Score.
* **Cross-Client Parity:** Automated parity tests (`cross-client-parity.test.ts`) assert that CLI, VS Code, and JetBrains IDE daemons produce identical findings when pointed at any fixture in this directory.
* **Exclusion from Workspace Audits:** This directory is registered in the root [`.animoriaignore`](../.animoriaignore) so that synthetic test files never pollute live development galleries.

---

## Fixture Directory Inventory

| Fixture Workspace | Verified Behaviors & Architectural Guarantees |
| :--- | :--- |
| [`clean-workspace/`](./clean-workspace/) | **Clean Baseline:** Asserts that a clean workspace with 100% referenced assets reports zero diagnostics, 100% Health Score, and accurately lists evaluated rules. |
| [`unreferenced-assets/`](./unreferenced-assets/) | **Orphan Detection:** Asserts that unreferenced assets trigger `no-unreferenced-assets`, produce structured evidence, and cause `animoria check` to exit with status code `1` under error severity. |
| [`duplicates/`](./duplicates/) | **Content Duplication:** Verifies SHA-256 binary content hashing. Asserts that byte-identical files (even with different names or nested directories) are grouped into a single duplicate group with deterministic canonical selection. |
| [`mixed-governance/`](./mixed-governance/) | **Multi-Rule Evaluation:** Tests concurrent execution of multiple rules (`max-file-size-kb`, `no-gif`, `allowed-formats`, `no-duplicate-names`). Asserts that warnings do not fail CI while errors trigger non-zero exit codes. |
| [`reference-formats/`](./reference-formats/) | **Syntax Diversity:** Contains authentic references across 20+ syntaxes (`.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.md`, `.css`, `.html`, `.dart`, `.swift`, `.kt`) paired with negative false-positive candidates (prose, URLs, data URIs) to prove extractor accuracy. |
| [`reference-edge-cases/`](./reference-edge-cases/) | **Extraction Boundaries:** Asserts that Markdown inline code blocks and `.json` data strings are ignored, while inline comments with `// animoria-ignore` are properly excluded from usage counts. |
| [`malformed-assets/`](./malformed-assets/) | **Fault Tolerance:** Contains truncated Lottie JSON, corrupted dotLottie archives, and invalid Rive headers. Asserts that parsers fail gracefully with descriptive error states without crashing the host process. |
| [`empty-workspace/`](./empty-workspace/) | **Empty Workspace State:** Asserts that a repository with no visual assets reports `HealthScoreOutcome.unavailable("no-assets")` rather than inventing a false 100% score. |
| [`multi-root-workspace/`](./multi-root-workspace/) | **Multi-Root Isolation:** Contains multiple independent roots, each with distinct `.animoriarc` policies, asserting that multi-root sessions maintain isolated analysis states. |
| [`monorepo-scoped/`](./monorepo-scoped/) | **Boundary Scoping:** Contains multiple monorepo packages, verifying that reference searching respects project boundaries (`package.json`, `pubspec.yaml`, `Cargo.toml`). |

---

## How Fixtures Are Executed in Tests

Fixtures are loaded dynamically by Vitest test suites:

```typescript
import { resolve } from 'node:path';
import { WorkspaceIndexer } from '@animoria/core';

const fixturePath = resolve(__dirname, '../../fixtures/duplicates');
const indexer = new WorkspaceIndexer({ workspacePath: fixturePath });
const analysis = await indexer.analyzeComplete();

// Assert deterministic outcome
expect(analysis.duplicateGroups).toHaveLength(1);
expect(analysis.duplicateGroups[0]?.assets).toHaveLength(2);
```

---

## Guidelines for Adding New Fixtures

When introducing a new fixture workspace:
1. **Keep Assets Minimal:** Author minimal synthetic payloads (1–2 KB). Do not commit large production binary files.
2. **Platform-Neutral Paths:** Use relative POSIX paths only. Avoid symlinks and OS-specific casing assumptions.
3. **Paired Test Assertion:** Never commit a fixture without a corresponding test in `packages/animoria-core/tests/` asserting its exact output.
4. **Self-Documenting:** Place a brief `README.md` inside the fixture folder explaining what specific invariant it proves.

---

## Large Workload Performance Testing

Workloads exceeding 50+ assets and 300+ source files are generated dynamically in temporary directories during benchmark runs rather than committed to Git. See [`packages/animoria-core/tests/perf/`](../packages/animoria-core/tests/perf/).
