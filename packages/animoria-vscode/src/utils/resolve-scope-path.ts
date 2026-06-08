import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

const PROJECT_MARKERS = [
  'package.json',
  'pubspec.yaml',
  'build.gradle',
  'build.gradle.kts',
  'Podfile',
  'Package.swift',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
];

export function resolveScopePath(
  assetPath: string,
  workspacePath: string
): string {
  const root = resolve(workspacePath);
  let current = dirname(resolve(assetPath));

  while (current.startsWith(root) && current !== root) {
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(current, marker))) {
        return current;
      }
    }
    current = dirname(current);
  }

  return root;
}
