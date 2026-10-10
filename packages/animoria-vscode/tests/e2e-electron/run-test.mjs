import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    const extensionDevelopmentPath = resolve(__dirname, '../../');
    const extensionTestsPath = resolve(__dirname, './suite/index.mjs');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions', '--disable-gpu'],
    });
  } catch (err) {
    console.error('Failed to run tests in VS Code Electron:', err);
    process.exit(1);
  }
}

main();
