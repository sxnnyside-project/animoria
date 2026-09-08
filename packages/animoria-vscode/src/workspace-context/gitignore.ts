import { promises as fs, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ensures that `.animoria/` is listed in the workspace's `.gitignore`
 * if the workspace is a Git repository.
 *
 * Returns true if `.gitignore` was modified or created, false otherwise.
 */
export async function ensureGitignoreContainsAnimoria(workspaceRoot: string): Promise<boolean> {
  if (!workspaceRoot) return false;

  const gitDir = join(workspaceRoot, '.git');
  if (!existsSync(gitDir)) return false;

  const gitignorePath = join(workspaceRoot, '.gitignore');
  let content = '';

  if (existsSync(gitignorePath)) {
    try {
      content = await fs.readFile(gitignorePath, 'utf8');
    } catch {
      return false;
    }

    const lines = content.split(/\r?\n/);
    const isIgnored = lines.some((line) => {
      const trimmed = line.trim();
      return (
        trimmed === '.animoria' ||
        trimmed === '.animoria/' ||
        trimmed === '/.animoria' ||
        trimmed === '/.animoria/' ||
        trimmed === '**/.animoria' ||
        trimmed === '**/.animoria/**'
      );
    });

    if (isIgnored) return false;
  }

  const block =
    content.length === 0
      ? '# Animoria cache & staged cleanup\n.animoria/\n'
      : content.endsWith('\n')
        ? '\n# Animoria cache & staged cleanup\n.animoria/\n'
        : '\n\n# Animoria cache & staged cleanup\n.animoria/\n';

  try {
    await fs.appendFile(gitignorePath, block, 'utf8');
    return true;
  } catch {
    return false;
  }
}
