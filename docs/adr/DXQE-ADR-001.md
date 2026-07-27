# DXQE-ADR-001: TypeScript Stack Profile package manager deviation

**Status:** Accepted
**Scope:** Repository-wide

## Decision

TypeScript package management remains based on `pnpm` + `Turborepo` instead of the canonical `Bun` profile defined in DXQE v2.

## Rationale

Repository maturity, existing workspace architecture, and release stability outweigh the migration benefits while preserving every DXQE engineering principle.

## Consequences

- The repository will continue using `pnpm` for installing dependencies and managing workspace packages.
- `Turborepo` remains the build coordination tool.
- All other developer experience enhancements (e.g. static analysis using Biome, task execution abstraction using `just`, and Git commit validation hooks) will be implemented as standard.
