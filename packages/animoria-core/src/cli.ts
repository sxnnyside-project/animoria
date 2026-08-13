#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCheckCommand } from './cli/check-command.js';
import { runDaemonCommand } from './cli/daemon-command.js';
import { CLI_USAGE, resolveEntryPoint } from './cli/entry-point.js';
import { CLI_EXIT_CODES } from './cli/exit-codes.js';

/**
 * Entry point dispatcher for the `animoria` executable.
 *
 * ## Two consumers, one binary
 * `dist/cli.js` serves two distinct callers:
 *
 * 1. `animoria check [...]` — the headless CI/CD validation command.
 *    See `cli/check-command.js` for the actual orchestration; this
 *    file's only involvement is recognizing the `check` subcommand and
 *    translating its result into process-level effects (stdout,
 *    `process.exitCode`).
 * 2. `animoria daemon <root...>` — the long-running protocol daemon an IDE
 *    host spawns as a subprocess. Bidirectional NDJSON over stdio, speaking
 *    protocol v1 (`daemon/protocol.ts`). Accepts several roots, because a
 *    workspace may have several (V2).
 *
 *    The protocol itself lives in `daemon/server.ts` and the stdio transport in
 *    `cli/daemon-command.ts`. This file used to hold ~600 lines of it inline,
 *    which meant the only way to test the protocol was to spawn a process.
 *
 * Dispatch is a single, explicit check on the first argument — no
 * shared state, no fallthrough between the two modes.
 */
/**
 * Translates a resolved entry point into process-level effects.
 *
 * All of the decision-making lives in {@link resolveEntryPoint}, which is a pure
 * function with its own tests; this wrapper exists only to write to streams, set an
 * exit code, and hand control to the daemon.
 */
async function main(): Promise<void> {
  const entry = resolveEntryPoint(process.argv.slice(2));

  switch (entry.kind) {
    case 'help':
      process.stdout.write(`${CLI_USAGE}\n`);
      process.exitCode = entry.exitCode;
      return;

    case 'version':
      process.stdout.write(`${await readPackageVersion()}\n`);
      return;

    case 'check': {
      const result = await runCheckCommand(entry.argv);
      process.stdout.write(`${result.output}\n`);
      process.exitCode = result.exitCode;
      return;
    }

    case 'daemon': {
      const version = await readPackageVersion();
      process.exitCode = await runDaemonCommand(entry.workspacePaths, {
        coreVersion: version,
        // The SEA build embeds the same Core, so the two versions coincide today.
        // Reported separately because a future packaging change could make them
        // differ, and a host debugging a mismatch needs to know which one is wrong.
        daemonVersion: version,
      });
      return;
    }

    case 'usage-error':
      process.stderr.write(`${entry.message}\n\n${CLI_USAGE}\n`);
      process.exitCode = CLI_EXIT_CODES.INVALID_USAGE;
      return;
  }
}

/**
 * Reads the version from the package manifest that ships beside this binary.
 *
 * Resolved from `__dirname` rather than `import.meta.url` because this file is also
 * bundled into a CommonJS single-executable build, where `import.meta` is illegal.
 */
async function readPackageVersion(): Promise<string> {
  for (const candidate of [
    join(__dirname, '..', 'package.json'),
    join(__dirname, 'package.json'),
  ]) {
    try {
      const raw = await readFile(candidate, 'utf-8');
      const version = (JSON.parse(raw) as { version?: string }).version;
      if (version) return version;
    } catch {
      // Try the next candidate; a bundled build may have neither.
    }
  }
  return 'unknown';
}

/**
 * The process entry point.
 *
 * `void` rather than a top-level `await`: this file is also bundled into a CommonJS
 * single-executable build, where top-level `await` is illegal. Every error path
 * inside `main` already sets `process.exitCode`, so there is nothing here to catch.
 */
void main();
