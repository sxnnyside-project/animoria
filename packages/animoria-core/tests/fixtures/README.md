# Test Fixtures

The assets in this directory are synthetic testing resources. They exist to validate parsing, scanning, and governance heuristics deterministically — not to represent production-quality visual assets.

- `valid.lottie.json`, `invalid.json` — minimal Lottie documents for structural validation tests.
- `valid.animation.lottie` — minimal dotLottie (V2 ZIP) archive.
- `rive-workspace/hero.riv` — minimal Rive binary for format/magic-byte detection.
- `workspace/`, `governance-workspace/` — small mock workspaces (a `package.json` boundary, source files under `src/`, assets under `assets/`) used to exercise usage-reference scanning and governance analysis (duplicates, unused/overused classification) against a realistic directory shape.

Their purpose is deterministic testing, not visual fidelity. When validating rendering quality, governance behavior, or real-world compatibility, prefer genuine production assets over these fixtures.
