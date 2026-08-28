# animoria-sandbox

Isolated Vite development harness and component testing environment for `@animoria/ui`.

> **Note on Project Structure:** The active application implementation lives in [`apps/animoria-sandbox`](../../apps/animoria-sandbox).

## Responsibilities
- Mounts shared Lit web components in a standalone browser window without launching IDE hosts.
- Provides mock `HostBridge` implementation (`canMutate: false`) backed by fixture animations.
- Exercises state transitions across all 6 lifecycle states (`initializing`, `analyzing`, `ready`, `stale`, `incomplete`, `failed`).
