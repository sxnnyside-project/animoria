import { resetVscodeMock } from './mocks/vscode.js';

/**
 * Call from a test's `beforeEach` before touching any extension code that
 * reaches into the `vscode` mock's shared state (workspace folders,
 * configuration, the in-memory filesystem, command registry). The mock is a
 * module-level singleton — like the real `vscode` API — so tests that don't
 * reset it will leak state into one another.
 */
export function resetTestWorkspace(): void {
  resetVscodeMock();
}

export { __mockState as mockVscodeState } from './mocks/vscode.js';
export * as vscodeMock from './mocks/vscode.js';
