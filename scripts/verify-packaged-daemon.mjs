#!/usr/bin/env node
/**
 * Runs the *packaged* daemon and proves it answers what the plugin requires.
 *
 * ## Why a runtime check and not a build-time one
 * Every previous gate reasoned about files: is the binary present, is it newer than
 * `dist/`, does the source implement the method. All of them passed while a JetBrains
 * user saw `"getUsageReferences" is declared but not implemented in this build`,
 * because the only thing that settles the question is asking the binary.
 *
 * This spawns the exact executable that ships inside the plugin jar, completes the
 * handshake, and requires the methods `CoreProcessManager.REQUIRED_METHODS` names —
 * then actually calls the one that was reported broken. A binary that lies in `hello`
 * fails here too.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nativeRoot = join(repoRoot, 'packages/animoria-jetbrains/src/main/resources/native');
const workspace = join(repoRoot, 'fixtures/reference-formats');

/** The plugin's own requirement list, read from Kotlin rather than restated here. */
function requiredMethods() {
  const source = readFileSync(
    join(
      repoRoot,
      'packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/CoreProcessManager.kt'
    ),
    'utf8'
  );
  const block = /REQUIRED_METHODS: Set<String> =\s*setOf\(([\s\S]*?)\)/.exec(source)?.[1] ?? '';
  return [...block.matchAll(/"([A-Za-z]+)"/g)].map((match) => match[1]);
}

function fail(message) {
  console.error(`[verify-packaged-daemon] ${message}`);
  process.exit(1);
}

if (!existsSync(nativeRoot))
  fail(`no packaged daemon under ${nativeRoot}. Run: pnpm package:jetbrains-daemon`);

const platforms = readdirSync(nativeRoot, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory()
);
if (platforms.length === 0)
  fail('no platform directories under native/. Run: pnpm package:jetbrains-daemon');

const required = requiredMethods();
if (required.length === 0) fail('could not read REQUIRED_METHODS from CoreProcessManager.kt');

for (const platform of platforms) {
  // build-sea.mjs names the Windows binary with a `.exe` suffix.
  const binaryName = platform.name.startsWith('win32') ? 'animoria-core.exe' : 'animoria-core';
  const binary = join(nativeRoot, platform.name, binaryName);
  if (!existsSync(binary)) fail(`${platform.name}: the packaged daemon executable is missing`);
  await verify(binary, platform.name);
}

console.log(`[verify-packaged-daemon] OK — ${required.length} required methods answerable`);

async function verify(binary, platformName) {
  await new Promise((resolve) => {
    const daemon = spawn(binary, ['daemon', workspace]);
    let buffer = '';
    const timer = setTimeout(() => {
      daemon.kill();
      fail(`${platformName}: the packaged daemon did not answer within 90s`);
    }, 90_000);

    const send = (message) => daemon.stdin.write(`${JSON.stringify(message)}\n`);

    daemon.on('error', (error) =>
      fail(`${platformName}: could not spawn the daemon — ${error.message}`)
    );

    daemon.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      // NDJSON: one message per line, and a chunk may hold a fraction of one.
      for (;;) {
        const newline = buffer.indexOf('\n');
        if (newline === -1) break;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);

        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (message.event === 'ready') send({ protocol: 1, id: 'hello', method: 'hello' });

        if (message.id === 'hello') {
          const methods = message.result?.methods;
          if (!Array.isArray(methods)) {
            clearTimeout(timer);
            daemon.kill();
            fail(
              `${platformName}: hello did not declare a method list — the daemon predates the check`
            );
          }
          const missing = required.filter((method) => !methods.includes(method));
          if (missing.length > 0) {
            clearTimeout(timer);
            daemon.kill();
            fail(`${platformName}: the packaged daemon cannot answer ${missing.join(', ')}`);
          }
          // Declared is not the same as working. Call the one that shipped broken.
          send({ protocol: 1, id: 'usage', method: 'getUsageReferences' });
        }

        if (message.id === 'usage') {
          clearTimeout(timer);
          daemon.kill();
          if (message.error) {
            fail(
              `${platformName}: getUsageReferences failed — ${message.error.code}: ${message.error.message}`
            );
          }
          if (!Array.isArray(message.result?.references)) {
            fail(`${platformName}: getUsageReferences returned no reference list`);
          }
          console.log(
            `[verify-packaged-daemon] ${platformName}: ${message.result.references.length} references, ` +
              `${required.length} required methods present`
          );
          resolve();
        }
      }
    });
  });
}
