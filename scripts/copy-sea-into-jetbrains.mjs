#!/usr/bin/env node
/**
 * Copies the native `animoria` executable (built by Cargo in `packages/animoria-core-rust`)
 * into the JetBrains plugin's resources, so it gets bundled into the packaged plugin and
 * `CoreProcessManager` can find it at `classes/native/<platform-arch>/`
 * inside the installed plugin — see `findBundledExecutable()`.
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

const targetDir = join(
  repoRoot,
  'packages/animoria-jetbrains/src/main/resources/native',
  platformArchDir
);

if (!sourceBin) {
  console.warn(
    `[JetBrains Packager] Note: Native binary not found at ${rustReleaseBin}. Build with 'cargo build --release -p animoria-core-rust' first.`
  );
  process.exit(0);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceBin, join(targetDir, binName));

console.log(`Copied native binary from ${sourceBin} into ${join(targetDir, binName)}`);
