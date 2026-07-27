#!/usr/bin/env node
/**
 * Copies the self-contained native `animoria-core` executable (built by
 * `pnpm --filter @animoria/core build:sea`) into the JetBrains plugin's
 * resources, so it gets bundled into the packaged plugin and
 * `CoreProcessManager` can find it at `classes/native/<platform-arch>/`
 * inside the installed plugin — see `findBundledExecutable()`.
 *
 * Only copies the binary for the platform this script runs on. Producing
 * a plugin with binaries for every OS means running this (and the SEA
 * build before it) once per platform and merging the resulting
 * `native/` trees before `./gradlew buildPlugin` — see the release
 * workflow's build matrix.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { platform, arch } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const platformArchDir = `${platform()}-${arch()}`;
const sourceDir = join(repoRoot, 'packages/animoria-core/sea', platformArchDir);
const targetDir = join(
  repoRoot,
  'packages/animoria-jetbrains/src/main/resources/native',
  platformArchDir
);

if (!existsSync(sourceDir)) {
  console.error(
    `No SEA build output found at ${sourceDir}. Run "pnpm --filter @animoria/core build:sea" first.`
  );
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied native daemon for ${platformArchDir} into ${targetDir}`);
