import { existsSync, watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { DaemonServer } from '../daemon/server.js';
import type { DaemonEvent, DaemonResponse } from '../daemon/protocol.js';
import { PROTOCOL_VERSION, daemonError } from '../daemon/protocol.js';
import { logWarn } from '../logging/logger.js';
import { CLI_EXIT_CODES } from './exit-codes.js';

/**
 * The NDJSON transport for {@link DaemonServer}.
 *
 * ## What this file is, and what it is not
 * It is **only** a transport: read lines from stdin, hand them to the server, write
 * the server's messages to stdout, and run a filesystem watcher. Every protocol
 * decision — validation, versioning, the handshake, the request registry,
 * cancellation, error taxonomy — lives in `daemon/server.ts`, which knows nothing
 * about stdio.
 *
 * That split is the point. The protocol used to be ~500 lines of `switch` inside
 * `cli.ts`, reachable only by spawning a subprocess, so "does a duplicate request id
 * get rejected" could only be tested by booting a real daemon and racing it. The
 * protocol is now in-process testable and this file is thin enough that the
 * subprocess test only has to prove the pipes are connected.
 */

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.animoria']);

/** One NDJSON line per message. */
function write(message: DaemonResponse | DaemonEvent): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

/**
 * Explains why a path cannot serve as a workspace root, or `null` when it can.
 *
 * Checked before the server starts, so an unusable root produces a `fatal` naming
 * the actual problem rather than an empty analysis a host would read as "your
 * workspace is clean".
 */
async function describeRootProblem(rootPath: string): Promise<string | null> {
  if (!existsSync(rootPath)) return `Workspace root does not exist: ${rootPath}`;
  try {
    const stats = await stat(rootPath);
    if (!stats.isDirectory()) return `Workspace root is not a directory: ${rootPath}`;
  } catch (error) {
    return `Workspace root could not be read: ${rootPath} (${
      error instanceof Error ? error.message : String(error)
    })`;
  }
  return null;
}

/**
 * Runs the daemon over stdio until stdin closes or `shutdown` is called.
 *
 * @returns the process exit code.
 */
export async function runDaemonCommand(
  rawRootPaths: readonly string[],
  versions: { coreVersion: string; daemonVersion: string }
): Promise<number> {
  if (rawRootPaths.length === 0) {
    write({
      protocol: PROTOCOL_VERSION,
      event: 'fatal',
      sequence: 1,
      sessionId: '',
      payload: daemonError('workspace-not-found', 'No workspace root was provided.'),
    });
    return CLI_EXIT_CODES.WORKSPACE_ERROR;
  }

  const rootPaths = rawRootPaths.map((path) => resolve(path));

  for (const rootPath of rootPaths) {
    const problem = await describeRootProblem(rootPath);
    if (problem) {
      write({
        protocol: PROTOCOL_VERSION,
        event: 'fatal',
        sequence: 1,
        sessionId: '',
        payload: daemonError('workspace-not-found', problem),
      });
      return CLI_EXIT_CODES.WORKSPACE_ERROR;
    }
  }

  const server = new DaemonServer({
    rootPaths,
    emit: write,
    coreVersion: versions.coreVersion,
    daemonVersion: versions.daemonVersion,
  });

  await server.start();

  const watchers = rootPaths.map((rootPath) => startWatcher(rootPath, server));

  const rl = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });

  // Handled sequentially per line rather than fire-and-forget, so a client that
  // pipelines requests cannot have two mutating operations interleave inside one
  // workspace. Concurrency across *sessions* is unaffected — they are separate
  // processes with separate servers.
  const pending: Promise<void>[] = [];
  rl.on('line', (line) => {
    pending.push(server.handleLine(line));
  });

  await new Promise<void>((resolveClose) => {
    rl.on('close', () => resolveClose());
    // A client that dies without closing stdin cleanly still terminates us: the
    // stream ends, and a daemon whose client is gone has nothing left to serve.
    process.stdin.on('end', () => resolveClose());
  });

  await Promise.allSettled(pending);

  for (const watcher of watchers) watcher?.close();
  server.stop();
  return CLI_EXIT_CODES.SUCCESS;
}

/**
 * Watches one root and forwards changes to the server, which routes them to the
 * indexer that owns the path.
 *
 * Returns the watcher so the caller can close it — an unclosed recursive watcher is
 * a live file-descriptor set that outlives the daemon it belonged to, which is
 * exactly the kind of leak §27 asks to rule out.
 */
function startWatcher(rootPath: string, server: DaemonServer): ReturnType<typeof watch> | null {
  try {
    return watch(rootPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const segments = filename.split(/[/\\]/);
      if (segments.some((segment) => EXCLUDE_DIRS.has(segment))) return;

      const fullPath = join(rootPath, filename);
      const kind = !existsSync(fullPath)
        ? 'deleted'
        : eventType === 'rename'
          ? 'created'
          : 'changed';

      server.notifyFileChanged(fullPath, kind);
    });
  } catch (error) {
    logWarn('cli-watch', 'runDaemonCommand', 'Filesystem watcher could not be started', {
      reason: 'watch() rejected this platform or path',
      error,
      recovery: 'the daemon still serves requests; it will not push change events',
      // The root's basename rather than its path: enough to identify which root in a
      // multi-root workspace, without writing the developer's directory layout into
      // every log line.
      assetPath: basename(rootPath),
    });
    return null;
  }
}
