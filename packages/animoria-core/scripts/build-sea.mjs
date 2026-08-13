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
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { arch, platform } from 'node:os';
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

  /*
   * The freshness check that was missing.
   *
   * This script bundles `dist/`, and only ever asserted that `dist/` *existed*. A
   * `dist/` compiled before the most recent source change produced a binary that was
   * a valid daemon of an older Core — one that speaks the current protocol perfectly
   * and refuses a method the client now depends on.
   *
   * That is precisely what shipped. A JetBrains plugin calling `getUsageReferences`
   * received `"getUsageReferences" is declared but not implemented in this build`,
   * which describes the binary accurately and says nothing about why: the binary was
   * built from a `dist/` older than the source that implements it. Nothing in the
   * chain — not this script, not Gradle, not the packaging step — compared the two.
   */
  const newest = (dir, extensions) => {
    let latest = 0;
    const visit = (current) => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) visit(full);
        else if (extensions.some((extension) => entry.name.endsWith(extension))) {
          latest = Math.max(latest, statSync(full).mtimeMs);
        }
      }
    };
    visit(dir);
    return latest;
  };

  const newestSource = newest(join(rootDir, 'src'), ['.ts']);
  const newestBuild = newest(distDir, ['.js']);
  if (newestSource > newestBuild) {
    console.error(
      'dist/ is older than src/ — this would package a daemon that silently lacks\n' +
        'capabilities the source implements, and clients would report them as\n' +
        '"declared but not implemented in this build".\n\n' +
        'Run: pnpm --filter @animoria/core build'
    );
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
    signDarwinBinary(outputPath);
  }

  console.log(`Done: ${outputPath}`);
}

main().catch((err) => {
  console.error('build-sea failed:', err);
  process.exit(1);
});

/**
 * Signs the macOS binary, and refuses to pretend an unsigned one is releasable.
 *
 * ## Why this is not just `codesign --sign -`
 * An ad-hoc signature satisfies the loader on the machine that produced it and
 * nothing else: Gatekeeper rejects an ad-hoc-signed binary downloaded from the
 * internet, so a plugin shipping one fails to launch its daemon on every user's
 * Mac with an error that names quarantine rather than Animoria. Ad-hoc signing is
 * correct for a local build and wrong for a release, and the difference has to be
 * decided by something other than which credentials happened to be present.
 *
 * `ANIMORIA_RELEASE_SIGNING=required` — set by the release workflow — makes
 * missing credentials a hard failure. Without it, a local build signs ad-hoc and
 * says so. What is never allowed is a *release* silently downgrading to ad-hoc,
 * which is how an unlaunchable artifact reaches a marketplace.
 */
function signDarwinBinary(outputPath) {
  const identity = process.env.ANIMORIA_SIGNING_IDENTITY;
  const releaseRequired = process.env.ANIMORIA_RELEASE_SIGNING === 'required';

  if (!identity) {
    if (releaseRequired) {
      throw new Error(
        'Release signing is required but ANIMORIA_SIGNING_IDENTITY is not set. ' +
          'A release must not ship an ad-hoc-signed macOS binary: Gatekeeper blocks it ' +
          'on every downloaded copy. Set ANIMORIA_SIGNING_IDENTITY (and the notarization ' +
          'credentials) in the release environment, or build without ' +
          'ANIMORIA_RELEASE_SIGNING for a local, ad-hoc-signed binary.'
      );
    }
    console.log('Re-applying an ad-hoc code signature (local build; not distributable)...');
    execFileSync('codesign', ['--sign', '-', outputPath], { stdio: 'inherit' });
    return;
  }

  console.log(`Signing with Developer ID identity: ${identity}`);
  execFileSync(
    'codesign',
    ['--sign', identity, '--options', 'runtime', '--timestamp', '--force', outputPath],
    { stdio: 'inherit' }
  );

  // Notarization is a separate, network-bound step against Apple's service. It is
  // attempted only when its own credentials are present, and its absence during a
  // required-signing build is fatal for the same reason an unsigned binary is.
  const appleId = process.env.ANIMORIA_NOTARIZE_APPLE_ID;
  const teamId = process.env.ANIMORIA_NOTARIZE_TEAM_ID;
  const password = process.env.ANIMORIA_NOTARIZE_PASSWORD;

  if (!appleId || !teamId || !password) {
    if (releaseRequired) {
      throw new Error(
        'Release signing is required but notarization credentials are incomplete ' +
          '(ANIMORIA_NOTARIZE_APPLE_ID, ANIMORIA_NOTARIZE_TEAM_ID, ANIMORIA_NOTARIZE_PASSWORD). ' +
          'A signed-but-unnotarized binary is still blocked by Gatekeeper on first launch.'
      );
    }
    console.log('Notarization credentials absent; skipping notarization (local build).');
    return;
  }

  console.log('Submitting for notarization...');
  const zipPath = `${outputPath}.zip`;
  execFileSync('ditto', ['-c', '-k', '--keepParent', outputPath, zipPath], { stdio: 'inherit' });
  execFileSync(
    'xcrun',
    [
      'notarytool',
      'submit',
      zipPath,
      '--apple-id',
      appleId,
      '--team-id',
      teamId,
      '--password',
      password,
      '--wait',
    ],
    { stdio: 'inherit' }
  );
  rmSync(zipPath, { force: true });
  // A bare executable cannot carry a stapled ticket the way a bundle can, so
  // Gatekeeper validates it online against the notarization record submitted above.
  console.log('Notarization complete.');
}
