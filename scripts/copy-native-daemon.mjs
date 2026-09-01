#!/usr/bin/env node
/**
 * Copies the native `animoria` executable (built by Cargo in
 * `packages/animoria-core-rust`) into both hosts' resources for local
 * dev/packaging:
 * - `packages/animoria-vscode/bin/` — `daemon-client.ts`'s `resolveBinaryPath`
 *   looks there first.
 * - `packages/animoria-jetbrains/src/main/resources/native/<platform-arch>/` —
 *   `DaemonBinaryResolver.findBundledExecutable()`.
 *
 * The release workflow does its own per-platform copy for the four shipped
 * targets; this is for building/running a single host locally.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const isWindows = platform() === 'win32';
const binName = isWindows ? 'animoria.exe' : 'animoria';
const platformArchDir = `${platform()}-${arch()}`;

const rustReleaseBin = join(repoRoot, 'packages/animoria-core-rust/target/release', binName);
const rustDebugBin = join(repoRoot, 'packages/animoria-core-rust/target/debug', binName);

const sourceBin = existsSync(rustReleaseBin)
  ? rustReleaseBin
  : existsSync(rustDebugBin)
    ? rustDebugBin
    : null;

if (!sourceBin) {
  console.warn(
    `Native binary not found at ${rustReleaseBin}. Build with 'cargo build --release -p animoria-core-rust' first.`
  );
  process.exit(0);
}

const vscodeBinDir = join(repoRoot, 'packages/animoria-vscode/bin');
rmSync(vscodeBinDir, { recursive: true, force: true });
mkdirSync(vscodeBinDir, { recursive: true });
cpSync(sourceBin, join(vscodeBinDir, binName));

const jetbrainsTargetDir = join(
  repoRoot,
  'packages/animoria-jetbrains/src/main/resources/native',
  platformArchDir
);
rmSync(jetbrainsTargetDir, { recursive: true, force: true });
mkdirSync(jetbrainsTargetDir, { recursive: true });
cpSync(sourceBin, join(jetbrainsTargetDir, binName));

console.log(`Copied ${sourceBin} into ${vscodeBinDir} and ${jetbrainsTargetDir}`);
