/**
 * The harness entry point.
 *
 * Two imports: the shared token contract, and the shell. Every product surface comes
 * from `@animoria/ui` — the sandbox no longer owns a copy of any of them.
 *
 * The token stylesheet is imported here rather than by the components because tokens
 * live on `:root` and a Lit shadow root cannot define them for its host. Every IDE
 * host does the same thing: supply values on `:root`, then mount.
 */
import '@animoria/ui/tokens.css';
import './components/sandbox-app.js';
