#!/usr/bin/env node
/**
 * Builds `cli.js` into a self-contained native executable using Node's
 * Single Executable Application (SEA) support, so JetBrains plugin users
 * never need Node.js installed separately.
 *
 * ## Why this exists
 * The JetBrains client spawns `@animoria/core`'s CLI as a background
 * daemon (`CoreProcessManager`) because Kotlin cannot import it directly.
 * Requiring end users to have Node.js on their machine just to use a
 * JetBrains plugin is an unusual, easy-to-trip adoption blocker for an
 * IDE that doesn't bundle Node itself (unlike VS Code, which runs on
 * Electron). This script produces a native binary that embeds the Node
 * runtime and the bundled CLI together, so `CoreProcessManager` can spawn
 * it directly with no separate Node install required — falling back to
 * `node cli.js` only in development or on a platform this hasn't been
 * built for.
 *
 * ## Process (per Node's documented SEA workflow)
 * 1. Bundle `dist/cli.js` and every module it imports into a single
 *    CommonJS file with esbuild — SEA blobs one script, so cross-file
 *    ESM imports must be inlined first.
 * 2. Generate the V8 startup snapshot blob via `node --experimental-sea-config`.
 * 3. Copy the *current* Node binary as the executable's base and inject
 *    the blob into it with `postject`.
 * 4. On macOS, remove and re-apply an ad-hoc code signature — required
 *    after modifying a signed Mach-O binary's contents.
 *
 * ## Cross-platform builds
 * This script can only produce a binary for the platform it runs on —
 * SEA injects into the *actual* Node binary present on the machine, it
 * does not cross-compile. Producing macOS/Linux/Windows binaries means
 * running this script on each of those platforms (see the release
 * workflow's build matrix), then collecting all three outputs into the
 * plugin's `native/<platform>-<arch>/` resources.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { platform, arch } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const seaDir = join(rootDir, 'sea');
// Intermediate build artifacts live in their own subfolder so `sea/`'s only
// direct children are the per-platform output directories — this is what
// lets the release workflow upload the whole `sea/` tree as one artifact
// per OS and merge them without picking up build-only junk files.
const buildDir = join(seaDir, '.build');

const bundlePath = join(buildDir, 'cli.bundle.cjs');
const seaConfigPath = join(buildDir, 'sea-config.json');
const blobPath = join(buildDir, 'cli.blob');

const platformArchDir = `${platform()}-${arch()}`;
const outputName = platform() === 'win32' ? 'animoria-core.exe' : 'animoria-core';
const outputPath = join(seaDir, platformArchDir, outputName);
const nativeModulesDir = join(seaDir, platformArchDir, 'native_modules');

/**
 * Node's SEA blob can only embed pure-JS logic — `require()` inside an SEA
 * main script is neutered to built-ins only (see the Node SEA docs). Any
 * dependency that ships a native `.node` addon (here: `sharp`, pulled in
 * transitively by `@dotlottie/dotlottie-js`'s perceptual-hash feature)
 * cannot be bundled and must instead be `require`d from a real path on
 * disk via `module.createRequire()` at runtime.
 *
 * This esbuild plugin replaces every `require('sharp')` the bundle would
 * otherwise emit with a small shim that does exactly that, resolving
 * against a `native_modules/` folder this script installs alongside the
 * executable (see below). To support another native dependency later,
 * add its name to `NATIVE_MODULES` — no other change needed.
 */
const NATIVE_MODULES = ['sharp'];

/** @type {import('esbuild').Plugin} */
const nativeModuleShimPlugin = {
  name: 'native-module-shim',
  setup(build) {
    for (const moduleName of NATIVE_MODULES) {
      const filter = new RegExp(`^${moduleName}$`);
      build.onResolve({ filter }, (args) => ({ path: args.path, namespace: 'native-shim' }));
      build.onLoad({ filter, namespace: 'native-shim' }, () => ({
        // Resolved against process.execPath's directory (where the SEA
        // executable actually lives at runtime), not __dirname — a
        // synthetic esbuild module has no meaningful __dirname of its own.
        contents: `
          const { createRequire } = require('module');
          const path = require('path');
          const nativeModulesDir = path.join(path.dirname(process.execPath), 'native_modules');
          const nativeRequire = createRequire(path.join(nativeModulesDir, '_shim.js'));
          module.exports = nativeRequire(${JSON.stringify(moduleName)});
        `,
        loader: 'js',
      }));
    }
  },
};

async function main() {
  mkdirSync(join(seaDir, platformArchDir), { recursive: true });
  mkdirSync(buildDir, { recursive: true });

  if (!existsSync(join(distDir, 'cli.js'))) {
    console.error('dist/cli.js not found — run `pnpm build` first.');
    process.exit(1);
  }

  console.log('[1/4] Bundling cli.js and its dependencies into a single CommonJS file...');
  await esbuild.build({
    entryPoints: [join(distDir, 'cli.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    outfile: bundlePath,
    plugins: [nativeModuleShimPlugin],
  });

  console.log('Installing native dependencies (sharp) for this platform into native_modules/...');
  mkdirSync(nativeModulesDir, { recursive: true });
  execFileSync(
    'npm',
    ['install', '--prefix', nativeModulesDir, '--no-save', '--no-package-lock', 'sharp'],
    { stdio: 'inherit' }
  );

  console.log('[2/4] Writing sea-config.json and generating the startup blob...');
  writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: bundlePath,
        output: blobPath,
        disableExperimentalSEAWarning: true,
      },
      null,
      2
    )
  );
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
    stdio: 'inherit',
  });

  console.log(
    `[3/4] Copying the current Node binary (${process.execPath}) as the executable base...`
  );
  copyFileSync(process.execPath, outputPath);
  if (platform() !== 'win32') {
    execFileSync('chmod', ['+x', outputPath]);
  }

  if (platform() === 'darwin') {
    // A universal/fat Node build (e.g. Homebrew's) embeds the SEA sentinel
    // string once per architecture slice — postject's single-occurrence
    // scan then fails. Thin it down to the running architecture first;
    // `lipo -info` reports "Non-fat file" for an already single-arch
    // binary, in which case there is nothing to do.
    const lipoInfo = execFileSync('lipo', ['-info', outputPath], { encoding: 'utf-8' });
    if (!lipoInfo.includes('Non-fat file')) {
      console.log(`Thinning universal binary down to ${arch()}...`);
      execFileSync('lipo', [
        '-thin',
        arch() === 'x64' ? 'x86_64' : arch(),
        outputPath,
        '-output',
        outputPath,
      ]);
    }

    console.log('Removing existing code signature (required before injection on macOS)...');
    execFileSync('codesign', ['--remove-signature', outputPath], { stdio: 'inherit' });
  }

  console.log('[4/4] Injecting the blob with postject...');
  const postjectArgs = [
    '-y',
    'postject',
    outputPath,
    'NODE_SEA_BLOB',
    blobPath,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ];
  if (platform() === 'darwin') {
    postjectArgs.push('--macho-segment-name', 'NODE_SEA');
  }
  execFileSync('npx', postjectArgs, { stdio: 'inherit' });

  if (platform() === 'darwin') {
    console.log('Re-applying an ad-hoc code signature...');
    execFileSync('codesign', ['--sign', '-', outputPath], { stdio: 'inherit' });
  }

  console.log(`Done: ${outputPath}`);
}

main().catch((err) => {
  console.error('build-sea failed:', err);
  process.exit(1);
});
